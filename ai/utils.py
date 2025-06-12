import time

def handle_ai_turn(ai_player, board, current_turn, last_move):
    start = time.time()
    move, score = ai_player.get_move(board, current_turn)
    end = time.time()
    duration = end - start
    print(f"[MinimaxAI] Move chosen in {duration:.2f} seconds. Score: {score:.2f}")
    return move
