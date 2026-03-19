const socket = io();
let myColor = null;
let currentRoom = null;
let gameMode = null; // 'single' or 'multi'
let isBoardFlipped = false; // Controls the visual rotation of the board
let selectedMultiplayerMode = 'quick'; // 'quick' or 'arena'
let arenaRoster = [];const game = new Chess();
const boardEl = document.getElementById('board');

// Helper to assign UI components to the correct physical side of the screen
function getSide(color) {
    return isBoardFlipped ? (color === 'b' ? 'bottom' : 'top') : (color === 'w' ? 'bottom' : 'top');
}
// --- OPTIONS MENU WIRING ---
document.getElementById('btn-options').addEventListener('click', () => {
    document.getElementById('options-modal').style.display = 'flex';
});

document.getElementById('btn-resume').addEventListener('click', () => {
    document.getElementById('options-modal').style.display = 'none';
});

document.getElementById('btn-quit').addEventListener('click', () => {
    location.reload(); 
});
// --- MAIN MENU & LOCAL WIZARD WIRING ---
document.getElementById('btn-singleplayer').addEventListener('click', () => {
    gameMode = 'single';
    document.getElementById('main-menu').style.display = 'none';

    // Show local mode wizard
    document.getElementById('local-mode-menu').style.display = 'flex';
    document.getElementById('local-step-1').style.display = 'block';
    document.getElementById('local-step-1p').style.display = 'none';
    document.getElementById('local-step-0p').style.display = 'none';
});

// Back button logic for the wizard
document.getElementById('btn-back-local').addEventListener('click', () => {
    if (document.getElementById('local-step-1').style.display === 'block') {
        document.getElementById('local-mode-menu').style.display = 'none';
        document.getElementById('main-menu').style.display = 'flex';
    } else {
        document.getElementById('local-step-1p').style.display = 'none';
        document.getElementById('local-step-0p').style.display = 'none';
        document.getElementById('local-step-1').style.display = 'block';
    }
});

// 2 Players selected
document.getElementById('btn-2-players').addEventListener('click', () => {
    document.getElementById('white-ai-type').value = 'human';
    document.getElementById('black-ai-type').value = 'human';
    proceedToCharSelect();
});

// 1 Player selected
document.getElementById('btn-1-player').addEventListener('click', () => {
    document.getElementById('local-step-1').style.display = 'none';
    document.getElementById('local-step-1p').style.display = 'block';
});

document.getElementById('btn-confirm-1p').addEventListener('click', () => {
    const playerColor = document.getElementById('1p-color').value;
    const aiLevel = document.getElementById('1p-ai').value;

    if (playerColor === 'w') {
        document.getElementById('white-ai-type').value = 'human';
        document.getElementById('black-ai-type').value = aiLevel;
    } else {
        document.getElementById('white-ai-type').value = aiLevel;
        document.getElementById('black-ai-type').value = 'human';
    }
    proceedToCharSelect();
});

// 0 Players selected
document.getElementById('btn-0-players').addEventListener('click', () => {
    document.getElementById('local-step-1').style.display = 'none';
    document.getElementById('local-step-0p').style.display = 'block';
});

document.getElementById('btn-confirm-0p').addEventListener('click', () => {
    document.getElementById('white-ai-type').value = document.getElementById('0p-w-ai').value;
    document.getElementById('black-ai-type').value = document.getElementById('0p-b-ai').value;
    proceedToCharSelect();
});

// The final handoff to the Character Selection screen
function proceedToCharSelect() {
    document.getElementById('local-mode-menu').style.display = 'none';
    document.getElementById('game-container').style.display = 'flex';

    // Hide the original AI dropdowns in the Character Select modal to keep it clean!
    document.querySelectorAll('.player-type-row').forEach(row => {
        row.style.display = 'none';
    });

    document.querySelector('.select-col:first-child').style.display = 'block';
    document.querySelector('.select-col:last-child').style.display = 'block';
    document.getElementById('char-select-modal').style.display = 'flex';
}

document.getElementById('btn-multiplayer').addEventListener('click', () => {
    gameMode = 'multi';
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('multiplayer-menu').style.display = 'flex';
    document.getElementById('room-display').textContent = '';
    document.getElementById('room-code-input').value = '';
});
function syncCustomState() {
    if (currentRoom && gameMode === 'multi') {
        socket.emit('sync_custom_state', {
            roomId: currentRoom,
            fen: game.fen(),
            abilities: abilities
        });
    }
}
// Back button for Multiplayer Menu
document.getElementById('btn-back-multiplayer').addEventListener('click', () => {
    document.getElementById('multiplayer-menu').style.display = 'none';
    document.getElementById('main-menu').style.display = 'flex';
});
// --- Multiplayer UI Wiring ---
document.getElementById('mode-quick').addEventListener('click', (e) => {
    selectedMultiplayerMode = 'quick';
    e.target.classList.add('active-mode');
    e.target.style.backgroundColor = ''; // Restores green CSS
    document.getElementById('mode-arena').classList.remove('active-mode');
    document.getElementById('mode-arena').style.backgroundColor = '#444'; // Greys out arena
});

document.getElementById('mode-arena').addEventListener('click', (e) => {
    selectedMultiplayerMode = 'arena';
    e.target.classList.add('active-mode');
    e.target.style.backgroundColor = ''; // Restores green CSS
    document.getElementById('mode-quick').classList.remove('active-mode');
    document.getElementById('mode-quick').style.backgroundColor = '#444'; // Greys out quick
});

document.getElementById('create-room-btn').addEventListener('click', () => {
    socket.emit('create_room', selectedMultiplayerMode);
});

document.getElementById('join-room-btn').addEventListener('click', () => {
    const code = document.getElementById('room-code-input').value.trim().toUpperCase();
    if (code) {
        socket.emit('join_room', code);
        currentRoom = code;
        document.getElementById('room-display').textContent = `Joined Room: ${code}. Game starting!`;
    }
});

socket.on('room_created', (roomId) => {
    currentRoom = roomId;
    document.getElementById('room-display').textContent = `Your Room Code: ${roomId} (Waiting for friend...)`;
});

socket.on('player_color', (color) => {
    myColor = color;
});

// Handle new room join architecture
socket.on('room_joined', (data) => {
    document.getElementById('multiplayer-menu').style.display = 'none';
    
    if (data.mode === 'arena') {
        selectedMultiplayerMode = 'arena';
        initArenaDraft();
    } else {
        selectedMultiplayerMode = 'quick';
        myColor = data.players.w === socket.id ? 'w' : 'b';
        socket.emit('player_color', myColor); // Ensure color is set
        document.getElementById('game-container').style.display = 'flex';
        
        if (myColor === 'w') {
            document.querySelector('.select-col:last-child').style.display = 'none';
        } else {
            document.querySelector('.select-col:first-child').style.display = 'none';
        }

        document.querySelectorAll('.player-type-row').forEach(row => row.style.display = 'none');
        document.getElementById('start-game-btn').textContent = 'Ready';
        document.getElementById('char-select-modal').style.display = 'flex';
        updateBoard();
    }
});

