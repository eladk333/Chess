import chess
import time
from ai.minmax import MinimaxAI  

def run_test_suite():
    # Format: "Test Name": ("FEN String", "Expected Best Move", Depth to test)
    test_positions = {
        "1. Mate in 1 (Fixed)": (
            "6k1/8/6K1/8/8/8/8/R7 w - - 0 1", # Rook is now on a1, safely protected
            "a1a8", 
            3
        ),
        "2. Take Free Queen": (
            "k7/8/8/3q4/8/8/8/3R2K1 w - - 0 1", 
            "d1d5", 
            3
        ),
        "3. Avoid Checkmate": (
            "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2", 
            "d8h4", # Black can mate white in 1 move here
            3
        ),
        "4. Mate in 2 (Queen Sacrifice)": (
            "r1bq2r1/b4pk1/p1pp1p2/1p2pP2/1P2P1PB/3P4/1PPQ2P1/R3K2R w KQ - 0 1", 
            "d2h6", # Queen sacrifices herself so Bishop can mate on the next turn
            4      # Needs depth 4 to see the full sequence
        )
    }

    print("========================================")
    print(" CHESS ENGINE TACTICAL EVALUATION SUITE ")
    print("========================================\n")

    total_passed = 0
    total_time = 0

    for name, (fen, expected_move, depth) in test_positions.items():
        print(f"Testing: {name} (Depth {depth})...")
        
        board = chess.Board(fen)
        
        # Instantiate the engine with the specific depth for this test
        engine = MinimaxAI(depth=depth)
        
        # Start the timer
        start_time = time.time()
        
        # Ask the engine for the move
        best_move = engine.get_best_move(board)
        
        # Stop the timer
        end_time = time.time()
        time_taken = end_time - start_time
        total_time += time_taken
        
        # Convert the move to a string to compare
        move_str = best_move.uci() if best_move else "None"
        
        if move_str == expected_move:
            print(f"  [PASS] Found {move_str} in {time_taken:.3f} seconds.")
            total_passed += 1
        else:
            print(f"  [FAIL] Expected {expected_move}, but engine played {move_str}. Time: {time_taken:.3f} seconds.")
        print("-" * 40)

    print("\n========================================")
    print(f" RESULTS: {total_passed} / {len(test_positions)} Passed")
    print(f" TOTAL CALCULATION TIME: {total_time:.3f} seconds")
    print("========================================")

if __name__ == "__main__":
    run_test_suite()