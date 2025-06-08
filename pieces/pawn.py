from pieces.piece import Piece
from rules_helpers import in_bounds, is_empty, is_enemy

class Pawn(Piece):
    def get_legal_moves(self, row, col, board, last_move=None):
        moves = []
        direction = -1 if self.color == 'white' else 1
        start_row = 6 if self.color == 'white' else 1

        # Forward
        if is_empty(board, row + direction, col):
            moves.append((row + direction, col))
            if row == start_row and is_empty(board, row + 2 * direction, col):
                moves.append((row + 2 * direction, col))

        # Diagonal captures
        for dc in [-1, 1]:
            r, c = row + direction, col + dc
            if in_bounds(r, c) and is_enemy(self, board[r][c]):
                moves.append((r, c))

        # En passant
        if last_move:
            (from_row, from_col), (to_row, to_col), moved_piece = last_move
            if moved_piece and moved_piece.type_name() == "pawn" and abs(to_row - from_row) == 2:
                if to_row == row and abs(to_col - col) == 1:
                    moves.append((row + direction, to_col))

        return moves
