class BoardArea:
    def __init__(self, tile_size=80, rows=8, cols=8, top=60, bottom=40, left=0, right=0, flipped=False):
        self.tile_size = tile_size
        self.rows = rows
        self.cols = cols
        self.top = top
        self.bottom = bottom
        self.left = left
        self.right = right
        self.flipped = flipped
        
        self.board_width = self.cols * self.tile_size
        self.board_height = self.rows * self.tile_size

        self.screen_width = self.board_width + self.left + self.right
        self.screen_height = self.board_height + self.top + self.bottom

    def to_screen(self, row, col):
        """Convert board coordinates to screen pixel coordinates, with flipping support."""
        if self.flipped:
            row = self.rows - 1 - row
            col = self.cols - 1 - col
        x = self.left + col * self.tile_size
        y = self.top + row * self.tile_size
        return x, y

    def to_board(self, x, y):
        """Convert screen pixel coordinates to board (row, col), with flipping support."""
        board_x = x - self.left
        board_y = y - self.top

        if 0 <= board_x < self.board_width and 0 <= board_y < self.board_height:
            col = board_x // self.tile_size
            row = board_y // self.tile_size
            if self.flipped:
                row = self.rows - 1 - row
                col = self.cols - 1 - col
            return int(row), int(col)
        return None