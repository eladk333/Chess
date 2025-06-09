import torch
from ml.network import ChessNet
from ml.utils import board_to_tensor
from ml.self_play import get_all_moves, move_to_index

class NeuralNetAI:
    def __init__(self, model_path="chess_model_best.pt", device=None):
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = ChessNet().to(self.device)
        self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        self.model.eval()

    def choose_move(self, board, color, last_move):
        legal_moves = get_all_moves(board, color, last_move)
        if not legal_moves:
            return None

        # Convert board to tensor input
        x = board_to_tensor(board).unsqueeze(0).to(self.device)

        with torch.no_grad():
            policy_logits, _ = self.model(x)
        policy_logits = policy_logits.squeeze(0).cpu()

        # Filter logits to only legal moves
        legal_indices = [move_to_index(m) for m in legal_moves]
        legal_logits = torch.tensor([policy_logits[idx].item() for idx in legal_indices])
        probs = torch.softmax(legal_logits, dim=0)

        # Sample a move from the legal ones using predicted policy
        move_idx = torch.multinomial(probs, 1).item()
        return legal_moves[move_idx]
