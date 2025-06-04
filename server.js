
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 8080;

app.use(express.static('public'));

let waitingPlayer = null;

class Game {
  constructor(playerX, playerO) {
    this.players = { X: playerX, O: playerO };
    this.board = Array(9).fill('');
    this.currentPlayer = 'X';
    this.gameActive = true;

    this.sendToBoth({ type: 'start', player: 'X' });
    this.sendStatus(`Player X's turn`);

    this.players.X.on('message', (msg) => this.handleMessage('X', msg));
    this.players.O.on('message', (msg) => this.handleMessage('O', msg));
  }

  sendStatus(message) {
    this.sendToBoth({ type: 'status', message });
  }

  sendToBoth(data) {
    Object.values(this.players).forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
    });
  }

  handleMessage(player, message) {
    if (!this.gameActive) return;
    if (player !== this.currentPlayer) return;

    let data;
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }

    if (data.type === 'move') this.handleMove(player, data.index);
  }

  handleMove(player, index) {
    if (index < 0 || index > 8 || this.board[index] !== '') return;

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

  checkWin(player) {
    const winConditions = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];
    return winConditions.some(c => c.every(i => this.board[i] === player));
  }
}

wss.on('connection', (ws) => {
  if (waitingPlayer === null) {
    waitingPlayer = ws;
    ws.send(JSON.stringify({ type: 'waiting', message: 'Waiting for an opponent...' }));
  } else {
    new Game(waitingPlayer, ws);
    waitingPlayer = null;
  }

  ws.on('close', () => {
    if (waitingPlayer === ws) waitingPlayer = null;
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
