const boardEl = document.getElementById('board');
const game = new Chess();

const pieceMap = {
    'p': 'pawn',
    'n': 'knight',
    'b': 'bishop',
    'r': 'rook',
    'q': 'queen',
    'k': 'king'
};

const PIECE_VALUES = {
    'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0
};

const START_COUNTS = {
    'p': 8, 'n': 2, 'b': 2, 'r': 2, 'q': 1
};

const CAPTURE_ORDER = ['p', 'n', 'b', 'r', 'q'];

let selectedSquare = null;
let preventClick = false;

// --- AI Player State ---
const playerTypes = { w: 'human', b: 'human' };
let aiWorker = null;
let stockfishWorker = null;
let stockfishThinkingColor = null;
let aiThinking = false;

// --- Character & Ability State ---
const chars = {
    w: 'none',
    b: 'none'
};

const abilities = {
    w: { movesSinceLastUltimate: 0, huntingMode: false, movesSinceBabyOil: 10, babyOilActive: false, movesSinceUniSniper: 5, uniSniperActive: false },
    b: { movesSinceLastUltimate: 0, huntingMode: false, movesSinceBabyOil: 10, babyOilActive: false, movesSinceUniSniper: 5, uniSniperActive: false }
};

const ULTIMATE_CHARGE_REQ = 10;
const BABY_OIL_COOLDOWN = 5;
const UNI_SNIPER_COOLDOWN = 3;

const avatarMap = {
    'none': 'virgin_human.png',
    'epstein': 'epstien.jpg',
    'bibi': 'bibi.png',
    'diddy': 'diddy.jpg',
    'kirk': 'kirk.jfif',
    'noam': 'noam.jfif',
    'shlomo': 'shlomo.jfif',
    'dvir': 'dvir.jfif'
};

function initGame() {
    createBoard();
    playSound('start');

    document.querySelectorAll('.char-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const container = e.currentTarget.closest('.char-options');
            container.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
            e.currentTarget.classList.add('selected');
        });
    });

    document.getElementById('start-game-btn').addEventListener('click', () => {
        const whiteChar = document.querySelector('#white-char-options .char-card.selected').dataset.char;
        const blackChar = document.querySelector('#black-char-options .char-card.selected').dataset.char;

        chars.w = whiteChar;
        chars.b = blackChar;
        playerTypes.w = document.getElementById('white-ai-type').value;
        playerTypes.b = document.getElementById('black-ai-type').value;

        // Force Dvir to always use Stockfish, ignoring the UI selector
        if (chars.w === 'dvir') playerTypes.w = 'stockfish';
        if (chars.b === 'dvir') playerTypes.b = 'stockfish';

        abilities.w = { movesSinceLastUltimate: 0, huntingMode: false, movesSinceBabyOil: 10, babyOilActive: false, movesSinceUniSniper: 5, uniSniperActive: false, spentPoints: 0 };
        abilities.b = { movesSinceLastUltimate: 0, huntingMode: false, movesSinceBabyOil: 10, babyOilActive: false, movesSinceUniSniper: 5, uniSniperActive: false, spentPoints: 0 };
        aiThinking = false;
        document.body.classList.remove('hunting-mode');

        if (aiWorker) { aiWorker.terminate(); aiWorker = null; }
        if (stockfishWorker) { stockfishWorker.terminate(); stockfishWorker = null; }

        const needsStandardAI = playerTypes.w === 'random' || playerTypes.w === 'minimax' || playerTypes.b === 'random' || playerTypes.b === 'minimax';
        const needsStockfish = playerTypes.w === 'stockfish' || playerTypes.b === 'stockfish';

        if (needsStandardAI) {
            aiWorker = new Worker('aiWorker.js');
            aiWorker.onmessage = handleAiResponse;
            aiWorker.onerror = (err) => {
                console.error('AI Worker error:', err);
                aiThinking = false;
                setTimeout(scheduleAiTurnIfNeeded, 500);
            };
        }

        if (needsStockfish) {
            stockfishWorker = new Worker('stockfish.js');
            stockfishWorker.postMessage('uci');
            stockfishWorker.postMessage('setoption name Skill Level value 20');
            stockfishWorker.onmessage = function (e) {
                const line = typeof e.data === 'string' ? e.data : '';
                if (line.startsWith('bestmove')) {
                    const moveStr = line.split(' ')[1];
                    if (moveStr && moveStr !== '(none)') {
                        handleStockfishResponse(moveStr);
                    }
                }
            };
        }

        document.getElementById('bottom-char-name').textContent = formatCharName(whiteChar);
        document.getElementById('top-char-name').textContent = formatCharName(blackChar);

        document.getElementById('bottom-avatar').style.backgroundImage = `url('assets/players/${avatarMap[whiteChar]}')`;
        document.getElementById('top-avatar').style.backgroundImage = `url('assets/players/${avatarMap[blackChar]}')`;

        setupAbilityUI('w', 'bottom');
        setupAbilityUI('b', 'top');

        document.getElementById('top-ai-stats').textContent = '';
        document.getElementById('bottom-ai-stats').textContent = '';

        document.getElementById('char-select-modal').style.display = 'none';
        game.reset();
        selectedSquare = null;
        updateBoard();

        scheduleAiTurnIfNeeded();
    });

    document.getElementById('restart-btn').addEventListener('click', () => {
        document.getElementById('game-over-modal').classList.add('hidden');
        document.getElementById('char-select-modal').style.display = 'flex';
    });

    document.getElementById('bottom-ability-btn').addEventListener('click', () => handleAbilityClick('w'));
    document.getElementById('top-ability-btn').addEventListener('click', () => handleAbilityClick('b'));
}

