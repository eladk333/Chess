def handle_ai_turn(ai_player, board, current_turn, last_move):
    move = ai_player.choose_move(board, current_turn, last_move)
    if move:
        (src_row, src_col), (dst_row, dst_col) = move
        piece = board[src_row][src_col]
        board[dst_row][dst_col] = piece
        board[src_row][src_col] = None
        piece['has_moved'] = True
        last_move = ((src_row, src_col), (dst_row, dst_col), piece.copy())
        current_turn = 'black' if current_turn == 'white' else 'white'
    return current_turn, last_move
