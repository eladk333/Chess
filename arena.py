import chess
import chess.engine
import chess.pgn
import chess.polyglot
import math
import time

# ============================================================================
# CONFIGURATION
# ============================================================================
STOCKFISH_PATH = r"C:\Users\eladk\Downloads\stockfish-windows-x86-64-avx2\stockfish\stockfish-windows-x86-64-avx2.exe"
TIME_LIMIT_PER_MOVE = 5.0  # Seconds per move
OUTPUT_FILE = "ai_tournament_results.pgn"

class TimeoutException(Exception):
    pass

# ============================================================================
# SHARED EVALUATION CONSTANTS (Both models use the exact same PSTs/Values)
# ============================================================================
PIECE_VALUES = {
    chess.PAWN: 100, chess.KNIGHT: 300, chess.BISHOP: 300,
    chess.ROOK: 500, chess.QUEEN: 900, chess.KING: 0
}

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

def shared_evaluate(board: chess.Board) -> float:
    if board.is_checkmate():            
        return -100000 if board.turn == chess.WHITE else 100000
    if board.is_game_over(): 
        return 0
        
    score = 0
    non_pawn_material = 0
    for pt in [chess.KNIGHT, chess.BISHOP, chess.ROOK, chess.QUEEN]:
        non_pawn_material += len(board.pieces(pt, chess.WHITE)) * PIECE_VALUES[pt]
        non_pawn_material += len(board.pieces(pt, chess.BLACK)) * PIECE_VALUES[pt]
    
    is_endgame = non_pawn_material <= 2000
    psts = {
        chess.PAWN: PAWN_PST, chess.KNIGHT: KNIGHT_PST, chess.BISHOP: BISHOP_PST,
        chess.ROOK: ROOK_PST, chess.QUEEN: QUEEN_PST,
        chess.KING: KING_EG_PST if is_endgame else KING_MG_PST
    }

    for piece_type in [chess.PAWN, chess.KNIGHT, chess.BISHOP, chess.ROOK, chess.QUEEN, chess.KING]:
        value = PIECE_VALUES.get(piece_type, 0) 
        pst = psts[piece_type]                  
        for sq in board.pieces(piece_type, chess.WHITE):
            score += value       
            score += pst[chess.square_mirror(sq)]     
        for sq in board.pieces(piece_type, chess.BLACK):
            score -= value       
            score -= pst[sq] 
    return score


