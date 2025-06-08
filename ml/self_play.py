import random
from rules import get_legal_moves, is_checkmate
from ml.utils import board_to_tensor
import torch

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

def evaluate_material(board, color):
    values = {
        "pawn": 1,
        "knight": 3,
        "bishop": 3,
        "rook": 5,
        "queen": 9,
        "king": 0
    }
    score = 0
    for row in board:
        for piece in row:
            if piece:
                sign = 1 if piece.color == color else -1
                score += sign * values[piece.type_name()]
    return score

def simulate_game(policy_fn, board_factory):
    states = []
    rewards = []

    board = board_factory()
    current_color = "white"
    last_move = None

    # Initial material score for current player
    previous_score = evaluate_material(board, current_color)

    for turn in range(100):  # Limit game length
        moves = get_all_moves(board, current_color, last_move)
        if not moves or is_checkmate(board, current_color):
            # Game ends, punish the player who cannot move
            final_reward = -10
            rewards.append(torch.tensor([final_reward], dtype=torch.float32))
            break

        state_tensor = board_to_tensor(board).unsqueeze(0)
        move = policy_fn(moves, state_tensor)
        if not move:
            break  # don't append reward without a state

        states.append(state_tensor.squeeze(0))

        # Apply move
        (r1, c1), (r2, c2) = move
        piece = board[r1][c1]
        board[r2][c2] = piece
        board[r1][c1] = None
        piece.has_moved = True
        last_move = ((r1, c1), (r2, c2), piece.clone())

        # Material reward
        new_score = evaluate_material(board, current_color)
        delta = new_score - previous_score
        rewards.append(torch.tensor([delta], dtype=torch.float32))
        previous_score = evaluate_material(board, current_color)

        # Alternate player
        current_color = "black" if current_color == "white" else "white"

    return states, rewards

