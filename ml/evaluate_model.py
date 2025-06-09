import time
from ai.minimax_ai import MinimaxAI
from ai.random_ai import RandomAI
from ai.neural_net_ai import NeuralNetAI
from rules import is_checkmate, get_legal_moves
from game_setup import create_starting_board

def get_all_moves(board, color, last_move):
    moves = []
    for row in range(8):
        for col in range(8):
            piece = board[row][col]
            if piece and piece.color == color:
                legal = get_legal_moves(piece, row, col, board, last_move=last_move)
                for dst in legal:
                    moves.append(((row, col), dst))
    return moves

def play_single_game(ai_white, ai_black, verbose=False, max_turns=100):
    board = create_starting_board()
    turn = "white"
    last_move = None

    for _ in range(max_turns):
        ai = ai_white if turn == "white" else ai_black
        moves = get_all_moves(board, turn, last_move)

        if not moves or is_checkmate(board, turn):
            winner = "black" if turn == "white" else "white"
            return winner

        move = ai.choose_move(board, turn, last_move)
        if move is None:
            winner = "black" if turn == "white" else "white"
            return winner

        (r1, c1), (r2, c2) = move
        piece = board[r1][c1]
        board[r2][c2] = piece
        board[r1][c1] = None
        piece.has_moved = True
        last_move = ((r1, c1), (r2, c2), piece.clone())

        turn = "black" if turn == "white" else "white"

    return "draw"

def evaluate(ai1, ai2, n_games=20):
    results = {"ai1": 0, "ai2": 0, "draw": 0}
    total_time = 0.0

    print(f"Evaluating {type(ai1).__name__} vs {type(ai2).__name__}...\n")

    for i in range(n_games):
        white, black = (ai1, ai2) if i % 2 == 0 else (ai2, ai1)

        start_time = time.time()
        result = play_single_game(white, black)
        elapsed = time.time() - start_time
        total_time += elapsed

        if result == "white":
            winner = "ai1" if i % 2 == 0 else "ai2"
        elif result == "black":
            winner = "ai2" if i % 2 == 0 else "ai1"
        else:
            winner = "draw"

        results[winner] += 1
        print(f"Game {i+1:02}: {result.upper()} wins ({elapsed:.2f}s)")

    print("\n=== Evaluation Summary ===")
    print(f"{type(ai1).__name__} Wins: {results['ai1']}")
    print(f"{type(ai2).__name__} Wins: {results['ai2']}")
    print(f"Draws:              {results['draw']}")
    print(f"AI1 Win Rate:       {results['ai1'] / n_games:.2f}")
    print(f"Avg game time:      {total_time / n_games:.2f}s")

if __name__ == "__main__":
    #ai1 = MinimaxAI(depth=2)
    ai1 = NeuralNetAI()
    ai2 = RandomAI()
    evaluate(ai1, ai2, n_games=20)
