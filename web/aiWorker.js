// ============================================================
// aiWorker.js - Chess AI Web Worker
// Runs in a separate thread to avoid freezing the UI.
// Handles both Random and Minimax AI, with character ability support.
// ============================================================

// We can't import ES modules in Workers, so we re-implement what we need.
// chess.js is loaded via importScripts from the CDN.
importScripts('https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js');

const PIECE_VALUES = { p: 100, n: 300, b: 300, r: 500, q: 900, k: 0 };

// ---- Piece-Square Tables (from minmax.py) ----
// All PSTs are from White's perspective (row 0 = rank 8)
const PAWN_PST = [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0
];
const KNIGHT_PST = [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50
];
const BISHOP_PST = [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20
];
const ROOK_PST = [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0
];
const QUEEN_PST = [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20
];
const KING_MG_PST = [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20
];
const KING_EG_PST = [
    -50,-40,-30,-20,-20,-30,-40,-50,
    -30,-20,-10,  0,  0,-10,-20,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-30,  0,  0,  0,  0,-30,-30,
    -50,-30,-30,-30,-30,-30,-30,-50
];

const PST_MAP = { p: PAWN_PST, n: KNIGHT_PST, b: BISHOP_PST, r: ROOK_PST, q: QUEEN_PST };

// ---- FEN Helpers ----
function sqToCoords(sq) {
    return { c: sq.charCodeAt(0) - 97, r: parseInt(sq[1]) };
}
function coordsToSq(c, r) {
    if (c < 0 || c > 7 || r < 1 || r > 8) return null;
    return String.fromCharCode(97 + c) + r;
}
function movePieceInFen(fen, fromSq, toSq) {
    let tokens = fen.split(' ');
    let rows = tokens[0].split('/');
    let grid = [];
    for (let r = 0; r < 8; r++) {
        let rowGrid = [];
        for (let i = 0; i < rows[r].length; i++) {
            let ch = rows[r][i];
            if (isNaN(parseInt(ch))) { rowGrid.push(ch); }
            else { for (let j = 0; j < parseInt(ch); j++) rowGrid.push(''); }
        }
        grid.push(rowGrid);
    }
    const fromR = 8 - parseInt(fromSq[1]), fromC = fromSq.charCodeAt(0) - 97;
    const toR = 8 - parseInt(toSq[1]), toC = toSq.charCodeAt(0) - 97;
    const piece = grid[fromR][fromC];
    grid[fromR][fromC] = '';
    grid[toR][toC] = piece;
    let newRows = [];
    for (let r = 0; r < 8; r++) {
        let rowStr = '', emptyCount = 0;
        for (let c = 0; c < 8; c++) {
            if (grid[r][c] === '') { emptyCount++; }
            else { if (emptyCount > 0) { rowStr += emptyCount; emptyCount = 0; } rowStr += grid[r][c]; }
        }
        if (emptyCount > 0) rowStr += emptyCount;
        newRows.push(rowStr);
    }
    tokens[0] = newRows.join('/');
    tokens[1] = tokens[1] === 'w' ? 'b' : 'w';
    tokens[3] = '-';
    return tokens.join(' ');
}

// ---- Get All Ability Moves for AI ----
// Returns synthetic "moves" as objects with type 'ability' for special actions.
function getAbilityMoves(fen, chars, abilities, color) {
    const moves = [];
    const char = chars[color];
    const ab = abilities[color];
    const game = new Chess(fen);

    // --- Bibi: Ultimate Strike ---
    if (char === 'bibi' && ab.movesSinceLastUltimate >= 20) {
        // Find all unprotected enemy pieces
        const enemyColor = color === 'w' ? 'b' : 'w';
        const boardState = game.board();
        const toKill = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = boardState[r][c];
                if (p && p.color === enemyColor && p.type !== 'k') {
                    const sqCode = String.fromCharCode(97 + c) + (8 - r);
                    // Check if defended
                    game.remove(sqCode);
                    game.put({ type: p.type, color: color }, sqCode);
                    const flipFen = game.fen().replace(` ${color} `, ` ${enemyColor} `);
                    let isDefended = false;
                    try {
                        const tmp = new Chess(flipFen);
                        isDefended = tmp.moves({ verbose: true }).some(m => m.to === sqCode);
                    } catch(e) {}
                    game.remove(sqCode);
                    game.put({ type: p.type, color: enemyColor }, sqCode);
                    if (!isDefended) toKill.push(sqCode);
                }
            }
        }
        if (toKill.length > 0) {
            moves.push({ abilityType: 'bibi_ultimate', toKill, color });
        }
    }

    // --- Epstein: Buy a piece ---
    if (char === 'epstein') {
        const enemyColor = color === 'w' ? 'b' : 'w';
        const capturedPts = ab.capturedPoints || 0;
        const boardState = game.board();
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = boardState[r][c];
                if (p && p.color === enemyColor && p.type !== 'k') {
                    const cost = (PIECE_VALUES[p.type] || 0) * 3;
                    if (capturedPts >= cost) {
                        const sq = String.fromCharCode(97 + c) + (8 - r);
                        moves.push({ abilityType: 'epstein_buy', sq, piece: p, cost, color });
                    }
                }
            }
        }
    }

    // --- Kirk: Uni Sniper capture ---
    if (char === 'kirk' && ab.movesSinceUniSniper >= 5) {
        const enemyColor = color === 'w' ? 'b' : 'w';
        const dir = color === 'w' ? 1 : -1;
        const boardState = game.board();
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = boardState[r][c];
                if (!p || p.type !== 'p' || p.color !== color) continue;
                const fromSq = String.fromCharCode(97 + c) + (8 - r);
                const fromCoord = sqToCoords(fromSq);
                const targetR = fromCoord.r + (2 * dir);
                [-2, 2].forEach(dc => {
                    const targetC = fromCoord.c + dc;
                    const targetSq = coordsToSq(targetC, targetR);
                    if (!targetSq) return;
                    const interSq = coordsToSq(fromCoord.c + dc / 2, fromCoord.r + dir);
                    if (!interSq || game.get(interSq)) return;
                    const target = game.get(targetSq);
                    if (target && target.color === enemyColor && target.type !== 'k') {
                        moves.push({ abilityType: 'kirk_snipe', from: fromSq, to: targetSq, color });
                    }
                });
            }
        }
    }

    return moves;
}

