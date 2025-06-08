from pieces.piece import Piece
from rules_helpers import in_bounds, is_empty, is_enemy

class Bishop(Piece):
    def get_legal_moves(self, row, col, board, last_move=None):
        directions = [(-1, -1), (-1, 1), (1, -1), (1, 1)]
        moves = []
        for dr, dc in directions:
            r, c = row + dr, col + dc
            while in_bounds(r, c):
                if is_empty(board, r, c):
                    moves.append((r, c))
                elif is_enemy(self, board[r][c]):
                    moves.append((r, c))
                    break
                else:
                    break
                r += dr
                c += dc
        return moves