function formatCharName(charId) {
    if (charId === 'none') return 'Standard';
    if (charId === 'epstein') return 'Epstein';
    if (charId === 'bibi') return 'Big Yahu';
    if (charId === 'diddy') return 'Diddy';
    if (charId === 'kirk') return 'Charlie Kirk';
    if (charId === 'noam') return 'Noam';
    if (charId === 'shlomo') return 'Shlomo';
    if (charId === 'dvir') return 'Dvir';
    return '';
}

function setupAbilityUI(color, side) {
    const container = document.getElementById(`${side}-ability-container`);
    const btn = document.getElementById(`${side}-ability-btn`);
    const status = document.getElementById(`${side}-ability-status`);

    container.classList.remove('hidden');
    btn.classList.remove('ready', 'active');
    btn.disabled = true;

    if (chars[color] === 'none') {
        container.classList.add('hidden');
    } else if (chars[color] === 'epstein') {
        btn.textContent = 'Buy Piece';
        status.textContent = 'Costs 3x Points';
        btn.disabled = false;
    } else if (chars[color] === 'bibi') {
        btn.textContent = 'Ultimate Strike';
        status.textContent = '0/10 Moves';
    } else if (chars[color] === 'diddy') {
        btn.textContent = 'Baby Oil';
        btn.classList.add('ready');
        status.textContent = 'Ready!';
        btn.disabled = false;
    } else if (chars[color] === 'kirk') {
        btn.textContent = 'Uni Sniper';
        btn.classList.add('ready');
        status.textContent = 'Ready!';
        btn.disabled = false;
    }
}

function handleAbilityClick(color) {
    if (game.turn() !== color) return;

    if (chars[color] === 'epstein') {
        abilities[color].huntingMode = !abilities[color].huntingMode;

        const side = color === 'w' ? 'bottom' : 'top';
        const btn = document.getElementById(`${side}-ability-btn`);

        if (abilities[color].huntingMode) {
            btn.classList.add('active');
            document.body.classList.add('hunting-mode');
            updateEpsteinBuyTargets(color);
        } else {
            btn.classList.remove('active');
            document.body.classList.remove('hunting-mode');
            clearValidMoves();
        }
    } else if (chars[color] === 'bibi') {
        if (abilities[color].movesSinceLastUltimate >= ULTIMATE_CHARGE_REQ) {
            triggerBibiUltimate(color);
        }
    } else if (chars[color] === 'diddy') {
        if (abilities[color].movesSinceBabyOil >= BABY_OIL_COOLDOWN && !abilities[color].babyOilActive) {
            abilities[color].babyOilActive = true;
            abilities[color].movesSinceBabyOil = 0;

            const side = color === 'w' ? 'bottom' : 'top';
            const btn = document.getElementById(`${side}-ability-btn`);
            btn.classList.remove('ready');
            btn.classList.add('active');
            document.getElementById(`${side}-ability-status`).textContent = 'Trap Set!';

            playSound('diddy');
        }
    } else if (chars[color] === 'kirk') {
        if (abilities[color].movesSinceUniSniper >= UNI_SNIPER_COOLDOWN && !abilities[color].uniSniperActive) {
            abilities[color].uniSniperActive = true;
            abilities[color].movesSinceUniSniper = 0;

            const side = color === 'w' ? 'bottom' : 'top';
            const btn = document.getElementById(`${side}-ability-btn`);
            btn.classList.remove('ready');
            btn.classList.add('active');
            document.getElementById(`${side}-ability-status`).textContent = 'Active!';

            playSound('kirk');
        }
    }
}

