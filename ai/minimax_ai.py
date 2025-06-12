import math
from copy import deepcopy
from evaluate import evaluate_board
from rules import get_legal_moves, is_checkmate

PIECE_VALUES = {
    "pawn": 1,
    "knight": 3,
    "bishop": 3,
    "rook": 5,
    "queen": 9,
    "king": 0  # not counted in material eval
}

class MinimaxAI:
    def __init__(self, depth=2):
        self.depth = depth

    def get_move(self, board, color):
        best_score = -math.inf
        best_move = None
        is_white = (color == "white")

        all_moves = []
        for row in range(8):
            for col in range(8):
                piece = board[row][col]
                if piece and piece.color == color:
                    for dst in get_legal_moves(piece, row, col, board):
                        all_moves.append(((row, col), dst))

        if not all_moves:
            if is_checkmate(board, color):
                return None, -math.inf if is_white else math.inf
            return None, 0  # stalemate

        alpha = -math.inf
        beta = math.inf

        ordered = self.order_moves(board, all_moves, color)
        for src, dst in ordered:
            new_board = self.fast_copy_board(board)
            self.simulate_move(new_board, src, dst)
            score = -self._minimax(new_board, self.depth - 1, -beta, -alpha, not is_white)
            if score > best_score:
                best_score = score
                best_move = (src, dst)
            alpha = max(alpha, score)

        # if best_move:
        #     print(f"[MinimaxAI] Best move: {best_move[0]} -> {best_move[1]} | Score: {best_score:.2f}")
        return best_move, best_score

    def _minimax(self, board, depth, alpha, beta, is_white_turn):
        if depth == 0:
            return self.quiescence(board, alpha, beta, is_white_turn)

        color = "white" if is_white_turn else "black"
        all_moves = []
        for row in range(8):
            for col in range(8):
                piece = board[row][col]
                if piece and piece.color == color:
                    for dst in get_legal_moves(piece, row, col, board):
                        all_moves.append(((row, col), dst))

        if not all_moves:
            if is_checkmate(board, color):
                return -math.inf
            return 0  # stalemate

        best_score = -math.inf
        ordered = self.order_moves(board, all_moves, color)
        for src, dst in ordered:
            new_board = deepcopy(board)
            self.simulate_move(new_board, src, dst)
            score = -self._minimax(new_board, depth - 1, -beta, -alpha, not is_white_turn)
            best_score = max(best_score, score)
            alpha = max(alpha, score)
            if alpha >= beta:
                break  # alpha-beta pruning

        return best_score

    def simulate_move(self, board, src, dst):
        piece = board[src[0]][src[1]]
        # Handle pawn promotion (auto-promote to queen)
        if piece.type_name() == "pawn" and (dst[0] == 0 or dst[0] == 7):
            from pieces.factory import create_piece
            promoted = create_piece("queen", piece.color)
            promoted.has_moved = True
            promoted.image = piece.image
            board[dst[0]][dst[1]] = promoted
        else:
            board[dst[0]][dst[1]] = piece
        board[src[0]][src[1]] = None

    def order_moves(self, board, moves, color):
        scored_moves = []

        for src, dst in moves:
            piece = board[src[0]][src[1]]
            target = board[dst[0]][dst[1]]

            score = 0

            # MVV-LVA: prioritize capturing high-value piece with low-value piece
            if target:
                victim_value = PIECE_VALUES.get(target.type_name(), 0)
                attacker_value = PIECE_VALUES.get(piece.type_name(), 0)
                score += (10 * victim_value - attacker_value)

            # Promotion bonus
            if piece.type_name() == "pawn":
                if (piece.color == "white" and dst[0] == 0) or (piece.color == "black" and dst[0] == 7):
                    score += 50

            scored_moves.append(((src, dst), score))

        # Descending order: higher score = higher priority
        scored_moves.sort(key=lambda x: x[1], reverse=True)
        return [move for move, _ in scored_moves]

    def quiescence(self, board, alpha, beta, is_white_turn):
        stand_pat = evaluate_board(board, perspective="white" if is_white_turn else "black")
        if stand_pat >= beta:
            return beta
        if alpha < stand_pat:
            alpha = stand_pat

        color = "white" if is_white_turn else "black"
        all_captures = []
        for row in range(8):
            for col in range(8):
                piece = board[row][col]
                if piece and piece.color == color:
                    for dst in get_legal_moves(piece, row, col, board):
                        target = board[dst[0]][dst[1]]
                        if target and target.color != color:
                            all_captures.append(((row, col), dst))

        ordered = self.order_moves(board, all_captures, color)
        for src, dst in ordered:
            new_board = deepcopy(board)
            self.simulate_move(new_board, src, dst)
            score = -self.quiescence(new_board, -beta, -alpha, not is_white_turn)

            if score >= beta:
                return beta
            if score > alpha:
                alpha = score

        return alpha
    
    def fast_copy_board(self, board):
        # Assumes each piece has a .clone() method, as in your rules.py
        return [[piece.clone() if piece else None for piece in row] for row in board]