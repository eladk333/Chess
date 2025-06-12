PIECE_VALUES = {
    "pawn": 1,
    "knight": 3,
    "bishop": 3,
    "rook": 5,
    "queen": 9,
    "king": 0  # typically not counted in material evaluation
}

def evaluate_board(board, perspective="white"):
    white_score = 0
    black_score = 0

    for row in board:
        for piece in row:
            if piece:
                value = PIECE_VALUES.get(piece.type_name(), 0)
                if piece.color == "white":
                    white_score += value
                else:
                    black_score += value

    score = white_score - black_score
    return score if perspective == "white" else -score
