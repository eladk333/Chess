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
const playerTypes = { w: 'human', b: 'human' }; // 'human', 'random', 'minimax'
let aiWorker = null;
let aiThinking = false;

// --- Character & Ability State ---
const chars = {
    w: 'none', // 'none', 'epstein', 'bibi', 'diddy', 'kirk'
    b: 'none'
};

const abilities = {
    w: { movesSinceLastUltimate: 0, huntingMode: false, movesSinceBabyOil: 10, babyOilActive: false, movesSinceUniSniper: 5, uniSniperActive: false },
    b: { movesSinceLastUltimate: 0, huntingMode: false, movesSinceBabyOil: 10, babyOilActive: false, movesSinceUniSniper: 5, uniSniperActive: false }
};

const ULTIMATE_CHARGE_REQ = 20;
const BABY_OIL_COOLDOWN = 10;
const UNI_SNIPER_COOLDOWN = 5;

// Avatar mappings based on the files you provided
const avatarMap = {
    'none': 'virgin_human.png',
    'epstein': 'epstien.jpg',
    'bibi': 'bibi.png',
    'diddy': 'diddy.jpg',
    'kirk': 'kirk.jfif',
    'noam': 'noam.jfif',
    'shlomo': 'shlomo.jfif'
};

function initGame() {
    createBoard();
    playSound('start'); // hypothetical game start sound

    // Character Selection Logic
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

        // Reset state
        abilities.w = { movesSinceLastUltimate: 0, huntingMode: false, movesSinceBabyOil: 10, babyOilActive: false, movesSinceUniSniper: 5, uniSniperActive: false, spentPoints: 0 };
        abilities.b = { movesSinceLastUltimate: 0, huntingMode: false, movesSinceBabyOil: 10, babyOilActive: false, movesSinceUniSniper: 5, uniSniperActive: false, spentPoints: 0 };
        aiThinking = false;
        document.body.classList.remove('hunting-mode');

        // Setup AI Worker
        if (aiWorker) { aiWorker.terminate(); aiWorker = null; }
        const needsAI = playerTypes.w !== 'human' || playerTypes.b !== 'human';
        if (needsAI) {
            aiWorker = new Worker('aiWorker.js');
            aiWorker.onmessage = handleAiResponse;
        }

        // Update UI Text & Avatars
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
        // Trigger AI if it's AI's turn first (white AI)
        scheduleAiTurnIfNeeded();
    });

    document.getElementById('restart-btn').addEventListener('click', () => {
        document.getElementById('game-over-modal').classList.add('hidden');
        document.getElementById('char-select-modal').style.display = 'flex';
    });

    // Ability Button Listeners
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
        btn.disabled = false; // Always enabled to toggle mode
    } else if (chars[color] === 'bibi') {
        btn.textContent = 'Ultimate Strike';
        status.textContent = '0/20 Moves';
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

            playSound('diddy'); // Generic sound hook
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

    scheduleAiTurnIfNeeded();
}

