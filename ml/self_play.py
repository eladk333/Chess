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

def simulate_game(policy_fn, board_factory):
    states = []
    rewards = []

    board = board_factory()
    current_color = "white"
    last_move = None

    for turn in range(100):  # Limit game length
        moves = get_all_moves(board, current_color, last_move)
        if not moves or is_checkmate(board, current_color):
            # Game ends, give final reward only
            break

        state_tensor = board_to_tensor(board).unsqueeze(0)
        move = policy_fn(moves, state_tensor)

        if not move:
            break

        states.append(state_tensor.squeeze(0))

        (r1, c1), (r2, c2) = move
        piece = board[r1][c1]
        board[r2][c2] = piece
        board[r1][c1] = None
        piece.has_moved = True
        last_move = ((r1, c1), (r2, c2), piece.clone())

        current_color = "black" if current_color == "white" else "white"
        #print(f"Generated {len(states)} states, {len(rewards)} rewards")

    # Assign dummy rewards (reward only to final move)
    for i in range(len(states)):
        reward = torch.tensor([1.0 if i == len(states) - 1 else 0.0])
        rewards.append(reward)

    return states, rewards
