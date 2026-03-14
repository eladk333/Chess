// ============================================================
// aiWorker.js - Upgraded Chess AI Web Worker
// ============================================================

importScripts('https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js');

const PIECE_VALUES = { p: 100, n: 300, b: 300, r: 500, q: 900, k: 0 };
const FRONTEND_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const START_COUNTS = { p: 8, n: 2, b: 2, r: 2, q: 1 };

// ---- Piece-Square Tables ----
const PAWN_PST = [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0
];
const KNIGHT_PST = [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50
];
const BISHOP_PST = [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20
];
const ROOK_PST = [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0
];
const QUEEN_PST = [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20
];
const KING_MG_PST = [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20
];
const KING_EG_PST = [
    -50, -40, -30, -20, -20, -30, -40, -50,
    -30, -20, -10, 0, 0, -10, -20, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 30, 40, 40, 30, -10, -30,
    -30, -10, 20, 30, 30, 20, -10, -30,
    -30, -30, 0, 0, 0, 0, -30, -30,
    -50, -30, -30, -30, -30, -30, -30, -50
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
function movePieceInFen(fen, fromSq, toSq, flipTurn = true) {
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

    // CRITICAL FIX: Prevent AI crash if pawn teleports/slips to back rank
    let finalPiece = piece;
    if (piece === 'p' && toR === 7) finalPiece = 'q';
    if (piece === 'P' && toR === 0) finalPiece = 'Q';

    grid[toR][toC] = finalPiece;
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
    if (flipTurn) tokens[1] = tokens[1] === 'w' ? 'b' : 'w';
    tokens[3] = '-';
    return tokens.join(' ');
}

function getEpsteinPoints(fen, color, spentPoints) {
    const game = new Chess(fen);
    const counts = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    const enemy = color === 'w' ? 'b' : 'w';
    const board = game.board();
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (p && p.color === enemy && p.type !== 'k') counts[p.type]++;
        }
    }
    let pts = 0;
    for (let pt in START_COUNTS) {
        pts += Math.max(0, START_COUNTS[pt] - counts[pt]) * FRONTEND_VALUES[pt];
    }
    return pts - (spentPoints || 0);
}

// ---- Get All Ability Moves for AI ----
function getAbilityMoves(fen, chars, abilities, color) {
    const moves = [];
    const char = chars[color];
    const ab = abilities[color];
    const game = new Chess(fen);

    if (char === 'bibi' && ab.movesSinceLastUltimate >= 10) {
        const enemyColor = color === 'w' ? 'b' : 'w';
        const boardState = game.board();
        const toKill = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = boardState[r][c];
                if (p && p.color === enemyColor && p.type !== 'k') {
                    const sqCode = String.fromCharCode(97 + c) + (8 - r);
                    game.remove(sqCode);
                    game.put({ type: p.type, color: color }, sqCode);
                    const flipFen = game.fen().replace(` ${color} `, ` ${enemyColor} `);
                    let isDefended = false;
                    try {
                        const tmp = new Chess(flipFen);
                        isDefended = tmp.moves({ verbose: true }).some(m => m.to === sqCode);
                    } catch (e) { }
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

    if (char === 'epstein') {
        const enemyColor = color === 'w' ? 'b' : 'w';
        const availablePts = getEpsteinPoints(fen, color, ab.spentPoints);
        const boardState = game.board();
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = boardState[r][c];
                if (p && p.color === enemyColor && p.type !== 'k') {
                    const frontendCost = (FRONTEND_VALUES[p.type] || 0) * 3;
                    if (availablePts >= frontendCost) {
                        const sq = String.fromCharCode(97 + c) + (8 - r);
                        moves.push({ abilityType: 'epstein_buy', sq, piece: p, frontendCost, color });
                    }
                }
            }
        }
    }

    if (char === 'diddy' && ab.movesSinceBabyOil >= 5 && !ab.babyOilActive) {
        moves.push({ abilityType: 'diddy_baby_oil', color });
    }

    if (char === 'kirk' && ab.movesSinceUniSniper >= 3) {
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

function applyAbilityMove(fen, move) {
    const game = new Chess(fen);
    if (move.abilityType === 'bibi_ultimate') {
        move.toKill.forEach(sq => game.remove(sq));
    } else if (move.abilityType === 'epstein_buy') {
        game.remove(move.sq);
        game.put({ type: move.piece.type, color: move.color }, move.sq);
    } else if (move.abilityType === 'kirk_snipe') {
        return movePieceInFen(game.fen(), move.from, move.to, true);
    } else if (move.abilityType === 'diddy_baby_oil') {
        return fen;
    }

    const tokens = game.fen().split(' ');
    tokens[1] = tokens[1] === 'w' ? 'b' : 'w';
    tokens[3] = '-';
    return tokens.join(' ');
}

function evaluate(game, chars, abilities) {
    if (game.in_checkmate()) return game.turn() === 'w' ? -100000 : 100000;
    if (game.game_over()) return 0;

    let score = 0;
    let nonPawnMaterial = 0;

    ['w', 'b'].forEach(c => {
        if (chars && chars[c] === 'epstein' && abilities) {
            const unspent = getEpsteinPoints(game.fen(), c, abilities[c].spentPoints);
            const bankValue = unspent * 50;
            if (c === 'w') score += bankValue;
            else score -= bankValue;
        }
    });

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
                const pstIdx = p.color === 'w' ? r * 8 + c : (7 - r) * 8 + c;
                pstVal = pst[pstIdx] || 0;
            }
            if (p.color === 'w') { score += val + pstVal; }
            else { score -= val + pstVal; }
        }
    }
    return score;
}