function handleDragStart(e) {
    if (game.game_over()) return;
    const turnColor = game.turn();
    const pieceColor = e.target.dataset.color;

    if (pieceColor !== turnColor || abilities[turnColor].huntingMode) {
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
    // Block human input during AI turn
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
        c: sq.charCodeAt(0) - 97, // a -> 0
        r: parseInt(sq[1]) // 1-8
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

    // Handle Kirk Uni Sniper Custom Capture BEFORE standard move gen
    if (chars[movingColor] === 'kirk' && abilities[movingColor].uniSniperActive && piece && piece.type === 'p') {
        const fromC = sqToCoords(from);
        const toC = sqToCoords(to);

        if (Math.abs(toC.c - fromC.c) === 2 && Math.abs(toC.r - fromC.r) === 2) {
            const dir = movingColor === 'w' ? 1 : -1;
            if (toC.r - fromC.r === 2 * dir) {
                // Valid sniper direction
                const interC = fromC.c + ((toC.c - fromC.c) / 2);
                const interR = fromC.r + dir;
                const interSq = coordsToSq(interC, interR);

                if (interSq && !game.get(interSq)) {
                    const targetPiece = game.get(to);
                    if (targetPiece && targetPiece.color !== movingColor && targetPiece.type !== 'k') {
                        // Execute Sniper Capture
                        abilities[movingColor].uniSniperActive = false;

                        // FEN manipulation teleport pawn
                        const newFen = movePieceInFen(game.fen(), from, to);
                        game.load(newFen);

                        postMoveLogic(movingColor);
                        playSound('snipe');
                        updateBoard();
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
            moveObj = { from, to, promotion: 'q' };
            break;
        }
    }

    if (!moveObj) return false;

    let slipSquare = null;

    // Check if enemy has Diddy Trap active
    if (chars[enemyColor] === 'diddy' && abilities[enemyColor].babyOilActive) {
        // Calculate direction vector
        const fromC = sqToCoords(from);
        const toC = sqToCoords(to);

        // Calculate the raw delta
        const dc = toC.c - fromC.c;
        const dr = toC.r - fromC.r;

        // Normalize direction mathematically (sign)
        const dirC = dc === 0 ? 0 : (dc > 0 ? 1 : -1);
        const dirR = dr === 0 ? 0 : (dr > 0 ? 1 : -1);

        const slipTargetCoord = { c: toC.c + dirC, r: toC.r + dirR };
        const potentialSlipSq = coordsToSq(slipTargetCoord.c, slipTargetCoord.r);

        if (potentialSlipSq) {
            // Is it empty? (No capturing on slip)
            const pieceAtSlip = game.get(potentialSlipSq);
            if (!pieceAtSlip) {
                slipSquare = potentialSlipSq;
            }
        }
    }

    if (slipSquare) {
        // We override the move entirely!
        game.move(moveObj);

        // Manual slip FEN manipulation to bypass chess.js history/put bugs
        const fen = game.fen();
        let newFen = movePieceInFen(fen, to, slipSquare);

        // movePieceInFen automatically flips the turn, but game.move() already flipped it. 
        // We must flip it back to prevent the same player from going twice.
        let tokens = newFen.split(' ');
        tokens[1] = tokens[1] === 'w' ? 'b' : 'w';
        game.load(tokens.join(' '));

        // Disable the trap
        abilities[enemyColor].babyOilActive = false;

        postMoveLogic(movingColor);
        playSound('slip'); // generic slip
        updateBoard(slipSquare); // animate slipping piece
        return true;
    } else {
        // Standard normal move
        const move = game.move(moveObj);
        if (move) {
            postMoveLogic(movingColor);
            updateBoard();
            return true;
        }
    }

    return false;
}

function movePieceInFen(fen, fromSq, toSq) {
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
    grid[toR][toC] = piece;

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
    tokens[1] = tokens[1] === 'w' ? 'b' : 'w'; // Flip the turn character
    tokens[3] = '-'; // Disable En Passant to be safe when teleporting pawns
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

    // Reset Epstein hunting mode off
    ['w', 'b'].forEach(c => {
        if (chars[c] === 'epstein') {
            abilities[c].huntingMode = false;
        }
        // Consume Uni Sniper buff on any move
        abilities[c].uniSniperActive = false;
    });

    document.body.classList.remove('hunting-mode');
    document.getElementById('bottom-ability-btn').classList.remove('active');
    document.getElementById('top-ability-btn').classList.remove('active');

    // Make sure we re-apply active state classes if one of them has a trap set
    ['w', 'b'].forEach(c => {
        const side = c === 'w' ? 'bottom' : 'top';
        if (chars[c] === 'diddy' && abilities[c].babyOilActive) {
            document.getElementById(`${side}-ability-btn`).classList.add('active');
        }
    });

    // Noam says his thing after every move
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

    // Shlomo wins for real after every move
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

    // Uni Sniper custom hints
    if (chars[turnColor] === 'kirk' && abilities[turnColor].uniSniperActive && piece && piece.type === 'p') {
        const currCoord = sqToCoords(sqId);
        const dir = turnColor === 'w' ? 1 : -1;

        const targetR = currCoord.r + (2 * dir);
        const targetC1 = currCoord.c - 2;
        const targetC2 = currCoord.c + 2;

        [targetC1, targetC2].forEach(tc => {
            const targetSq = coordsToSq(tc, targetR);
            if (targetSq) {
                // Check if intermediate is empty
                const interC = currCoord.c + ((tc - currCoord.c) / 2);
                const interR = currCoord.r + dir;
                const interSq = coordsToSq(interC, interR);

                if (interSq && !game.get(interSq)) {
                    // Check if target has ENEMY piece (not King)
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

// --- Abilities Implementations --- //

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
}

function switchTurn() {
    const fenTokens = game.fen().split(' ');
    fenTokens[1] = fenTokens[1] === 'w' ? 'b' : 'w';
    fenTokens[3] = '-';
    game.load(fenTokens.join(' '));
}

// --- Material Tracking ---

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

// Simple sound hook
function playSound(hook) {
    // We could play actual audio here. 
    // Example: new Audio('assets/sounds/' + hook + '.mp3').play();
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

    // Small delay so the board renders before the AI freezes
    setTimeout(() => {
        if (!aiWorker) return;
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
    aiThinking = false;
    // Hide both thinking labels
    document.getElementById('top-thinking').style.display = 'none';
    document.getElementById('bottom-thinking').style.display = 'none';

    if (!e.data.success) {
        console.error('AI Error:', e.data.error);
        return;
    }

    const { isAbility, move, depth, evalScore } = e.data.result;
    const nodes = e.data.nodes;
    const color = game.turn();

    // Display the stats
    const side = color === 'w' ? 'bottom' : 'top';
    if (depth !== undefined) {
        document.getElementById(`${side}-ai-stats`).textContent = `Depth: ${depth} | Eval: ${evalScore} | Nodes: ${nodes}`;
    }

    if (isAbility) {
        executeAbilityMove(color, move);
    } else {
        // Standard chess.js move
        const result = game.move({ from: move.from, to: move.to, promotion: 'q' });
        if (result) {
            postMoveLogic(color);
            updateBoard();
        }
    }

    // Schedule next AI turn if both players are AI
    setTimeout(scheduleAiTurnIfNeeded, 500);
}

function executeAbilityMove(color, move) {
    if (move.abilityType === 'bibi_ultimate') {
        move.toKill.forEach(sq => game.remove(sq));
        abilities[color].movesSinceLastUltimate = 0;
        switchTurn();
        postMoveLogic(color);
        playSound('bibi_ultimate');
        updateBoard();

    } else if (move.abilityType === 'epstein_buy') {
        game.remove(move.sq);
        game.put({ type: move.piece.type, color: color }, move.sq);
        abilities[color].spentPoints = (abilities[color].spentPoints || 0) + move.frontendCost;
        switchTurn();
        postMoveLogic(color);
        updateBoard();

    } else if (move.abilityType === 'kirk_snipe') {
        abilities[color].uniSniperActive = false;
        abilities[color].movesSinceUniSniper = 0;
        const newFen = movePieceInFen(game.fen(), move.from, move.to);
        game.load(newFen);
        postMoveLogic(color);
        playSound('snipe');
        updateBoard();

    } else if (move.abilityType === 'diddy_baby_oil') {
        abilities[color].babyOilActive = true;
        abilities[color].movesSinceBabyOil = 0;
        // After activating, AI still needs to make a standard move this turn
        // so we just mark the trap and let the normal move follow
    }
}

initGame();
