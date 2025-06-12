# test_evaluate.py

from pieces.factory import create_piece
from evaluate import evaluate_board


def print_board(board):
    for row in board:
        row_str = ""
        for piece in row:
            if piece is None:
                row_str += ". "
            else:
                symbol = piece.type_name()[0].upper()
                symbol = symbol if piece.color == "white" else symbol.lower()
                row_str += symbol + " "
        print(row_str)
    print("-" * 20)


def create_custom_board_1():
    # White has extra queen and rook
    board = [[None for _ in range(8)] for _ in range(8)]
    board[7][3] = create_piece("queen", "white")
    board[7][0] = create_piece("rook", "white")
    board[6][0] = create_piece("pawn", "white")
    board[0][4] = create_piece("king", "black")
    board[7][4] = create_piece("king", "white")
    return board


def create_custom_board_2():
    # Black has 2 rooks and a bishop, white has only pawns
    board = [[None for _ in range(8)] for _ in range(8)]
    board[0][0] = create_piece("rook", "black")
    board[0][7] = create_piece("rook", "black")
    board[1][2] = create_piece("bishop", "black")
    board[6][0] = create_piece("pawn", "white")
    board[6][1] = create_piece("pawn", "white")
    board[0][4] = create_piece("king", "black")
    board[7][4] = create_piece("king", "white")
    return board


def create_custom_board_3():
    # Roughly equal position: both sides have a rook and a bishop
    board = [[None for _ in range(8)] for _ in range(8)]
    board[0][0] = create_piece("rook", "black")
    board[1][2] = create_piece("bishop", "black")
    board[7][0] = create_piece("rook", "white")
    board[6][2] = create_piece("bishop", "white")
    board[0][4] = create_piece("king", "black")
    board[7][4] = create_piece("king", "white")
    return board


if __name__ == "__main__":
    boards = [
        ("White advantage", create_custom_board_1()),
        ("Black advantage", create_custom_board_2()),
        ("Draw-ish", create_custom_board_3())
    ]

    for label, board in boards:
        print(f"Position: {label}")
        print_board(board)
        score = evaluate_board(board)
        print(f"Evaluation score: {score:.2f}\n")
