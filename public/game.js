document.addEventListener('DOMContentLoaded', () => {

// --- DOM Elements ---
const btnPlayOnline = document.getElementById('btnPlayOnline');
const btnCreateRoom = document.getElementById('btnCreateRoom');
const btnJoinRoom = document.getElementById('btnJoinRoom');
const btnResetStats = document.getElementById('btnResetStats');
const roomCodeInput = document.getElementById('roomCodeInput');
const menuMsg = document.getElementById('menuMsg');
const boardCells = document.querySelectorAll('.cell');
const statusText = document.getElementById('statusText');
const scoreboardX = document.getElementById('scoreX');
const scoreboardO = document.getElementById('scoreO');
const scoreboardDraw = document.getElementById('scoreDraw');

let socket = null;
let roomCode = '';
let playerSymbol = '';
let isMyTurn = false;
let board = ['', '', '', '', '', '', '', '', ''];
let gameActive = false;

// Disable create/join buttons initially
btnCreateRoom.disabled = true;
btnJoinRoom.disabled = true;

// --- Helper Functions ---

function setStatus(text) {
  statusText.textContent = text;
}

function resetBoard() {
  board.fill('');
  boardCells.forEach(cell => {
    cell.textContent = '';
    cell.classList.remove('win');
  });
  gameActive = true;
}

function updateScoreboard(winner) {
  let x = parseInt(localStorage.getItem('winsX') || '0');
  let o = parseInt(localStorage.getItem('winsO') || '0');
  let d = parseInt(localStorage.getItem('draws') || '0');

  if (winner === 'X') {
    x++;
    localStorage.setItem('winsX', x);
  } else if (winner === 'O') {
    o++;
    localStorage.setItem('winsO', o);
  } else {
    d++;
    localStorage.setItem('draws', d);
  }
  scoreboardX.textContent = x;
  scoreboardO.textContent = o;
  scoreboardDraw.textContent = d;
}

// Call this on page load
function loadScoreboard() {
  scoreboardX.textContent = localStorage.getItem('winsX') || '0';
  scoreboardO.textContent = localStorage.getItem('winsO') || '0';
  scoreboardDraw.textContent = localStorage.getItem('draws') || '0';
}

function highlightWinLine(indices) {
  indices.forEach(i => boardCells[i].classList.add('win'));
}

function checkWin(player) {
  const winConditions = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,3,6], [1,4,7], [2,5,8],
    [0,4,8], [2,4,6]
  ];
  for (const condition of winConditions) {
    if (condition.every(i => board[i] === player)) {
      highlightWinLine(condition);
      return true;
    }
  }
  return false;
}

function checkDraw() {
  return board.every(cell => cell !== '');
}

// --- WebSocket connection and room management ---

function connectToServer() {
  if (socket) {
    socket.close();
  }
  socket = new WebSocket('ws://' + window.location.hostname + ':8080');

  menuMsg.textContent = 'Connecting to server... Please wait.';
  btnCreateRoom.disabled = true;
  btnJoinRoom.disabled = true;

  socket.onopen = () => {
    menuMsg.textContent = 'Connected to server';
    btnCreateRoom.disabled = false;
    btnJoinRoom.disabled = false;
  };

  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === 'waiting') {
      menuMsg.textContent = msg.message;
    } else if (msg.type === 'start') {
      playerSymbol = msg.player;
      isMyTurn = (playerSymbol === 'X');
      menuMsg.textContent = `Game started! You are ${playerSymbol}.`;
      resetBoard();
      setStatus(isMyTurn ? "Your turn" : "Opponent's turn");
      gameActive = true;
    } else if (msg.type === 'move') {
      board[msg.index] = msg.player;
      boardCells[msg.index].textContent = msg.player;
      if (msg.player !== playerSymbol) {
        isMyTurn = true;
        setStatus("Your turn");
      } else {
        isMyTurn = false;
        setStatus("Opponent's turn");
      }
    } else if (msg.type === 'gameover') {
      gameActive = false;
      if (msg.winner === null) {
        setStatus("Game is a draw.");
        updateScoreboard(null);
      } else if (msg.winner === playerSymbol) {
        setStatus("You win!");
        updateScoreboard(playerSymbol);
      } else {
        setStatus("You lose!");
        updateScoreboard(msg.winner);
      }
    } else if (msg.type === 'room-created') {
      roomCode = msg.room;
      menuMsg.textContent = `Room created! Share code: ${roomCode}`;
    } else if (msg.type === 'room-joined') {
      roomCode = msg.room;
      menuMsg.textContent = `Joined room: ${roomCode}`;
    } else if (msg.type === 'error') {
      menuMsg.textContent = 'Error: ' + msg.message;
    }
  };

  socket.onclose = () => {
    menuMsg.textContent = 'Disconnected from server.';
    btnCreateRoom.disabled = true;
    btnJoinRoom.disabled = true;
    isMyTurn = false;
    gameActive = false;
  };

  socket.onerror = () => {
    menuMsg.textContent = 'Connection error.';
    btnCreateRoom.disabled = true;
    btnJoinRoom.disabled = true;
  };
}

// --- Event handlers ---

btnPlayOnline.onclick = () => {
  connectToServer();
};

btnCreateRoom.onclick = () => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    menuMsg.textContent = 'Connect to server first (click Play Online)';
    return;
  }
  socket.send(JSON.stringify({ type: 'create-room' }));
};

btnJoinRoom.onclick = () => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    menuMsg.textContent = 'Connect to server first (click Play Online)';
    return;
  }
  const code = roomCodeInput.value.trim().toUpperCase();
  if (!code || code.length !== 5) {
    menuMsg.textContent = 'Enter a valid 5-letter room code.';
    return;
  }
  socket.send(JSON.stringify({ type: 'join-room', room: code }));
};

btnResetStats.onclick = () => {
  localStorage.removeItem('winsX');
  localStorage.removeItem('winsO');
  localStorage.removeItem('draws');
  loadScoreboard();
  menuMsg.textContent = 'Stats reset.';
};

boardCells.forEach((cell, idx) => {
  cell.addEventListener('click', () => {
    if (!gameActive || !isMyTurn || board[idx] !== '') return;
    board[idx] = playerSymbol;
    cell.textContent = playerSymbol;
    isMyTurn = false;
    setStatus("Opponent's turn");
    socket.send(JSON.stringify({ type: 'move', index: idx }));
    // Here you can add your animated win lines and check logic after opponent move comes back
  });
});

// --- Initialize ---

loadScoreboard();
setStatus('Click Play Online to connect');
menuMsg.textContent = 'Ready to play!';

// Responsive and animation code assumed unchanged, keep your existing code here.


  });

