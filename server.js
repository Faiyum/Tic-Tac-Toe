const http = require('http');
const WebSocket = require('ws');
const PORT = process.env.PORT || 8080;

const server = http.createServer();
const wss = new WebSocket.Server({ server });

server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});

let rooms = new Map();

class Game {
  constructor(playerX, playerO) {
    this.players = { X: playerX, O: playerO };
    this.board = Array(9).fill('');
    this.currentPlayer = 'X';
    this.gameActive = true;

    this.sendToBoth({ type: 'start', player: 'X' });
    this.sendStatus(`Player X's turn`);

    this.players.X.on('message', msg => this.handleMessage('X', msg));
    this.players.O.on('message', msg => this.handleMessage('O', msg));
  }

  sendStatus(msg) {
    this.sendToBoth({ type: 'status', message: msg });
  }

  sendToBoth(data) {
    Object.values(this.players).forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
    });
  }

  handleMessage(player, msg) {
    if (!this.gameActive) return;

    let data;
    try {
      data = JSON.parse(msg);
    } catch { return; }

    if (data.type === 'move') {
      if (player !== this.currentPlayer) {
        this.players[player].send(JSON.stringify({ type: 'error', message: 'Not your turn' }));
        return;
      }
      this.handleMove(player, data.index);
    }
  }

  handleMove(player, index) {
    if (index < 0 || index > 8 || this.board[index] !== '') {
      this.players[player].send(JSON.stringify({ type: 'error', message: "Invalid move" }));
      return;
    }

    this.board[index] = player;
    this.sendToBoth({ type: 'move', index, player });

    if (this.checkWin(player)) {
      this.sendToBoth({ type: 'gameover', winner: player });
      this.gameActive = false;
      return;
    }

    if (!this.board.includes('')) {
      this.sendToBoth({ type: 'gameover', winner: null });
      this.gameActive = false;
      return;
    }

    this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
    this.sendStatus(`Player ${this.currentPlayer}'s turn`);
  }

  checkWin(p) {
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    return wins.some(line => line.every(i => this.board[i] === p));
  }
}

function generateRoomCode() {
  return Math.random().toString(36).substr(2, 4).toUpperCase();
}

wss.on('connection', (ws) => {
  ws.on('message', (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      return;
    }

    if (data.type === 'create') {
      const code = generateRoomCode();
      rooms.set(code, ws);
      ws.send(JSON.stringify({ type: 'roomCreated', room: code }));
    }

    else if (data.type === 'join') {
      const host = rooms.get(data.room);
      if (host && host.readyState === WebSocket.OPEN) {
        new Game(host, ws);
        rooms.delete(data.room);
      } else {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid or expired room code' }));
      }
    }
  });

  ws.on('close', () => {
    // clean up if needed
    for (let [room, sock] of rooms.entries()) {
      if (sock === ws) {
        rooms.delete(room);
      }
    }
  });
});
