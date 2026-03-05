import pygame
import chess

AI_MOVE_EVENT = pygame.USEREVENT + 1

# Chess.com-style material / captured pieces UI helpers
PIECE_VALUES = {
    chess.PAWN: 1,
    chess.KNIGHT: 3,
    chess.BISHOP: 3,
    chess.ROOK: 5,
    chess.QUEEN: 9,
}

# Starting piece counts per side (excluding king)
START_COUNTS = {
    chess.PAWN: 8,
    chess.KNIGHT: 2,
    chess.BISHOP: 2,
    chess.ROOK: 2,
    chess.QUEEN: 1,
}

# Order to display captured pieces (like chess.com)
CAPTURE_ORDER = [chess.PAWN, chess.KNIGHT, chess.BISHOP, chess.ROOK, chess.QUEEN]

class DummyPiece:
    def __init__(self, chess_piece, images):
        self.color = "white" if chess_piece.color == chess.WHITE else "black"
        self.type = chess.PIECE_NAMES[chess_piece.piece_type]
        self.image = images.get(f"{self.color}_{self.type}")

    def type_name(self):
        return self.type

class GameController:
    def __init__(self, board: chess.Board, layout, images, mode="pvp", white_ai=None, black_ai=None):
        self.board = board
        self.layout = layout
        self.images = images
        self.mode = mode
        
        self.white_ai = white_ai
        self.black_ai = black_ai
        
        self.last_move = None
        self.selected = None
        self.highlight_squares = []
        self.check_message = ""
        self.game_over = False

        self.dragging = False
        self.dragged_piece = None
        self.drag_start = None
        self.drag_pos = (0, 0)
        self.click_down_pos = None
        self.mouse_down_square = None
        
        self.waiting_for_ai = False
        
        # Kick off the AI logic if the starting player is AI
        self._check_ai_turn()

    def _to_chess_square(self, row, col):
        if row is None or col is None: return None
        return chess.square(col, 7 - row)

    def _to_ui_coord(self, square):
        if square is None: return None
        rank = chess.square_rank(square)
        file = chess.square_file(square)
        return (7 - rank, file)

    def _get_ui_board(self):
        ui_board = [[None for _ in range(8)] for _ in range(8)]
        for sq in chess.SQUARES:
            piece = self.board.piece_at(sq)
            if piece:
                r, c = self._to_ui_coord(sq)
                ui_board[r][c] = DummyPiece(piece, self.images)
        return ui_board

    def _check_ai_turn(self):
        """Checks if the current turn belongs to an AI and sets the timer if so."""
        if self.game_over:
            return
            
        is_ai_turn = False
        if self.board.turn == chess.WHITE and self.white_ai:
            is_ai_turn = True
        elif self.board.turn == chess.BLACK and self.black_ai:
            is_ai_turn = True
            
        if is_ai_turn:
            self.waiting_for_ai = True
            # Add a slight delay (300ms) so moves don't happen instantly
            pygame.time.set_timer(AI_MOVE_EVENT, 300)

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
                pygame.time.set_timer(AI_MOVE_EVENT, 0) # Turn off the timer
                
                # Fetch the correct AI
                current_ai = self.white_ai if self.board.turn == chess.WHITE else self.black_ai
                
                if current_ai:
                    move = current_ai.get_best_move(self.board, time_limit=5.0)
                    if move:
                        self._apply_move(move)
                        
                self.waiting_for_ai = False
                self._check_ai_turn() # Check if the *next* player is also AI!

    def draw(self, screen, draw_board_func, draw_pieces_func, draw_players_func, font, options_icon, options_rect, names_and_icons):
        ui_board = self._get_ui_board()
        
        ui_last_move = None
        if self.last_move:
            src = self._to_ui_coord(self.last_move.from_square)
            dst = self._to_ui_coord(self.last_move.to_square)
            ui_last_move = (src, dst, None) 

        draw_board_func(screen, self.highlight_squares, self.layout, last_move=ui_last_move)
        draw_players_func(screen, self.layout, font, *names_and_icons)
        screen.blit(options_icon, options_rect)

        # Chess.com-style captured pieces + material advantage (right side)
        self._draw_capture_bars(screen, font, options_rect)

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

    def _material_balance(self):
        """Returns (white_material, black_material, white_minus_black)."""
        white = 0
        black = 0
        for sq in chess.SQUARES:
            p = self.board.piece_at(sq)
            if not p:
                continue
            v = PIECE_VALUES.get(p.piece_type, 0)
            if p.color == chess.WHITE:
                white += v
            else:
                black += v
        return white, black, white - black

    def _captured_by_color(self):
        """Returns (captured_by_white, captured_by_black) as dict piece_type -> count.

        captured_by_white are *black* pieces missing from the board.
        captured_by_black are *white* pieces missing from the board.
        """
        current_white = {pt: 0 for pt in START_COUNTS}
        current_black = {pt: 0 for pt in START_COUNTS}

        for sq in chess.SQUARES:
            p = self.board.piece_at(sq)
            if not p:
                continue
            if p.piece_type not in START_COUNTS:
                continue
            if p.color == chess.WHITE:
                current_white[p.piece_type] += 1
            else:
                current_black[p.piece_type] += 1

        captured_by_white = {pt: START_COUNTS[pt] - current_black[pt] for pt in START_COUNTS}
        captured_by_black = {pt: START_COUNTS[pt] - current_white[pt] for pt in START_COUNTS}
        return captured_by_white, captured_by_black

    def _draw_capture_bars(self, screen, font, options_rect):
        """Draw captured pieces + material advantage like chess.com.

        - Shows captured pieces for each player.
        - Shows +score at the end of the side that is ahead.
        - Draws on the right side to avoid clashing with name/avatar.
        """
        # If layout is missing expected fields, fail safely.
        if not hasattr(self.layout, "screen_width") or not hasattr(self.layout, "tile_size"):
            return

        captured_by_white, captured_by_black = self._captured_by_color()
        _, _, score = self._material_balance()  # white - black

        # Decide which UI row corresponds to white/black based on board flip.
        # When flipped=True (player is black), white is at the TOP.
        flipped = bool(getattr(self.layout, "flipped", False))
        top_color = chess.WHITE if flipped else chess.BLACK
        bottom_color = chess.BLACK if flipped else chess.WHITE

        # Bar positions: draw inside the top/bottom player UI bands.
        top_band_h = int(getattr(self.layout, "top", 60))
        bottom_band_h = int(getattr(self.layout, "bottom", 60))
        top_y = 10
        bottom_y = int(self.layout.screen_height - bottom_band_h + 10)

        # Right boundary: avoid options icon in the top bar.
        right_margin = 10
        top_right_limit = min(int(self.layout.screen_width - right_margin), int(options_rect.left - 10))
        bottom_right_limit = int(self.layout.screen_width - right_margin)

        icon_size = max(16, int(self.layout.tile_size * 0.28))
        overlap = max(6, int(icon_size * 0.35))  # overlap a bit like chess.com

        def build_icon_list(captured_dict, captured_color_str):
            icons = []
            for pt in CAPTURE_ORDER:
                n = max(0, int(captured_dict.get(pt, 0)))
                if n <= 0:
                    continue
                type_name = chess.PIECE_NAMES[pt]
                key = f"{captured_color_str}_{type_name}"
                img = self.images.get(key)
                if not img:
                    continue
                scaled = pygame.transform.smoothscale(img, (icon_size, icon_size))
                icons.extend([scaled] * n)
            return icons

        # For each player row, we show the pieces they captured (enemy color icons)
        # White captured black pieces, black captured white pieces.
        icons_for_white = build_icon_list(captured_by_white, "black")
        icons_for_black = build_icon_list(captured_by_black, "white")

        def draw_row(color, y, right_limit):
            # Determine which captured list to use
            icons = icons_for_white if color == chess.WHITE else icons_for_black

            # Determine +score label (only on the side that is ahead)
            label = ""
            if score != 0:
                if score > 0 and color == chess.WHITE:
                    label = f"+{score}"
                elif score < 0 and color == chess.BLACK:
                    label = f"+{abs(score)}"

            label_surf = font.render(label, True, (0, 0, 0)) if label else None
            label_w = label_surf.get_width() if label_surf else 0
            label_h = label_surf.get_height() if label_surf else 0

            # Start drawing from the right edge going left
            x = right_limit
            if label_surf:
                x -= label_w
                screen.blit(label_surf, (x, y + (icon_size - label_h) // 2))
                x -= 8

            # Draw icons right-to-left
            for icon in reversed(icons):
                x -= icon_size
                screen.blit(icon, (x, y))
                x += overlap  # pull back a bit to create overlap

        # Draw both rows
        draw_row(top_color, top_y, top_right_limit)
        draw_row(bottom_color, bottom_y, bottom_right_limit)

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

        if self.selected:
            src_sq = self._to_chess_square(*self.selected)
            
            move = chess.Move(src_sq, target_sq)
            if chess.Move(src_sq, target_sq, promotion=chess.QUEEN) in self.board.legal_moves:
                move = chess.Move(src_sq, target_sq, promotion=chess.QUEEN)

            if move in self.board.legal_moves:
                self._apply_move(move)
                self._clear_selection()
                self._check_ai_turn() # Check if AI should respond to your move
                return

        piece = self.board.piece_at(target_sq)
        if piece and piece.color == self.board.turn:
            self.selected = target_rc
            self._update_highlights(target_sq)
        else:
            self._clear_selection()

    def _update_highlights(self, square):
        self.highlight_squares = []
        for move in self.board.legal_moves:
            if move.from_square == square:
                self.highlight_squares.append(self._to_ui_coord(move.to_square))

    def _apply_move(self, move: chess.Move):
        self.board.push(move)
        self.last_move = move
        self._update_game_state()

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