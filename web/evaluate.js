// ============================================================
// evaluate.js - Chess Engine Arena
// ============================================================

// You will need chess.js loaded in your HTML for the referee to work
// <script src="https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js"></script>

class CustomAIEngine {
    constructor(name, workerScript) {
        this.name = name;
        this.worker = new Worker(workerScript);

        // Disable abilities to test pure chess strength
        this.baseChars = { w: 'none', b: 'none' };
        this.baseAbilities = {
            w: { movesSinceLastUltimate: 0, huntingMode: false, movesSinceBabyOil: 10, babyOilActive: false, movesSinceUniSniper: 5, uniSniperActive: false, spentPoints: 0 },
            b: { movesSinceLastUltimate: 0, huntingMode: false, movesSinceBabyOil: 10, babyOilActive: false, movesSinceUniSniper: 5, uniSniperActive: false, spentPoints: 0 }
        };
    }

    async getMove(fen, color) {
        return new Promise((resolve, reject) => {
            this.worker.onmessage = (e) => {
                if (!e.data.success) {
                    console.error(`${this.name} Error:`, e.data.error);
                    reject(e.data.error);
                } else {
                    const move = e.data.result.move;
                    // Format into standard UCI notation (e.g., e2e4, e7e8q)
                    let uciMove = move.from + move.to;
                    if (move.promotion) uciMove += move.promotion;
                    resolve(uciMove);
                }
            };

            this.worker.postMessage({
                fen: fen,
                chars: this.baseChars,
                abilities: this.baseAbilities,
                color: color,
                aiType: 'minimax'
            });
        });
    }

    terminate() {
        this.worker.terminate();
    }
}

class StockfishEngine {
    constructor(workerScript, elo = 1500) {
        this.name = `Stockfish (${elo})`;
        this.worker = new Worker(workerScript);
        this.isReady = false;

        // Initialize UCI
        this.worker.postMessage('uci');
        this.worker.postMessage('setoption name UCI_LimitStrength value true');
        this.worker.postMessage(`setoption name UCI_Elo value ${elo}`);
        this.worker.postMessage('isready');
    }

    async getMove(fen, color) {
        return new Promise((resolve) => {
            const listener = (e) => {
                const msg = e.data;
                if (typeof msg === 'string' && msg.startsWith('bestmove')) {
                    this.worker.removeEventListener('message', listener);
                    const move = msg.split(' ')[1]; // e.g., "e2e4"
                    resolve(move);
                }
            };
            this.worker.addEventListener('message', listener);
            this.worker.postMessage(`position fen ${fen}`);
            // Give Stockfish 4 seconds to match your custom AI limit
            this.worker.postMessage('go movetime 4000');
        });
    }

    terminate() {
        this.worker.terminate();
    }
}

// ---- The Referee / Arena ----
async function playGame(whiteEngine, blackEngine) {
    const game = new Chess();
    console.log(`\n⚔️ MATCH START: ${whiteEngine.name} (White) vs ${blackEngine.name} (Black)`);

    let moveCount = 1;

    while (!game.game_over()) {
        const turnColor = game.turn();
        const currentEngine = turnColor === 'w' ? whiteEngine : blackEngine;

        const fen = game.fen();
        const startTime = performance.now();

        try {
            const moveStr = await currentEngine.getMove(fen, turnColor);
            const timeTaken = ((performance.now() - startTime) / 1000).toFixed(2);

            const moveResult = game.move(moveStr, { sloppy: true });

            if (!moveResult) {
                console.error(`❌ INVALID MOVE by ${currentEngine.name}: ${moveStr}`);
                return `${currentEngine.name} forfeited due to illegal move.`;
            }

            let logPrefix = turnColor === 'w' ? `${Math.ceil(moveCount / 2)}.` : `${Math.ceil(moveCount / 2)}...`;
            //console.log(`${logPrefix} ${moveResult.san} (${currentEngine.name} took ${timeTaken}s)`);

        } catch (error) {
            console.error(`${currentEngine.name} crashed!`);
            return `${currentEngine.name} crashed.`;
        }

        moveCount++;
    }

    // Determine Result
    if (game.in_checkmate()) {
        const winner = game.turn() === 'w' ? blackEngine.name : whiteEngine.name;
        console.log(`🏆 CHECKMATE! ${winner} wins.`);
        return `${winner} wins by Checkmate.`;
    } else if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) {
        console.log(`🤝 DRAW!`);
        return "Draw.";
    }
}

async function runTournament() {
    console.log("=====================================");
    console.log("🏁 CHESS ENGINE TOURNAMENT STARTING");
    console.log("=====================================");

    // Match 1: Old vs New
    let oldAi = new CustomAIEngine("Old AI", "aiWorker.js");
    let newAi = new CustomAIEngine("New AI", "newaiWorker.js");
    await playGame(oldAi, newAi);
    oldAi.terminate();
    newAi.terminate();

    // Match 2: New vs Stockfish 1500
    newAi = new CustomAIEngine("New AI", "newaiWorker.js");
    let stockfish = new StockfishEngine("stockfish.js", 1500);
    await playGame(newAi, stockfish);
    newAi.terminate();
    stockfish.terminate();

    console.log("=====================================");
    console.log("🏁 TOURNAMENT COMPLETE");
    console.log("=====================================");
}

// Make it available globally so you can trigger it from HTML
window.runTournament = runTournament;