// server.js
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });
console.log('WebSocket server running on ws://localhost:8080');

const rooms = {}; // roomCode: { players: [ws, ws], symbols: ['X','O'] }

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i=0; i<5; i++) {
    code += chars.charAt(Math.floor(Math.random()*chars.length));
  }
  return code;
}

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.room = null;
  ws.symbol = null;

  ws.on('message', (message) => {
    let msg;
    try {
      msg = JSON.parse(message);
    } catch (e) {
      send(ws, { type: 'error', message: 'Invalid message format' });
      return;
    }

    if (msg.type === 'create-room') {
      let roomCode;
      do {
        roomCode = generateRoomCode();
      } while (rooms[roomCode]);

      rooms[roomCode] = { players: [ws], symbols: ['X', 'O'] };
      ws.room = roomCode;
      ws.symbol = 'X';

      send(ws, { type: 'room-created', room: roomCode });
    } else if (msg.type === 'join-room') {
      const room = rooms[msg.room];
      if (!room) {
        send(ws, { type: 'error', message: 'Room not found' });
        return;
      }
      if (room.players.length >= 2) {
        send(ws, { type: 'error', message: 'Room full' });
        return;
      }
      room.players.push(ws);
      ws.room = msg.room;
      ws.symbol = 'O';

      send(ws, { type: 'room-joined', room: msg.room, symbol: 'O' });

      // Notify both players to start game
      room.players.forEach(p => send(p, { type: 'start-game', symbol: p.symbol }));
    } else if (msg.type === 'move') {
      const room = rooms[ws.room];
      if (!room) return;
      // Broadcast move to opponent
      room.players.forEach(p => {
        if (p !== ws && p.readyState === WebSocket.OPEN) {
          send(p, { type: 'move', index: msg.index, player: msg.player });
        }
      });
    }
  });

  ws.on('close', () => {
    if (ws.room && rooms[ws.room]) {
      const room = rooms[ws.room];
      room.players = room.players.filter(p => p !== ws);
      // Notify remaining player opponent left
      room.players.forEach(p => {
        send(p, { type: 'opponent-left' });
      });
      if (room.players.length === 0) {
        delete rooms[ws.room];
      }
    }
  });
});

// Heartbeat to close dead connections
setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);