function createBoard() {
    boardEl.innerHTML = '';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const squareEl = document.createElement('div');
            const isLight = (row + col) % 2 === 0;
            squareEl.className = `square ${isLight ? 'light' : 'dark'}`;

            const file = String.fromCharCode(97 + col);
            const rank = 8 - row;
            const sqId = file + rank;
            squareEl.dataset.square = sqId;
            squareEl.id = sqId;

            if (col === 0) {
                const rankLabels = document.createElement('div');
                rankLabels.className = 'coord coord-row';
                rankLabels.textContent = rank;
                squareEl.appendChild(rankLabels);
            }
            if (row === 7) {
                const fileLabels = document.createElement('div');
                fileLabels.className = 'coord coord-col';
                fileLabels.textContent = file;
                squareEl.appendChild(fileLabels);
            }

            squareEl.addEventListener('dragover', (e) => e.preventDefault());
            squareEl.addEventListener('drop', handleDrop);
            squareEl.addEventListener('click', () => handleSquareClick(sqId));

            boardEl.appendChild(squareEl);
        }
    }
}

function updateBoard(animateSlipForSquare = null) {
    document.querySelectorAll('.square').forEach(sq => {
        Array.from(sq.children).forEach(child => {
            if (child.classList.contains('piece')) child.remove();
        });
        sq.classList.remove('highlight', 'selected', 'valid-move', 'valid-capture', 'buy-target', 'slipping');
    });

    const boardState = game.board();
    let moveHistory = game.history({ verbose: true });
    let lastMove = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : null;

    if (lastMove) {
        document.getElementById(lastMove.from).classList.add('highlight');
        document.getElementById(lastMove.to).classList.add('highlight');
    }

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row][col];
            if (piece) {
                const file = String.fromCharCode(97 + col);
                const rank = 8 - row;
                const sqId = file + rank;

                const pieceEl = document.createElement('div');
                pieceEl.className = 'piece';

                const colorStr = piece.color === 'w' ? 'white' : 'black';
                const typeStr = pieceMap[piece.type];

                pieceEl.style.backgroundImage = `url('assets/${colorStr}-${typeStr}.png')`;
                pieceEl.dataset.square = sqId;
                pieceEl.dataset.color = piece.color;

                if (sqId === animateSlipForSquare) {
                    pieceEl.classList.add('slipping');
                }

                pieceEl.draggable = true;
                pieceEl.addEventListener('dragstart', handleDragStart);
                pieceEl.addEventListener('dragend', handleDragEnd);

                document.getElementById(sqId).appendChild(pieceEl);
            }
        }
    }

    updateCaptureBars();
    updateAbilityDisplay();
    checkGameOver();
}

function updateAbilityDisplay() {
    ['w', 'b'].forEach(color => {
        const side = color === 'w' ? 'bottom' : 'top';
        const char = chars[color];
        if (char === 'none') return;

        const btn = document.getElementById(`${side}-ability-btn`);
        const status = document.getElementById(`${side}-ability-status`);

        if (char === 'bibi') {
            const charge = abilities[color].movesSinceLastUltimate;
            status.textContent = `${charge}/${ULTIMATE_CHARGE_REQ} Moves`;

            if (charge >= ULTIMATE_CHARGE_REQ) {
                btn.disabled = false || game.turn() !== color;
                btn.classList.add('ready');
            } else {
                btn.disabled = true;
                btn.classList.remove('ready');
            }
        } else if (char === 'epstein') {
            const myScoreInfo = getCapturedPointsInfo(color);
            status.textContent = `${myScoreInfo.pointsAvailable} pts available`;
            btn.disabled = game.turn() !== color;
        } else if (char === 'diddy') {
            if (abilities[color].babyOilActive) {
                status.textContent = 'Trap Active!';
                btn.disabled = true;
                btn.classList.add('active');
            } else {
                const charge = abilities[color].movesSinceBabyOil;
                btn.classList.remove('active');
                if (charge >= BABY_OIL_COOLDOWN) {
                    status.textContent = 'Ready!';
                    btn.disabled = game.turn() !== color;
                    btn.classList.add('ready');
                } else {
                    status.textContent = `Cooldown: ${BABY_OIL_COOLDOWN - charge}`;
                    btn.disabled = true;
                    btn.classList.remove('ready');
                }
            }
        } else if (char === 'kirk') {
            if (abilities[color].uniSniperActive) {
                status.textContent = 'Active!';
                btn.disabled = true;
                btn.classList.add('active');
            } else {
                const charge = abilities[color].movesSinceUniSniper;
                btn.classList.remove('active');
                if (charge >= UNI_SNIPER_COOLDOWN) {
                    status.textContent = 'Ready!';
                    btn.disabled = game.turn() !== color;
                    btn.classList.add('ready');
                } else {
                    status.textContent = `Cooldown: ${UNI_SNIPER_COOLDOWN - charge}`;
                    btn.disabled = true;
                    btn.classList.remove('ready');
                }
            }
        }
    });

    const turnColor = game.turn();
    if (chars[turnColor] === 'epstein' && abilities[turnColor].huntingMode) {
        updateEpsteinBuyTargets(turnColor);
    }
}

