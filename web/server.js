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
    socket.on('create_room', () => {
        const roomId = Math.random().toString(36).substring(2, 6).toUpperCase();
        games[roomId] = {
            chess: new Chess(),
            players: { w: socket.id, b: null },
            chars: { w: 'none', b: 'none' },
            ready: { w: false, b: false },
            abilities: {}
        };
        socket.join(roomId);
        socket.emit('room_created', roomId);
        socket.emit('player_color', 'w');
        console.log(`Room ${roomId} created by ${socket.id}`);
    });

    // Player 2 joins the room
    socket.on('join_room', (roomId) => {
        const game = games[roomId];
        if (game && !game.players.b) {
            game.players.b = socket.id;
            socket.join(roomId);
            socket.emit('player_color', 'b');

            // Notify both players the game has started
            io.to(roomId).emit('game_start', { fen: game.chess.fen() });
        } else {
            socket.emit('error', 'Room full or not found');
        }
    });

    
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