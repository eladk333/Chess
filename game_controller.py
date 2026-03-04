import pygame
import chess
from ai.utils import handle_ai_turn

AI_MOVE_EVENT = pygame.USEREVENT + 1

class DummyPiece:
    """Adapter so your UI's draw_pieces can read piece.color, piece.type_name(), and piece.image"""
    def __init__(self, chess_piece, images):
        self.color = "white" if chess_piece.color == chess.WHITE else "black"
        self.type = chess.PIECE_NAMES[chess_piece.piece_type]
        self.image = images.get(f"{self.color}_{self.type}")

    def type_name(self):
        return self.type

class GameController:
    def __init__(self, board: chess.Board, layout, images, vs_ai=False, player_color="white", ai_player=None):
        self.board = board
        self.layout = layout
        self.images = images
        self.vs_ai = vs_ai
        
        # UI State
        self.player_color = chess.WHITE if player_color == "white" else chess.BLACK
        self.ai_player = ai_player
        self.last_move = None
        self.selected = None
        self.highlight_squares = []
        self.check_message = ""
        self.game_over = False

        # Dragging State
        self.dragging = False
        self.dragged_piece = None
        self.drag_start = None
        self.drag_pos = (0, 0)
        self.click_down_pos = None
        self.mouse_down_square = None
        
        # AI Timer
        self.waiting_for_ai = False
        if self.vs_ai and self.player_color == chess.BLACK:
            self.waiting_for_ai = True
            pygame.time.set_timer(AI_MOVE_EVENT, 300)

    # --- Coordinate Translators ---
    # --- Coordinate Translators ---
    def _to_chess_square(self, row, col):
        """Converts UI (row, col) to python-chess square (0-63)"""
        if row is None or col is None: return None
        return chess.square(col, 7 - row)

    def _to_ui_coord(self, square):
        """Converts python-chess square (0-63) to UI (row, col)"""
        if square is None: return None
        rank = chess.square_rank(square)
        file = chess.square_file(square)
        return (7 - rank, file)

    def _get_ui_board(self):
        """Generates the 8x8 array your UI expects on the fly."""
        ui_board = [[None for _ in range(8)] for _ in range(8)]
        for sq in chess.SQUARES:
            piece = self.board.piece_at(sq)
            if piece:
                r, c = self._to_ui_coord(sq)
                ui_board[r][c] = DummyPiece(piece, self.images)
        return ui_board

    # --- Core Loop ---
    def handle_event(self, event):
        if event.type == pygame.QUIT:
            return "quit"
        
        if self.game_over:
            return

        if event.type == pygame.MOUSEBUTTONDOWN and not self.waiting_for_ai:
            return self._on_mouse_down(event)
        elif event.type == pygame.MOUSEMOTION and not self.waiting_for_ai:
            return self._on_mouse_move(event)
        elif event.type == pygame.MOUSEBUTTONUP and not self.waiting_for_ai:
            return self._on_mouse_up(event)
        elif event.type == AI_MOVE_EVENT:
            if self.waiting_for_ai:
                # Assuming your AI returns a chess.Move object now
                move = self.ai_player.get_best_move(self.board) 
                if move:
                    self._apply_move(move)
                self.waiting_for_ai = False
                pygame.time.set_timer(AI_MOVE_EVENT, 0)

    def draw(self, screen, draw_board_func, draw_pieces_func, draw_players_func, font, options_icon, options_rect, names_and_icons):
        ui_board = self._get_ui_board()
        
        # Format last move for UI highlighting
        ui_last_move = None
        if self.last_move:
            src = self._to_ui_coord(self.last_move.from_square)
            dst = self._to_ui_coord(self.last_move.to_square)
            ui_last_move = (src, dst, None) # None because UI doesn't strictly need the piece object for highlighting

        draw_board_func(screen, self.highlight_squares, self.layout, last_move=ui_last_move)
        draw_players_func(screen, self.layout, font, *names_and_icons)
        screen.blit(options_icon, options_rect)

        # Handle drawing the dragged piece
        if self.dragging and self.drag_start:
            r, c = self.drag_start
            temp = ui_board[r][c]
            ui_board[r][c] = None
            draw_pieces_func(screen, ui_board, self.layout)
            ui_board[r][c] = temp
            
            if self.dragged_piece and self.dragged_piece.image:
                x, y = self.drag_pos
                screen.blit(self.dragged_piece.image, (x - self.layout.tile_size // 2, y - self.layout.tile_size // 2))
        else:
            draw_pieces_func(screen, ui_board, self.layout)

        if self.check_message:
            text = font.render(self.check_message, True, (255, 0, 0))
            screen.blit(text, (10, 10))

    # --- Mouse Handlers ---
    def _on_mouse_down(self, event):
        self.click_down_pos = pygame.mouse.get_pos()
        self.mouse_down_square = self.layout.to_board(*self.click_down_pos)
        self.dragging = False

    def _on_mouse_move(self, event):
        if not self.dragging and self.click_down_pos and self.mouse_down_square:
            dx = event.pos[0] - self.click_down_pos[0]
            dy = event.pos[1] - self.click_down_pos[1]
            if abs(dx) > 5 or abs(dy) > 5:
                row, col = self.mouse_down_square
                sq = self._to_chess_square(row, col)
                piece = self.board.piece_at(sq)
                
                if piece and piece.color == self.board.turn:
                    self.dragging = True
                    self.drag_start = (row, col)
                    self.dragged_piece = DummyPiece(piece, self.images)
                    self.drag_pos = event.pos
                    self.selected = (row, col)
                    self._update_highlights(sq)
                    
        if self.dragging:
            self.drag_pos = pygame.mouse.get_pos()

    def _on_mouse_up(self, event):
        was_dragging = self.dragging
        self.dragging = False

        self.click_down_pos = None  
        self.mouse_down_square = None
        
        drop_pos = pygame.mouse.get_pos()
        target_rc = self.layout.to_board(*drop_pos)
        
        if not target_rc:
            self._clear_selection()
            return

        target_sq = self._to_chess_square(*target_rc)

        # Execute move if valid
        if self.selected:
            src_sq = self._to_chess_square(*self.selected)
            
            # Auto-promote to Queen for simplicity (can add UI for this later)
            move = chess.Move(src_sq, target_sq)
            if chess.Move(src_sq, target_sq, promotion=chess.QUEEN) in self.board.legal_moves:
                move = chess.Move(src_sq, target_sq, promotion=chess.QUEEN)

            if move in self.board.legal_moves:
                self._apply_move(move)
                self._clear_selection()
                return

        # Handle simple clicking (selection)
        piece = self.board.piece_at(target_sq)
        if piece and piece.color == self.board.turn:
            self.selected = target_rc
            self._update_highlights(target_sq)
        else:
            self._clear_selection()

    def _update_highlights(self, square):
        """Highlights legal moves for the selected piece"""
        self.highlight_squares = []
        for move in self.board.legal_moves:
            if move.from_square == square:
                self.highlight_squares.append(self._to_ui_coord(move.to_square))

    def _apply_move(self, move: chess.Move):
        self.board.push(move)
        self.last_move = move
        self._update_game_state()

        if self.vs_ai and self.board.turn != self.player_color and not self.game_over:
            self.waiting_for_ai = True
            pygame.time.set_timer(AI_MOVE_EVENT, 300)

    def _update_game_state(self):
        if self.board.is_checkmate():
            winner = "Black" if self.board.turn == chess.WHITE else "White"
            self.check_message = f"Checkmate! {winner} wins."
            self.game_over = True
        elif self.board.is_stalemate() or self.board.is_insufficient_material():
            self.check_message = "Draw!"
            self.game_over = True
        elif self.board.is_check():
            self.check_message = "Check!"
        else:
            self.check_message = ""

    def _clear_selection(self):
        self.dragging = False
        self.dragged_piece = None
        self.drag_start = None
        self.selected = None
        self.highlight_squares = []