// ---- Apply Ability Move (returns new FEN) ----
function applyAbilityMove(fen, move) {
    const game = new Chess(fen);
    if (move.abilityType === 'bibi_ultimate') {
        move.toKill.forEach(sq => game.remove(sq));
    } else if (move.abilityType === 'epstein_buy') {
        game.remove(move.sq);
        game.put({ type: move.piece.type, color: move.color }, move.sq);
    } else if (move.abilityType === 'kirk_snipe') {
        const newFen = movePieceInFen(game.fen(), move.from, move.to);
        return newFen; // already flips turn
    }
    // Flip turn for non-FEN-flip abilities
    const tokens = game.fen().split(' ');
    tokens[1] = tokens[1] === 'w' ? 'b' : 'w';
    tokens[3] = '-';
    return tokens.join(' ');
}

// ---- Evaluation ----
function evaluate(game) {
    if (game.in_checkmate()) return game.turn() === 'w' ? -100000 : 100000;
    if (game.game_over()) return 0;

    let score = 0;
    let nonPawnMaterial = 0;
    const board = game.board();

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (!p) continue;
            if (p.type !== 'p' && p.type !== 'k') {
                nonPawnMaterial += PIECE_VALUES[p.type] || 0;
            }
        }
    }

    const isEndgame = nonPawnMaterial <= 2000;
    const kingPST = isEndgame ? KING_EG_PST : KING_MG_PST;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (!p) continue;
            const val = PIECE_VALUES[p.type] || 0;
            const pst = p.type === 'k' ? kingPST : (PST_MAP[p.type] || null);
            let pstVal = 0;
            if (pst) {
                // White: mirror row, Black: use as-is
                const pstIdx = p.color === 'w' ? (7 - r) * 8 + c : r * 8 + c;
                pstVal = pst[pstIdx] || 0;
            }
            if (p.color === 'w') { score += val + pstVal; }
            else { score -= val + pstVal; }
        }
    }
    return score;
}

// ---- Score a move for ordering (MVV-LVA) ----
function scoreMoveForOrdering(game, move) {
    if (!game.get(move.to)) return 0;
    const attacker = game.get(move.from);
    const victim = game.get(move.to);
    if (!attacker || !victim) return 0;
    return 10 * (PIECE_VALUES[victim.type] || 0) - (PIECE_VALUES[attacker.type] || 0);
}

// ---- Random AI ----
function randomMove(fen, chars, abilities, color) {
    const game = new Chess(fen);
    const legalMoves = game.moves({ verbose: true });
    const abilityMoves = getAbilityMoves(fen, chars, abilities, color);
    const all = [...legalMoves, ...abilityMoves];
    if (all.length === 0) return null;
    const choice = all[Math.floor(Math.random() * all.length)];
    if (choice.abilityType) return { isAbility: true, move: choice };
    return { isAbility: false, move: choice };
}

// ---- Minimax AI ----
let tt = {};
let nodeCount = 0;
const TIME_LIMIT_MS = 4000;
let startTime = 0;

