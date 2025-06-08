import torch
from ai.minimax_ai import MinimaxAI
from ai.random_ai import RandomAI
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

def play_single_game(ai_white, ai_black):
    board = create_starting_board()
    turn = "white"
    last_move = None

    for _ in range(100):
        ai = ai_white if turn == "white" else ai_black
        moves = get_all_moves(board, turn, last_move)

        if not moves or is_checkmate(board, turn):
            return "black" if turn == "white" else "white"

        move = ai.choose_move(board, turn, last_move)
        if move is None:
            return "black" if turn == "white" else "white"

        (r1, c1), (r2, c2) = move
        piece = board[r1][c1]
        board[r2][c2] = piece
        board[r1][c1] = None
        piece.has_moved = True
        last_move = ((r1, c1), (r2, c2), piece.clone())

        turn = "black" if turn == "white" else "white"

    return "draw"

def evaluate(n_games=10):
    print("Evaluating Minimax AI vs Random AI...\n")
    minimax_ai = MinimaxAI(depth=2)  # Adjust depth as needed
    random_ai = RandomAI()

    minimax_wins = 0
    random_wins = 0
    draws = 0

    for i in range(n_games):
        if i % 2 == 0:
            result = play_single_game(minimax_ai, random_ai)
        else:
            result = play_single_game(random_ai, minimax_ai)

        if result == "white" and i % 2 == 0:
            minimax_wins += 1
        elif result == "black" and i % 2 == 0:
            random_wins += 1
        elif result == "black" and i % 2 == 1:
            minimax_wins += 1
        elif result == "white" and i % 2 == 1:
            random_wins += 1
        else:
            draws += 1

        print(f"Game {i+1}: {result}")

    print("\n=== Evaluation Summary ===")
    print(f"Minimax AI Wins: {minimax_wins}")
    print(f"Random AI Wins:  {random_wins}")
    print(f"Draws:           {draws}")
    print(f"Minimax Win Rate: {minimax_wins / n_games:.2f}")

if __name__ == "__main__":
    evaluate()
