import random
import torch
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
    previous_score = evaluate_material(board, current_color)

    for turn in range(100):
        moves = get_all_moves(board, current_color, last_move)
        if not moves or is_checkmate(board, current_color):
            # If game ends, still record final state with strong negative reward
            state_tensor = board_to_tensor(board).squeeze(0)
            states.append(state_tensor)
            rewards.append(torch.tensor([-10.0], dtype=torch.float32))
            break

        state_tensor = board_to_tensor(board).squeeze(0)
        move = policy_fn(moves, state_tensor.unsqueeze(0))
        if not move:
            # Invalid move from policy — end game
            states.append(state_tensor)
            rewards.append(torch.tensor([-10.0], dtype=torch.float32))
            break

        # Save current state
        states.append(state_tensor)

        # Apply move
        (r1, c1), (r2, c2) = move
        piece = board[r1][c1]
        board[r2][c2] = piece
        board[r1][c1] = None
        piece.has_moved = True
        last_move = ((r1, c1), (r2, c2), piece.clone())

        # Compute material gain/loss for current player
        new_score = evaluate_material(board, current_color)
        delta = new_score - previous_score
        rewards.append(torch.tensor([delta], dtype=torch.float32))
        previous_score = evaluate_material(board, current_color)

        current_color = "black" if current_color == "white" else "white"

    return states, rewards
