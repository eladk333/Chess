class Piece:
    def __init__(self, color):
        self.color = color

    def is_valid_move(self, src_row, src_col, dst_row, dst_col, board):
        raise NotImplementedError

class Pawn(Piece):
    def is_valid_move(self, src_row, src_col, dst_row, dst_col, board):
        direction = -1 if self.color == "white" else 1
        if src_col == dst_col and board.grid[dst_row][dst_col] is None:
            if dst_row - src_row == direction:
                return True
        return False

# Add Rook, Knight, Bishop, Queen, King similarly

def create_piece(code, color):
    if code == 'P': return Pawn(color)
    # Map 'R', 'N', etc. to their classes
