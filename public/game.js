// game.js

const menu = document.getElementById('menu');
const gameScreen = document.getElementById('gameScreen');
const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const winsEl = document.getElementById('wins');
const lossesEl = document.getElementById('losses');
const drawsEl = document.getElementById('draws');
const resetBtn = document.getElementById('reset-btn');
const resetStatsBtn = document.getElementById('reset-stats');
const roomCodeInput = document.getElementById('roomCodeInput');
const menuMsg = document.getElementById('menuMsg');

const btnPlayAI = document.getElementById('btnPlayAI');
const btnPlayOnline = document.getElementById('btnPlayOnline');
const btnCreateRoom = document.getElementById('btnCreateRoom');
const btnJoinRoom = document.getElementById('btnJoinRoom');

let board = Array(9).fill('');
let player = 'X'; // user always X
let currentPlayer = 'X';
let gameActive = false;
let vsAI = false;
let aiDifficulty = 'easy'; // 'easy' or 'hard'
let aiGames = 0;
let socket = null;
let roomCode = '';
let cells = [];
let winPatterns = [
  [0,1,2], [3,4,5], [6,7,8],
  [0,3,6], [1,4,7], [2,5,8],
  [0,4,8], [2,4,6]
];

// Load stats from localStorage or init
let stats = {
  wins: Number(localStorage.getItem('wins')) || 0,
  losses: Number(localStorage.getItem('losses')) || 0,
  draws: Number(localStorage.getItem('draws')) || 0
};

function updateStatsUI() {
  winsEl.textContent = stats.wins;
  lossesEl.textContent = stats.losses;
  drawsEl.textContent = stats.draws;
  // Add animation class for scoreboard changes
  [winsEl, lossesEl, drawsEl].forEach(el => {
    el.classList.remove('updated');
    void el.offsetWidth; // trigger reflow
    el.classList.add('updated');
  });
}

function saveStats() {
  localStorage.setItem('wins', stats.wins);
  localStorage.setItem('losses', stats.losses);
  localStorage.setItem('draws', stats.draws);
}

function resetStats() {
  stats = { wins:0, losses:0, draws:0 };
  saveStats();
  updateStatsUI();
}

function showScreen(screenToShow) {
  if(screenToShow === 'menu') {
    menu.style.display = 'block';
    gameScreen.style.display = 'none';
  } else if(screenToShow === 'game') {
    menu.style.display = 'none';
    gameScreen.style.display = 'block';
  }
}

function initBoard() {
  boardEl.innerHTML = '';
  cells = [];
  for(let i=0; i<9; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    cell.dataset.index = i;
    cell.addEventListener('click', () => onCellClick(i));
    boardEl.appendChild(cell);
    cells.push(cell);
  }
}

function onCellClick(i) {
  if (!gameActive || board[i] !== '' || currentPlayer !== player) return;
  makeMove(i, player);
  if (vsAI) {
    if (gameActive) setTimeout(() => aiMove(), 300);
  } else if (socket) {
    socket.send(JSON.stringify({ type: 'move', index: i, player }));
  }
}

function makeMove(i, p) {
  board[i] = p;
  cells[i].textContent = p;
  checkWinner();
  if (gameActive) {
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    statusEl.textContent = `Player ${currentPlayer}'s turn`;
  }
}

function checkWinner(tempBoard = board, returnOnly = false) {
  for (const combo of winPatterns) {
    const [a, b, c] = combo;
    if (tempBoard[a] && tempBoard[a] === tempBoard[b] && tempBoard[a] === tempBoard[c]) {
      if (!returnOnly) {
        showWinLine(combo);
        statusEl.textContent = `${tempBoard[a]} wins!`;
        if (vsAI || socket) {
          const result = (tempBoard[a] === player) ? 'win' : 'loss';
          updateStats(result);
        }
        resetBtn.style.display = 'block';
        gameActive = false;
      }
      return tempBoard[a];
    }
  }
  if (!tempBoard.includes('') && !returnOnly) {
    statusEl.textContent = 'Draw!';
    if (vsAI || socket) updateStats('draw');
    resetBtn.style.display = 'block';
    gameActive = false;
  }
  return null;
}

function showWinLine(combo) {
  // Simple highlight by background color
  combo.forEach(i => cells[i].style.background = '#90ee90');
}

function resetBoardColors() {
  cells.forEach(c => c.style.background = 'white');
}

function resetGame() {
  board = Array(9).fill('');
  cells.forEach(c => c.textContent = '');
  resetBoardColors();
  currentPlayer = 'X';
  gameActive = true;
  statusEl.textContent = `Player ${currentPlayer}'s turn`;
  resetBtn.style.display = 'none';
  menuMsg.textContent = '';
}

function updateStats(result) {
  if (result === 'win') stats.wins++;
  else if (result === 'loss') stats.losses++;
  else if (result === 'draw') stats.draws++;
  saveStats();
  updateStatsUI();
}

