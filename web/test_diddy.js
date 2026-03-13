const { Chess } = require('./chess.js');
const game = new Chess();
game.move({from: 'c2', to: 'c3'});
const p = game.get('c3');
game.remove('c3');
const success = game.put(p, 'c4');
console.log("Put success:", success);
console.log("FEN:", game.fen());
console.log("GameOver:", game.game_over());
