import random
from rules import get_legal_moves

class RandomAI:
    def choose_move(self, board, color, last_move):
        moves = []
        for row in range(8):
            for col in range(8):
                piece = board[row][col]
                if piece and piece.color == color:
                    legal_moves = get_legal_moves(piece, row, col, board, last_move=last_move)
                    for move in legal_moves:
                        moves.append(((row, col), move))
        return random.choice(moves) if moves else None
