// ============================================================
// aiWorker.js - Upgraded Chess AI Web Worker (Fully Bulletproofed)
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
function isBlockedByWall(gameFen, fromSq, toSq, allWalls) {
    if (!allWalls || allWalls.length === 0) return false;
    if (allWalls.includes(toSq)) return true;
    const from = sqToCoords(fromSq);
    const to = sqToCoords(toSq);
    if (!from || !to) return false;
    const tempGame = new Chess(gameFen);
    const piece = tempGame.get(fromSq);
    if (!piece || piece.type === 'n') return false;
    const dc = to.c === from.c ? 0 : Math.sign(to.c - from.c);
    const dr = to.r === from.r ? 0 : Math.sign(to.r - from.r);
    let currC = from.c + dc;
    let currR = from.r + dr;
    let steps = 0;
    while ((currC !== to.c || currR !== to.r) && steps < 10) {
        if (allWalls.includes(coordsToSq(currC, currR))) return true;
        currC += dc;
        currR += dr;
        steps++;
    }
    return false;
}
function getStandardMovesFiltered(game, fen, abilities) {
    const allWalls = [...(abilities.w?.walls || []), ...(abilities.b?.walls || [])];
    return safeGetMoves(game).filter(m => !isBlockedByWall(fen, m.from, m.to, allWalls));
}
function sqToCoords(sq) {
    if (!sq) return { c: 0, r: 0 };
    return { c: sq.charCodeAt(0) - 97, r: parseInt(sq[1]) };
}
function coordsToSq(c, r) {
    if (c < 0 || c > 7 || r < 1 || r > 8) return null;
    return String.fromCharCode(97 + c) + r;
}
// Wraps standard chess.js move generation, injecting dummy pieces for walls to fix Phantom Checks
function safeGetMovesWithWalls(fen, abilities) {
    try {
        const tempGame = new Chess(fen);
        const allWalls = [...(abilities.w?.walls || []), ...(abilities.b?.walls || [])];
        if (allWalls.length === 0) {
            return tempGame.moves({ verbose: true }).filter(m => !isBlockedByWall(fen, m.from, m.to, allWalls));
        }
        
        const turn = tempGame.turn();
        allWalls.forEach(sq => {
            if (!tempGame.get(sq)) tempGame.put({type: 'p', color: turn}, sq);
        });
        return tempGame.moves({ verbose: true }).filter(m => 
            !allWalls.includes(m.from) && !isBlockedByWall(fen, m.from, m.to, allWalls)
        );
    } catch (e) { return []; }
}