function scoreMoveForOrdering(game, move) {
    if (move.abilityType) {
        if (move.abilityType === 'bibi_ultimate') return 1000000;
        if (move.abilityType === 'epstein_buy') return 500000 + (move.frontendCost * 100);
        if (move.abilityType === 'kirk_snipe') return 300000;
        if (move.abilityType === 'diddy_baby_oil') return 200000;
    }
    let score = 0;
    if (move.promotion) score += 900;
    if (game.get(move.to)) {
        const attacker = game.get(move.from);
        const victim = game.get(move.to);
        if (attacker && victim) {
            score += 10 * (PIECE_VALUES[victim.type] || 0) - (PIECE_VALUES[attacker.type] || 0);
        }
    }
    return score;
}

// ---- Game Tree Simulation logic (Shared between Minimax & QS) ----
function simulateMove(game, fen, move, color, chars, currentAbilities) {
    let childFen;
    let childAbilities = JSON.parse(JSON.stringify(currentAbilities));

    if (move.abilityType) {
        childFen = applyAbilityMove(fen, move);
        if (move.abilityType === 'bibi_ultimate') childAbilities[color].movesSinceLastUltimate = 0;
        else if (move.abilityType === 'epstein_buy') childAbilities[color].spentPoints = (childAbilities[color].spentPoints || 0) + move.frontendCost;
        else if (move.abilityType === 'diddy_baby_oil') { childAbilities[color].babyOilActive = true; childAbilities[color].movesSinceBabyOil = 0; }
        else if (move.abilityType === 'kirk_snipe') { childAbilities[color].movesSinceUniSniper = 0; childAbilities[color].uniSniperActive = false; }
    } else {
        let slipSquare = null;
        const enemyColor = color === 'w' ? 'b' : 'w';

        if (chars[enemyColor] === 'diddy' && childAbilities[enemyColor].babyOilActive) {
            const fromC = move.from.charCodeAt(0) - 97;
            const fromR = parseInt(move.from[1]);
            const toC = move.to.charCodeAt(0) - 97;
            const toR = parseInt(move.to[1]);
            const dirC = toC === fromC ? 0 : Math.sign(toC - fromC);
            const dirR = toR === fromR ? 0 : Math.sign(toR - fromR);
            const slipC = toC + dirC;
            const slipR = toR + dirR;

            if (slipC >= 0 && slipC <= 7 && slipR >= 1 && slipR <= 8) {
                const potentialSlipSq = String.fromCharCode(97 + slipC) + slipR;
                game.move(move);
                if (!game.get(potentialSlipSq)) slipSquare = potentialSlipSq;
                game.undo();
            }
            childAbilities[enemyColor].babyOilActive = false;
        }

        if (slipSquare) {
            game.move(move);
            childFen = movePieceInFen(game.fen(), move.to, slipSquare, false);
            game.undo();
        } else {
            game.move(move);
            childFen = game.fen();
            game.undo();
        }

        if (chars[color] === 'bibi') childAbilities[color].movesSinceLastUltimate++;
        if (chars[color] === 'diddy' && !childAbilities[color].babyOilActive) childAbilities[color].movesSinceBabyOil++;
        if (chars[color] === 'kirk' && !childAbilities[color].uniSniperActive) childAbilities[color].movesSinceUniSniper++;
    }

    return { childFen, childAbilities };
}

