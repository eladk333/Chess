def in_bounds(row, col):
    return 0 <= row < 8 and 0 <= col < 8

def is_empty(board, row, col):
    return in_bounds(row, col) and board[row][col] is None

def is_enemy(piece, target):
    return target is not None and target.color != piece.color
