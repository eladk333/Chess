import torch
from ml.network import ChessNet
from ml.utils import board_to_tensor
from rules import get_legal_moves
from ml.self_play import move_to_index

class PolicyAI:
    def __init__(self, model_path="chess_model_best.pt", device="cpu"):
        self.model = ChessNet()
        self.model.load_state_dict(torch.load(model_path, map_location=device))
        self.model.eval()
        self.device = device

    def choose_move(self, board, color, last_move):
        state = board_to_tensor(board).unsqueeze(0).to(self.device)

        with torch.no_grad():
            policy_logits, _ = self.model(state)
        policy_logits = policy_logits.squeeze(0)

        legal_moves = get_legal_moves_for_color(board, color, last_move)
        if not legal_moves:
            return None

        legal_indices = [move_to_index(m) for m in legal_moves]
        legal_logits = torch.tensor([policy_logits[idx].item() for idx in legal_indices])
        probs = torch.softmax(legal_logits, dim=0)
        chosen = torch.multinomial(probs, 1).item()
        
        return legal_moves[chosen]

def get_legal_moves_for_color(board, color, last_move):
    moves = []
    for row in range(8):
        for col in range(8):
            piece = board[row][col]
            if piece and piece.color == color:
                legal = get_legal_moves(piece, row, col, board, last_move)
                for dst in legal:
                    moves.append(((row, col), dst))
    return moves
