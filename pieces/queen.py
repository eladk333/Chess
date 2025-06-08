from pieces.rook import Rook
from pieces.bishop import Bishop

class Queen(Rook, Bishop):
    def get_legal_moves(self, row, col, board, last_move=None):
        # Combine Rook and Bishop logic
        return Rook.get_legal_moves(self, row, col, board, last_move) + \
               Bishop.get_legal_moves(self, row, col, board, last_move)
