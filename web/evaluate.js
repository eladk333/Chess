// ============================================================
// evaluate.js - Silent 10-Game Arena
// ============================================================

class CustomAIEngine {
    constructor(name, workerScript) {
        this.name = name;
        this.worker = new Worker(workerScript);
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
                    reject(e.data.error);
                } else {
                    const move = e.data.result.move;
                    let uciMove = move.from + move.to;
                    if (move.promotion) uciMove += move.promotion;
                    resolve(uciMove);
                }
            };
            this.worker.postMessage({ fen: fen, chars: this.baseChars, abilities: this.baseAbilities, color: color, aiType: 'minimax' });
        });
    }

    terminate() { this.worker.terminate(); }
}

async function runTournament() {
    console.clear();
    console.log("⏳ Running 10 games in the background. Please wait, this might take a few minutes...");

    const numGames = 10;
    let stats = { "New AI Wins": 0, "Old AI Wins": 0, "Draws": 0 };

    let oldAi = new CustomAIEngine("Old AI", "aiWorker.js");
    let newAi = new CustomAIEngine("New AI", "newaiWorker.js");

    for (let i = 0; i < numGames; i++) {
        // Swap colors each game. Evens = New AI is White. Odds = Old AI is White.
        let whiteEngine = (i % 2 === 0) ? newAi : oldAi;
        let blackEngine = (i % 2 === 0) ? oldAi : newAi;

        const game = new Chess();
        let moveCount = 0;

        while (!game.game_over()) {
            const turnColor = game.turn();
            const currentEngine = turnColor === 'w' ? whiteEngine : blackEngine;

            try {
                const moveStr = await currentEngine.getMove(game.fen(), turnColor);
                const moveResult = game.move(moveStr, { sloppy: true });
                if (!moveResult) throw new Error("Illegal move");
            } catch (error) {
                // If an engine crashes or makes an illegal move, the other one wins
                let winner = currentEngine.name === "New AI" ? "Old AI Wins" : "New AI Wins";
                stats[winner]++;
                break;
            }

            moveCount++;
            // Force a draw if the game gets stuck in an endless loop
            if (moveCount > 300) break;
        }

        if (game.in_checkmate()) {
            const winner = game.turn() === 'w' ? blackEngine.name : whiteEngine.name;
            stats[`${winner} Wins`]++;
        } else if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition() || moveCount > 300) {
            stats["Draws"]++;
        }
    }

    oldAi.terminate();
    newAi.terminate();

    console.log("✅ Tournament Complete!");
    console.table(stats);
}

window.runTournament = runTournament;