function initArenaDraft() {
    document.getElementById('arena-draft-modal').style.display = 'flex';
    arenaRoster = [];
    
    // Copy the white char options to the arena pool
    const poolContainer = document.getElementById('arena-char-pool');
    poolContainer.innerHTML = document.querySelector('#white-char-options').innerHTML;
    
    poolContainer.querySelectorAll('.char-card').forEach(card => {
        card.classList.remove('selected');
        // Clear any old inline styles from previous matches
        card.style.opacity = '1';
        card.style.cursor = 'pointer';
        card.style.borderColor = ''; 

        card.addEventListener('click', () => {
            const charId = card.dataset.char;
            // CHECK: Prevent duplicates from being added!
            if (arenaRoster.length < 4 && !arenaRoster.includes(charId)) {
                arenaRoster.push(charId);
                updateDraftSlots();
            }
        });
    });

    // Handle clicking a slot to remove a pick
    document.querySelectorAll('.draft-slot').forEach(slot => {
        // Clear old event listeners by cloning the node to prevent double-firing bugs
        const newSlot = slot.cloneNode(true);
        slot.parentNode.replaceChild(newSlot, slot);
        
        newSlot.addEventListener('click', () => {
            const index = parseInt(newSlot.dataset.index);
            if (arenaRoster.length > index) {
                arenaRoster.splice(index, 1);
                updateDraftSlots();
            }
        });
    });
    
    // Initial UI reset
    updateDraftSlots(); 
}

function updateDraftSlots() {
    // 1. Update the slots at the top
    const slots = document.querySelectorAll('.draft-slot');
    slots.forEach((slot, index) => {
        if (arenaRoster[index]) {
            slot.classList.add('filled');
            slot.style.backgroundImage = `url('assets/players/${avatarMap[arenaRoster[index]]}')`;
        } else {
            slot.classList.remove('filled');
            slot.style.backgroundImage = 'none';
        }
    });

    // 2. Visually disable the picked characters in the pool
    const poolCards = document.querySelectorAll('#arena-char-pool .char-card');
    poolCards.forEach(card => {
        if (arenaRoster.includes(card.dataset.char)) {
            card.style.opacity = '0.3';
            card.style.cursor = 'not-allowed';
            card.style.borderColor = '#777';
        } else {
            card.style.opacity = '1';
            card.style.cursor = 'pointer';
            card.style.borderColor = ''; // Reverts to CSS default
        }
    });

    // 3. Update Lock Button state
    const lockBtn = document.getElementById('lock-arena-picks-btn');
    if (arenaRoster.length === 4) {
        lockBtn.disabled = false;
        lockBtn.style.backgroundColor = '#5c8a3f';
    } else {
        lockBtn.disabled = true;
        lockBtn.style.backgroundColor = '#555';
    }
}
document.getElementById('lock-arena-picks-btn').addEventListener('click', () => {
    document.getElementById('lock-arena-picks-btn').textContent = "Waiting for opponent...";
    document.getElementById('lock-arena-picks-btn').disabled = true;
    socket.emit('arena_picks_locked', { roomId: currentRoom, roster: arenaRoster });
});

socket.on('arena_match_start', (data) => {
    myColor = data.color;
    game.load(data.fen);
    
    document.getElementById('arena-draft-modal').style.display = 'none';
    document.getElementById('game-over-modal').classList.add('hidden');
    
    const transition = document.getElementById('arena-transition-overlay');
    transition.style.display = 'flex';
    
    document.getElementById('arena-match-title').textContent = `Match ${data.matchNum}`;
    document.getElementById('arena-score-you').textContent = data.scores[socket.id];
    
    const oppId = Object.keys(data.scores).find(id => id !== socket.id);
    document.getElementById('arena-score-opp').textContent = data.scores[oppId];
    document.getElementById('arena-transition-status').textContent = 'Preparing the board...';

    setTimeout(() => {
        transition.style.display = 'none';
        startGameFlow({ 
            w: myColor === 'w' ? data.myChar : data.opponentChar, 
            b: myColor === 'b' ? data.myChar : data.opponentChar 
        });
    }, 3000);
});

socket.on('arena_match_over_announcement', (data) => {
    const modal = document.getElementById('game-over-modal');
    const msg = document.getElementById('game-over-message');
    document.getElementById('restart-btn').style.display = 'none'; // Hide restart in arena

    if (data.winnerColor === 'draw') {
        msg.textContent = 'Match Drawn! Next match starting soon...';
    } else {
        const winnerName = data.winnerColor === myColor ? 'You Win!' : 'Opponent Wins!';
        msg.textContent = `${winnerName} Next match starting soon...`;
    }
    modal.classList.remove('hidden');
});

socket.on('arena_tournament_over', (data) => {
    const modal = document.getElementById('game-over-modal');
    const msg = document.getElementById('game-over-message');
    document.getElementById('restart-btn').style.display = 'block';
    
    const myScore = data.scores[socket.id];
    const oppId = Object.keys(data.scores).find(id => id !== socket.id);
    const oppScore = data.scores[oppId];

    if (myScore > oppScore) {
        msg.textContent = `🏆 TOURNAMENT WINNER! (${myScore} to ${oppScore})`;
    } else if (oppScore > myScore) {
        msg.textContent = `💀 DEFEAT! (${myScore} to ${oppScore})`;
    } else {
        msg.textContent = `🤝 TOURNAMENT DRAW! (${myScore} to ${oppScore})`;
    }
    modal.classList.remove('hidden');
});

// --- Game Loop Sync ---
socket.on('game_start', (data) => {
    game.load(data.fen);
document.getElementById('multiplayer-menu').style.display = 'none';
document.getElementById('game-container').style.display = 'flex';

    // UI FIX: Hide the character column of the opponent!
    if (myColor === 'w') {
        document.querySelector('.select-col:last-child').style.display = 'none'; // Hide Black
    } else {
        document.querySelector('.select-col:first-child').style.display = 'none'; // Hide White
    }

    // Hide the AI selection dropdown for multiplayer
    document.querySelectorAll('.player-type-row').forEach(row => {
        row.style.display = 'none';
    });

    // Change the button text to Ready
    document.getElementById('start-game-btn').textContent = 'Ready';

    document.getElementById('char-select-modal').style.display = 'flex';
    updateBoard();
});

socket.on('state_update', (data) => {
    game.load(data.fen);
    // Run postMoveLogic for whoever just moved — both players need it
    // skipSync=true so we don't trigger a loop
    if (data.lastMoveColor) {
        postMoveLogic(data.lastMoveColor, true);
    }
    updateBoard();
    scheduleAiTurnIfNeeded();
});
socket.on('sync_custom_state', (data) => {
    game.load(data.fen);
    // Must mutate in-place since abilities is const
    if (data.abilities) {
        Object.assign(abilities.w, data.abilities.w);
        Object.assign(abilities.b, data.abilities.b);
    }
    updateBoard();
    scheduleAiTurnIfNeeded();
});
socket.on('invalid_move', (data) => {
    game.load(data.fen);
    updateBoard();
});

// When both players are ready, initialize game abilities and draw characters
socket.on('both_ready', (serverChars) => {
    startGameFlow(serverChars);
});
socket.on('opponent_ready', () => {
    document.getElementById('room-display').textContent = 'Opponent is ready! Waiting for you...';
});

// If the server tells us the opponent left, alert the player and auto-quit
socket.on('opponent_quit', () => {
    alert("Your opponent has disconnected from the game.");
    document.getElementById('btn-quit').click(); // Re-use your existing quit logic!
});

