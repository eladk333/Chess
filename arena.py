import chess
import random
import time
from ai.minmax import MinimaxAI  # Adjust if your file is minimax_ai.py

class RandomAI:
    def get_best_move(self, board: chess.Board):
        """Just picks a completely random legal move."""
        legal_moves = list(board.legal_moves)
        return random.choice(legal_moves) if legal_moves else None

def play_game(white_player, black_player, game_num):
    board = chess.Board()
    
    # We'll use a hard cap just in case, but python-chess handles rules perfectly
    max_moves = 300 
    moves_played = 0

    while not board.is_game_over(claim_draw=True) and moves_played < max_moves:
        if board.turn == chess.WHITE:
            move = white_player.get_best_move(board)
        else:
            move = black_player.get_best_move(board)

        if move is None:
            break
            
        board.push(move)
        moves_played += 1

    # Determine the result
    # claim_draw=True forces it to recognize 50-move rule and 3-fold repetition
    outcome = board.outcome(claim_draw=True) 
    
    if outcome is None:
        return "Draw (Move Limit)"
    elif outcome.winner == chess.WHITE:
        return "White"
    elif outcome.winner == chess.BLACK:
        return "Black"
    else:
        return f"Draw ({outcome.termination.name})"

def run_arena(num_games=10, depth=2):
    print("========================================")
    print(f" THE ARENA: Minimax (Depth {depth}) vs Random ")
    print("========================================\n")

    minimax_bot = MinimaxAI(depth=depth)
    random_bot = RandomAI()

    results = {"Minimax Wins": 0, "Random Wins": 0, "Draws": 0}
    start_time = time.time()

    for i in range(1, num_games + 1):
        # Swap colors every game
        if i % 2 != 0:
            white = minimax_bot
            black = random_bot
            minimax_color = "White"
        else:
            white = random_bot
            black = minimax_bot
            minimax_color = "Black"

        print(f"Game {i}/{num_games} (Minimax playing {minimax_color})... ", end="", flush=True)
        
        winner = play_game(white, black, i)
        
        if winner == minimax_color:
            print("Minimax WINS!")
            results["Minimax Wins"] += 1
        elif winner in ["White", "Black"]: # Someone won, and it wasn't Minimax
            print("Random WINS! (Wait, what?!)")
            results["Random Wins"] += 1
        else:
            print(f"{winner}")
            results["Draws"] += 1

    total_time = time.time() - start_time
    
    print("\n========================================")
    print(" FINAL RESULTS:")
    print(f" Minimax Wins: {results['Minimax Wins']}")
    print(f" Random Wins:  {results['Random Wins']}")
    print(f" Draws:        {results['Draws']}")
    print(f" Time Taken:   {total_time:.1f} seconds")
    print("========================================")

if __name__ == "__main__":
    # Note: Depth 2 is usually enough to crush a random bot quickly. 
    # Depth 3+ might take several minutes to play 10 full games!
    run_arena(num_games=10, depth=4)