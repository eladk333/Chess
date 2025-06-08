import torch
from rules import get_legal_moves, is_checkmate
from ml.utils import board_to_tensor
from ml.network import ChessNet

class MinimaxAI:
    def __init__(self, model_path="chess_model_best.pt", depth=2, device=None):
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = ChessNet().to(self.device)
        self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        self.model.eval()
        self.depth = depth

    def choose_move(self, board, color, last_move):
        best_score = float("-inf") if color == "white" else float("inf")
        best_move = None

        for move in self.get_all_moves(board, color, last_move):
            new_board = self.simulate(board, move)
            piece = board[move[0][0]][move[0][1]]
            move_info = (move[0], move[1], piece.clone())
            score = self.minimax(
                new_board,
                self.depth - 1,
                maximizing=False,
                original_color=color,
                last_move=move_info,
                alpha=float("-inf"),
                beta=float("inf")
            )

            if (color == "white" and score > best_score) or (color == "black" and score < best_score):
                best_score = score
                best_move = move

        return best_move

    def minimax(self, board, depth, maximizing, original_color, last_move=None, alpha=float("-inf"), beta=float("inf")):
        current_color = original_color if maximizing else ("black" if original_color == "white" else "white")

        if depth == 0 or is_checkmate(board, current_color):
            return self.evaluate(board)

        moves = self.get_all_moves(board, current_color, last_move)
        if not moves:
            return self.evaluate(board)

        if maximizing:
            max_eval = float("-inf")
            for move in moves:
                new_board = self.simulate(board, move)
                piece = board[move[0][0]][move[0][1]]
                move_info = (move[0], move[1], piece.clone())
                eval = self.minimax(new_board, depth - 1, False, original_color, move_info, alpha, beta)
                max_eval = max(max_eval, eval)
                alpha = max(alpha, eval)
                if beta <= alpha:
                    break  # Alpha-Beta Prune
            return max_eval
        else:
            min_eval = float("inf")
            for move in moves:
                new_board = self.simulate(board, move)
                piece = board[move[0][0]][move[0][1]]
                move_info = (move[0], move[1], piece.clone())
                eval = self.minimax(new_board, depth - 1, True, original_color, move_info, alpha, beta)
                min_eval = min(min_eval, eval)
                beta = min(beta, eval)
                if beta <= alpha:
                    break  # Alpha-Beta Prune
            return min_eval

    def evaluate(self, board):
        tensor = board_to_tensor(board).unsqueeze(0).to(self.device)
        with torch.no_grad():
            return self.model(tensor).item()


    def get_all_moves(self, board, color, last_move):
        moves = []
        for row in range(8):
            for col in range(8):
                piece = board[row][col]
                if piece and piece.color == color:
                    legal = get_legal_moves(piece, row, col, board, last_move=last_move)
                    for dst in legal:
                        moves.append(((row, col), dst))
        return moves

    def simulate(self, board, move):
        r1, c1 = move[0]
        r2, c2 = move[1]
        new_board = [[p.clone() if p else None for p in row] for row in board]
        piece = new_board[r1][c1]
        new_board[r2][c2] = piece
        new_board[r1][c1] = None
        piece.has_moved = True
        return new_board