function startGameFlow(selectedChars) {
    chars.w = selectedChars.w;
    chars.b = selectedChars.b;

    if (gameMode !== 'multi') {
        playerTypes.w = document.getElementById('white-ai-type').value;
        playerTypes.b = document.getElementById('black-ai-type').value;
        if (chars.w === 'dvir') playerTypes.w = 'stockfish';
        if (chars.b === 'dvir') playerTypes.b = 'stockfish';
    } else {
        playerTypes.w = 'human';
        playerTypes.b = 'human';
        
        // If playing multiplayer and YOUR character is Dvir, let Stockfish take the wheel
        if (myColor && chars[myColor] === 'dvir') {
            playerTypes[myColor] = 'stockfish';
        }
    }

   abilities.w = { movesSinceLastUltimate: 0, huntingMode: false, movesSinceBabyOil: 10, babyOilActive: false, movesSinceUniSniper: 5, uniSniperActive: false, spentPoints: 0, earnedPoints: 0, movesSinceSmoke: 5, smokeActive: false, smokeRemainingMoves: 0, smokeCenterSq: null, targetingSmoke: false, movesSinceWall: 3, placingWall: false, walls: [], georgeConsecutiveChecks: 0, georgeSecondMovePending: false };
    
    abilities.b = { movesSinceLastUltimate: 0, huntingMode: false, movesSinceBabyOil: 10, babyOilActive: false, movesSinceUniSniper: 5, uniSniperActive: false, spentPoints: 0, earnedPoints: 0, movesSinceSmoke: 5, smokeActive: false, smokeRemainingMoves: 0, smokeCenterSq: null, targetingSmoke: false, movesSinceWall: 3, placingWall: false, walls: [], georgeConsecutiveChecks: 0, georgeSecondMovePending: false };
    document.body.classList.remove('hunting-mode');
    
    // Reset AI thinking lock and ensure single-player board is strictly reset
    aiThinking = false;
    const startingFen = generateCustomFen(chars.w, chars.b);
    
   lastFenForHighlight = startingFen;
    lastHighlightSquares = [];
    
    game.load(startingFen);

    // --- DYNAMICALLY TRACK STARTING PIECES FOR THE VISUAL UI ---
    matchStartCounts = { w: { 'p': 0, 'n': 0, 'b': 0, 'r': 0, 'q': 0 }, b: { 'p': 0, 'n': 0, 'b': 0, 'r': 0, 'q': 0 } };
    const initialBoard = game.board();
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = initialBoard[r][c];
            if (p && p.type !== 'k') matchStartCounts[p.color][p.type]++;
        }
    }
    // -----------------------------------------------------------

    if (gameMode === 'multi') {
        syncCustomState();
    }
    document.getElementById('game-container').style.display = 'flex'; // Ensure board is visible

    // Flip the board if playing solely as black
    isBoardFlipped = false;
    if (gameMode === 'multi' && myColor === 'b') {
        isBoardFlipped = true;
    } else if (gameMode === 'single' && playerTypes.b === 'human' && playerTypes.w !== 'human') {
        isBoardFlipped = true;
    }
    createBoard(); // Recreate visually based on flip status

    if (aiWorker) { aiWorker.terminate(); aiWorker = null; }
    if (stockfishWorker) { stockfishWorker.terminate(); stockfishWorker = null; }

    const needsStandardAI = playerTypes.w === 'random' || playerTypes.w === 'minimax' || playerTypes.b === 'random' || playerTypes.b === 'minimax';
    const needsStockfish = playerTypes.w === 'stockfish' || playerTypes.b === 'stockfish';

    if (needsStandardAI) {
        aiWorker = new Worker('aiWorker.js');
        aiWorker.onmessage = handleAiResponse;
        aiWorker.onerror = (err) => {
            console.error('AI Worker fatal error:', err.message || err);
            aiThinking = false;
            document.getElementById('top-thinking').style.display = 'none';
            document.getElementById('bottom-thinking').style.display = 'none';
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

    document.getElementById(`${getSide('w')}-char-name`).textContent = formatCharName(chars.w);
    document.getElementById(`${getSide('b')}-char-name`).textContent = formatCharName(chars.b);

    document.getElementById(`${getSide('w')}-avatar`).style.backgroundImage = `url('assets/players/${avatarMap[chars.w]}')`;
    document.getElementById(`${getSide('b')}-avatar`).style.backgroundImage = `url('assets/players/${avatarMap[chars.b]}')`;

    setupAbilityUI('w', getSide('w'));
    setupAbilityUI('b', getSide('b'));

    document.getElementById('top-ai-stats').textContent = '';
    document.getElementById('bottom-ai-stats').textContent = '';

    document.getElementById('char-select-modal').style.display = 'none';

    // Reset the ready button for next time
    const btn = document.getElementById('start-game-btn');
    btn.textContent = 'Ready';
    btn.disabled = false;
    btn.style.backgroundColor = '';

    selectedSquare = null;
    updateBoard();
    scheduleAiTurnIfNeeded();
}

const pieceMap = { 'p': 'pawn', 'n': 'knight', 'b': 'bishop', 'r': 'rook', 'q': 'queen', 'k': 'king' };
const PIECE_VALUES = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0 };
const START_COUNTS = { 'p': 8, 'n': 2, 'b': 2, 'r': 2, 'q': 1 };
const CAPTURE_ORDER = ['p', 'n', 'b', 'r', 'q'];

let matchStartCounts = { w: {}, b: {} }; // Track dynamic starting pieces

let selectedSquare = null;
let preventClick = false;

let lastFenForHighlight = null;
let lastHighlightSquares = [];

// Manually parses FEN strings to find changed squares
function getChangedSquares(fen1, fen2) {
    if (!fen1 || !fen2) return [];
    const changed = [];
    const b1 = fen1.split(' ')[0].split('/');
    const b2 = fen2.split(' ')[0].split('/');
    
    for (let r = 0; r < 8; r++) {
        let a1 = [], a2 = [];
        // Convert FEN rows into simple 8-length arrays
        for (let char of b1[r]) isNaN(char) ? a1.push(char) : a1.push(...Array(parseInt(char)).fill(''));
        for (let char of b2[r]) isNaN(char) ? a2.push(char) : a2.push(...Array(parseInt(char)).fill(''));
        
        // Compare the squares
        for (let c = 0; c < 8; c++) {
            if (a1[c] !== a2[c]) changed.push(String.fromCharCode(97 + c) + (8 - r));
        }
    }
    return changed;
}


const playerTypes = { w: 'human', b: 'human' };
let aiWorker = null;
let stockfishWorker = null;
let stockfishThinkingColor = null;
let aiThinking = false;

const chars = { w: 'none', b: 'none' };
const abilities = {
    w: { movesSinceLastUltimate: 0, huntingMode: false, movesSinceBabyOil: 10, babyOilActive: false, movesSinceUniSniper: 5, uniSniperActive: false, movesSinceSmoke: 5, smokeActive: false, smokeRemainingMoves: 0, smokeCenterSq: null, targetingSmoke: false, movesSinceWall: 3, placingWall: false, walls: [] },
    b: { movesSinceLastUltimate: 0, huntingMode: false, movesSinceBabyOil: 10, babyOilActive: false, movesSinceUniSniper: 5, uniSniperActive: false, movesSinceSmoke: 5, smokeActive: false, smokeRemainingMoves: 0, smokeCenterSq: null, targetingSmoke: false, movesSinceWall: 3, placingWall: false, walls: [] }
};

const ULTIMATE_CHARGE_REQ = 10;
const BABY_OIL_COOLDOWN = 5;
const UNI_SNIPER_COOLDOWN = 3;

