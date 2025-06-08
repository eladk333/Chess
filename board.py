from utils import parse_pos
from pieces import create_piece  # or define each piece class individually

class Board:
    def __init__(self):
        self.grid = [[None for _ in range(8)] for _ in range(8)]
        self.current_turn = "white"
        self.setup()

    def setup(self):
        # place pawns
        for col in range(8):
            self.grid[1][col] = create_piece('P', 'black')
            self.grid[6][col] = create_piece('P', 'white')
        
        # place other pieces using create_piece('R', 'white') etc.
        # ...

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
        # actual checkmate detection logic here
        return False
