import copy

def get_legal_moves(piece, row, col, board, ignore_check=False, last_move=None):
    moves = piece.get_legal_moves(row, col, board, last_move)

    if not ignore_check:
        valid = []
        for r, c in moves:
            new_board = simulate_move(board, (row, col), (r, c))
            if not is_in_check(new_board, piece.color):
                valid.append((r, c))
        moves = valid

    return moves


def is_empty(board, row, col):
    return in_bounds(row, col) and board[row][col] is None


def is_enemy(piece, target):
    return target is not None and target.color != piece.color


def in_bounds(row, col):
    return 0 <= row < 8 and 0 <= col < 8


def simulate_move(board, src, dst):
    new_board = [[piece.clone() if piece else None for piece in row] for row in board]
    r1, c1 = src
    r2, c2 = dst
    new_board[r2][c2] = new_board[r1][c1]
    new_board[r1][c1] = None
    new_board[r2][c2].has_moved = True
    return new_board




def find_king(board, color):
    for row in range(8):
        for col in range(8):
            piece = board[row][col]
            if piece and piece.type_name() == 'king' and piece.color == color:
                return (row, col)
    return None


def is_in_check(board, color):
    king_pos = find_king(board, color)
    if not king_pos:
        return True  # No king found: technically checkmate

    enemy_color = 'black' if color == 'white' else 'white'
    for row in range(8):
        for col in range(8):
            piece = board[row][col]
            if piece and piece.color == enemy_color:
                moves = get_legal_moves(piece, row, col, board, ignore_check=True)
                if king_pos in moves:
                    return True
    return False


def is_checkmate(board, color):
    for row in range(8):
        for col in range(8):
            piece = board[row][col]
            if piece and piece.color == color:
                moves = get_legal_moves(piece, row, col, board)
                for move in moves:
                    new_board = simulate_move(board, (row, col), move)
                    if not is_in_check(new_board, color):
                        return False
    return is_in_check(board, color)