// Determines if a player is in check mathematically, respecting physical walls
function isTrueCheck(fen, abilities) {
    try {
        const tempGame = new Chess(fen);
        const allWalls = [...(abilities.w?.walls || []), ...(abilities.b?.walls || [])];
        if (allWalls.length === 0) return tempGame.in_check();
        const turn = tempGame.turn();
        allWalls.forEach(sq => {
            if (!tempGame.get(sq)) tempGame.put({type: 'p', color: turn}, sq);
        });
        return tempGame.in_check();
    } catch(e) { return false; }
}
function movePieceInFen(fen, fromSq, toSq, flipTurn = true) {
    if (!fromSq || !toSq) return fen;
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

function getEpsteinPoints(abilities, color) {
    return (abilities[color]?.earnedPoints || 0) - (abilities[color]?.spentPoints || 0);
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
                // Safe traversal applied
                if (p?.color === enemyColor && p?.type && p.type !== 'k') {
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
        const availablePts = getEpsteinPoints(abilities, color);
        const boardState = game.board();
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = boardState[r][c];
                // Safe traversal applied
                if (p?.color === enemyColor && p?.type && p.type !== 'k') {
                    const frontendCost = (FRONTEND_VALUES[p.type] || 0) * 3;
                    if (availablePts >= frontendCost) {
                        const sq = String.fromCharCode(97 + c) + (8 - r);
                        moves.push({
                            abilityType: 'epstein_buy',
                            sq,
                            pieceType: p.type,
                            frontendCost,
                            color
                        });
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
                // Safe traversal applied
                if (!p?.type || p.type !== 'p' || p?.color !== color) continue;
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
                    if (target?.color === enemyColor && target?.type && target.type !== 'k') {
                        moves.push({ abilityType: 'kirk_snipe', from: fromSq, to: targetSq, color });
                    }
                });
            }
        }
    }

    if (char === 'aheud' && ab.movesSinceSmoke >= 5 && !ab.smokeActive) {
        const enemyColor = color === 'w' ? 'b' : 'w';
        let bestSq = null;
        let bestScore = -1;
        const boardState = game.board();

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                let score = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr;
                        const nc = c + dc;
                        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                            const p = boardState[nr][nc];
                            // Safe traversal applied
                            if (p?.color === enemyColor && p?.type === 'k') {
                                score += 5;
                            } else if (p) {
                                score += 1;
                            }
                        }
                    }
                }
                if (score > bestScore) {
                    bestScore = score;
                    bestSq = String.fromCharCode(97 + c) + (8 - r);
                }
            }
        }
        if (bestSq) {
            moves.push({ abilityType: 'aheud_smoke', sq: bestSq, color });
        }
    }

    if (char === 'trump' && ab.movesSinceWall >= 3) {
        const boardState = game.board();
        const allWalls = [...(abilities.w?.walls || []), ...(abilities.b?.walls || [])];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (!boardState[r][c]) {
                    const sq = String.fromCharCode(97 + c) + (8 - r);
                    if (!allWalls.includes(sq)) {
                        moves.push({ abilityType: 'trump_wall', sq, color });
                    }
                }
            }
        }
    }

    if (char === 'einstein' && (ab.movesSinceQuantum || 0) >= 5) {
        const boardState = game.board();
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = boardState[r][c];
                if (p && p.color === color && p.type !== 'k' && p.type !== 'p') {
                    const sq = String.fromCharCode(97 + c) + (8 - r);
                    moves.push({ abilityType: 'einstein_quantum', sq: sq, color });
                    break;
                }
            }
        }
    }

    // AI Logic for George capturing the King directly
    if (char === 'george' && color === 'b') {
        const enemyColor = color === 'w' ? 'b' : 'w';
        const boardState = game.board();
        let enemyKingSq = null;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (boardState[r][c]?.type === 'k' && boardState[r][c]?.color === enemyColor) {
                    enemyKingSq = String.fromCharCode(97 + c) + (8 - r);
                }
            }
        }
        if (enemyKingSq) {
            game.remove(enemyKingSq);
            game.put({ type: 'q', color: enemyColor }, enemyKingSq);
            const pseudoMoves = safeGetMoves(game);
            const attacksOnKing = pseudoMoves.filter(m => m.to === enemyKingSq);
            game.remove(enemyKingSq);
            game.put({ type: 'k', color: enemyColor }, enemyKingSq);

            attacksOnKing.forEach(m => {
                moves.push({ abilityType: 'george_magic_win', from: m.from, to: m.to, color });
            });
        }
    }

    return moves;
}
function applyAbilityMove(fen, move) {
    const game = new Chess(fen);
    if (move.abilityType === 'bibi_ultimate') {
        move.toKill.forEach(sq => game.remove(sq));
    } else if (move.abilityType === 'epstein_buy') {
        const targetPiece = game.get(move.sq);

        // Safe traversal applied
        if (
            !targetPiece?.type ||
            targetPiece.color === move.color ||
            targetPiece.type === 'k' ||
            targetPiece.type !== move.pieceType
        ) {
            return fen;
        }

        game.remove(move.sq);
        game.put({ type: move.pieceType, color: move.color }, move.sq);
    } else if (move.abilityType === 'kirk_snipe') {
        return movePieceInFen(game.fen(), move.from, move.to, true);
    } else if (move.abilityType === 'diddy_baby_oil' || move.abilityType === 'aheud_smoke') {
        return fen;
    } else if (move.abilityType === 'george_magic_win') {
    return movePieceInFen(game.fen(), move.from, move.to, true);
    } else if (move.abilityType === 'trump_wall') {
        const tokens = game.fen().split(' ');
        tokens[1] = tokens[1] === 'w' ? 'b' : 'w';
        tokens[3] = '-';
        return tokens.join(' ');
    } else if (move.abilityType === 'einstein_quantum') {
        const fenFlip = movePieceInFen(game.fen(), move.sq, move.sq, true);
        const tempGame = new Chess(fenFlip);
        tempGame.remove(move.sq);
        return tempGame.fen();
    }

    const tokens = game.fen().split(' ');
    tokens[1] = tokens[1] === 'w' ? 'b' : 'w';
    tokens[3] = '-';
    return tokens.join(' ');
}