const avatarMap = {
   'none': 'virgin_human.png', 'epstein': 'epstien.jpg', 'bibi': 'bibi.png', 'diddy': 'diddy.jpg', 'kirk': 'kirk.jfif', 'noam': 'noam.jfif', 'shlomo': 'shlomo.jfif', 'dvir': 'dvir.jfif', 'aheud': 'barak.png', 'trump': 'trump.jfif', 'george': 'george.jfif', 'stalin': 'stalin.jfif'
};
function generateCustomFen(wChar, bChar) {
    let grid = [
        ['r','n','b','q','k','b','n','r'],
        ['p','p','p','p','p','p','p','p'],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['','','','','','','',''],
        ['P','P','P','P','P','P','P','P'],
        ['R','N','B','Q','K','B','N','R']
    ];

    if (bChar === 'stalin') {
        grid[0] = ['','','','','k','','',''];
        grid[1] = ['p','p','p','p','p','p','p','p'];
        grid[2] = ['p','p','p','p','p','p','p','p'];
        grid[3] = ['p','p','p','p','p','p','p','p'];
    }
    if (wChar === 'stalin') {
        grid[7] = ['','','','','K','','',''];
        grid[6] = ['P','P','P','P','P','P','P','P'];
        grid[5] = ['P','P','P','P','P','P','P','P'];
        grid[4] = ['P','P','P','P','P','P','P','P'];
    }

    let fenRows = [];
    for (let r = 0; r < 8; r++) {
        let rowStr = '';
        let emptyCount = 0;
        for (let c = 0; c < 8; c++) {
            if (grid[r][c] === '') {
                emptyCount++;
            } else {
                if (emptyCount > 0) { rowStr += emptyCount; emptyCount = 0; }
                rowStr += grid[r][c];
            }
        }
        if (emptyCount > 0) rowStr += emptyCount;
        fenRows.push(rowStr);
    }

    let castling = '';
    if (wChar !== 'stalin') castling += 'KQ';
    if (bChar !== 'stalin') castling += 'kq';
    if (castling === '') castling = '-';

    return `${fenRows.join('/')} w ${castling} - 0 1`;
}
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

    // MULTIPLAYER & SINGLE PLAYER READY BUTTON LOGIC
    document.getElementById('start-game-btn').addEventListener('click', () => {
        if (gameMode === 'single') {
            const wChar = document.querySelector('#white-char-options .char-card.selected').dataset.char;
            const bChar = document.querySelector('#black-char-options .char-card.selected').dataset.char;
            startGameFlow({ w: wChar, b: bChar });
        } else if (gameMode === 'multi') {
            if (!currentRoom || !myColor) return;

            const charId = myColor === 'w'
                ? document.querySelector('#white-char-options .char-card.selected').dataset.char
                : document.querySelector('#black-char-options .char-card.selected').dataset.char;

            socket.emit('player_ready', { roomId: currentRoom, charId: charId });

            const btn = document.getElementById('start-game-btn');
            btn.textContent = 'Waiting for opponent...';
            btn.disabled = true;
            btn.style.backgroundColor = '#555';
        }
    });

    document.getElementById('restart-btn').addEventListener('click', () => {
        document.getElementById('game-over-modal').classList.add('hidden');
        
        if (gameMode === 'multi') {
            // In multiplayer, the safest way to "Play Again" and clear the server room is a clean reload
            location.reload(); 
        } else {
            // In singleplayer, reset the board and go back to character select
            game.reset(); 
            document.getElementById('game-container').style.display = 'none';
            document.getElementById('char-select-modal').style.display = 'flex';
        }
    });

    document.getElementById('bottom-ability-btn').addEventListener('click', () => handleAbilityClick(isBoardFlipped ? 'b' : 'w'));
    document.getElementById('top-ability-btn').addEventListener('click', () => handleAbilityClick(isBoardFlipped ? 'w' : 'b'));
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
    if (charId === 'aheud') return 'Aheud Barak';
    if (charId === 'trump') return 'Donald Trump';
    if (charId === 'george') return 'George Floyd';
    if (charId === 'stalin') return 'Joseph Stalin';
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
        btn.textContent = 'Air Strike';
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
    } else if (chars[color] === 'aheud') {
        btn.textContent = 'Smoke Bomb';
        btn.classList.add('ready');
        status.textContent = 'Ready!';
        btn.disabled = false;
    } else if (chars[color] === 'trump') {
        btn.textContent = 'Build Wall';
        btn.classList.add('ready');
        status.textContent = 'Ready!';
        btn.disabled = false;
    } else if (chars[color] === 'george') {
        btn.textContent = 'Passive';
        if (color === 'b') status.textContent = 'Double Move';
        if (color === 'w') status.textContent = 'Fragile Ego';
    } else if (chars[color] === 'stalin') {
        btn.textContent = 'Passive';
        status.textContent = 'Soviet Wave';
    }
}

