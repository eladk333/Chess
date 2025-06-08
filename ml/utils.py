import torch
import numpy as np

PIECE_TO_INDEX = {
    "pawn": 0, "rook": 1, "knight": 2,
    "bishop": 3, "queen": 4, "king": 5
}

def board_to_tensor(board):
    tensor = np.zeros((12, 8, 8), dtype=np.float32)
    for row in range(8):
        for col in range(8):
            piece = board[row][col]
            if piece:
                offset = 0 if piece.color == 'white' else 6
                index = PIECE_TO_INDEX[piece.type_name()] + offset
                tensor[index][row][col] = 1
    return torch.tensor(tensor)
