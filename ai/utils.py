def handle_ai_turn(ai_player, board, current_turn, last_move):
    """Returns the move the AI wants to play, but does NOT apply it yet."""
    move = ai_player.choose_move(board, current_turn, last_move)
    return move  # e.g., ((src_row, src_col), (dst_row, dst_col))
