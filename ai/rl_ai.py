import torch
import random
from rules import get_legal_moves
from ml.network import ChessNet
from ml.utils import board_to_tensor

class RL_AI:
    def __init__(self, model_path="chess_model.pt", device="cpu"):
        self.model = ChessNet()
        self.model.load_state_dict(torch.load(model_path, map_location=device))
        self.model.eval()
        self.device = device

    def choose_move(self, board, color, last_move):
        all_moves = []
        for row in range(8):
            for col in range(8):
                piece = board[row][col]
                if piece and piece.color == color:
                    legal_moves = get_legal_moves(piece, row, col, board, last_move=last_move)
                    for dst in legal_moves:
                        all_moves.append(((row, col), dst))

        if not all_moves:
            return None

        # Evaluate each move using the model
        scored_moves = []
        for move in all_moves:
            clone_board = [[p.clone() if p else None for p in row] for row in board]
            (r1, c1), (r2, c2) = move
            piece = clone_board[r1][c1]
            clone_board[r2][c2] = piece
            clone_board[r1][c1] = None
            piece.has_moved = True

            tensor = board_to_tensor(clone_board).unsqueeze(0).to(self.device)
            with torch.no_grad():
                value = self.model(tensor).item()
            scored_moves.append((value, move))

        # Pick the move with the highest value
        best_value, best_move = max(scored_moves, key=lambda x: x[0])
        return best_move