function handleAbilityClick(color) {
    if (gameMode === 'multi' && color !== myColor) return;
    if (game.turn() !== color) return;

    if (chars[color] === 'epstein') {
        abilities[color].huntingMode = !abilities[color].huntingMode;

        const side = getSide(color);
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

            const side = getSide(color);
            const btn = document.getElementById(`${side}-ability-btn`);
            btn.classList.remove('ready');
            btn.classList.add('active');
            document.getElementById(`${side}-ability-status`).textContent = 'Trap Set!';

            syncCustomState();
            playSound('diddy');
        }
    } else if (chars[color] === 'kirk') {
        if (abilities[color].movesSinceUniSniper >= UNI_SNIPER_COOLDOWN && !abilities[color].uniSniperActive) {
            abilities[color].uniSniperActive = true;
            abilities[color].movesSinceUniSniper = 0;

            const side = getSide(color);
            const btn = document.getElementById(`${side}-ability-btn`);
            btn.classList.remove('ready');
            btn.classList.add('active');
            document.getElementById(`${side}-ability-status`).textContent = 'Active!';

            syncCustomState();
            playSound('kirk');
        }
    } else if (chars[color] === 'aheud') {
        if (abilities[color].movesSinceSmoke >= 5 && !abilities[color].smokeActive) {
            abilities[color].targetingSmoke = !abilities[color].targetingSmoke;
            const side = getSide(color);
            const btn = document.getElementById(`${side}-ability-btn`);

            if (abilities[color].targetingSmoke) {
                btn.classList.add('active');
                document.body.classList.add('targeting-smoke');
            } else {
                btn.classList.remove('active');
                document.body.classList.remove('targeting-smoke');
            }
        }
    } else if (chars[color] === 'trump') {
        if (abilities[color].movesSinceWall >= 3) {
            abilities[color].placingWall = !abilities[color].placingWall;
            const side = getSide(color);
            const btn = document.getElementById(`${side}-ability-btn`);
            if (abilities[color].placingWall) {
                btn.classList.add('active');
                document.body.classList.add('placing-wall');
            } else {
                btn.classList.remove('active');
                document.body.classList.remove('placing-wall');
            }
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

            // Map the visual representation based on flipped status
            const fileIndex = isBoardFlipped ? 7 - col : col;
            const rankIndex = isBoardFlipped ? row : 7 - row;

            const file = String.fromCharCode(97 + fileIndex);
            const rank = rankIndex + 1;
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
            if (child.classList.contains('piece') || child.classList.contains('smoke-overlay') || child.classList.contains('wall-overlay')) child.remove();
        });
        sq.classList.remove('highlight', 'selected', 'valid-move', 'valid-capture', 'buy-target', 'slipping', 'obscured', 'friendly-obscured');
    });

    const smokedSquaresW = new Set();
    const smokedSquaresB = new Set();
    ['w', 'b'].forEach(c => {
        if (abilities[c].smokeActive && abilities[c].smokeCenterSq) {
            const center = sqToCoords(abilities[c].smokeCenterSq);
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const sq = coordsToSq(center.c + dc, center.r + dr);
                    if (sq) {
                        if (c === 'w') smokedSquaresW.add(sq);
                        if (c === 'b') smokedSquaresB.add(sq);
                    }
                }
            }
        }
    });

    const boardState = game.board();
    const currentFen = game.fen();
    // Only check for highlights if the actual piece positions changed
    if (lastFenForHighlight && lastFenForHighlight.split(' ')[0] !== currentFen.split(' ')[0]) {
        const changed = getChangedSquares(lastFenForHighlight, currentFen);
        if (changed.length > 0) {
            lastHighlightSquares = changed;
        }
    }
    lastFenForHighlight = currentFen;

    lastHighlightSquares.forEach(sq => {
        const el = document.getElementById(sq);
        if (el) el.classList.add('highlight');
    });

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const file = String.fromCharCode(97 + col);
            const rank = 8 - row;
            const sqId = file + rank;

            const piece = boardState[row][col];
            if (piece) {
                const pieceEl = document.createElement('div');
                pieceEl.className = 'piece';

                const colorStr = piece.color === 'w' ? 'white' : 'black';
                const typeStr = pieceMap[piece.type];

                pieceEl.style.backgroundImage = `url('assets/${colorStr}-${typeStr}.png')`;
                //pieceEl.style.pointerEvents = 'none';
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

            const smokedByW = smokedSquaresW.has(sqId);
            const smokedByB = smokedSquaresB.has(sqId);

            if (smokedByW || smokedByB) {
                let isMySmoke = false;
                let isEnemySmoke = false;
                
                // Viewer is "myColor" in multiplayer, or whoever's turn it is in singleplayer
                const viewerColor = (gameMode === 'multi' && myColor) ? myColor : game.turn();

                if (viewerColor === 'w') {
                    isMySmoke = smokedByW;
                    isEnemySmoke = smokedByB;
                } else {
                    isMySmoke = smokedByB;
                    isEnemySmoke = smokedByW;
                }

                const smokeEl = document.createElement('div');
                
                if (isEnemySmoke) {
                    document.getElementById(sqId).classList.add('obscured');
                    smokeEl.className = 'smoke-overlay';
                } else if (isMySmoke) {
                    document.getElementById(sqId).classList.add('friendly-obscured');
                    smokeEl.className = 'smoke-overlay friendly-smoke';
                }
                
                document.getElementById(sqId).appendChild(smokeEl);
            }

            const allWalls = [...(abilities.w.walls || []), ...(abilities.b.walls || [])];
            if (allWalls.includes(sqId)) {
                const wallEl = document.createElement('div');
                wallEl.className = 'wall-overlay';
                document.getElementById(sqId).appendChild(wallEl);
            }
        }
    }

    updateCaptureBars();
    updateAbilityDisplay();
    checkGameOver();
}