# ============================================================================
# MODEL 1: PYTHON MINIMAX AI (Zobrist Hashing, Full MVV-LVA)
# ============================================================================
class PythonMinimaxAI:
    def __init__(self, name="Python_AI"):
        self.name = name
        self.tt = {}
        self.stats = {}

    def get_best_move(self, board: chess.Board, time_limit=5.0):
        start_time = time.time()
        self.stats = {"nodes": 0, "tt_hits": 0}
        best_move_overall = None
        current_depth = 1

        try:
            while True:
                self.minimax(board, current_depth, -math.inf, math.inf, board.turn == chess.WHITE, start_time, time_limit)
                tt_entry = self.tt.get(chess.polyglot.zobrist_hash(board))
                if tt_entry and tt_entry.get("best_move"):
                    best_move_overall = tt_entry["best_move"]
                current_depth += 1
        except TimeoutException:
            pass

        if best_move_overall is None:
            best_move_overall = list(board.legal_moves)[0]
        return best_move_overall

    def minimax(self, board, depth, alpha, beta, is_maximizing, start_time, time_limit):
        self.stats["nodes"] += 1
        if time.time() - start_time > time_limit:
            raise TimeoutException()

        hash_key = chess.polyglot.zobrist_hash(board)
        tt_entry = self.tt.get(hash_key)

        if tt_entry and tt_entry["depth"] >= depth:
            self.stats["tt_hits"] += 1
            flag = tt_entry["flag"]
            score = tt_entry["score"]
            if flag == "EXACT": return score
            elif flag == "LOWERBOUND": alpha = max(alpha, score)
            elif flag == "UPPERBOUND": beta = min(beta, score)
            if alpha >= beta: return score

        if board.is_game_over(): return shared_evaluate(board)
        if depth == 0: return self.quiescence_search(board, alpha, beta, is_maximizing, start_time, time_limit)

        original_alpha = alpha
        original_beta = beta
        best_move_this_node = None
        tt_best_move = tt_entry["best_move"] if tt_entry else None

        moves = list(board.legal_moves)
        def get_move_score(m):
            if tt_best_move is not None and m == tt_best_move: return 1_000_000
            score = 0
            if m.promotion: score += PIECE_VALUES.get(m.promotion, 0)
            if board.is_capture(m):
                attacker = board.piece_at(m.from_square)
                victim = board.piece_at(m.to_square)
                if victim and attacker:
                    score += 10 * PIECE_VALUES.get(victim.piece_type, 0) - PIECE_VALUES.get(attacker.piece_type, 0)
                elif board.is_en_passant(m):
                    score += 10 * 100 - 100
            return score

        moves.sort(key=get_move_score, reverse=True)

        best_val = -math.inf if is_maximizing else math.inf
        for move in moves:
            board.push(move)
            try:
                score = self.minimax(board, depth - 1, alpha, beta, not is_maximizing, start_time, time_limit)
            finally:
                board.pop()

            if is_maximizing:
                if score > best_val:
                    best_val = score
                    best_move_this_node = move
                alpha = max(alpha, best_val)
            else:
                if score < best_val:
                    best_val = score
                    best_move_this_node = move
                beta = min(beta, best_val)
            if alpha >= beta: break

        flag = "EXACT"
        if best_val <= original_alpha: flag = "UPPERBOUND"
        elif best_val >= original_beta: flag = "LOWERBOUND"

        self.tt[hash_key] = {"depth": depth, "score": best_val, "flag": flag, "best_move": best_move_this_node}        
        return best_val

    def quiescence_search(self, board, alpha, beta, is_maximizing, start_time, time_limit):
        if time.time() - start_time > time_limit: raise TimeoutException()
        stand_pat = shared_evaluate(board)
        if board.is_game_over(): return stand_pat

        if is_maximizing:
            if stand_pat >= beta: return beta 
            if alpha < stand_pat: alpha = stand_pat
        else:
            if stand_pat <= alpha: return alpha 
            if beta > stand_pat: beta = stand_pat

        captures = list(board.generate_legal_captures())
        
        def score_cap(m):
            v = board.piece_at(m.to_square)
            a = board.piece_at(m.from_square)
            if v and a: return 10 * PIECE_VALUES.get(v.piece_type, 0) - PIECE_VALUES.get(a.piece_type, 0)
            return 0
            
        captures.sort(key=score_cap, reverse=True)

        best_val = stand_pat
        for move in captures:
            board.push(move)
            try:
                score = self.quiescence_search(board, alpha, beta, not is_maximizing, start_time, time_limit)
            finally:
                board.pop()

            if is_maximizing:
                best_val = max(best_val, score)
                alpha = max(alpha, score)
            else:
                best_val = min(best_val, score)
                beta = min(beta, score)
            if beta <= alpha: break 
        return best_val