function handleDragStart(e) {
    if (game.game_over()) return;
    const turnColor = game.turn();
    const pieceColor = e.target.dataset.color;

    // FIX: Enforce human players and stop interaction while AI thinks
    if (pieceColor !== turnColor || abilities[turnColor].huntingMode || playerTypes[turnColor] !== 'human' || aiThinking) {
        e.preventDefault();
        return;
    }

    selectedSquare = e.target.dataset.square;
    e.dataTransfer.setData('text/plain', selectedSquare);
    e.dataTransfer.effectAllowed = 'move';

    setTimeout(() => {
        e.target.classList.add('dragging');
    }, 0);

    showValidMoves(selectedSquare);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    clearValidMoves();
    preventClick = true;
    setTimeout(() => preventClick = false, 50);
}

function handleDrop(e) {
    e.preventDefault();
    if (!selectedSquare) return;

    const targetSquare = e.currentTarget.dataset.square;
    attemptMove(selectedSquare, targetSquare);
    selectedSquare = null;
    clearValidMoves();
}

function handleSquareClick(sqId) {
    if (preventClick || game.game_over()) return;
    const turnColor = game.turn();
    if (playerTypes[turnColor] !== 'human' || aiThinking) return;
    const piece = game.get(sqId);

    if (chars[turnColor] === 'epstein' && abilities[turnColor].huntingMode) {
        if (piece && piece.color !== turnColor && piece.type !== 'k') {
            attemptBuyPiece(turnColor, sqId, piece);
        }
        return;
    }

    if (selectedSquare) {
        const moveAttempt = attemptMove(selectedSquare, sqId);
        if (moveAttempt) {
            selectedSquare = null;
            clearValidMoves();
            return;
        }
    }

    if (piece && piece.color === turnColor) {
        selectedSquare = sqId;
        clearValidMoves();
        document.getElementById(sqId).classList.add('selected');
        showValidMoves(sqId);
    } else {
        selectedSquare = null;
        clearValidMoves();
    }
}

function sqToCoords(sq) {
    return {
        c: sq.charCodeAt(0) - 97,
        r: parseInt(sq[1])
    };
}
function coordsToSq(c, r) {
    if (c < 0 || c > 7 || r < 1 || r > 8) return null;
    return String.fromCharCode(97 + c) + r;
}

function attemptMove(from, to) {
    if (from === to) return false;

    const movingColor = game.turn();
    const enemyColor = movingColor === 'w' ? 'b' : 'w';
    const piece = game.get(from);

    if (chars[movingColor] === 'kirk' && abilities[movingColor].uniSniperActive && piece && piece.type === 'p') {
        const fromC = sqToCoords(from);
        const toC = sqToCoords(to);

        if (Math.abs(toC.c - fromC.c) === 2 && Math.abs(toC.r - fromC.r) === 2) {
            const dir = movingColor === 'w' ? 1 : -1;
            if (toC.r - fromC.r === 2 * dir) {
                const interC = fromC.c + ((toC.c - fromC.c) / 2);
                const interR = fromC.r + dir;
                const interSq = coordsToSq(interC, interR);

                if (interSq && !game.get(interSq)) {
                    const targetPiece = game.get(to);
                    if (targetPiece && targetPiece.color !== movingColor && targetPiece.type !== 'k') {
                        abilities[movingColor].uniSniperActive = false;

                        // Use true so that it flips the turn via movePieceInFen
                        const newFen = movePieceInFen(game.fen(), from, to, true);
                        game.load(newFen);

                        postMoveLogic(movingColor);
                        playSound('snipe');
                        updateBoard();
                        // FIX: Ensure AI gets scheduled after human plays!
                        setTimeout(scheduleAiTurnIfNeeded, 500);
                        return true;
                    }
                }
            }
        }
    }

    const moves = game.moves({ verbose: true });
    let moveObj = null;

    for (let m of moves) {
        if (m.from === from && m.to === to) {
            moveObj = { from, to, promotion: m.promotion ? m.promotion : 'q' };
            break;
        }
    }

    if (!moveObj) return false;

    let slipSquare = null;
    let diddyTrapTriggered = false;

    if (chars[enemyColor] === 'diddy' && abilities[enemyColor].babyOilActive) {
        diddyTrapTriggered = true;
        const fromC = sqToCoords(from);
        const toC = sqToCoords(to);

        const dc = toC.c - fromC.c;
        const dr = toC.r - fromC.r;

        const dirC = dc === 0 ? 0 : (dc > 0 ? 1 : -1);
        const dirR = dr === 0 ? 0 : (dr > 0 ? 1 : -1);

        const slipTargetCoord = { c: toC.c + dirC, r: toC.r + dirR };
        const potentialSlipSq = coordsToSq(slipTargetCoord.c, slipTargetCoord.r);

        if (potentialSlipSq) {
            const pieceAtSlip = game.get(potentialSlipSq);
            if (!pieceAtSlip) {
                slipSquare = potentialSlipSq;
            }
        }
    }

    if (slipSquare) {
        game.move(moveObj);
        const fen = game.fen();

        // Pass false so movePieceInFen doesn't flip the turn (game.move already flipped it)
        let newFen = movePieceInFen(fen, to, slipSquare, false);
        game.load(newFen);

        abilities[enemyColor].babyOilActive = false;

        postMoveLogic(movingColor);
        playSound('slip');
        updateBoard(slipSquare);
        setTimeout(scheduleAiTurnIfNeeded, 500); // FIX: Ensure AI gets scheduled
        return true;
    } else {
        const move = game.move(moveObj);
        if (move) {
            if (diddyTrapTriggered) {
                abilities[enemyColor].babyOilActive = false;
            }
            postMoveLogic(movingColor);
            updateBoard();
            setTimeout(scheduleAiTurnIfNeeded, 500); // FIX: Ensure AI gets scheduled
            return true;
        }
    }

    return false;
}

