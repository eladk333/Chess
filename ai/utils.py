# ai/utils.py

def handle_ai_turn(ai_player, board, current_turn, last_move):
    """
    Gets a move from the AI player.
    """
    if not ai_player:
        return None
    
    # This calls the get_move method on whatever AI object we pass in
    # (e.g., RandomAI, MinimaxAI)
    return ai_player.get_move(board, current_turn, last_move)