// AI logic
function aiMove() {
  if (!gameActive) return;

  if (aiDifficulty === 'easy' || aiGames < 3) {
    // Random move
    const emptyIndices = board.map((v,i) => v === '' ? i : -1).filter(i => i !== -1);
    if (emptyIndices.length === 0) return;
    const move = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    makeMove(move, 'O');
  } else {
    // Minimax perfect play
    const move = findBestMove(board, 'O');
    if (move !== -1) makeMove(move, 'O');
  }
  if (!gameActive) aiGames++;
}

// Minimax algorithm
function findBestMove(bd, aiPlayer) {
  let bestVal = -Infinity;
  let bestMove = -1;
  for (let i=0; i<9; i++) {
    if (bd[i] === '') {
      bd[i] = aiPlayer;
      let moveVal = minimax(bd, 0, false, aiPlayer);
      bd[i] = '';
      if (moveVal > bestVal) {
        bestMove = i;
        bestVal = moveVal;
      }
    }
  }
  return bestMove;
}

function minimax(bd, depth, isMax, aiPlayer) {
  const winner = checkWinner(bd, true);
  if (winner === aiPlayer) return 10 - depth;
  else if (winner && winner !== aiPlayer) return depth - 10;
  else if (!bd.includes('')) return 0;

  if (isMax) {
    let best = -Infinity;
    for (let i=0; i<9; i++) {
      if (bd[i] === '') {
        bd[i] = aiPlayer;
        best = Math.max(best, minimax(bd, depth + 1, false, aiPlayer));
        bd[i] = '';
      }
    }
    return best;
  } else {
    let best = Infinity;
    const opponent = aiPlayer === 'X' ? 'O' : 'X';
    for (let i=0; i<9; i++) {
      if (bd[i] === '') {
        bd[i] = opponent;
        best = Math.min(best, minimax(bd, depth + 1, true, aiPlayer));
        bd[i] = '';
      }
    }
    return best;
  }
}

// Online multiplayer with room code support

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for(let i=0; i<5; i++) {
    code += chars.charAt(Math.floor(Math.random()*chars.length));
  }
  return code;
}

function connectToServer() {
  if (socket) {
    socket.close();
  }
  socket = new WebSocket('ws://' + window.location.hostname + ':8080');
  socket.onopen = () => {
    menuMsg.textContent = 'Connected to server';
  };
  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'room-created') {
      roomCode = msg.room;
      menuMsg.textContent = `Room created: ${roomCode}. Share this code with your friend. Waiting for opponent...`;
    } else if (msg.type === 'room-joined') {
      roomCode = msg.room;
      menuMsg.textContent = `Joined room ${roomCode}. Game starting...`;
      startOnlineGame(msg.symbol);
    } else if (msg.type === 'start-game') {
      startOnlineGame(msg.symbol);
    } else if (msg.type === 'move') {
      // Opponent move
      if (gameActive) {
        board[msg.index] = msg.player;
        cells[msg.index].textContent = msg.player;
        checkWinner();
        currentPlayer = player;
        statusEl.textContent = `Your turn (${player})`;
      }
    } else if (msg.type === 'error') {
      menuMsg.textContent = `Error: ${msg.message}`;
    } else if (msg.type === 'opponent-left') {
      statusEl.textContent = 'Opponent left. You win by default.';
      gameActive = false;
      resetBtn.style.display = 'block';
      updateStats('win');
    }
  };
  socket.onclose = () => {
    menuMsg.textContent = 'Disconnected from server.';
  };
}

function startOnlineGame(symbol) {
  showScreen('game');
  initBoard();
  resetGame();
  player = symbol;
  currentPlayer = 'X'; // X always starts
  vsAI = false;
  statusEl.textContent = `Game started. You are ${player}. ${currentPlayer}'s turn`;
  gameActive = true;
}

btnPlayAI.onclick = () => {
  showScreen('game');
  initBoard();
  resetGame();
  vsAI = true;
  player = 'X';
  currentPlayer = 'X';
  aiGames = 0;
  // Prompt AI difficulty
  aiDifficulty = prompt('Choose AI difficulty: easy or hard', 'easy')?.toLowerCase();
  if (aiDifficulty !== 'hard') aiDifficulty = 'easy';
  statusEl.textContent = `You are X. ${currentPlayer}'s turn`;
  gameActive = true;
  menuMsg.textContent = '';
};

btnPlayOnline.onclick = () => {
  connectToServer();
  menuMsg.textContent = 'Connected to server. Create or join a room.';
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

resetBtn.onclick = () => {
  if (vsAI) {
    resetGame();
  } else if (socket) {
    // Online game reset - disallow mid-game reset, must reconnect or start new
    statusEl.textContent = 'Use menu to create/join a new room.';
  }
};

resetStatsBtn.onclick = () => {
  resetStats();
};

// Initial setup
updateStatsUI();
showScreen('menu');