function minimaxSearch(fen, depth, alpha, beta, isMaximizing, chars, abilities) {
    if (Date.now() - startTime > TIME_LIMIT_MS) throw 'timeout';

    nodeCount++;

    const game = new Chess(fen);
    if (game.game_over() || depth === 0) return evaluate(game);

    const color = game.turn(); // 'w' or 'b'
    const stdMoves = game.moves({ verbose: true });
    const abilityMoves = getAbilityMoves(fen, chars, abilities, color);

    stdMoves.sort((a, b) => scoreMoveForOrdering(game, b) - scoreMoveForOrdering(game, a));
    const allMoves = [...stdMoves, ...abilityMoves];

    if (allMoves.length === 0) return evaluate(game);

    let bestVal = isMaximizing ? -Infinity : Infinity;

    for (const move of allMoves) {
        let childFen;
        let childAbilities = JSON.parse(JSON.stringify(abilities));

        if (move.abilityType) {
            childFen = applyAbilityMove(fen, move);
            // Update ability cooldown state
            if (move.abilityType === 'bibi_ultimate') {
                childAbilities[color].movesSinceLastUltimate = 0;
            } else if (move.abilityType === 'epstein_buy') {
                childAbilities[color].capturedPoints = (childAbilities[color].capturedPoints || 0) - move.cost;
            } else if (move.abilityType === 'kirk_snipe') {
                childAbilities[color].movesSinceUniSniper = 0;
                childAbilities[color].uniSniperActive = false;
            }
        } else {
            game.move(move);
            childFen = game.fen();
            game.undo();
            // Advance cooldowns for the player who just moved
            if (chars[color] === 'bibi') childAbilities[color].movesSinceLastUltimate++;
            if (chars[color] === 'diddy' && !childAbilities[color].babyOilActive) childAbilities[color].movesSinceBabyOil++;
            if (chars[color] === 'kirk' && !childAbilities[color].uniSniperActive) childAbilities[color].movesSinceUniSniper++;
        }

        const nextIsMax = new Chess(childFen).turn() === 'w';
        const score = minimaxSearch(childFen, depth - 1, alpha, beta, nextIsMax, chars, childAbilities);

        if (isMaximizing) {
            if (score > bestVal) bestVal = score;
            alpha = Math.max(alpha, bestVal);
        } else {
            if (score < bestVal) bestVal = score;
            beta = Math.min(beta, bestVal);
        }
        if (alpha >= beta) break;
    }
    return bestVal;
}

function minimaxBestMove(fen, chars, abilities, color) {
    startTime = Date.now();
    nodeCount = 0;
    tt = {};

    const game = new Chess(fen);
    const stdMoves = game.moves({ verbose: true });
    const abilityMoves = getAbilityMoves(fen, chars, abilities, color);
    stdMoves.sort((a, b) => scoreMoveForOrdering(game, b) - scoreMoveForOrdering(game, a));
    const allMoves = [...stdMoves, ...abilityMoves];

    if (allMoves.length === 0) return null;

    const isMax = color === 'w';
    let bestMove = allMoves[0];
    let bestScore = isMax ? -Infinity : Infinity;

    // Iterative deepening
    for (let depth = 1; depth <= 4; depth++) {
        let currentBestMove = allMoves[0];
        let currentBestScore = isMax ? -Infinity : Infinity;

        try {
            for (const move of allMoves) {
                let childFen;
                let childAbilities = JSON.parse(JSON.stringify(abilities));

                if (move.abilityType) {
                    childFen = applyAbilityMove(fen, move);
                    if (move.abilityType === 'bibi_ultimate') childAbilities[color].movesSinceLastUltimate = 0;
                    else if (move.abilityType === 'epstein_buy') childAbilities[color].capturedPoints = (childAbilities[color].capturedPoints || 0) - move.cost;
                    else if (move.abilityType === 'kirk_snipe') { childAbilities[color].movesSinceUniSniper = 0; childAbilities[color].uniSniperActive = false; }
                } else {
                    game.move(move);
                    childFen = game.fen();
                    game.undo();
                    if (chars[color] === 'bibi') childAbilities[color].movesSinceLastUltimate++;
                    if (chars[color] === 'diddy' && !childAbilities[color].babyOilActive) childAbilities[color].movesSinceBabyOil++;
                    if (chars[color] === 'kirk' && !childAbilities[color].uniSniperActive) childAbilities[color].movesSinceUniSniper++;
                }

                const nextIsMax = new Chess(childFen).turn() === 'w';
                const score = minimaxSearch(childFen, depth - 1, -Infinity, Infinity, nextIsMax, chars, childAbilities);

                if (isMax ? score > currentBestScore : score < currentBestScore) {
                    currentBestScore = score;
                    currentBestMove = move;
                }
            }
            bestMove = currentBestMove;
            bestScore = currentBestScore;
        } catch(e) {
            if (e === 'timeout') break;
            throw e;
        }

        if (Date.now() - startTime > TIME_LIMIT_MS) break;
    }

    if (bestMove.abilityType) return { isAbility: true, move: bestMove };
    return { isAbility: false, move: bestMove };
}

// ---- Message Handler ----
self.onmessage = function(e) {
    const { fen, chars, abilities, color, aiType } = e.data;
    let result;
    try {
        if (aiType === 'random') {
            result = randomMove(fen, chars, abilities, color);
        } else {
            result = minimaxBestMove(fen, chars, abilities, color);
        }
        self.postMessage({ success: true, result, nodes: nodeCount });
    } catch(err) {
        self.postMessage({ success: false, error: String(err) });
    }
};
