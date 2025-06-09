import torch
import random
from rules import get_legal_moves, is_checkmate
from ml.utils import board_to_tensor

PIECE_VALUES = {
    "pawn": 0.1,
    "knight": 0.3,
    "bishop": 0.3,
    "rook": 0.5,
    "queen": 0.9,
    "king": 0.0  # shouldn't be captured
}

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
    (r1, c1), (r2, c2) = move
    return (r1 * 8 + c1) * 64 + (r2 * 8 + c2)

def reward_for_capture(captured_piece):
    if captured_piece:
        return PIECE_VALUES.get(captured_piece.__class__.__name__.lower(), 0.0)
    return 0.0

def penalize_for_losing(captured_piece, current_color, model_color, rewards):
    if current_color != model_color and captured_piece and len(rewards) > 0:
        penalty = PIECE_VALUES.get(captured_piece.__class__.__name__.lower(), 0.0)
        rewards[-1] -= penalty

def compute_material_score(board, color):
    return sum([
        {"pawn": 1, "knight": 3, "bishop": 3, "rook": 5, "queen": 9}.get(
            (p.__class__.__name__.lower() if p else ""), 0)
        for row in board for p in row if p and p.color == color
    ])

def simulate_game(model, board_factory):
    board = board_factory()
    current_color = "white"
    model_color = random.choice(["white", "black"])
    last_move = None

    states, policies, rewards = [], [], []
    move_log = []

    for _ in range(100):
        legal_moves = get_all_moves(board, current_color, last_move)
        if not legal_moves:
            winner = "black" if current_color == "white" else "white"
            break

        # Board to tensor
        state_tensor = board_to_tensor(board).unsqueeze(0)

        # Model prediction
        with torch.no_grad():
            policy_logits, _ = model(state_tensor)
        policy_logits = policy_logits.squeeze(0)

        legal_indices = [move_to_index(m) for m in legal_moves]
        legal_logits = torch.tensor([policy_logits[idx].item() for idx in legal_indices])
        move_probs = torch.softmax(legal_logits, dim=0)
        move_idx = torch.multinomial(move_probs, 1).item()
        chosen_move = legal_moves[move_idx]

        policy_target = torch.zeros(4096)
        policy_target[move_to_index(chosen_move)] = 1.0

        # Execute move
        (r1, c1), (r2, c2) = chosen_move
        captured = board[r2][c2]
        piece = board[r1][c1]

        board[r2][c2] = piece
        board[r1][c1] = None
        piece.has_moved = True
        last_move = ((r1, c1), (r2, c2), piece.clone())

        # Reward logic
        reward = reward_for_capture(captured)
        penalize_for_losing(captured, current_color, model_color, rewards)

        # Save experience only if model is playing
        if current_color == model_color:
            states.append(state_tensor.squeeze(0))
            policies.append(policy_target)
            rewards.append(reward)
            move_log.append((current_color, reward))

        # End game on checkmate
        if is_checkmate(board, "black" if current_color == "white" else "white"):
            winner = current_color
            break

        current_color = "black" if current_color == "white" else "white"

    # Assign winner based on material or random tiebreak
    if 'winner' not in locals():
        white_score = compute_material_score(board, "white")
        black_score = compute_material_score(board, "black")
        if white_score > black_score:
            winner = "white"
        elif black_score > white_score:
            winner = "black"
        else:
            winner = random.choice(["white", "black"])

    # Final game outcome reward
    final_reward = {
        "white": 1.0,
        "black": -1.0,
        None: 0.0
    }

    for i, (color, _) in enumerate(move_log):
        rewards[i] += final_reward[winner] if color == winner else -final_reward[winner]

    rewards_tensor = torch.tensor(rewards, dtype=torch.float32).unsqueeze(1)
    return states, policies, rewards_tensor
