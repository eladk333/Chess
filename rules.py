import copy

def get_legal_moves(piece, row, col, board, ignore_check=False, last_move=None):
    moves = []

    if piece['type'] == 'pawn':
        moves += pawn_moves(piece, row, col, board, last_move)
    elif piece['type'] == 'rook':
        moves += rook_moves(piece, row, col, board)
    elif piece['type'] == 'knight':
        moves += knight_moves(piece, row, col, board)
    elif piece['type'] == 'bishop':
        moves += bishop_moves(piece, row, col, board)
    elif piece['type'] == 'queen':
        moves += rook_moves(piece, row, col, board) + bishop_moves(piece, row, col, board)
    elif piece['type'] == 'king':
        moves += king_moves(piece, row, col, board)

    if not ignore_check:
        # Filter out moves that would leave king in check
        valid = []
        for r, c in moves:
            new_board = simulate_move(board, (row, col), (r, c))
            if not is_in_check(new_board, piece['color']):
                valid.append((r, c))
        moves = valid

    return moves

def pawn_moves(piece, row, col, board, last_move):
    moves = []
    direction = -1 if piece['color'] == 'white' else 1
    start_row = 6 if piece['color'] == 'white' else 1

    # One step forward
    if is_empty(board, row + direction, col):
        moves.append((row + direction, col))
        # Two steps
        if row == start_row and is_empty(board, row + 2 * direction, col):
            moves.append((row + 2 * direction, col))

    # Captures
    for dcol in [-1, 1]:
        r, c = row + direction, col + dcol
        if in_bounds(r, c) and is_enemy(piece, board[r][c]):
            moves.append((r, c))

    # En passant
    if last_move:
        (from_row, from_col), (to_row, to_col), last_piece = last_move
        if last_piece and last_piece['type'] == 'pawn' and abs(to_row - from_row) == 2:
            if to_row == row and abs(to_col - col) == 1 and board[row][to_col] and board[row][to_col]['color'] != piece['color']:
                moves.append((row + direction, to_col))

    return moves

def rook_moves(piece, row, col, board):
    moves = []
    directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]
    for dr, dc in directions:
        r, c = row + dr, col + dc
        while in_bounds(r, c):
            if is_empty(board, r, c):
                moves.append((r, c))
            elif is_enemy(piece, board[r][c]):
                moves.append((r, c))
                break
            else:
                break
            r += dr
            c += dc
    return moves

def knight_moves(piece, row, col, board):
    moves = []
    deltas = [
        (-2, -1), (-2, 1), (-1, -2), (-1, 2),
        (1, -2),  (1, 2),  (2, -1),  (2, 1)
    ]
    for dr, dc in deltas:
        r, c = row + dr, col + dc
        if in_bounds(r, c) and (is_empty(board, r, c) or is_enemy(piece, board[r][c])):
            moves.append((r, c))
    return moves

def bishop_moves(piece, row, col, board):
    moves = []
    directions = [(-1, -1), (-1, 1), (1, -1), (1, 1)]
    for dr, dc in directions:
        r, c = row + dr, col + dc
        while in_bounds(r, c):
            if is_empty(board, r, c):
                moves.append((r, c))
            elif is_enemy(piece, board[r][c]):
                moves.append((r, c))
                break
            else:
                break
            r += dr
            c += dc
    return moves

def king_moves(piece, row, col, board):
    moves = []
    for dr in [-1, 0, 1]:
        for dc in [-1, 0, 1]:
            if dr == 0 and dc == 0:
                continue
            r, c = row + dr, col + dc
            if in_bounds(r, c) and (is_empty(board, r, c) or is_enemy(piece, board[r][c])):
                moves.append((r, c))

    # Castling (simplified: only if path is clear and no movement yet)
    if not piece.get('has_moved'):
        row_castle = row
        # Kingside
        if all(is_empty(board, row_castle, c) for c in [5, 6]):
            rook = board[row_castle][7]
            if rook and rook['type'] == 'rook' and rook['color'] == piece['color'] and not rook.get('has_moved'):
                moves.append((row_castle, 6))  # King goes to g-file

        # Queenside
        if all(is_empty(board, row_castle, c) for c in [1, 2, 3]):
            rook = board[row_castle][0]
            if rook and rook['type'] == 'rook' and rook['color'] == piece['color'] and not rook.get('has_moved'):
                moves.append((row_castle, 2))  # King goes to c-file

    return moves

def is_empty(board, row, col):
    return in_bounds(row, col) and board[row][col] is None

def is_enemy(piece, target):
    return target is not None and target['color'] != piece['color']

def in_bounds(row, col):
    return 0 <= row < 8 and 0 <= col < 8

def find_king(board, color):
    for row in range(8):
        for col in range(8):
            piece = board[row][col]
            if piece and piece['type'] == 'king' and piece['color'] == color:
                return (row, col)
    return None

def simulate_move(board, src, dst):
    new_board = copy.deepcopy(board)
    r1, c1 = src
    r2, c2 = dst
    new_board[r2][c2] = new_board[r1][c1]
    new_board[r1][c1] = None
    if new_board[r2][c2]:
        new_board[r2][c2]['has_moved'] = True
    return new_board

def is_in_check(board, color):
    king_pos = find_king(board, color)
    if not king_pos:
        return True  # king not on board

    enemy_color = 'black' if color == 'white' else 'white'
    for row in range(8):
        for col in range(8):
            piece = board[row][col]
            if piece and piece['color'] == enemy_color:
                moves = get_legal_moves(piece, row, col, board, ignore_check=True)
                if king_pos in moves:
                    return True
    return False

def is_checkmate(board, color):
    for row in range(8):
        for col in range(8):
            piece = board[row][col]
            if piece and piece['color'] == color:
                moves = get_legal_moves(piece, row, col, board)
                for move in moves:
                    new_board = simulate_move(board, (row, col), move)
                    if not is_in_check(new_board, color):
                        return False
    return is_in_check(board, color)