// FIX: Added 'flipTurn' parameter to ensure human/AI share identically calculated turns
function movePieceInFen(fen, fromSq, toSq, flipTurn = true) {
    let tokens = fen.split(' ');
    let rows = tokens[0].split('/');

    let grid = [];
    for (let r = 0; r < 8; r++) {
        let rowGrid = [];
        for (let i = 0; i < rows[r].length; i++) {
            let char = rows[r][i];
            if (isNaN(parseInt(char))) {
                rowGrid.push(char);
            } else {
                for (let j = 0; j < parseInt(char); j++) {
                    rowGrid.push('');
                }
            }
        }
        grid.push(rowGrid);
    }

    const fromR = 8 - parseInt(fromSq[1]);
    const fromC = fromSq.charCodeAt(0) - 97;
    const toR = 8 - parseInt(toSq[1]);
    const toC = toSq.charCodeAt(0) - 97;

    const piece = grid[fromR][fromC];
    grid[fromR][fromC] = '';

    let finalPiece = piece;
    if (piece === 'p' && toR === 7) finalPiece = 'q';
    if (piece === 'P' && toR === 0) finalPiece = 'Q';

    grid[toR][toC] = finalPiece;

    let newRows = [];
    for (let r = 0; r < 8; r++) {
        let rowStr = '';
        let emptyCount = 0;
        for (let c = 0; c < 8; c++) {
            if (grid[r][c] === '') {
                emptyCount++;
            } else {
                if (emptyCount > 0) {
                    rowStr += emptyCount;
                    emptyCount = 0;
                }
                rowStr += grid[r][c];
            }
        }
        if (emptyCount > 0) rowStr += emptyCount;
        newRows.push(rowStr);
    }

    tokens[0] = newRows.join('/');

    // FIX: Respect turn flip correctly
    if (flipTurn) {
        tokens[1] = tokens[1] === 'w' ? 'b' : 'w';
    }

    tokens[3] = '-';
    return tokens.join(' ');
}

