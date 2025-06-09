import torch
import random
from rules import get_legal_moves, is_checkmate
from ml.utils import board_to_tensor

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

def move_to_index(move):
    # Map (from_row, from_col, to_row, to_col) to a unique index (simple version)
    (r1, c1), (r2, c2) = move
    return (r1 * 8 + c1) * 64 + (r2 * 8 + c2)  # 0–4095

def index_to_move(index):
    from_square = index // 64
    to_square = index % 64
    return ((from_square // 8, from_square % 8), (to_square // 8, to_square % 8))

def simulate_game(model, board_factory):
    states = []
    policies = []
    rewards = []

    board = board_factory()
    current_color = "white"
    last_move = None
    turn = 0
    final_result = None  # +1 if white wins, -1 if black wins, 0 for draw

    for _ in range(100):
        state_tensor = board_to_tensor(board)
        state_tensor = state_tensor.unsqueeze(0)  # batch dimension

        with torch.no_grad():
            policy_logits, _ = model(state_tensor)
        policy_logits = policy_logits.squeeze(0)

        legal_moves = get_all_moves(board, current_color, last_move)
        if not legal_moves:
            final_result = -1 if current_color == "white" else 1
            break

        legal_indices = [move_to_index(m) for m in legal_moves]
        legal_logits = torch.tensor([policy_logits[idx].item() for idx in legal_indices])
        move_probs = torch.softmax(legal_logits, dim=0)

        move_idx = torch.multinomial(move_probs, 1).item()
        chosen_move = legal_moves[move_idx]

        # Create a one-hot vector of size 4096 as policy target
        policy_target = torch.zeros(4096)
        policy_target[move_to_index(chosen_move)] = 1.0

        # Record state and policy target
        states.append(state_tensor.squeeze(0))
        policies.append(policy_target)

        # Make the move on the board
        (r1, c1), (r2, c2) = chosen_move
        piece = board[r1][c1]
        board[r2][c2] = piece
        board[r1][c1] = None
        piece.has_moved = True
        last_move = ((r1, c1), (r2, c2), piece.clone())

        if is_checkmate(board, "black" if current_color == "white" else "white"):
            final_result = 1 if current_color == "white" else -1
            break

        current_color = "black" if current_color == "white" else "white"
        turn += 1

    # Assign reward to all positions from the winner's perspective
    reward_value = torch.tensor([final_result if final_result is not None else 0.0], dtype=torch.float32)
    rewards = [reward_value for _ in range(len(states))]

    return states, policies, rewards