# ============================================================================
# MODEL 2: JAVASCRIPT PORTED AI (FEN Hashing, JS Move Ordering)
# ============================================================================
class JSPortedMinimaxAI:
    def __init__(self, name="JS_Ported_AI"):
        self.name = name
        self.tt = {}
        self.stats = {}

    def get_best_move(self, board: chess.Board, time_limit=5.0):
        start_time = time.time()
        self.stats = {"nodes": 0, "tt_hits": 0}
        self.tt = {} # JS Version clears TT on new AI turn
        
        best_move_overall = None
        current_depth = 1

        try:
            while True:
                self.minimax(board, current_depth, -math.inf, math.inf, board.turn == chess.WHITE, start_time, time_limit)
                tt_entry = self.tt.get(board.fen())
                if tt_entry and tt_entry.get("best_move"):
                    best_move_overall = tt_entry["best_move"]
                current_depth += 1
        except TimeoutException:
            pass

        if best_move_overall is None:
            best_move_overall = list(board.legal_moves)[0]
        return best_move_overall

    def minimax(self, board, depth, alpha, beta, is_maximizing, start_time, time_limit):
        self.stats["nodes"] += 1
        if time.time() - start_time > time_limit:
            raise TimeoutException()

        hash_key = board.fen() # JS uses literal FEN
        tt_entry = self.tt.get(hash_key)

        if tt_entry and tt_entry["depth"] >= depth:
            self.stats["tt_hits"] += 1
            flag = tt_entry["flag"]
            score = tt_entry["score"]
            if flag == "EXACT": return score
            elif flag == "LOWERBOUND": alpha = max(alpha, score)
            elif flag == "UPPERBOUND": beta = min(beta, score)
            if alpha >= beta: return score

        if board.is_game_over(): return shared_evaluate(board)
        if depth == 0: return self.quiescence_search(board, alpha, beta, is_maximizing, start_time, time_limit)

        original_alpha = alpha
        original_beta = beta
        best_move_this_node = None
        tt_best_move_str = tt_entry["best_move"].uci() if (tt_entry and tt_entry["best_move"]) else None

        moves = list(board.legal_moves)
        
        def js_move_score(m):
            if tt_best_move_str and m.uci() == tt_best_move_str: return 10000000
            score = 0
            if m.promotion: score += 900
            # JS version doesn't implement En Passant MVV-LVA logic safely
            if board.is_capture(m) and not board.is_en_passant(m):
                attacker = board.piece_at(m.from_square)
                victim = board.piece_at(m.to_square)
                if victim and attacker:
                    score += 10 * PIECE_VALUES.get(victim.piece_type, 0) - PIECE_VALUES.get(attacker.piece_type, 0)
            return score

        moves.sort(key=js_move_score, reverse=True)

        best_val = -math.inf if is_maximizing else math.inf
        for move in moves:
            board.push(move)
            try:
                score = self.minimax(board, depth - 1, alpha, beta, not is_maximizing, start_time, time_limit)
            finally:
                board.pop()

            if is_maximizing:
                if score > best_val:
                    best_val = score
                    best_move_this_node = move
                alpha = max(alpha, best_val)
            else:
                if score < best_val:
                    best_val = score
                    best_move_this_node = move
                beta = min(beta, best_val)
            if alpha >= beta: break

        flag = "EXACT"
        if best_val <= original_alpha: flag = "UPPERBOUND"
        elif best_val >= original_beta: flag = "LOWERBOUND"

        self.tt[hash_key] = {"depth": depth, "score": best_val, "flag": flag, "best_move": best_move_this_node}        
        return best_val

    def quiescence_search(self, board, alpha, beta, is_maximizing, start_time, time_limit):
        if time.time() - start_time > time_limit: raise TimeoutException()
        stand_pat = shared_evaluate(board)
        if board.is_game_over(): return stand_pat

        if is_maximizing:
            if stand_pat >= beta: return beta 
            if alpha < stand_pat: alpha = stand_pat
        else:
            if stand_pat <= alpha: return alpha 
            if beta > stand_pat: beta = stand_pat

        captures = list(board.generate_legal_captures())
        
        def js_score_cap(m):
            if not board.is_en_passant(m):
                v = board.piece_at(m.to_square)
                a = board.piece_at(m.from_square)
                if v and a: return 10 * PIECE_VALUES.get(v.piece_type, 0) - PIECE_VALUES.get(a.piece_type, 0)
            return 0
            
        captures.sort(key=js_score_cap, reverse=True)

        best_val = stand_pat
        for move in captures:
            board.push(move)
            try:
                score = self.quiescence_search(board, alpha, beta, not is_maximizing, start_time, time_limit)
            finally:
                board.pop()

            if is_maximizing:
                best_val = max(best_val, score)
                alpha = max(alpha, score)
            else:
                best_val = min(best_val, score)
                beta = min(beta, score)
            if beta <= alpha: break 
        return best_val


