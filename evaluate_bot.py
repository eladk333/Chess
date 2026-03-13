import chess
import chess.engine
import chess.pgn
import time
from ai.minmax import MinimaxAI

# --- CONFIGURATION ---
STOCKFISH_PATH = r"C:\Users\eladk\Downloads\stockfish-windows-x86-64-avx2\stockfish\stockfish-windows-x86-64-avx2.exe"

TARGET_ELO = 1700
NUM_GAMES = 2
TIME_LIMIT_PER_MOVE = 10
OUTPUT_FILE = "saved_games.pgn"  # Back to PGN!

def play_game(custom_ai, sf_engine, ai_is_white):
    """Plays a single game between Custom AI and Stockfish and returns the final board."""
    board = chess.Board()
    
    while not board.is_game_over():
        is_custom_ai_turn = (board.turn == chess.WHITE and ai_is_white) or \
                            (board.turn == chess.BLACK and not ai_is_white)
        
        if is_custom_ai_turn:
            # Custom AI's turn
            move = custom_ai.get_best_move(board, time_limit=TIME_LIMIT_PER_MOVE)
        else:
            # Stockfish's turn
            result = sf_engine.play(board, chess.engine.Limit(time=TIME_LIMIT_PER_MOVE))
            move = result.move
            
        board.push(move)
        
    return board

def run_tournament():
    print(f"Starting {NUM_GAMES}-game match against Stockfish at {TARGET_ELO} Elo...")
    print(f"Time limit per move: {TIME_LIMIT_PER_MOVE}s")
    print(f"Games will be saved to: {OUTPUT_FILE}\n")
    
    my_ai = MinimaxAI()
    
    try:
        sf_engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
    except FileNotFoundError:
        print(f"Error: Stockfish not found at {STOCKFISH_PATH}. Please check the path.")
        return

    # Configure Stockfish strength
    sf_engine.configure({"UCI_LimitStrength": True, "UCI_Elo": TARGET_ELO})
    
    # Score tracking
    ai_wins = 0
    ai_losses = 0
    draws = 0
    
    # Clear previous contents of the save file
    with open(OUTPUT_FILE, "w") as f:
        f.write("")
    
    for i in range(1, NUM_GAMES + 1):
        # AI is ALWAYS Black now
        ai_is_white = False
        color_str = "Black"
        
        print(f"Game {i}/{NUM_GAMES} - MinimaxAI playing as {color_str}...", end="", flush=True)
        
        start_time = time.time()
        final_board = play_game(my_ai, sf_engine, ai_is_white)
        duration = time.time() - start_time
        
        result = final_board.result()
        
        # Calculate winner
        if result == '1/2-1/2':
            winner = "Draw"
            draws += 1
        elif (result == '1-0' and ai_is_white) or (result == '0-1' and not ai_is_white):
            winner = "MinimaxAI Won!"
            ai_wins += 1
        else:
            winner = "Stockfish Won"
            ai_losses += 1
            
        print(f" Result: {result} ({winner}) in {duration:.1f}s")
        
        # --- FIXED PGN EXPORT LOGIC ---
        game = chess.pgn.Game()  # Start a fresh game from the starting position
        game.headers["Event"] = f"MinimaxAI Match - Game {i}"
        game.headers["White"] = f"Stockfish ({TARGET_ELO})"
        game.headers["Black"] = "MinimaxAI"
        game.headers["Result"] = result
        
        # Add the entire sequence of played moves to the game
        game.add_line(final_board.move_stack)
        
        with open(OUTPUT_FILE, "a") as f:
            print(game, file=f, end="\n\n") # Directly print the game object to the file
        
    sf_engine.quit()
    
    # Print final scorecard
    print("\n" + "="*30)
    print("TOURNAMENT RESULTS")
    print("="*30)
    print(f"MinimaxAI Wins:  {ai_wins}")
    print(f"Stockfish Wins:  {ai_losses}")
    print(f"Draws:           {draws}")
    print("="*30 + "\n")

if __name__ == "__main__":
    run_tournament()