function updateAbilityDisplay() {
    ['w', 'b'].forEach(color => {
        const side = getSide(color);
        const char = chars[color];
        if (char === 'none') return;

        const btn = document.getElementById(`${side}-ability-btn`);
        const status = document.getElementById(`${side}-ability-status`);

       if (char === 'bibi') {
            const charge = abilities[color].movesSinceLastUltimate;

            if (charge >= ULTIMATE_CHARGE_REQ) {
                status.textContent = 'Ready!';
                btn.disabled = false || game.turn() !== color;
                btn.classList.add('ready');
            } else {
                status.textContent = `${charge}/${ULTIMATE_CHARGE_REQ} Moves`;
                btn.disabled = true;
                btn.classList.remove('ready');
            }
        } else if (char === 'epstein') {
            const myScoreInfo = getCapturedPointsInfo(color);
            status.textContent = `${myScoreInfo.pointsAvailable} pts available`;
            btn.disabled = game.turn() !== color;
        } else if (char === 'diddy') {
            const isOpponent = (gameMode === 'multi' && myColor && color !== myColor);
            
            if (abilities[color].babyOilActive) {
                if (isOpponent) {
                    status.textContent = 'Ready!';
                    btn.disabled = true; 
                    btn.classList.add('ready');
                    btn.classList.remove('active');
                } else {
                    status.textContent = 'Trap Active!';
                    btn.disabled = true;
                    btn.classList.add('active');
                    btn.classList.remove('ready');
                }
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
        } else if (char === 'aheud') {
            if (abilities[color].smokeActive) {
                status.textContent = `Active (${abilities[color].smokeRemainingMoves})`;
                btn.disabled = true;
                btn.classList.add('active');
            } else {
                const charge = abilities[color].movesSinceSmoke;
                btn.classList.remove('active');
                if (charge >= 5) {
                    status.textContent = 'Ready!';
                    btn.disabled = game.turn() !== color;
                    btn.classList.add('ready');
                } else {
                    status.textContent = `Cooldown: ${5 - charge}`;
                    btn.disabled = true;
                    btn.classList.remove('ready');
                }
           }
        } else if (char === 'trump') {
            const charge = abilities[color].movesSinceWall;
            if (abilities[color].placingWall) {
                status.textContent = 'Select Square';
                btn.disabled = true;
                btn.classList.add('active');
            } else if (charge >= 3) {
                status.textContent = 'Ready!';
                btn.disabled = game.turn() !== color;
                btn.classList.add('ready');
            } else {
                status.textContent = `Cooldown: ${3 - charge}`;
                btn.disabled = true;
                btn.classList.remove('ready');
            }
        } else if (char === 'george') {
            if (color === 'b') {
                status.textContent = abilities[color].georgeSecondMovePending ? '2nd Move!' : 'Double Move';
                btn.classList.toggle('active', abilities[color].georgeSecondMovePending);
            } else {
                status.textContent = `Checks: ${abilities[color].georgeConsecutiveChecks || 0}/3`;
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

    if (pieceColor !== turnColor || abilities[turnColor].huntingMode || playerTypes[turnColor] !== 'human' || aiThinking || (gameMode === 'multi' && turnColor !== myColor)) {
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
    if (chars[turnColor] === 'trump' && abilities[turnColor].placingWall && (gameMode !== 'multi' || turnColor === myColor)) {
        const allWalls = [...(abilities.w.walls || []), ...(abilities.b.walls || [])];
        if (!piece && !allWalls.includes(sqId)) { 
            abilities[turnColor].walls = [sqId];
            abilities[turnColor].placingWall = false;
            abilities[turnColor].movesSinceWall = 0;
            document.body.classList.remove('placing-wall');
            document.getElementById(`${getSide(turnColor)}-ability-btn`).classList.remove('active', 'ready');
            playSound('wall');
            switchTurn(); 
            postMoveLogic(turnColor, true);
            syncCustomState();
            updateBoard();
            setTimeout(scheduleAiTurnIfNeeded, 500);
        }
        return;
    }
    if (chars[turnColor] === 'aheud' && abilities[turnColor].targetingSmoke && (gameMode !== 'multi' || turnColor === myColor)) {
        abilities[turnColor].targetingSmoke = false;
        abilities[turnColor].smokeActive = true;
        abilities[turnColor].smokeRemainingMoves = 4;
        abilities[turnColor].movesSinceSmoke = 0;
        abilities[turnColor].smokeCenterSq = sqId;

        document.body.classList.remove('targeting-smoke');
        document.getElementById(`${getSide(turnColor)}-ability-btn`).classList.remove('ready', 'active');

        playSound('smoke');
        syncCustomState();
        updateBoard();
        return;
    }
    if (chars[turnColor] === 'epstein' && abilities[turnColor].huntingMode && (gameMode !== 'multi' || turnColor === myColor)) {
    if (piece && piece.color !== turnColor && piece.type !== 'k') {
        attemptBuyPiece(turnColor, sqId);
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

// --- UNIFIED ATTEMPT MOVE ---
function attemptMove(from, to) {
    if (from === to) return false;

    // MULTIPLAYER CHECK: Prevent moving out of turn visually!
    if (myColor && game.turn() !== myColor) return false;

    const movingColor = game.turn();
    const enemyColor = movingColor === 'w' ? 'b' : 'w';
    const piece = game.get(from);
    const targetPiece = game.get(to);

    // --- GEORGE KING CAPTURE OVERRIDE ---
    if (chars[movingColor] === 'george' && movingColor === 'b' && targetPiece && targetPiece.type === 'k' && targetPiece.color === enemyColor) {
 
        game.remove(to);
        game.put({ type: 'q', color: enemyColor }, to); // Temp replace with Queen to validate attack
        const pseudoMoves = game.moves({ verbose: true });
        const validAttack = pseudoMoves.find(m => m.from === from && m.to === to);
        game.remove(to);
        game.put({ type: 'k', color: enemyColor }, to); // Restore King

        if (validAttack) {
        let newFen = movePieceInFen(game.fen(), from, to, true);
        game.load(newFen);
        postMoveLogic(movingColor, true);
        updateBoard();
        if (currentRoom) socket.emit('sync_custom_state', { roomId: currentRoom, fen: game.fen(), abilities: abilities });
        checkGameOver();
        return true;
        }
    }

    // --- CUSTOM ABILITIES (Kirk Sniper) ---
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
                        const newFen = movePieceInFen(game.fen(), from, to, true);
                        game.load(newFen);
                        postMoveLogic(movingColor, true);
                        playSound('snipe');
                        updateBoard();
                        syncCustomState();
    setTimeout(scheduleAiTurnIfNeeded, 500);
    return true;
                    }
                }
            }
        }
    }

    // --- STANDARD MOVE VALIDATION ---
    const moves = game.moves({ verbose: true });
    const allWalls = [...(abilities.w.walls || []), ...(abilities.b.walls || [])];
    if (isBlockedByWall(game.fen(), from, to, allWalls)) return false;
    let moveObj = moves.find(m => m.from === from && m.to === to);

    if (!moveObj) return false;

    if (moveObj.flags && (moveObj.flags.includes('c') || moveObj.flags.includes('e'))) {
        abilities[movingColor].earnedPoints = (abilities[movingColor].earnedPoints || 0) + PIECE_VALUES[moveObj.captured];
        if (currentRoom) {
            socket.emit('sync_custom_state', { roomId: currentRoom, fen: game.fen(), abilities: abilities });
        }
    }

    // --- CUSTOM ABILITIES (Diddy Baby Oil) ---
    let slipSquare = null;

    if (chars[enemyColor] === 'diddy' && abilities[enemyColor].babyOilActive) {
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

    // --- APPLY THE MOVE ---
    if (slipSquare) {
        // Slip: apply locally and sync to opponent — do NOT emit make_move (server would overwrite with the wrong FEN)
        game.move(moveObj);
        const fen = game.fen();
        let newFen = movePieceInFen(fen, to, slipSquare, false);
        game.load(newFen);
        abilities[enemyColor].babyOilActive = false;
        
        // --- DIDDY VOICE LINE TRIGGER ---
        const diddySide = getSide(enemyColor);
        const label = document.getElementById(`${diddySide}-thinking`);
        label.style.color = '#ff66b2';
        label.style.fontSize = '1.5em';
        label.textContent = "You got diddly!";
        label.style.display = 'inline';

        setTimeout(() => {
            label.style.display = 'none';
            label.textContent = '🤔 Thinking...';
            label.style.color = '';
            label.style.fontSize = '';
        }, 2000);
        // --------------------------------

        postMoveLogic(movingColor, true);
        syncCustomState();
        playSound('slip');
        updateBoard(slipSquare);
        setTimeout(scheduleAiTurnIfNeeded, 500);
        return true;
    } if (currentRoom) {
        // Multiplayer normal move: send to server, it echoes back via state_update — don't apply locally
        socket.emit('make_move', {
            roomId: currentRoom,
            move: { from, to, promotion: moveObj.promotion || 'q' }
        });
        return true;
    } else {
        // Singleplayer: apply locally
        const move = game.move(moveObj);
        if (move) {
            postMoveLogic(movingColor);
            updateBoard();
            setTimeout(scheduleAiTurnIfNeeded, 500);
            return true;
        }
    }

    return false;
}

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

    if (flipTurn) {
        tokens[1] = tokens[1] === 'w' ? 'b' : 'w';
    }

    tokens[3] = '-';
    return tokens.join(' ');
}

function postMoveLogic(colorWhoMoved, skipSync = false) {
    const hist = game.history({ verbose: true });
    const lastMove = hist.length > 0 ? hist[hist.length - 1] : null;
    const isCapture = lastMove && (lastMove.flags.includes('c') || lastMove.flags.includes('e'));

    if (chars[colorWhoMoved] === 'bibi' && isCapture) {
        const side = getSide(colorWhoMoved);
        const label = document.getElementById(`${side}-thinking`);

        label.style.color = 'green';
        label.style.fontSize = '1.5em';
        label.textContent = 'Yummy! Palestine kids';
        label.style.display = 'inline';

        setTimeout(() => {
            label.style.display = 'none';
            label.textContent = '🤔 Thinking...';
            label.style.color = '';
            label.style.fontSize = '';
        }, 2000);
    }

    const victimColor = colorWhoMoved === 'w' ? 'b' : 'w';
    if (chars[victimColor] === 'bibi' && isCapture) {
        const victimSide = getSide(victimColor);
        const victimLabel = document.getElementById(`${victimSide}-thinking`);

        victimLabel.style.color = 'red';
        victimLabel.style.fontSize = '1.5em';
        victimLabel.textContent = '!!!היועמשית';
        victimLabel.style.display = 'inline';

        setTimeout(() => {
            victimLabel.style.display = 'none';
            victimLabel.textContent = '🤔 Thinking...';
            victimLabel.style.color = '';
            victimLabel.style.fontSize = '';
        }, 2000);
    }

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
    if (chars[colorWhoMoved] === 'aheud') {
        if (abilities[colorWhoMoved].smokeActive) {
            abilities[colorWhoMoved].smokeRemainingMoves--;
            if (abilities[colorWhoMoved].smokeRemainingMoves <= 0) {
                abilities[colorWhoMoved].smokeActive = false;
            }
        } else {
            abilities[colorWhoMoved].movesSinceSmoke++;
        }
    }
    if (chars[colorWhoMoved] === 'trump') abilities[colorWhoMoved].movesSinceWall++;

   ['w', 'b'].forEach(c => {
        if (chars[c] === 'trump') abilities[c].placingWall = false;
        if (chars[c] === 'epstein') {
            abilities[c].huntingMode = false;
        }
        // Only cancel sniper/smoke-targeting for the color that just moved
        if (c === colorWhoMoved) {
            abilities[c].uniSniperActive = false;
            abilities[c].targetingSmoke = false;
        }
    });

    document.body.classList.remove('hunting-mode', 'targeting-smoke', 'placing-wall');
    document.getElementById('bottom-ability-btn').classList.remove('active');
    document.getElementById('top-ability-btn').classList.remove('active');

    ['w', 'b'].forEach(c => {
        const side = getSide(c);
        const isOpponent = (gameMode === 'multi' && myColor && c !== myColor);
        if (chars[c] === 'diddy' && abilities[c].babyOilActive && !isOpponent) {
            document.getElementById(`${side}-ability-btn`).classList.add('active');
        }
    });

    if (chars[colorWhoMoved] === 'noam') {
        const side = getSide(colorWhoMoved);
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
            if (gameMode === 'multi' && selectedMultiplayerMode === 'arena') {
                // In Arena Mode, tell the server to tally the score and start the next match
                if (myColor === colorWhoMoved) {
                    socket.emit('arena_match_ended', { roomId: currentRoom, winnerColor: colorWhoMoved });
                }
            } else {
                // Quick Game / Singleplayer fallback
                const modal = document.getElementById('game-over-modal');
                const msg = document.getElementById('game-over-message');
                const winner = colorWhoMoved === 'w' ? 'White (Shlomo)' : 'Black (Shlomo)';
                msg.textContent = `Checkmate! ${winner} wins!`;
                modal.classList.remove('hidden');
            }
        }, 400);
    }

    // --- GEORGE ABILITY LOGIC ---
    const currentTurn = game.turn(); 
    if (chars.w === 'george' && currentTurn === 'w') {
        if (game.in_check()) {
            abilities.w.georgeConsecutiveChecks++;
        if (abilities.w.georgeConsecutiveChecks >= 3) {
            const side = getSide('w');
            const label = document.getElementById(`${side}-thinking`);
            label.style.color = 'red';
            label.style.fontSize = '1.5em';
            label.textContent = "I can't breathe!";
            label.style.display = 'inline';

            // --- UI CLEANUP: Hide and reset the text after 2 seconds ---
            setTimeout(() => {
                label.style.display = 'none';
                label.textContent = '🤔 Thinking...';
                label.style.color = '';
                label.style.fontSize = '';
            }, 2000);
            // -----------------------------------------------------------

            setTimeout(() => {
                if (gameMode === 'multi' && selectedMultiplayerMode === 'arena') {
                    // In Arena Mode, Black wins
                    if (myColor === 'b') {
                        socket.emit('arena_match_ended', { roomId: currentRoom, winnerColor: 'b' });
                    }
        } else {
            // Quick Game / Singleplayer fallback
            const modal = document.getElementById('game-over-modal');
            const msg = document.getElementById('game-over-message');
            msg.textContent = `I can't breathe!`;
            modal.classList.remove('hidden');
        }
    }, 800);
    return; // ← זה השינוי הכי חשוב — עוצר את המשחק
}
        } else {
            abilities.w.georgeConsecutiveChecks = 0;
        }
    }

    if (chars.b === 'george' && colorWhoMoved === 'b') {
        let whiteKingAlive = false;
        const boardState = game.board();
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = boardState[r][c];
                if (p && p.type === 'k' && p.color === 'w') {
                    whiteKingAlive = true;
                }
            }
        }

        if (!whiteKingAlive || game.game_over()) {
            abilities.b.georgeSecondMovePending = false;
        } else if (!abilities.b.georgeSecondMovePending) {
            abilities.b.georgeSecondMovePending = true;
            switchTurn();
            updateAbilityDisplay();
            
            // Force server synchronization for the extra turn
            if (currentRoom && myColor === 'b') {
                socket.emit('sync_custom_state', { 
                    roomId: currentRoom, 
                    fen: game.fen(), 
                    abilities: abilities 
                });
            }
            
            setTimeout(scheduleAiTurnIfNeeded, 400);
        } else {
            abilities.b.georgeSecondMovePending = false;
        }
    }

    if (!skipSync) {
        syncCustomState();
    }
}

