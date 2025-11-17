# ai/random_ai.py
import random
from rules import get_legal_moves

class RandomAI:
    def __init__(self):
        pass  # No setup needed

    def get_move(self, board, color, last_move):
        all_possible_moves = []
        
        # Find all pieces for the current AI player
        for r in range(8):
            for c in range(8):
                piece = board[r][c]
                if piece and piece.color == color:
                    # Get all legal moves for this piece
                    legal_moves = get_legal_moves(piece, r, c, board, last_move=last_move)
                    for move in legal_moves:
                        all_possible_moves.append(((r, c), move)) # Store as (src, dst)
        
        # Pick a random move from all possibilities
        if all_possible_moves:
            return random.choice(all_possible_moves)
        
        return None # No legal moves, game must be over