# ============================================================================
# TOURNAMENT RUNNER
# ============================================================================
def play_match(white_player, black_player, time_limit, match_name):
    board = chess.Board()
    
    def get_player_name(p):
        if hasattr(p, 'name'): return p.name
        return f"Stockfish_{p.options['UCI_Elo']}"

    w_name = get_player_name(white_player)
    b_name = get_player_name(black_player)
    print(f"Starting Match: {w_name} (W) vs {b_name} (B)... ", end="", flush=True)

    start_time = time.time()
    while not board.is_game_over():
        current_player = white_player if board.turn == chess.WHITE else black_player
        
        if isinstance(current_player, chess.engine.SimpleEngine):
            result = current_player.play(board, chess.engine.Limit(time=time_limit))
            move = result.move
        else:
            move = current_player.get_best_move(board, time_limit=time_limit)
            
        board.push(move)

    duration = time.time() - start_time
    result = board.result()
    print(f"Result: {result} in {duration:.1f}s")
    
    # Save to PGN
    game = chess.pgn.Game()
    game.headers["Event"] = match_name
    game.headers["White"] = w_name
    game.headers["Black"] = b_name
    game.headers["Result"] = result
    game.add_line(board.move_stack)
    
    with open(OUTPUT_FILE, "a") as f:
        print(game, file=f, end="\n\n")
        
    return w_name, b_name, result

def configure_stockfish(engine, elo):
    engine.configure({"UCI_LimitStrength": True, "UCI_Elo": elo})

def run_tournament():
    print("="*40)
    print(f"CHESS AI TOURNAMENT ({TIME_LIMIT_PER_MOVE}s per move)")
    print("="*40)
    
    # Clear previous results
    with open(OUTPUT_FILE, "w") as f: f.write("")

    py_ai = PythonMinimaxAI("Python_Minimax")
    js_ai = JSPortedMinimaxAI("JS_Ported_Minimax")
    
    try:
        sf_engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
    except FileNotFoundError:
        print(f"Error: Stockfish not found at {STOCKFISH_PATH}.")
        return

    scoreboard = {
        "Python_Minimax": {"Wins": 0, "Losses": 0, "Draws": 0},
        "JS_Ported_Minimax": {"Wins": 0, "Losses": 0, "Draws": 0}
    }

    def update_score(w_name, b_name, result):
        if result == "1-0":
            if w_name in scoreboard: scoreboard[w_name]["Wins"] += 1
            if b_name in scoreboard: scoreboard[b_name]["Losses"] += 1
        elif result == "0-1":
            if b_name in scoreboard: scoreboard[b_name]["Wins"] += 1
            if w_name in scoreboard: scoreboard[w_name]["Losses"] += 1
        else:
            if w_name in scoreboard: scoreboard[w_name]["Draws"] += 1
            if b_name in scoreboard: scoreboard[b_name]["Draws"] += 1

    # --- MATCH SCHEDULE ---
    print("\nPhase 1: AI vs AI")
    w, b, r = play_match(py_ai, js_ai, TIME_LIMIT_PER_MOVE, "AI Showdown 1")
    update_score(w, b, r)
    w, b, r = play_match(js_ai, py_ai, TIME_LIMIT_PER_MOVE, "AI Showdown 2")
    update_score(w, b, r)

    print("\nPhase 2: vs Stockfish 1700")
    configure_stockfish(sf_engine, 1700)
    for model in [py_ai, js_ai]:
        w, b, r = play_match(model, sf_engine, TIME_LIMIT_PER_MOVE, "SF 1700 Challenge (W)")
        update_score(w, b, r)
        w, b, r = play_match(sf_engine, model, TIME_LIMIT_PER_MOVE, "SF 1700 Challenge (B)")
        update_score(w, b, r)

    print("\nPhase 3: vs Stockfish 1900")
    configure_stockfish(sf_engine, 1900)
    for model in [py_ai, js_ai]:
        w, b, r = play_match(model, sf_engine, TIME_LIMIT_PER_MOVE, "SF 1900 Challenge (W)")
        update_score(w, b, r)
        w, b, r = play_match(sf_engine, model, TIME_LIMIT_PER_MOVE, "SF 1900 Challenge (B)")
        update_score(w, b, r)

    sf_engine.quit()

    print("\n" + "="*40)
    print("FINAL SCOREBOARD (Includes all games)")
    print("="*40)
    for name, stats in scoreboard.items():
        print(f"{name.ljust(20)} | W: {stats['Wins']} | L: {stats['Losses']} | D: {stats['Draws']}")
    print("="*40)
    print(f"Saved all PGNs to {OUTPUT_FILE}")

if __name__ == "__main__":
    run_tournament()