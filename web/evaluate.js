const { spawn } = require('child_process');
const { Worker } = require('worker_threads');
const { Chess } = require('chess.js');

// --- CONFIGURATION ---
const STOCKFISH_PATH = "C:\\Users\\eladk\\Downloads\\stockfish-windows-x86-64-avx2\\stockfish\\stockfish-windows-x86-64-avx2.exe";
const ELOS = [1500, 1700, 1900];
const NUM_GAMES_PER_ELO = 2;
const TIME_LIMIT_MS = 1000; // Lowered to 1 second so the tournament finishes reasonably fast!

const chars = { w: 'none', b: 'none' };
const abilities = {
    w: { movesSinceLastUltimate: 0, huntingMode: false, movesSinceBabyOil: 10, babyOilActive: false, movesSinceUniSniper: 5, uniSniperActive: false, spentPoints: 0 },
    b: { movesSinceLastUltimate: 0, huntingMode: false, movesSinceBabyOil: 10, babyOilActive: false, movesSinceUniSniper: 5, uniSniperActive: false, spentPoints: 0 }
};

// --- STOCKFISH WRAPPER ---
class Stockfish {
    constructor(path, elo) {
        this.process = spawn(path);
        this.process.stdin.write('uci\n');
        this.process.stdin.write('setoption name UCI_LimitStrength value true\n');
        this.process.stdin.write(`setoption name UCI_Elo value ${elo}\n`);
        this.process.stdin.write('isready\n');
    }

    async getBestMove(fen, timeLimitMs) {
        return new Promise((resolve) => {
            let buffer = '';
            const listener = (data) => {
                buffer += data.toString();
                const match = buffer.match(/bestmove\s+(\S+)/);
                if (match) {
                    this.process.stdout.removeListener('data', listener);
                    resolve(match[1]);
                }
            };
            this.process.stdout.on('data', listener);
            this.process.stdin.write(`position fen ${fen}\n`);
            this.process.stdin.write(`go movetime ${timeLimitMs}\n`);
        });
    }

    kill() {
        this.process.kill();
    }
}

// --- AI WORKER WRAPPER ---
const workerCode = `
    const { parentPort } = require('worker_threads');
    const { Chess } = require('chess.js');
    const fs = require('fs');

    // Mute internal logging to keep your terminal clean
    console.log = () => {}; 
    global.importScripts = () => {}; 
    global.self = { postMessage: (data) => parentPort.postMessage(data) };

    // Dynamically patch the null pointer crash in aiWorker.js without editing the file directly
    let aiScript = fs.readFileSync('aiWorker.js', 'utf8');
    aiScript = aiScript.replace(/move\\.abilityType/g, "(move && move.abilityType)");
    aiScript = aiScript.replace(/bestMoveOverall\\.abilityType/g, "(bestMoveOverall && bestMoveOverall.abilityType)");
    eval(aiScript);

    parentPort.on('message', (data) => {
        if (self.onmessage) self.onmessage({ data });
    });
`;

async function getAiMove(worker, fen, color) {
    return new Promise((resolve, reject) => {
        worker.once('message', (msg) => {
            if (msg.success) resolve(msg.result);
            else reject(msg.error);
        });
        worker.postMessage({ fen, chars, abilities, color, aiType: 'minimax' });
    });
}

// --- MAIN LOOP ---
async function runTournament() {
    const results = {};

    for (const elo of ELOS) {
        results[elo] = { aiWins: 0, sfWins: 0, draws: 0 };
        const sfEngine = new Stockfish(STOCKFISH_PATH, elo);

        for (let i = 0; i < NUM_GAMES_PER_ELO; i++) {
            const game = new Chess();
            const worker = new Worker(workerCode, { eval: true });
            const aiIsWhite = (i % 2 !== 0);

            while (!game.game_over()) {
                const turnColor = game.turn();
                const isAiTurn = (turnColor === 'w' && aiIsWhite) || (turnColor === 'b' && !aiIsWhite);

                let moveStr;
                if (isAiTurn) {
                    const result = await getAiMove(worker, game.fen(), turnColor);

                    // Fallback if AI gets completely stuck to prevent infinite crashing loops
                    if (!result || !result.move) {
                        break;
                    }
                    moveStr = { from: result.move.from, to: result.move.to, promotion: 'q' };
                } else {
                    const sfMove = await sfEngine.getBestMove(game.fen(), TIME_LIMIT_MS);
                    // Stockfish outputs (none) if it is checkmated
                    if (sfMove === '(none)') break;
                    moveStr = { from: sfMove.substring(0, 2), to: sfMove.substring(2, 4), promotion: sfMove.length > 4 ? sfMove[4] : undefined };
                }

                const moveAttempt = game.move(moveStr);
                if (!moveAttempt) break; // End game if an illegal move is generated
            }

            worker.terminate();

            // Tally results silently
            if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) {
                results[elo].draws++;
            } else {
                const winnerIsWhite = game.turn() === 'b';
                if (winnerIsWhite === aiIsWhite) {
                    results[elo].aiWins++;
                } else {
                    results[elo].sfWins++;
                }
            }
        }
        sfEngine.kill();
    }

    // --- FINAL OUTPUT ---
    console.log("\n==============================");
    console.log("      TOURNAMENT RESULTS      ");
    console.log("==============================");
    for (const elo of ELOS) {
        console.log(`\nvs Stockfish ${elo}:`);
        console.log(`  Minimax AI Wins: ${results[elo].aiWins}`);
        console.log(`  Stockfish Wins : ${results[elo].sfWins}`);
        console.log(`  Draws          : ${results[elo].draws}`);
    }
    console.log("\n==============================\n");
}

runTournament().catch(err => console.error("Tournament Failed:", err));