// ---- Search Algorithms ----
let tt = {};
let nodeCount = 0;
let ttHits = 0;
const TIME_LIMIT_MS = 4000;
let startTime = 0;

// QS: Only searches captures to prevent the Horizon Effect
function quiescenceSearch(fen, alpha, beta, isMaximizing, chars, abilities) {
    if (Date.now() - startTime > TIME_LIMIT_MS) throw 'timeout';
    nodeCount++;

    const game = new Chess(fen);
    const standPat = evaluate(game, chars, abilities);

    if (game.game_over()) return standPat;

    if (isMaximizing) {
        if (standPat >= beta) return beta;
        if (alpha < standPat) alpha = standPat;
    } else {
        if (standPat <= alpha) return alpha;
        if (beta > standPat) beta = standPat;
    }

    const stdMoves = game.moves({ verbose: true });
    // Keep only captures for QS
    const captures = stdMoves.filter(m => m.flags.includes('c') || m.flags.includes('e'));
    captures.sort((a, b) => scoreMoveForOrdering(game, b) - scoreMoveForOrdering(game, a));

    const color = game.turn();
    let bestVal = isMaximizing ? standPat : standPat;

    for (const move of captures) {
        const { childFen, childAbilities } = simulateMove(game, fen, move, color, chars, abilities);
        const nextIsMax = new Chess(childFen).turn() === 'w';
        const score = quiescenceSearch(childFen, alpha, beta, nextIsMax, chars, childAbilities);

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

function minimaxSearch(fen, depth, alpha, beta, isMaximizing, chars, abilities) {
    if (Date.now() - startTime > TIME_LIMIT_MS) throw 'timeout';
    nodeCount++;

    // Transposition Table lookup (FEN uniquely identifies the basic state in this search window)
    const ttKey = fen;
    const ttEntry = tt[ttKey];
    if (ttEntry && ttEntry.depth >= depth) {
        ttHits++;
        if (ttEntry.flag === 'EXACT') return ttEntry.score;
        if (ttEntry.flag === 'LOWERBOUND') alpha = Math.max(alpha, ttEntry.score);
        if (ttEntry.flag === 'UPPERBOUND') beta = Math.min(beta, ttEntry.score);
        if (alpha >= beta) return ttEntry.score;
    }

    const game = new Chess(fen);
    if (game.game_over()) return evaluate(game, chars, abilities);

    // Horizon reached: switch to QS
    if (depth === 0) return quiescenceSearch(fen, alpha, beta, isMaximizing, chars, abilities);

    const originalAlpha = alpha;
    const originalBeta = beta;
    const color = game.turn();

    const stdMoves = game.moves({ verbose: true });
    const abilityMoves = getAbilityMoves(fen, chars, abilities, color);
    const allMoves = [...stdMoves, ...abilityMoves];

    // TT Move sorting priority
    let ttBestMoveStr = ttEntry ? JSON.stringify(ttEntry.bestMove) : null;
    allMoves.sort((a, b) => {
        if (ttBestMoveStr) {
            if (JSON.stringify(a) === ttBestMoveStr) return 10000000;
            if (JSON.stringify(b) === ttBestMoveStr) return -10000000;
        }
        return scoreMoveForOrdering(game, b) - scoreMoveForOrdering(game, a);
    });

    if (allMoves.length === 0) return evaluate(game, chars, abilities);

    let bestVal = isMaximizing ? -Infinity : Infinity;
    let bestMoveThisNode = null;

    for (const move of allMoves) {
        const { childFen, childAbilities } = simulateMove(game, fen, move, color, chars, abilities);
        const nextIsMax = new Chess(childFen).turn() === 'w';

        const score = minimaxSearch(childFen, depth - 1, alpha, beta, nextIsMax, chars, childAbilities);

        if (isMaximizing) {
            if (score > bestVal) { bestVal = score; bestMoveThisNode = move; }
            alpha = Math.max(alpha, bestVal);
        } else {
            if (score < bestVal) { bestVal = score; bestMoveThisNode = move; }
            beta = Math.min(beta, bestVal);
        }
        if (alpha >= beta) break;
    }

    // Save to TT
    let flag = 'EXACT';
    if (bestVal <= originalAlpha) flag = 'UPPERBOUND';
    else if (bestVal >= originalBeta) flag = 'LOWERBOUND';
    tt[ttKey] = { depth, score: bestVal, flag, bestMove: bestMoveThisNode };

    return bestVal;
}

function minimaxBestMove(fen, chars, abilities, color) {
    startTime = Date.now();
    nodeCount = 0;
    ttHits = 0;
    tt = {}; // Clear TT on new AI turn

    const game = new Chess(fen);
    const stdMoves = game.moves({ verbose: true });
    const abilityMoves = getAbilityMoves(fen, chars, abilities, color);
    const allMoves = [...stdMoves, ...abilityMoves];

    if (allMoves.length === 0) return null;

    const isMax = color === 'w';
    let bestMoveOverall = allMoves[0];
    let lastCompletedDepth = 0;
    let finalDisplayScore = "0.00";

    // Iterative Deepening: Go as deep as possible until the 4 second timeout hits
    for (let depth = 1; depth <= 20; depth++) {
        let currentBestMove = allMoves[0];
        let currentBestScore = isMax ? -Infinity : Infinity;

        // Ensure we prioritize previous best move
        allMoves.sort((a, b) => {
            if (JSON.stringify(a) === JSON.stringify(bestMoveOverall)) return 10000000;
            if (JSON.stringify(b) === JSON.stringify(bestMoveOverall)) return -10000000;
            return scoreMoveForOrdering(game, b) - scoreMoveForOrdering(game, a);
        });

        try {
            for (const move of allMoves) {
                const { childFen, childAbilities } = simulateMove(game, fen, move, color, chars, abilities);
                const nextIsMax = new Chess(childFen).turn() === 'w';

                const score = minimaxSearch(childFen, depth - 1, -Infinity, Infinity, nextIsMax, chars, childAbilities);

                if (isMax ? score > currentBestScore : score < currentBestScore) {
                    currentBestScore = score;
                    currentBestMove = move;
                }
            }
            bestMoveOverall = currentBestMove;

            let displayScore = "N/A";
            if (Math.abs(currentBestScore) >= 90000) {
                displayScore = currentBestScore > 0 ? "MATE" : "-MATE";
            } else {
                displayScore = (currentBestScore / 100).toFixed(2);
                if (currentBestScore > 0) displayScore = "+" + displayScore;
            }
            let moveStr = bestMoveOverall.to ? bestMoveOverall.from + bestMoveOverall.to : bestMoveOverall.abilityType;

            lastCompletedDepth = depth;
            finalDisplayScore = displayScore;
            console.log(`[Minimax] depth=${depth}  positions=${nodeCount}  transpositions=${ttHits}  move=${moveStr}  eval=${displayScore}`);
        } catch (e) {
            if (e === 'timeout') {
                console.log(`[Minimax] Timeout hit! Stopped during depth ${depth}. Final chosen move from depth ${depth - 1}.`);
                break;
            }
            throw e; // Reraise unexpected errors
        }
    }

    if (bestMoveOverall.abilityType) return { isAbility: true, move: bestMoveOverall, depth: lastCompletedDepth, evalScore: finalDisplayScore };
    return { isAbility: false, move: bestMoveOverall, depth: lastCompletedDepth, evalScore: finalDisplayScore };
}

function randomMove(fen, chars, abilities, color) {
    const game = new Chess(fen);
    const all = [...game.moves({ verbose: true }), ...getAbilityMoves(fen, chars, abilities, color)];
    if (all.length === 0) return null;
    const choice = all[Math.floor(Math.random() * all.length)];
    return { isAbility: !!choice.abilityType, move: choice, depth: 1, evalScore: "Random" };
}
self.onmessage = function (e) {
    const { fen, chars, abilities, color, aiType } = e.data;
    try {
        let result = aiType === 'random' ? randomMove(fen, chars, abilities, color) : minimaxBestMove(fen, chars, abilities, color);
        self.postMessage({ success: true, result, nodes: nodeCount });
    } catch (err) {
        self.postMessage({ success: false, error: String(err) });
    }
};