function showValidMoves(sqId) {
    const turnColor = game.turn();
    const piece = game.get(sqId);

    const moves = game.moves({ square: sqId, verbose: true });
    const allWalls = [...(abilities.w.walls || []), ...(abilities.b.walls || [])];
    moves.forEach(m => {
        if (isBlockedByWall(game.fen(), m.from, m.to, allWalls)) return;
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
    const earned = abilities[color].earnedPoints || 0;
    const spent = abilities[color].spentPoints || 0;
    return { pointsAvailable: earned - spent };
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

function attemptBuyPiece(buyerColor, targetSq) {
    const targetPiece = game.get(targetSq);

    if (
        !targetPiece ||
        targetPiece.color === buyerColor ||
        targetPiece.type === 'k'
    ) {
        return false;
    }

    const { pointsAvailable } = getCapturedPointsInfo(buyerColor);
    const cost = PIECE_VALUES[targetPiece.type] * 3;

    if (pointsAvailable < cost) {
        return false;
    }

    abilities[buyerColor].spentPoints = (abilities[buyerColor].spentPoints || 0) + cost;
    game.remove(targetSq);
    game.put({ type: targetPiece.type, color: buyerColor }, targetSq);
    switchTurn();
    postMoveLogic(buyerColor, true);
    syncCustomState();
    updateBoard();
    setTimeout(scheduleAiTurnIfNeeded, 500);
    return true;
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
    const btnId = `${getSide(color)}-ability-btn`;
    document.getElementById(btnId).classList.remove('ready', 'active');

    switchTurn();
    postMoveLogic(color, true);
    syncCustomState();
    updateBoard();
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
        // Use the dynamic matchStartCounts instead of the standard START_COUNTS
        capByWhite[pt] = Math.max(0, (matchStartCounts.b[pt] || 0) - currentCounts.b[pt]);
        capByBlack[pt] = Math.max(0, (matchStartCounts.w[pt] || 0) - currentCounts.w[pt]);
    });

    return { score: white - black, capByWhite, capByBlack, currentCounts };
}

function updateCaptureBars() {
    const { score, capByWhite, capByBlack } = getMaterialBalance();

    const topCapEl = document.getElementById('top-captures');
    const bottomCapEl = document.getElementById('bottom-captures');

    topCapEl.innerHTML = '';
    bottomCapEl.innerHTML = '';

    if (isBoardFlipped) {
        // If flipped, bottom is Black and top is White
        renderCaptures(topCapEl, capByWhite, 'black', score > 0 ? score : 0);
        renderCaptures(bottomCapEl, capByBlack, 'white', score < 0 ? Math.abs(score) : 0);
    } else {
        renderCaptures(topCapEl, capByBlack, 'white', score < 0 ? Math.abs(score) : 0);
        renderCaptures(bottomCapEl, capByWhite, 'black', score > 0 ? score : 0);
    }
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
    const modal = document.getElementById('game-over-modal');
    const msg = document.getElementById('game-over-message');

    // --- CUSTOM KING CAPTURE CHECK ---
    let whiteKing = false;
    let blackKing = false;
    const boardState = game.board();
    
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = boardState[r][c];
            if (p && p.type === 'k') {
                if (p.color === 'w') whiteKing = true;
                if (p.color === 'b') blackKing = true;
            }
        }
    }

    // If a King is missing, end the game immediately
    if (!whiteKing || !blackKing) {
        const winnerColor = !whiteKing ? 'b' : 'w';
        
        if (gameMode === 'multi' && selectedMultiplayerMode === 'arena' && myColor === winnerColor) {
            socket.emit('arena_match_ended', { roomId: currentRoom, winnerColor: winnerColor });
        }

        if (chars[winnerColor] === 'george') {
            msg.innerHTML = `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                    <div style="color: #f0c040; font-size: 3rem; font-weight: bold; margin-bottom: 10px;">George Floyd won by breaking the laws</div>
                    <div style="color: #aaa; font-size: 1.5rem; font-weight: normal;">Well well well</div>
                </div>
            `;
        } else {
            const winnerName = winnerColor === 'b' ? 'Black' : 'White';
            msg.textContent = `King captured! ${winnerName} wins.`;
        }
        modal.classList.remove('hidden');
        return; // Stop further checks
    }

    // --- STANDARD CHESS.JS CHECKS ---
    if (game.game_over()) {
        let winnerCol = null;
        if (game.in_checkmate()) {
            winnerCol = game.turn() === 'w' ? 'b' : 'w';
            const winner = winnerCol === 'b' ? 'Black' : 'White';
            msg.textContent = `Checkmate! ${winner} wins.`;
        } else if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) {
            winnerCol = 'draw';
            msg.textContent = 'Game drawn!';
        }

        if (gameMode === 'multi' && selectedMultiplayerMode === 'arena' && (myColor === winnerCol || winnerCol === 'draw' && myColor === 'w')) {
            // Only emit from one client on draw to prevent double counting
            socket.emit('arena_match_ended', { roomId: currentRoom, winnerColor: winnerCol });
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
    const side = getSide(color);
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
        console.error('AI Logic Error:', e.data.error);
        aiThinking = false;
        // We removed the auto-retry here so it doesn't infinite loop!
        return;
    }

    const { isAbility, move, depth, evalScore } = e.data.result;
    const nodes = e.data.nodes;

    const color = game.turn();
    const side = getSide(color);

    if (depth !== undefined) {
        document.getElementById(`${side}-ai-stats`).textContent = `Depth: ${depth} | Eval: ${evalScore} | Nodes: ${nodes}`;
    }

    aiThinking = false;

    if (isAbility) {
        executeAbilityMove(color, move);
    } else {
        const success = attemptMove(move.from, move.to);
        if (!success) {
            const allWalls = [...(abilities.w.walls || []), ...(abilities.b.walls || [])];
            if (!isBlockedByWall(game.fen(), move.from, move.to, allWalls)) {
                const result = game.move({ from: move.from, to: move.to, promotion: 'q' });
                if (result) {
                    postMoveLogic(color);
                    updateBoard();
                    setTimeout(scheduleAiTurnIfNeeded, 500);
                }
            }
        }
    }
}

