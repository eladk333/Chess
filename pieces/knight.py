from pieces.piece import Piece
from rules_helpers import in_bounds, is_empty, is_enemy

class Knight(Piece):
    def get_legal_moves(self, row, col, board, last_move=None):
        deltas = [
            (-2, -1), (-2, 1), (-1, -2), (-1, 2),
            (1, -2),  (1, 2),  (2, -1),  (2, 1)
        ]
        moves = []
        for dr, dc in deltas:
            r, c = row + dr, col + dc
            if in_bounds(r, c) and (is_empty(board, r, c) or is_enemy(self, board[r][c])):
                moves.append((r, c))
        return moves
