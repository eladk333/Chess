import random
import chess

class RandomAI:
    def __init__(self):
        # Added to match MinimaxAI signature in case you ever want to pass depth
        pass 

    def get_best_move(self, board: chess.Board, time_limit=2.0):
        """
        Returns a random legal move.
        """
        legal_moves = list(board.legal_moves)
        if legal_moves:
            return random.choice(legal_moves)
        return None