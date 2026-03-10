import chess
import chess.engine
import chess.pgn
import time
from ai.minmax import MinimaxAI

# --- CONFIGURATION ---
STOCKFISH_PATH = r"C:\Users\elad.k.int\Downloads\stockfish-windows-x86-64-avx2\stockfish\stockfish-windows-x86-64-avx2.exe"

TARGET_ELOS = [1500, 1700, 1900]
NUM_GAMES_PER_COLOR = 2
TIME_LIMIT_PER_MOVE = 10
OUTPUT_FILE = "saved_games.pgn"


def play_game(custom_ai, sf_engine, ai_is_white):
    """Plays a single game between Custom AI and Stockfish and returns the final board."""
    board = chess.Board()

    while not board.is_game_over():
        is_custom_ai_turn = (
            (board.turn == chess.WHITE and ai_is_white) or
            (board.turn == chess.BLACK and not ai_is_white)
        )

        if is_custom_ai_turn:
            move = custom_ai.get_best_move(board, time_limit=TIME_LIMIT_PER_MOVE)
        else:
            result = sf_engine.play(board, chess.engine.Limit(time=TIME_LIMIT_PER_MOVE))
            move = result.move

        board.push(move)

    return board


def run_tournament():
    total_games = len(TARGET_ELOS) * 2 * NUM_GAMES_PER_COLOR

    print("Starting tournament...")
    print(f"Stockfish levels: {TARGET_ELOS}")
    print(f"Games per color per level: {NUM_GAMES_PER_COLOR}")
    print(f"Total games: {total_games}")
    print(f"Time limit per move: {TIME_LIMIT_PER_MOVE}s")
    print(f"Games will be saved to: {OUTPUT_FILE}\n")

    my_ai = MinimaxAI()

    try:
        sf_engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
    except FileNotFoundError:
        print(f"Error: Stockfish not found at {STOCKFISH_PATH}. Please check the path.")
        return

    # Overall score tracking
    total_ai_wins = 0
    total_ai_losses = 0
    total_draws = 0

    # Per-ELO score tracking
    results_by_elo = {
        elo: {"wins": 0, "losses": 0, "draws": 0}
        for elo in TARGET_ELOS
    }

    # Clear previous contents of the save file
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("")

    game_number = 1

    try:
        for elo in TARGET_ELOS:
            print("=" * 40)
            print(f"Playing against Stockfish {elo}")
            print("=" * 40)

            # Configure Stockfish strength for this block
            sf_engine.configure({"UCI_LimitStrength": True, "UCI_Elo": elo})

            for ai_is_white in [True, False]:
                color_str = "White" if ai_is_white else "Black"

                for game_idx in range(1, NUM_GAMES_PER_COLOR + 1):
                    print(
                        f"Game {game_number}/{total_games} - "
                        f"MinimaxAI vs Stockfish {elo} as {color_str}...",
                        end="",
                        flush=True
                    )

                    start_time = time.time()
                    final_board = play_game(my_ai, sf_engine, ai_is_white)
                    duration = time.time() - start_time

                    result = final_board.result()

                    # Determine winner
                    if result == "1/2-1/2":
                        winner = "Draw"
                        total_draws += 1
                        results_by_elo[elo]["draws"] += 1
                    elif (result == "1-0" and ai_is_white) or (result == "0-1" and not ai_is_white):
                        winner = "MinimaxAI Won!"
                        total_ai_wins += 1
                        results_by_elo[elo]["wins"] += 1
                    else:
                        winner = "Stockfish Won"
                        total_ai_losses += 1
                        results_by_elo[elo]["losses"] += 1

                    print(f" Result: {result} ({winner}) in {duration:.1f}s")

                    # Save PGN
                    game = chess.pgn.Game()
                    game.headers["Event"] = f"MinimaxAI vs Stockfish {elo}"
                    game.headers["Site"] = "Local"
                    game.headers["Round"] = str(game_number)

                    if ai_is_white:
                        game.headers["White"] = "MinimaxAI"
                        game.headers["Black"] = f"Stockfish ({elo})"
                    else:
                        game.headers["White"] = f"Stockfish ({elo})"
                        game.headers["Black"] = "MinimaxAI"

                    game.headers["Result"] = result
                    game.add_line(final_board.move_stack)

                    with open(OUTPUT_FILE, "a", encoding="utf-8") as f:
                        print(game, file=f, end="\n\n")

                    game_number += 1

    finally:
        sf_engine.quit()

    # Print final scorecard
    print("\n" + "=" * 40)
    print("TOURNAMENT RESULTS")
    print("=" * 40)

    for elo in TARGET_ELOS:
        print(f"\nStockfish {elo}:")
        print(f"  MinimaxAI Wins: {results_by_elo[elo]['wins']}")
        print(f"  Stockfish Wins: {results_by_elo[elo]['losses']}")
        print(f"  Draws:          {results_by_elo[elo]['draws']}")

    print("\n" + "-" * 40)
    print("OVERALL TOTALS")
    print("-" * 40)
    print(f"MinimaxAI Wins: {total_ai_wins}")
    print(f"Stockfish Wins: {total_ai_losses}")
    print(f"Draws:          {total_draws}")
    print("=" * 40 + "\n")


if __name__ == "__main__":
    run_tournament()