function handleStockfishResponse(uciMove) {
    document.getElementById('top-thinking').style.display = 'none';
    document.getElementById('bottom-thinking').style.display = 'none';

    const color = stockfishThinkingColor;
    const side = getSide(color);
    document.getElementById(`${side}-ai-stats`).textContent = `Engine: Stockfish 10`;

    aiThinking = false;

    const move = {
        from: uciMove.substring(0, 2),
        to: uciMove.substring(2, 4),
        promotion: uciMove.length > 4 ? uciMove[4] : 'q'
    };

   const success = attemptMove(move.from, move.to);
    if (!success) {
        const allWalls = [...(abilities.w.walls || []), ...(abilities.b.walls || [])];
        if (!isBlockedByWall(game.fen(), move.from, move.to, allWalls)) {
            const result = game.move(move);
            if (result) {
                postMoveLogic(color);
                updateBoard();
                setTimeout(scheduleAiTurnIfNeeded, 500);
                return;
            }
        }

        // Fallback: Stockfish's move was blocked or illegal — pick any valid move
        const validMoves = game.moves({ verbose: true }).filter(m => !isBlockedByWall(game.fen(), m.from, m.to, allWalls));
        if (validMoves.length > 0) {
            const randomFallback = validMoves[Math.floor(Math.random() * validMoves.length)];
            game.move(randomFallback);
            postMoveLogic(color);
            updateBoard();
            setTimeout(scheduleAiTurnIfNeeded, 500);
        } else {
            checkGameOver();
        }
    }
}

function executeAbilityMove(color, move) {
    if (move.abilityType === 'bibi_ultimate') {
        move.toKill.forEach(sq => game.remove(sq));
        abilities[color].movesSinceLastUltimate = 0;
        switchTurn();
        postMoveLogic(color, true);
        playSound('bibi_ultimate');
        syncCustomState();
        updateBoard();
        setTimeout(scheduleAiTurnIfNeeded, 500);

  } else if (move.abilityType === 'epstein_buy') {
    const targetPiece = game.get(move.sq);
    const availablePts = getCapturedPointsInfo(color).pointsAvailable;

    if (
        !targetPiece ||
        targetPiece.color === color ||
        targetPiece.type === 'k' ||
        targetPiece.type !== move.pieceType ||
        availablePts < move.frontendCost
    ) {
        aiThinking = false;
        setTimeout(scheduleAiTurnIfNeeded, 300);
        return;
    }

    const fenBeforeBuy = game.fen();
    game.remove(move.sq);
    game.put({ type: move.pieceType, color: color }, move.sq);
    switchTurn();

    try {
        new Chess(game.fen());
    } catch (e) {
        game.load(fenBeforeBuy);
        aiThinking = false;
        setTimeout(scheduleAiTurnIfNeeded, 300);
        return;
    }

    abilities[color].spentPoints = (abilities[color].spentPoints || 0) + move.frontendCost;
    postMoveLogic(color, true);
    syncCustomState();
    updateBoard();
    setTimeout(scheduleAiTurnIfNeeded, 500);
    } else if (move.abilityType === 'kirk_snipe') {
        abilities[color].uniSniperActive = false;
        abilities[color].movesSinceUniSniper = 0;
        const newFen = movePieceInFen(game.fen(), move.from, move.to, true);
        game.load(newFen);
        postMoveLogic(color, true);
        playSound('snipe');
        syncCustomState();
        updateBoard();
        setTimeout(scheduleAiTurnIfNeeded, 500);

    } else if (move.abilityType === 'diddy_baby_oil') {
        abilities[color].babyOilActive = true;
        abilities[color].movesSinceBabyOil = 0;
        syncCustomState();
        updateBoard();
        setTimeout(scheduleAiTurnIfNeeded, 300);

    } else if (move.abilityType === 'aheud_smoke') {
        abilities[color].smokeActive = true;
        abilities[color].smokeRemainingMoves = 4;
        abilities[color].movesSinceSmoke = 0;
        abilities[color].smokeCenterSq = move.sq;

        syncCustomState();
        playSound('smoke');
        updateBoard();
        setTimeout(scheduleAiTurnIfNeeded, 300);
   } else if (move.abilityType === 'trump_wall') {
        abilities[color].walls = [move.sq];
        abilities[color].movesSinceWall = 0;
        switchTurn();
        postMoveLogic(color, true);
        playSound('wall');
        syncCustomState();
        updateBoard();
        setTimeout(scheduleAiTurnIfNeeded, 500);
    } else if (move.abilityType === 'george_magic_win') {
    let newFen = movePieceInFen(game.fen(), move.from, move.to, true);
    game.load(newFen);
    postMoveLogic(color, true);
    updateBoard();
    if (currentRoom) socket.emit('sync_custom_state', { roomId: currentRoom, fen: game.fen(), abilities: abilities });
    checkGameOver();
    setTimeout(scheduleAiTurnIfNeeded, 500);
}
}

initGame();