function postMoveLogic(colorWhoMoved) {
    if (chars[colorWhoMoved] === 'bibi') {
        abilities[colorWhoMoved].movesSinceLastUltimate++;
    }
    if (chars[colorWhoMoved] === 'diddy') {
        if (!abilities[colorWhoMoved].babyOilActive) {
            abilities[colorWhoMoved].movesSinceBabyOil++;
        }
    }
    if (chars[colorWhoMoved] === 'kirk') {
        if (!abilities[colorWhoMoved].uniSniperActive) {
            abilities[colorWhoMoved].movesSinceUniSniper++;
        }
    }

    ['w', 'b'].forEach(c => {
        if (chars[c] === 'epstein') {
            abilities[c].huntingMode = false;
        }
        abilities[c].uniSniperActive = false;
    });

    document.body.classList.remove('hunting-mode');
    document.getElementById('bottom-ability-btn').classList.remove('active');
    document.getElementById('top-ability-btn').classList.remove('active');

    ['w', 'b'].forEach(c => {
        const side = c === 'w' ? 'bottom' : 'top';
        if (chars[c] === 'diddy' && abilities[c].babyOilActive) {
            document.getElementById(`${side}-ability-btn`).classList.add('active');
        }
    });

    if (chars[colorWhoMoved] === 'noam') {
        const side = colorWhoMoved === 'w' ? 'bottom' : 'top';
        const label = document.getElementById(`${side}-thinking`);
        label.classList.add('noam-label');
        label.textContent = 'I am Homo!';
        label.style.display = 'inline';
        setTimeout(() => {
            label.style.display = 'none';
            label.textContent = '🤔 Thinking...';
            label.classList.remove('noam-label');
        }, 2000);
    }

    if (chars[colorWhoMoved] === 'shlomo') {
        setTimeout(() => {
            const modal = document.getElementById('game-over-modal');
            const msg = document.getElementById('game-over-message');
            const winner = colorWhoMoved === 'w' ? 'White (Shlomo)' : 'Black (Shlomo)';
            msg.textContent = `Checkmate! ${winner} wins!`;
            modal.classList.remove('hidden');
        }, 400);
    }
}

function showValidMoves(sqId) {
    const turnColor = game.turn();
    const piece = game.get(sqId);

    const moves = game.moves({ square: sqId, verbose: true });
    moves.forEach(m => {
        const targetSq = document.getElementById(m.to);
        if (targetSq) {
            if (m.flags.includes('c') || m.flags.includes('e')) {
                targetSq.classList.add('valid-capture');
            } else {
                targetSq.classList.add('valid-move');
            }
        }
    });

    if (chars[turnColor] === 'kirk' && abilities[turnColor].uniSniperActive && piece && piece.type === 'p') {
        const currCoord = sqToCoords(sqId);
        const dir = turnColor === 'w' ? 1 : -1;

        const targetR = currCoord.r + (2 * dir);
        const targetC1 = currCoord.c - 2;
        const targetC2 = currCoord.c + 2;

        [targetC1, targetC2].forEach(tc => {
            const targetSq = coordsToSq(tc, targetR);
            if (targetSq) {
                const interC = currCoord.c + ((tc - currCoord.c) / 2);
                const interR = currCoord.r + dir;
                const interSq = coordsToSq(interC, interR);

                if (interSq && !game.get(interSq)) {
                    const targetPiece = game.get(targetSq);
                    if (targetPiece && targetPiece.color !== turnColor && targetPiece.type !== 'k') {
                        document.getElementById(targetSq).classList.add('valid-capture');
                    }
                }
            }
        });
    }
}

function clearValidMoves() {
    document.querySelectorAll('.square').forEach(sq => {
        sq.classList.remove('valid-move', 'valid-capture', 'selected', 'buy-target');
    });
}

function getCapturedPointsInfo(color) {
    const { capByWhite, capByBlack } = getMaterialBalance();
    const myCaps = color === 'w' ? capByWhite : capByBlack;

    let totalValueAvailable = 0;
    Object.keys(myCaps).forEach(pt => {
        totalValueAvailable += (myCaps[pt] * PIECE_VALUES[pt]);
    });

    return { pointsAvailable: totalValueAvailable - (abilities[color].spentPoints || 0) };
}

function updateEpsteinBuyTargets(color) {
    clearValidMoves();
    const { pointsAvailable } = getCapturedPointsInfo(color);

    const boardState = game.board();
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = boardState[r][c];
            if (p && p.color !== color && p.type !== 'k') {
                const cost = PIECE_VALUES[p.type] * 3;
                if (pointsAvailable >= cost) {
                    const file = String.fromCharCode(97 + c);
                    const rank = 8 - r;
                    document.getElementById(file + rank).classList.add('buy-target');
                }
            }
        }
    }
}

function attemptBuyPiece(buyerColor, targetSq, piece) {
    const { pointsAvailable } = getCapturedPointsInfo(buyerColor);
    const cost = PIECE_VALUES[piece.type] * 3;

    if (pointsAvailable >= cost) {
        abilities[buyerColor].spentPoints = (abilities[buyerColor].spentPoints || 0) + cost;
        game.remove(targetSq);
        game.put({ type: piece.type, color: buyerColor }, targetSq);
        switchTurn();
        postMoveLogic(buyerColor);
        updateBoard();

        // FIX: Ensure AI gets scheduled after a human uses an ability
        setTimeout(scheduleAiTurnIfNeeded, 500);
    }
}

