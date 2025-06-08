from pieces.piece import Piece

class Pawn(Piece):
    def type_name(self):
        return "pawn"

    def get_legal_moves(self, row, col, board, last_move):
        direction = -1 if self.color == "white" else 1
        moves = []

        # One step forward
        if board[row + direction][col] is None:
            moves.append((row + direction, col))

            # Two steps forward from starting position
            if not self.has_moved and board[row + 2 * direction][col] is None:
                moves.append((row + 2 * direction, col))

        # Captures
        for dc in [-1, 1]:
            nc = col + dc
            if 0 <= nc < 8:
                target = board[row + direction][nc]
                if target and self.is_opponent(target):
                    moves.append((row + direction, nc))

        # En passant can be added here

        return moves


class King(Piece):
    def type_name(self):
        return "king"

    def get_legal_moves(self, row, col, board, last_move):
        moves = []
        for dr in [-1, 0, 1]:
            for dc in [-1, 0, 1]:
                if dr == 0 and dc == 0:
                    continue
                nr, nc = row + dr, col + dc
                if 0 <= nr < 8 and 0 <= nc < 8:
                    if board[nr][nc] is None or self.is_opponent(board[nr][nc]):
                        moves.append((nr, nc))

        # Castling can be added here

        return moves
