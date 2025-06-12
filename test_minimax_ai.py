from pieces.factory import create_piece
from ai.minimax_ai import MinimaxAI


def make_board_empty():
    return [[None for _ in range(8)] for _ in range(8)]


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


def test_white_advantage():
    print("=== White Advantage Test ===")
    board = make_board_empty()
    board[7][3] = create_piece("queen", "white")
    board[7][0] = create_piece("rook", "white")
    board[6][0] = create_piece("pawn", "white")
    board[0][4] = create_piece("king", "black")
    board[7][4] = create_piece("king", "white")

    print_board(board)
    ai = MinimaxAI(depth=2)
    move, score = ai.get_move(board, "white")
    print("Best move:", move, "Score:", score)
    print()


def test_black_advantage():
    print("=== Black Advantage Test ===")
    board = make_board_empty()
    board[0][0] = create_piece("rook", "black")
    board[0][7] = create_piece("rook", "black")
    board[1][2] = create_piece("bishop", "black")
    board[6][0] = create_piece("pawn", "white")
    board[6][1] = create_piece("pawn", "white")
    board[0][4] = create_piece("king", "black")
    board[7][4] = create_piece("king", "white")

    print_board(board)
    ai = MinimaxAI(depth=2)
    move, score = ai.get_move(board, "black")
    print("Best move:", move, "Score:", score)
    print()


def test_drawish():
    print("=== Draw-ish Test ===")
    board = make_board_empty()
    board[0][0] = create_piece("rook", "black")
    board[1][2] = create_piece("bishop", "black")
    board[7][0] = create_piece("rook", "white")
    board[6][2] = create_piece("bishop", "white")
    board[0][4] = create_piece("king", "black")
    board[7][4] = create_piece("king", "white")

    print_board(board)
    ai = MinimaxAI(depth=2)
    move, score = ai.get_move(board, "white")
    print("Best move:", move, "Score:", score)
    print()


def test_checkmate_white_lost():
    print("=== White Checkmated Test ===")
    board = make_board_empty()
    board[0][0] = create_piece("rook", "black")
    board[0][1] = create_piece("rook", "black")
    board[0][2] = create_piece("queen", "black")
    board[7][4] = create_piece("king", "white")
    board[0][4] = create_piece("king", "black")

    print_board(board)
    ai = MinimaxAI(depth=2)
    move, score = ai.get_move(board, "white")
    print("Best move:", move, "Score:", score)
    print()


def test_stalemate_white():
    print("=== Stalemate Test (Black has no legal moves) ===")
    board = make_board_empty()
    board[0][7] = create_piece("king", "black")
    board[1][5] = create_piece("queen", "white")
    board[1][6] = create_piece("king", "white")

    print_board(board)
    ai = MinimaxAI(depth=2)
    move, score = ai.get_move(board, "black")
    print("Best move:", move, "Score:", score)
    print()


if __name__ == "__main__":
    test_white_advantage()
    test_black_advantage()
    test_drawish()
    test_checkmate_white_lost()
    test_stalemate_white()