function triggerBibiUltimate(color) {
    const enemyColor = color === 'w' ? 'b' : 'w';
    let toKill = [];

    const boardState = game.board();

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = boardState[r][c];
            if (p && p.color === enemyColor && p.type !== 'k') {
                const sqCode = String.fromCharCode(97 + c) + (8 - r);

                game.remove(sqCode);
                game.put({ type: p.type, color: color }, sqCode);

                const fen = game.fen();
                const enemyFen = fen.replace(` ${color} `, ` ${enemyColor} `);

                let isDefended = false;
                try {
                    const tempGame = new Chess(enemyFen);
                    const tempMoves = tempGame.moves({ verbose: true });
                    isDefended = tempMoves.some(m => m.to === sqCode);
                } catch (e) { }

                game.remove(sqCode);
                game.put({ type: p.type, color: enemyColor }, sqCode);

                if (!isDefended) {
                    toKill.push(sqCode);
                }
            }
        }
    }

    toKill.forEach(sq => {
        game.remove(sq);
    });

    abilities[color].movesSinceLastUltimate = 0;
    const btnId = color === 'w' ? 'bottom-ability-btn' : 'top-ability-btn';
    document.getElementById(btnId).classList.remove('ready', 'active');

    switchTurn();
    postMoveLogic(color);
    updateBoard();

    // FIX: Ensure AI gets scheduled after a human uses an ability
    setTimeout(scheduleAiTurnIfNeeded, 500);
}

function switchTurn() {
    const fenTokens = game.fen().split(' ');
    fenTokens[1] = fenTokens[1] === 'w' ? 'b' : 'w';
    fenTokens[3] = '-';
    game.load(fenTokens.join(' '));
}

function getMaterialBalance() {
    let white = 0;
    let black = 0;
    const currentCounts = {
        w: { 'p': 0, 'n': 0, 'b': 0, 'r': 0, 'q': 0 },
        b: { 'p': 0, 'n': 0, 'b': 0, 'r': 0, 'q': 0 }
    };

    const board = game.board();
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (p) {
                if (p.type === 'k') continue;
                if (p.color === 'w') {
                    white += PIECE_VALUES[p.type];
                    currentCounts.w[p.type]++;
                } else {
                    black += PIECE_VALUES[p.type];
                    currentCounts.b[p.type]++;
                }
            }
        }
    }

    const capByWhite = {};
    const capByBlack = {};

    ['p', 'n', 'b', 'r', 'q'].forEach(pt => {
        capByWhite[pt] = Math.max(0, START_COUNTS[pt] - currentCounts.b[pt]);
        capByBlack[pt] = Math.max(0, START_COUNTS[pt] - currentCounts.w[pt]);
    });

    return { score: white - black, capByWhite, capByBlack, currentCounts };
}

function updateCaptureBars() {
    const { score, capByWhite, capByBlack } = getMaterialBalance();

    const topCapEl = document.getElementById('top-captures');
    const bottomCapEl = document.getElementById('bottom-captures');

    topCapEl.innerHTML = '';
    bottomCapEl.innerHTML = '';

    renderCaptures(topCapEl, capByBlack, 'white', score < 0 ? Math.abs(score) : 0);
    renderCaptures(bottomCapEl, capByWhite, 'black', score > 0 ? score : 0);
}

function renderCaptures(container, capturedDict, imgColorStr, plusScore) {
    if (plusScore > 0 && imgColorStr === 'black') {
        const scoreEl = document.createElement('span');
        scoreEl.className = 'material-advantage';
        scoreEl.textContent = `+${plusScore}`;
        container.appendChild(scoreEl);
    }

    CAPTURE_ORDER.forEach(pt => {
        const count = capturedDict[pt];
        for (let i = 0; i < count; i++) {
            const div = document.createElement('div');
            div.className = 'captured-piece';
            div.style.backgroundImage = `url('assets/${imgColorStr}-${pieceMap[pt]}.png')`;
            container.appendChild(div);
        }
    });

    if (plusScore > 0 && imgColorStr === 'white') {
        const scoreEl = document.createElement('span');
        scoreEl.className = 'material-advantage';
        scoreEl.textContent = `+${plusScore}`;
        container.appendChild(scoreEl);
    }
}

function checkGameOver() {
    if (game.game_over()) {
        const modal = document.getElementById('game-over-modal');
        const msg = document.getElementById('game-over-message');

        if (game.in_checkmate()) {
            const winner = game.turn() === 'w' ? 'Black' : 'White';
            msg.textContent = `Checkmate! ${winner} wins.`;
        } else if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) {
            msg.textContent = 'Game drawn!';
        }
        modal.classList.remove('hidden');
    }
}

