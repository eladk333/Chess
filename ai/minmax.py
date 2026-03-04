import chess
import math

class MinimaxAI:
    def __init__(self, depth=3):
        self.depth = depth
    
    # Pawns: Encouraged to advance and control the center.
    # Penalized for staying on their starting squares.
    PAWN_PST = [
        0,  0,  0,  0,  0,  0,  0,  0,
        50, 50, 50, 50, 50, 50, 50, 50,
        10, 10, 20, 30, 30, 20, 10, 10,
        5,  5, 10, 25, 25, 10,  5,  5,
        0,  0,  0, 20, 20,  0,  0,  0,
        5, -5,-10,  0,  0,-10, -5,  5,
        5, 10, 10,-20,-20, 10, 10,  5,
        0,  0,  0,  0,  0,  0,  0,  0
    ]

    # Knights: Heavily penalized on the rim/corners ("Knights on the rim are dim").
    # Rewarded for centralization.
    KNIGHT_PST = [
        -50,-40,-30,-30,-30,-30,-40,-50,
        -40,-20,  0,  0,  0,  0,-20,-40,
        -30,  0, 10, 15, 15, 10,  0,-30,
        -30,  5, 15, 20, 20, 15,  5,-30,
        -30,  0, 15, 20, 20, 15,  0,-30,
        -30,  5, 10, 15, 15, 10,  5,-30,
        -40,-20,  0,  5,  5,  0,-20,-40,
        -50,-40,-30,-30,-30,-30,-40,-50
    ]

    # Bishops: Encouraged to control long diagonals and avoid the edges.
    BISHOP_PST = [
        -20,-10,-10,-10,-10,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5, 10, 10,  5,  0,-10,
        -10,  5,  5, 10, 10,  5,  5,-10,
        -10,  0, 10, 10, 10, 10,  0,-10,
        -10, 10, 10, 10, 10, 10, 10,-10,
        -10,  5,  0,  0,  0,  0,  5,-10,
        -20,-10,-10,-10,-10,-10,-10,-20
    ]

    # Rooks: Encouraged to occupy the 7th rank and central files.
    ROOK_PST = [
        0,  0,  0,  0,  0,  0,  0,  0,
        5, 10, 10, 10, 10, 10, 10,  5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        0,  0,  0,  5,  5,  0,  0,  0
    ]

    # Queens: Slightly prefer the center, but mostly stay flexible.
    QUEEN_PST = [
        -20,-10,-10, -5, -5,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5,  5,  5,  5,  0,-10,
        -5,  0,  5,  5,  5,  5,  0, -5,
        0,  0,  5,  5,  5,  5,  0, -5,
        -10,  5,  5,  5,  5,  5,  0,-10,
        -10,  0,  5,  0,  0,  0,  0,-10,
        -20,-10,-10, -5, -5,-10,-10,-20
    ]

    # King (Middle Game): Needs to hide in the corners behind the pawn shield.
    KING_MG_PST = [
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -20,-30,-30,-40,-40,-30,-30,-20,
        -10,-20,-20,-20,-20,-20,-20,-10,
        20, 20,  0,  0,  0,  0, 20, 20,
        20, 30, 10,  0,  0, 10, 30, 20
    ]

    # King (End Game): Needs to become an active attacking piece in the center.
    KING_EG_PST = [
        -50,-40,-30,-20,-20,-30,-40,-50,
        -30,-20,-10,  0,  0,-10,-20,-30,
        -30,-10, 20, 30, 30, 20,-10,-30,
        -30,-10, 30, 40, 40, 30,-10,-30,
        -30,-10, 30, 40, 40, 30,-10,-30,
        -30,-10, 20, 30, 30, 20,-10,-30,
        -30,-30,  0,  0,  0,  0,-30,-30,
        -50,-30,-30,-30,-30,-30,-30,-50
    ]

    def get_best_move(self, board: chess.Board):
        """
        Entry point for the AI turn.
        """
        best_move = None
        is_maximizing = board.turn == chess.WHITE
        
        best_value = -math.inf if is_maximizing else math.inf
        
        # Initialize alpha and beta
        alpha = -math.inf
        beta = math.inf

        moves = list(board.legal_moves)
        # Sort moves based on our scoring function, highest score first
        moves.sort(key=lambda m: self.score_move(board, m), reverse=True)
        
        for move in moves:
            board.push(move)
            
            # Pass alpha and beta down the tree
            board_value = self.minimax(board, self.depth - 1, alpha, beta, not is_maximizing)
            
            board.pop()

            if is_maximizing:
                if board_value > best_value:
                    best_value = board_value
                    best_move = move
                # Update alpha at the root
                alpha = max(alpha, best_value)
            else:
                if board_value < best_value:
                    best_value = board_value
                    best_move = move
                # Update beta at the root
                beta = min(beta, best_value)
                
        return best_move

    def minimax(self, board: chess.Board, depth: int, alpha: float, beta: float, is_maximizing: bool) -> float:
        """
        Minimax algorithm with Alpha-Beta pruning.
        """
        if depth == 0 or board.is_game_over():
            return self.evaluate(board)

        if is_maximizing:
            max_eval = -math.inf
            moves = list(board.legal_moves)
            # Sort moves based on our scoring function, highest score first
            moves.sort(key=lambda m: self.score_move(board, m), reverse=True)
            
            for move in moves:
                board.push(move)
                eval = self.minimax(board, depth - 1, alpha, beta, False)
                board.pop()
                
                max_eval = max(max_eval, eval)
                alpha = max(alpha, eval)
                
                # The Pruning Magic
                if beta <= alpha:
                    break 
                    
            return max_eval
        else:
            min_eval = math.inf
            moves = list(board.legal_moves)
            # Sort moves based on our scoring function, highest score first
            moves.sort(key=lambda m: self.score_move(board, m), reverse=True)
            
            for move in moves:
                board.push(move)
                eval = self.minimax(board, depth - 1, alpha, beta, True)
                board.pop()
                
                min_eval = min(min_eval, eval)
                beta = min(beta, eval)
                
                # The Pruning Magic
                if beta <= alpha:
                    break 
                    
            return min_eval
        
    def score_move(self, board: chess.Board, move: chess.Move) -> int:
        """
        Scores a move for move ordering, primarily using MVV-LVA 
        (Most Valuable Victim - Least Valuable Attacker).
        """
        score = 0
        
        piece_values = {
            chess.PAWN: 100,
            chess.KNIGHT: 300,
            chess.BISHOP: 300,
            chess.ROOK: 500,
            chess.QUEEN: 900,
            chess.KING: 0
        }

        # 1. Promotions (High priority)
        if move.promotion:
            # Add the value of the piece being promoted to
            score += piece_values.get(move.promotion, 0)

        # 2. Captures (MVV-LVA)
        if board.is_capture(move):
            attacker_piece = board.piece_at(move.from_square)
            victim_piece = board.piece_at(move.to_square)
            
            # Standard capture
            if victim_piece and attacker_piece:
                attacker_val = piece_values.get(attacker_piece.piece_type, 0)
                victim_val = piece_values.get(victim_piece.piece_type, 0)
                
                # MVV-LVA formula: Prioritize high-value victims and low-value attackers
                # Multiplying victim value ensures capturing a Queen is always prioritized 
                # over capturing a Pawn, regardless of the attacker.
                score += 10 * victim_val - attacker_val
                
            # En Passant (Special case: the destination square is empty)
            elif board.is_en_passant(move):
                # Pawn taking Pawn
                score += 10 * 100 - 100

        return score

    def evaluate(self, board: chess.Board) -> float:
        """
        Evaluates the board based on material advantage AND piece-square tables.
        Positive score means White is winning, negative means Black is winning.
        """
        if board.is_checkmate():
            return -100000 if board.turn == chess.WHITE else 100000
        if board.is_game_over(): 
            return 0
            
        score = 0
        
        piece_values = {
            chess.PAWN: 100,
            chess.KNIGHT: 300,
            chess.BISHOP: 300,
            chess.ROOK: 500,
            chess.QUEEN: 900
            # The King is not given a material value here, only a positional one.
        }

        # --- 1. Detect Game Phase (Middle Game vs End Game) ---
        # Calculate total non-pawn, non-king material on the board
        non_pawn_material = 0
        for piece_type in [chess.KNIGHT, chess.BISHOP, chess.ROOK, chess.QUEEN]:
            non_pawn_material += len(board.pieces(piece_type, chess.WHITE)) * piece_values[piece_type]
            non_pawn_material += len(board.pieces(piece_type, chess.BLACK)) * piece_values[piece_type]
        
        # If total major/minor piece value is low, we are in the endgame
        is_endgame = non_pawn_material <= 2000

        # --- 2. Map Pieces to their PSTs ---
        psts = {
            chess.PAWN: self.PAWN_PST,
            chess.KNIGHT: self.KNIGHT_PST,
            chess.BISHOP: self.BISHOP_PST,
            chess.ROOK: self.ROOK_PST,
            chess.QUEEN: self.QUEEN_PST,
            chess.KING: self.KING_EG_PST if is_endgame else self.KING_MG_PST
        }

        # --- 3. Evaluate the Board ---
        for piece_type in [chess.PAWN, chess.KNIGHT, chess.BISHOP, chess.ROOK, chess.QUEEN, chess.KING]:
            value = piece_values.get(piece_type, 0) # Get material value (0 for King)
            pst = psts[piece_type]                  # Get positional table

            # Score White Pieces
            for sq in board.pieces(piece_type, chess.WHITE):
                score += value       # Add material bonus
                score += pst[sq]     # Add positional bonus

            # Score Black Pieces
            for sq in board.pieces(piece_type, chess.BLACK):
                score -= value       # Subtract material penalty
                
                # Mirror the square index for Black's perspective
                mirrored_sq = chess.square_mirror(sq)
                score -= pst[mirrored_sq] # Subtract positional penalty
            
        return score