from pieces import create_piece
from utils import parse_pos

class Board:
    def __init__(self):
        self.grid = [[None for _ in range(8)] for _ in range(8)]
        self.current_turn = "white"

    def setup(self):
        # Place pawns and other pieces using create_piece('P', 'white') etc.
        pass

    def display(self):
        # Print board to console
        pass

    def make_move(self, src, dst):
        src_row, src_col = parse_pos(src)
        dst_row, dst_col = parse_pos(dst)
        piece = self.grid[src_row][src_col]
        if piece and piece.color == self.current_turn and piece.is_valid_move(src_row, src_col, dst_row, dst_col, self):
            self.grid[dst_row][dst_col] = piece
            self.grid[src_row][src_col] = None
            self.current_turn = "black" if self.current_turn == "white" else "white"
            return True
        return False

    def is_checkmate(self):
        # Placeholder logic
        return False