function playSound(hook) {
    console.log("Playing sound:", hook);
}

// ---- AI Turn Logic ----

function scheduleAiTurnIfNeeded() {
    const color = game.turn();
    if (game.game_over() || aiThinking) return;
    if (playerTypes[color] === 'human') return;

    aiThinking = true;
    const side = color === 'w' ? 'bottom' : 'top';
    document.getElementById(`${side}-thinking`).style.display = 'inline';
    document.getElementById(`${side}-ai-stats`).textContent = '';

    setTimeout(() => {
        // Intercept Stockfish turns
        if (playerTypes[color] === 'stockfish' && stockfishWorker) {
            stockfishThinkingColor = color;
            stockfishWorker.postMessage(`position fen ${game.fen()}`);
            stockfishWorker.postMessage(`go movetime 1500`);
            return;
        }

        if (!aiWorker) { aiThinking = false; return; }
        aiWorker.postMessage({
            fen: game.fen(),
            chars: chars,
            abilities: abilities,
            color: color,
            aiType: playerTypes[color]
        });
    }, 300);
}

function handleAiResponse(e) {
    document.getElementById('top-thinking').style.display = 'none';
    document.getElementById('bottom-thinking').style.display = 'none';

    if (!e.data.success) {
        console.error('AI Error:', e.data.error);
        aiThinking = false;
        setTimeout(scheduleAiTurnIfNeeded, 500);
        return;
    }

    const { isAbility, move, depth, evalScore } = e.data.result;
    const nodes = e.data.nodes;

    const color = game.turn();
    const side = color === 'w' ? 'bottom' : 'top';

    if (depth !== undefined) {
        document.getElementById(`${side}-ai-stats`).textContent = `Depth: ${depth} | Eval: ${evalScore} | Nodes: ${nodes}`;
    }

    aiThinking = false;

    if (isAbility) {
        executeAbilityMove(color, move);
    } else {
        const success = attemptMove(move.from, move.to);
        if (!success) {
            const result = game.move({ from: move.from, to: move.to, promotion: 'q' });
            if (result) {
                postMoveLogic(color);
                updateBoard();

                // FIX: Fallback AI move successfully completed, schedule next turn!
                setTimeout(scheduleAiTurnIfNeeded, 500);
            }
        }
    }
}
function handleStockfishResponse(uciMove) {
    document.getElementById('top-thinking').style.display = 'none';
    document.getElementById('bottom-thinking').style.display = 'none';

    const color = stockfishThinkingColor;
    const side = color === 'w' ? 'bottom' : 'top';
    document.getElementById(`${side}-ai-stats`).textContent = `Engine: Stockfish 10`;

    aiThinking = false;

    const move = {
        from: uciMove.substring(0, 2),
        to: uciMove.substring(2, 4),
        promotion: uciMove.length > 4 ? uciMove[4] : 'q'
    };

    const success = attemptMove(move.from, move.to);
    if (!success) {
        const result = game.move(move);
        if (result) {
            postMoveLogic(color);
            updateBoard();
            setTimeout(scheduleAiTurnIfNeeded, 500);
        }
    }
}
function executeAbilityMove(color, move) {
    if (move.abilityType === 'bibi_ultimate') {
        move.toKill.forEach(sq => game.remove(sq));
        abilities[color].movesSinceLastUltimate = 0;
        switchTurn();
        postMoveLogic(color);
        playSound('bibi_ultimate');
        updateBoard();
        setTimeout(scheduleAiTurnIfNeeded, 500);

    } else if (move.abilityType === 'epstein_buy') {
        game.remove(move.sq);
        game.put({ type: move.piece.type, color: color }, move.sq);
        abilities[color].spentPoints = (abilities[color].spentPoints || 0) + move.frontendCost;
        switchTurn();
        postMoveLogic(color);
        updateBoard();
        setTimeout(scheduleAiTurnIfNeeded, 500);

    } else if (move.abilityType === 'kirk_snipe') {
        abilities[color].uniSniperActive = false;
        abilities[color].movesSinceUniSniper = 0;
        const newFen = movePieceInFen(game.fen(), move.from, move.to, true);
        game.load(newFen);
        postMoveLogic(color);
        playSound('snipe');
        updateBoard();
        setTimeout(scheduleAiTurnIfNeeded, 500);

    } else if (move.abilityType === 'diddy_baby_oil') {
        abilities[color].babyOilActive = true;
        abilities[color].movesSinceBabyOil = 0;
        updateBoard();

        // This is correct as 300ms because baby oil sets the trap but doesn't end the turn.
        setTimeout(scheduleAiTurnIfNeeded, 300);
    }
}

initGame();