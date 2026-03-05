import chess
import math
import time

class TimeoutException(Exception):
    """Custom exception to instantly break out of deep searches when time is up."""
    pass

class MinimaxAI:
    def __init__(self, depth=3):
        self.depth = depth
        self.tt = {} # The Transposition Table
    
    # Pawns: Encouraged to advance and control the center.
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

    # Knights: Heavily penalized on the rim/corners.
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

    # Bishops: Encouraged to control long diagonals.
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

    # Queens: Slightly prefer the center.
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

    # King (Middle Game): Needs to hide in the corners.
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

    # King (End Game): Needs to become an active attacking piece.
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

    def get_best_move(self, board: chess.Board, time_limit=5.0):
        """
        Iterative Deepening using the Transposition Table for memory and move ordering.
        """
        start_time = time.time()
        best_move_overall = None
        current_depth = 1
        # if len(board.move_stack) == 0 and board.turn == chess.WHITE:
        #     return chess.Move.from_uci("e2e4")
        try:
            while True:
                # Run the search for the current depth
                self.minimax(board, current_depth, -math.inf, math.inf, board.turn == chess.WHITE, start_time, time_limit)
                
                # If the search finishes without timing out, grab the best move from the TT
                tt_entry = self.tt.get(board.fen())
                if tt_entry and tt_entry['best_move']:
                    best_move_overall = tt_entry['best_move']
                
                current_depth += 1
                
        except TimeoutException:
            # Time ran out! The loop instantly breaks, and we return the best move 
            # from the last fully completed depth.
            pass 

        print(f"Reached depth: {current_depth - 1}")
        
        # Fallback if extremely low time limit prevented even depth 1 from finishing
        if best_move_overall is None:
            best_move_overall = list(board.legal_moves)[0]
            
        return best_move_overall

    def minimax(self, board: chess.Board, depth: int, alpha: float, beta: float, is_maximizing: bool, start_time: float, time_limit: float) -> float:
        """
        Minimax algorithm with Alpha-Beta pruning and Transposition Table integration.
        """
        # 1. True Timeout Check
        if time.time() - start_time > time_limit:
            raise TimeoutException()

        # 2. Transposition Table Lookup
        hash_key = board.fen()
        tt_entry = self.tt.get(hash_key)
        
        if tt_entry and tt_entry['depth'] >= depth:
            if tt_entry['flag'] == 'EXACT':
                return tt_entry['score']
            elif tt_entry['flag'] == 'LOWERBOUND':
                alpha = max(alpha, tt_entry['score'])
            elif tt_entry['flag'] == 'UPPERBOUND':
                beta = min(beta, tt_entry['score'])
            if alpha >= beta:
                return tt_entry['score'] # Prune!

        # 3. Base Cases
        if board.is_game_over():
            return self.evaluate(board)
        if depth == 0:
            return self.quiescence_search(board, alpha, beta, is_maximizing, start_time, time_limit)

        original_alpha = alpha
        original_beta = beta
        best_move_this_node = None
        tt_best_move = tt_entry['best_move'] if tt_entry else None

        # 4. Move Generation and Perfect Ordering
        moves = list(board.legal_moves)
        
        def get_move_score(m):
            if m == tt_best_move:
                return 1000000 # Absolute highest priority for the TT's known best move
            return self.score_move(board, m)
            
        moves.sort(key=get_move_score, reverse=True)

        # 5. Minimax Logic with try...finally block
        if is_maximizing:
            best_val = -math.inf
            for move in moves:
                board.push(move)
                try:
                    score = self.minimax(board, depth - 1, alpha, beta, False, start_time, time_limit)
                finally:
                    board.pop()

                if score > best_val:
                    best_val = score
                    best_move_this_node = move
                
                alpha = max(alpha, best_val)
                if beta <= alpha:
                    break
        else:
            best_val = math.inf
            for move in moves:
                board.push(move)
                try:
                    score = self.minimax(board, depth - 1, alpha, beta, True, start_time, time_limit)
                finally:
                    board.pop()

                if score < best_val:
                    best_val = score
                    best_move_this_node = move
                
                beta = min(beta, best_val)
                if beta <= alpha:
                    break

        # 6. Transposition Table Store
        flag = 'EXACT'
        if best_val <= original_alpha:
            flag = 'UPPERBOUND'
        elif best_val >= original_beta: 
            flag = 'LOWERBOUND'

        self.tt[hash_key] = {
            'depth': depth,
            'score': best_val,
            'flag': flag,
            'best_move': best_move_this_node
        }

        return best_val

    def quiescence_search(self, board: chess.Board, alpha: float, beta: float, is_maximizing: bool, start_time: float, time_limit: float) -> float:
        """
        A restricted search that only explores captures to resolve the Horizon Effect.
        """
        if time.time() - start_time > time_limit:
            raise TimeoutException()

        # 1. The "Stand-Pat" Score: Evaluating the board as it currently is.
        stand_pat = self.evaluate(board)
        
        # 2. Base case: If the game is already over, just return the score
        if board.is_game_over():
            return stand_pat

        # 3. Stand-Pat Pruning
        if is_maximizing:
            if stand_pat >= beta:
                return beta 
            if alpha < stand_pat:
                alpha = stand_pat
        else:
            if stand_pat <= alpha:
                return alpha 
            if beta > stand_pat:
                beta = stand_pat

        # 4. Generate and sort ONLY capture moves
        captures = list(board.generate_legal_captures())
        captures.sort(key=lambda m: self.score_move(board, m), reverse=True)

        # 5. Search the captures with try...finally block
        if is_maximizing:
            max_eval = stand_pat
            for move in captures:
                board.push(move)
                try:
                    score = self.quiescence_search(board, alpha, beta, False, start_time, time_limit)
                finally:
                    board.pop()

                max_eval = max(max_eval, score)
                alpha = max(alpha, score)
                if beta <= alpha:
                    break 
            return max_eval
            
        else:
            min_eval = stand_pat
            for move in captures:
                board.push(move)
                try:
                    score = self.quiescence_search(board, alpha, beta, True, start_time, time_limit)
                finally:
                    board.pop()

                min_eval = min(min_eval, score)
                beta = min(beta, score)
                if beta <= alpha:
                    break 
            return min_eval

    def score_move(self, board: chess.Board, move: chess.Move) -> int:
        """
        Scores a move for move ordering, primarily using MVV-LVA.
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
            score += piece_values.get(move.promotion, 0)

        # 2. Captures (MVV-LVA)
        if board.is_capture(move):
            attacker_piece = board.piece_at(move.from_square)
            victim_piece = board.piece_at(move.to_square)
            
            # Standard capture
            if victim_piece and attacker_piece:
                attacker_val = piece_values.get(attacker_piece.piece_type, 0)
                victim_val = piece_values.get(victim_piece.piece_type, 0)
                
                score += 10 * victim_val - attacker_val
                
            # En Passant
            elif board.is_en_passant(move):
                score += 10 * 100 - 100

        return score

    def evaluate(self, board: chess.Board) -> float:
        """
        Evaluates the board based on material advantage AND piece-square tables.
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
        }

        # 1. Detect Game Phase
        non_pawn_material = 0
        for piece_type in [chess.KNIGHT, chess.BISHOP, chess.ROOK, chess.QUEEN]:
            non_pawn_material += len(board.pieces(piece_type, chess.WHITE)) * piece_values[piece_type]
            non_pawn_material += len(board.pieces(piece_type, chess.BLACK)) * piece_values[piece_type]
        
        is_endgame = non_pawn_material <= 2000

        # 2. Map Pieces to PSTs
        psts = {
            chess.PAWN: self.PAWN_PST,
            chess.KNIGHT: self.KNIGHT_PST,
            chess.BISHOP: self.BISHOP_PST,
            chess.ROOK: self.ROOK_PST,
            chess.QUEEN: self.QUEEN_PST,
            chess.KING: self.KING_EG_PST if is_endgame else self.KING_MG_PST
        }

        # 3. Evaluate
        for piece_type in [chess.PAWN, chess.KNIGHT, chess.BISHOP, chess.ROOK, chess.QUEEN, chess.KING]:
            value = piece_values.get(piece_type, 0) 
            pst = psts[piece_type]                  

            for sq in board.pieces(piece_type, chess.WHITE):
                score += value       
                score += pst[sq]     

            for sq in board.pieces(piece_type, chess.BLACK):
                score -= value       
                mirrored_sq = chess.square_mirror(sq)
                score -= pst[mirrored_sq] 
            
        return score