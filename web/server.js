const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Chess } = require('chess.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve the frontend files from the 'public' directory
app.use(express.static('public'));

// Store active games in memory
const games = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('sync_custom_state', (data) => {
        const game = games[data.roomId];
        if (game) {
            try { game.chess.load(data.fen); } catch(e) {}
        }
        socket.to(data.roomId).emit('sync_custom_state', data);
    });
   // Player 1 creates a room
    socket.on('create_room', (mode = 'quick') => {
        const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
        const hostColor = Math.random() > 0.5 ? 'w' : 'b'; // Randomize starting color

        games[roomId] = {
            mode: mode,
            chess: new Chess(),
            players: { w: hostColor === 'w' ? socket.id : null, b: hostColor === 'b' ? socket.id : null },
            hostId: socket.id,
            chars: { w: 'none', b: 'none' },
            ready: { w: false, b: false },
            abilities: {},
            arena: {
                currentMatch: 1,
                maxMatches: 4,
                scores: {}, 
                rosters: {}, 
                initialHostColor: hostColor,
                matchActive: false
            }
        };
        games[roomId].arena.scores[socket.id] = 0;

        socket.join(roomId);
        socket.emit('room_created', roomId);
        console.log(`Room ${roomId} created by ${socket.id} (Mode: ${mode})`);
    });

    // Player 2 joins the room
    socket.on('join_room', (roomId) => {
        const game = games[roomId];
        if (game && (!game.players.w || !game.players.b)) {
            const joinColor = game.players.w ? 'b' : 'w';
            game.players[joinColor] = socket.id;
            game.arena.scores[socket.id] = 0;
            
            socket.join(roomId);
            
            io.to(roomId).emit('room_joined', { 
                mode: game.mode,
                players: game.players 
            });
        } else {
            socket.emit('error', 'Room full or not found');
        }
    });

    // Arena: Handle Roster Lock
    socket.on('arena_picks_locked', ({ roomId, roster }) => {
        const game = games[roomId];
        if (!game) return;

        game.arena.rosters[socket.id] = roster;
        
        if (Object.keys(game.arena.rosters).length === 2) {
            startArenaMatch(roomId, game);
        } else {
            socket.emit('waiting_for_opponent_draft');
        }
    });

    // Arena: Handle Match End
    socket.on('arena_match_ended', ({ roomId, winnerColor }) => {
        const game = games[roomId];
        if (!game || !game.arena.matchActive) return;

        game.arena.matchActive = false; // Prevent double counting
        
        if (winnerColor === 'w' || winnerColor === 'b') {
            const winnerId = game.players[winnerColor];
            if (winnerId) game.arena.scores[winnerId] += 1;
        } else if (winnerColor === 'draw') {
            game.arena.scores[game.players.w] += 0.5;
            game.arena.scores[game.players.b] += 0.5;
        }

        io.to(roomId).emit('arena_match_over_announcement', { 
            winnerColor, 
            scores: game.arena.scores 
        });

        setTimeout(() => {
            game.arena.currentMatch += 1;
            if (game.arena.currentMatch > game.arena.maxMatches) {
                io.to(roomId).emit('arena_tournament_over', { scores: game.arena.scores });
            } else {
                startArenaMatch(roomId, game);
            }
        }, 5000); // 5 second delay before next match
    });

    function startArenaMatch(roomId, game) {
        const isSwapped = game.arena.currentMatch % 2 === 0;
        const p1 = game.hostId;
        const p2 = Object.keys(game.arena.rosters).find(id => id !== game.hostId);
        
        game.players.w = (game.arena.initialHostColor === 'w') ^ isSwapped ? p2 : p1;
        game.players.b = (game.arena.initialHostColor === 'w') ^ isSwapped ? p1 : p2;

        const matchIndex = game.arena.currentMatch - 1;
        game.chars.w = game.arena.rosters[game.players.w][matchIndex];
        game.chars.b = game.arena.rosters[game.players.b][matchIndex];

        game.chess.reset();
        game.arena.matchActive = true;
        game.ready = { w: false, b: false };

        io.sockets.sockets.get(game.players.w)?.emit('arena_match_start', {
            color: 'w',
            matchNum: game.arena.currentMatch,
            scores: game.arena.scores,
            opponentChar: game.chars.b,
            myChar: game.chars.w,
            fen: game.chess.fen()
        });

        io.sockets.sockets.get(game.players.b)?.emit('arena_match_start', {
            color: 'b',
            matchNum: game.arena.currentMatch,
            scores: game.arena.scores,
            opponentChar: game.chars.w,
            myChar: game.chars.b,
            fen: game.chess.fen()
        });
    }

    
    // Handle character selection readiness
    socket.on('player_ready', ({ roomId, charId }) => {
        const game = games[roomId];
        if (!game) return;

        const color = game.players.w === socket.id ? 'w' : 'b';
        game.chars[color] = charId;

        game.ready[color] = true;

        if (game.ready.w && game.ready.b) {
            io.to(roomId).emit('both_ready', game.chars);
        } else {
            socket.to(roomId).emit('opponent_ready');
        }
    });
    // Handle incoming moves
    socket.on('make_move', ({ roomId, move }) => {
        const game = games[roomId];
        if (!game) return;

        const turn = game.chess.turn();

        if (game.players[turn] !== socket.id) {
            socket.emit('invalid_move', { fen: game.chess.fen() });
            return;
        }

        try {
            const result = game.chess.move(move);
            if (result) {
                io.to(roomId).emit('state_update', {
                    fen: game.chess.fen(),
                    turn: game.chess.turn(),
                    lastMoveColor: turn
                });
            } else {
                socket.emit('invalid_move', { fen: game.chess.fen() });
            }
        } catch (e) {
            socket.emit('invalid_move', { fen: game.chess.fen() });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        // Check if the user was in an active game
        for (const roomId in games) {
            const game = games[roomId];
            if (game.players.w === socket.id || game.players.b === socket.id) {
                // Tell the other player they left
                socket.to(roomId).emit('opponent_quit');
                // Delete the room so it doesn't stay in memory forever
                delete games[roomId];
                console.log(`Room ${roomId} closed because a player disconnected.`);
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));