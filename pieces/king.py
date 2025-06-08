from pieces.piece import Piece
from rules_helpers import in_bounds, is_empty, is_enemy

class King(Piece):
    def get_legal_moves(self, row, col, board, last_move=None):
        moves = []
        for dr in [-1, 0, 1]:
            for dc in [-1, 0, 1]:
                if dr == 0 and dc == 0:
                    continue
                r, c = row + dr, col + dc
                if in_bounds(r, c) and (is_empty(board, r, c) or is_enemy(self, board[r][c])):
                    moves.append((r, c))

        # Castling (simplified)
        if not self.has_moved:
            row_castle = row
            if all(is_empty(board, row_castle, c) for c in [5, 6]):
                rook = board[row_castle][7]
                if rook and isinstance(rook, Piece) and not rook.has_moved and rook.color == self.color:
                    moves.append((row_castle, 6))
            if all(is_empty(board, row_castle, c) for c in [1, 2, 3]):
                rook = board[row_castle][0]
                if rook and isinstance(rook, Piece) and not rook.has_moved and rook.color == self.color:
                    moves.append((row_castle, 2))

        return moves
