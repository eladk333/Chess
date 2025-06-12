import pygame
from rules import get_legal_moves, is_checkmate, is_in_check
from ai.utils import handle_ai_turn

AI_MOVE_EVENT = pygame.USEREVENT + 1

class GameController:
    def __init__(self, board, layout, images, vs_ai=False, player_color="white", ai_player=None):
        self.board = board
        self.layout = layout
        self.vs_ai = vs_ai
        self.player_color = player_color
        self.ai_player = ai_player
        self.images = images
        self.current_turn = "white"
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
        self.pending_ai_move = None

        # Only set the flag and timer if AI is black
        if self.vs_ai and self.player_color == "black":
            self.waiting_for_ai = True
            pygame.time.set_timer(AI_MOVE_EVENT, 300)

    def handle_event(self, event):
        if event.type == pygame.QUIT:
            return "quit"
        elif event.type == pygame.MOUSEBUTTONDOWN:
            if self.vs_ai and self.waiting_for_ai:
                return
            return self._on_mouse_down(event)
        elif event.type == pygame.MOUSEMOTION:
            if self.vs_ai and self.waiting_for_ai:
                return
            return self._on_mouse_move(event)
        elif event.type == pygame.MOUSEBUTTONUP:
            if self.vs_ai and self.waiting_for_ai:
                return
            return self._on_mouse_up(event)
        elif event.type == AI_MOVE_EVENT:
            if self.waiting_for_ai:
                move = handle_ai_turn(
                    self.ai_player, self.board, self.current_turn, self.last_move
                )
                if move:
                    src, dst = move
                    self._try_move(src, dst)
                self.waiting_for_ai = False
                pygame.time.set_timer(AI_MOVE_EVENT, 0)

    def draw(self, screen, draw_board_func, draw_pieces_func, draw_players_func, font, options_icon, options_rect, names_and_icons):
        # Pass self.last_move to draw_board_func for last move highlighting
        draw_board_func(screen, self.highlight_squares, self.layout, last_move=self.last_move)
        draw_players_func(screen, self.layout, font, *names_and_icons)
        screen.blit(options_icon, options_rect)

        if self.dragging and self.drag_start:
            row, col = self.drag_start
            temp = self.board[row][col]
            self.board[row][col] = None
            draw_pieces_func(screen, self.board, self.layout)
            self.board[row][col] = temp
        else:
            draw_pieces_func(screen, self.board, self.layout)

        if self.dragging and self.dragged_piece and self.drag_start:
            image = self.dragged_piece.image
            x, y = self.drag_pos
            if image:
                screen.blit(image, (x - self.layout.tile_size // 2, y - self.layout.tile_size // 2))

        if self.check_message:
            text = font.render(self.check_message, True, (255, 0, 0))
            screen.blit(text, (10, 10))

        if self.game_over:
            restart_text = font.render("Click to Restart", True, (0, 128, 0))
            rect = restart_text.get_rect(center=(320, 320))
            pygame.draw.rect(screen, (255, 255, 255), rect.inflate(20, 10))
            screen.blit(restart_text, rect)

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
                piece = self.board[row][col]
                if piece and piece.color == self.current_turn:
                    self.dragging = True
                    self.drag_start = (row, col)
                    self.dragged_piece = piece
                    self.drag_pos = event.pos
                    self.selected = (row, col)
                    self.highlight_squares = get_legal_moves(
                        piece, row, col, self.board, last_move=self.last_move
                    )
        if self.dragging:
            self.drag_pos = pygame.mouse.get_pos()

    def _on_mouse_up(self, event):
        was_dragging = self.dragging
        self.dragging = False
        self.drag_pos = (0, 0)

        drop_pos = pygame.mouse.get_pos()
        square = self.layout.to_board(*drop_pos)
        if not square:
            self._clear_selection()
            return

        row, col = square

        if was_dragging and self.drag_start:
            self._try_move(self.drag_start, (row, col))
            self._clear_selection()
            return

        if self.selected:
            src_row, src_col = self.selected
            piece = self.board[src_row][src_col]
            legal_moves = get_legal_moves(piece, src_row, src_col, self.board, last_move=self.last_move)

            if (row, col) in legal_moves:
                self._try_move((src_row, src_col), (row, col))
                self._clear_selection()
                return
            elif self.board[row][col] and self.board[row][col].color == self.current_turn:
                self.selected = (row, col)
                self.highlight_squares = get_legal_moves(
                    self.board[row][col], row, col, self.board, last_move=self.last_move
                )
                return
            else:
                self._clear_selection()
                return

        if self.board[row][col] and self.board[row][col].color == self.current_turn:
            self.selected = (row, col)
            self.highlight_squares = get_legal_moves(
                self.board[row][col], row, col, self.board, last_move=self.last_move
            )
        else:
            self._clear_selection()

        self.dragged_piece = None
        self.drag_start = None
        self.mouse_down_square = None

    def _is_legal_move(self, src, dst):
        src_row, src_col = src
        dst_row, dst_col = dst
        piece = self.board[src_row][src_col]
        legal_moves = get_legal_moves(piece, src_row, src_col, self.board, last_move=self.last_move)
        return (dst_row, dst_col) in legal_moves

    def _apply_move(self, src, dst):
        src_row, src_col = src
        dst_row, dst_col = dst
        piece = self.board[src_row][src_col]

        # En passant
        if piece.type_name() == 'pawn' and self.board[dst_row][dst_col] is None and dst_col != src_col:
            captured_row = dst_row + (1 if piece.color == 'white' else -1)
            self.board[captured_row][dst_col] = None

        # Castling
        if piece.type_name() == 'king' and abs(dst_col - src_col) == 2:
            if dst_col == 6:
                rook = self.board[src_row][7]
                self.board[src_row][5] = rook
                self.board[src_row][7] = None
                rook.has_moved = True
            elif dst_col == 2:
                rook = self.board[src_row][0]
                self.board[src_row][3] = rook
                self.board[src_row][0] = None
                rook.has_moved = True

        self.board[dst_row][dst_col] = piece
        self.board[src_row][src_col] = None
        piece.has_moved = True

        if piece.type_name() == 'pawn' and (dst_row == 0 or dst_row == 7):
            from pieces.factory import create_piece
            promoted = create_piece("queen", piece.color)
            promoted.has_moved = True
            promoted.image = piece.image
            self.board[dst_row][dst_col] = promoted

        # Save the last move as ((src_row, src_col), (dst_row, dst_col), piece)
        self.last_move = ((src_row, src_col), (dst_row, dst_col), piece)
        self.current_turn = 'black' if self.current_turn == 'white' else 'white'

    def _handle_post_move_updates(self, dst):
        # Only set the flag and timer, do not call handle_ai_turn here!
        if self.vs_ai and self.current_turn != self.player_color:
            self.waiting_for_ai = True
            pygame.time.set_timer(AI_MOVE_EVENT, 300)

        if is_checkmate(self.board, self.current_turn):
            self.check_message = f"Checkmate! {self.current_turn} loses."
            self.game_over = True
        elif is_in_check(self.board, self.current_turn):
            self.check_message = "Check!"
        else:
            self.check_message = ""

    def _try_move(self, src, dst):
        if not self._is_legal_move(src, dst):
            return False
        self._apply_move(src, dst)
        self._handle_post_move_updates(dst)
        return True

    def _clear_selection(self):
        self.dragging = False
        self.dragged_piece = None
        self.drag_start = None
        self.drag_pos = (0, 0)
        self.click_down_pos = None
        self.mouse_down_square = None
        self.selected = None
        self.highlight_squares = []

    def reset(self):
        pass