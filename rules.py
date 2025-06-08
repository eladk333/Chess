def get_legal_moves(piece, row, col, board):
    moves = []
    if piece['type'] == 'pawn':
        direction = -1 if piece['color'] == 'white' else 1
        start_row = 6 if piece['color'] == 'white' else 1

        # One step forward
        if is_empty(board, row + direction, col):
            moves.append((row + direction, col))

            # Two steps from starting row
            if row == start_row and is_empty(board, row + 2 * direction, col):
                moves.append((row + 2 * direction, col))

        # Captures
        for dcol in [-1, 1]:
            r, c = row + direction, col + dcol
            if in_bounds(r, c) and is_enemy(piece, board[r][c]):
                moves.append((r, c))

    # TODO: Add other pieces later
    return moves

def is_empty(board, row, col):
    return in_bounds(row, col) and board[row][col] is None

def is_enemy(piece, target):
    return target is not None and target['color'] != piece['color']

def in_bounds(row, col):
    return 0 <= row < 8 and 0 <= col < 8