function evaluate(game, chars, abilities) {
    // Check if a King was magically eaten
    let boardState = game.board();
    let whiteKing = false, blackKing = false;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = boardState[r][c];
            if (p?.type === 'k') {
                if (p.color === 'w') whiteKing = true;
                if (p.color === 'b') blackKing = true;
            }
        }
    }
    if (!whiteKing) return -1000000;
    if (!blackKing) return 1000000;

    const validMoves = safeGetMovesWithWalls(game.fen(), abilities);
    const hasValidMoves = validMoves.length > 0;
    const currentlyInCheck = isTrueCheck(game.fen(), abilities);

    if (currentlyInCheck && !hasValidMoves) return game.turn() === 'w' ? -100000 : 100000;
    if (!currentlyInCheck && !hasValidMoves) return 0;
    
    // George White Penalty
    if (chars && chars.w === 'george' && abilities && abilities.w && abilities.w.georgeConsecutiveChecks >= 3) {
        return -100000;
    }

    let score = 0;
    let nonPawnMaterial = 0;

   ['w', 'b'].forEach(c => {
        if (chars && chars[c] === 'epstein' && abilities && abilities[c]) {
            const unspent = getEpsteinPoints(abilities, c);
            const bankValue = unspent * 50;
            if (c === 'w') score += bankValue;
            else score -= bankValue;
        }
        if (chars && chars[c] === 'aheud' && abilities && abilities[c] && abilities[c].smokeActive) {
            const smokeBonus = 500;
            if (c === 'w') score += smokeBonus;
            else score -= smokeBonus;
        }
        if (chars && chars[c] === 'einstein' && abilities && abilities[c] && abilities[c].quantumPieces) {
            abilities[c].quantumPieces.forEach(qp => {
                const val = PIECE_VALUES[qp.type] || 0;
                if (c === 'w') score += val;
                else score -= val;
            });
        }
    });

    const board = game.board();
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            // Safe traversal applied
            if (p?.type && p.type !== 'p' && p.type !== 'k') {
                nonPawnMaterial += PIECE_VALUES[p.type] || 0;
            }
        }
    }

    const isEndgame = nonPawnMaterial <= 2000;
    const kingPST = isEndgame ? KING_EG_PST : KING_MG_PST;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            const typeStr = p?.type;
            if (!typeStr) continue;

            const val = PIECE_VALUES[typeStr] || 0;
            const pst = typeStr === 'k' ? kingPST : (PST_MAP[typeStr] || null);
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
        if (move.abilityType === 'george_magic_win') return 2000000;
        if (move.abilityType === 'bibi_ultimate') return 1000000;
        if (move.abilityType === 'epstein_buy') return 500000 + (move.frontendCost * 100);
        if (move.abilityType === 'kirk_snipe') return 300000;
        if (move.abilityType === 'aheud_smoke') return 250000;
        if (move.abilityType === 'trump_wall') return 220000;
        if (move.abilityType === 'einstein_quantum') return 210000;
        if (move.abilityType === 'diddy_baby_oil') return 200000;
    }
    let score = 0;
    if (move.promotion) score += 900;

    if (move.to && move.from) {
        const attacker = game.get(move.from);
        const victim = game.get(move.to);
        // Safe traversal applied to prevent missing piece objects crashing
        if (attacker?.type && victim?.type) {
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
        else if (move.abilityType === 'aheud_smoke') {
            childAbilities[color].smokeActive = true;
            childAbilities[color].smokeRemainingMoves = 4;
            childAbilities[color].movesSinceSmoke = 0;
            childAbilities[color].smokeCenterSq = move.sq;
        } else if (move.abilityType === 'trump_wall') {
            childAbilities[color].walls = [move.sq];
            childAbilities[color].movesSinceWall = 0;
        } else if (move.abilityType === 'einstein_quantum') {
            childAbilities[color].movesSinceQuantum = 0;
            if (!childAbilities[color].quantumPieces) childAbilities[color].quantumPieces = [];
            const piece = new Chess(fen).get(move.sq);
            const moveObjs = new Chess(fen).moves({ square: move.sq, verbose: true });
            childAbilities[color].quantumPieces.push({
                type: piece.type, color: piece.color,
                squares: [...new Set(moveObjs.map(m => m.to))],
                id: Math.random().toString(36).substr(2, 9)
            });
        }
    } else {
        if (move.flags && (move.flags.includes('c') || move.flags.includes('e'))) {
            childAbilities[color].earnedPoints = (childAbilities[color].earnedPoints || 0) + (FRONTEND_VALUES[move.captured] || 0);
        }

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
        if (chars[color] === 'trump') childAbilities[color].movesSinceWall++;
        if (chars[color] === 'aheud') {
            if (childAbilities[color].smokeActive) {
                childAbilities[color].smokeRemainingMoves--;
                if (childAbilities[color].smokeRemainingMoves <= 0) childAbilities[color].smokeActive = false;
            } else {
                childAbilities[color].movesSinceSmoke++;
            }
        }
    }

    // AI logic for Black George Double Move
    if (chars[color] === 'george' && color === 'b' && move.abilityType !== 'george_magic_win') {
        let tempGame = new Chess(childFen);
        let wKingAlive = false;
        const bState = tempGame.board();
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (bState[r][c]?.type === 'k' && bState[r][c]?.color === 'w') {
                    wKingAlive = true;
                }
            }
        }

        if (!wKingAlive || tempGame.game_over()) {
            childAbilities[color].georgeSecondMovePending = false;
        } else if (!childAbilities[color].georgeSecondMovePending) {
            childAbilities[color].georgeSecondMovePending = true;
            let tokens = childFen.split(' ');
            tokens[1] = 'b';
            childFen = tokens.join(' ');
        } else {
            childAbilities[color].georgeSecondMovePending = false;
        }
    }

    // AI logic for White George getting checked
    let nextTurn = childFen.split(' ')[1];
    if (chars[nextTurn] === 'george') {
    try {
        let tempGame = new Chess(childFen);
        if (tempGame.in_check()) {
            childAbilities[nextTurn].georgeConsecutiveChecks = (childAbilities[nextTurn].georgeConsecutiveChecks || 0) + 1;
        } else {
            childAbilities[nextTurn].georgeConsecutiveChecks = 0;
        }
    } catch(e) {}
}

    return { childFen, childAbilities };
}

// ---- Search Algorithms ----
let tt = {};
let nodeCount = 0;
let ttHits = 0;
const TIME_LIMIT_MS = 4000;
let startTime = 0;

function quiescenceSearch(fen, alpha, beta, isMaximizing, chars, abilities) {
    if (Date.now() - startTime > TIME_LIMIT_MS) throw 'timeout';
    nodeCount++;

    let game;
try { game = new Chess(fen); } catch(e) { return 0; }
const standPat = evaluate(game, chars, abilities);

if (Math.abs(standPat) >= 900000) return standPat; // king missing — stop immediately
if (game.game_over()) return standPat;

    if (isMaximizing) {
        if (standPat >= beta) return beta;
        if (alpha < standPat) alpha = standPat;
    } else {
        if (standPat <= alpha) return alpha;
        if (beta > standPat) beta = standPat;
    }

    const stdMoves = safeGetMoves(game)
    const captures = stdMoves.filter(m => m.flags.includes('c') || m.flags.includes('e'));
    captures.sort((a, b) => scoreMoveForOrdering(game, b) - scoreMoveForOrdering(game, a));

    const color = game.turn();
    let bestVal = isMaximizing ? standPat : standPat;

    for (const move of captures) {
        const { childFen, childAbilities } = simulateMove(game, fen, move, color, chars, abilities);
        const nextIsMax = childFen.split(' ')[1] === 'w';
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

    const ttKey = fen;
    const ttEntry = tt[ttKey];
    if (ttEntry && ttEntry.depth >= depth) {
        ttHits++;
        if (ttEntry.flag === 'EXACT') return ttEntry.score;
        if (ttEntry.flag === 'LOWERBOUND') alpha = Math.max(alpha, ttEntry.score);
        if (ttEntry.flag === 'UPPERBOUND') beta = Math.min(beta, ttEntry.score);
        if (alpha >= beta) return ttEntry.score;
    }

   let game;
try { game = new Chess(fen); } catch(e) { return 0; }
const earlyEval = evaluate(game, chars, abilities);
if (Math.abs(earlyEval) >= 900000) return earlyEval; // king missing — stop immediately
if (game.game_over()) return earlyEval;


    if (depth === 0) return quiescenceSearch(fen, alpha, beta, isMaximizing, chars, abilities);

    const originalAlpha = alpha;
    const originalBeta = beta;
    const color = game.turn();

    const stdMoves = safeGetMoves(game);
    const abilityMoves = getAbilityMoves(fen, chars, abilities, color);
    const allMoves = [...stdMoves, ...abilityMoves];

    const ttBestMove = ttEntry ? ttEntry.bestMove : null;
allMoves.sort((a, b) => {
    if (ttBestMove) {
        const aMatch = a.from === ttBestMove.from && a.to === ttBestMove.to && a.abilityType === ttBestMove.abilityType;
        const bMatch = b.from === ttBestMove.from && b.to === ttBestMove.to && b.abilityType === ttBestMove.abilityType;
        if (aMatch) return -1;   // a comes first
if (bMatch) return 1;    // b comes first
    }
    return scoreMoveForOrdering(game, b) - scoreMoveForOrdering(game, a);
});

    if (allMoves.length === 0) return evaluate(game, chars, abilities);

    let bestVal = isMaximizing ? -Infinity : Infinity;
    let bestMoveThisNode = null;

    for (const move of allMoves) {
        const { childFen, childAbilities } = simulateMove(game, fen, move, color, chars, abilities);
        const nextIsMax = childFen.split(' ')[1] === 'w';

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
    tt = {};

    const game = new Chess(fen);
    const stdMoves = safeGetMoves(game);
    const abilityMoves = getAbilityMoves(fen, chars, abilities, color);
    const allMoves = [...stdMoves, ...abilityMoves];

    if (allMoves.length === 0) return null;

    const isMax = color === 'w';
    let bestMoveOverall = allMoves[0];
    let lastCompletedDepth = 0;
    let finalDisplayScore = "0.00";

    for (let depth = 1; depth <= 20; depth++) {
        let currentBestMove = allMoves[0];
        let currentBestScore = isMax ? -Infinity : Infinity;

        allMoves.sort((a, b) => {
    const aMatch = a.from === bestMoveOverall.from && a.to === bestMoveOverall.to && a.abilityType === bestMoveOverall.abilityType;
    const bMatch = b.from === bestMoveOverall.from && b.to === bestMoveOverall.to && b.abilityType === bestMoveOverall.abilityType;
    if (aMatch) return -1;   // a comes first
if (bMatch) return 1;    // b comes first
    return scoreMoveForOrdering(game, b) - scoreMoveForOrdering(game, a);
});

        try {
            for (const move of allMoves) {
                const { childFen, childAbilities } = simulateMove(game, fen, move, color, chars, abilities);
                const nextIsMax = childFen.split(' ')[1] === 'w';

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
            lastCompletedDepth = depth;
            finalDisplayScore = displayScore;
        } catch (e) {
            if (e === 'timeout') {
                break;
            }
            throw e;
        }
    }

    if (bestMoveOverall.abilityType) return { isAbility: true, move: bestMoveOverall, depth: lastCompletedDepth, evalScore: finalDisplayScore };
    return { isAbility: false, move: bestMoveOverall, depth: lastCompletedDepth, evalScore: finalDisplayScore };
}

function randomMove(fen, chars, abilities, color) {
    const game = new Chess(fen);
    const all = [...safeGetMoves(game), ...getAbilityMoves(fen, chars, abilities, color)];
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