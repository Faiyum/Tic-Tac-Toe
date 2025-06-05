const boardEl = document.getElementById('board');
const cells = document.querySelectorAll('.cell');
const statusEl = document.getElementById('status');
const menu = document.getElementById('menu');
const game = document.getElementById('game');
const playAI = document.getElementById('play-ai');
const playOnline = document.getElementById('play-online');
const difficultySelect = document.getElementById('difficulty');
const winLine = document.getElementById('win-line');

let board = Array(9).fill('');
let player = 'X';
let aiPlayer = 'O';
let vsAI = false;
let difficulty = 'easy';
let aiGames = 0;
let socket = null;
let isPlayerTurn = true;

const winPatterns = [
  [0,1,2], [3,4,5], [6,7,8],
  [0,3,6], [1,4,7], [2,5,8],
  [0,4,8], [2,4,6]
];

// Start game
playAI.onclick = () => {
  difficulty = difficultySelect.value;
  vsAI = true;
  menu.style.display = 'none';
  game.style.display = 'block';
  resetGame();
};

playOnline.onclick = () => {
  vsAI = false;
  menu.style.display = 'none';
  game.style.display = 'block';
  socket = new WebSocket('wss://your-ws-server-here.com'); // replace with your server

  socket.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.type === 'start') {
      player = data.player;
      isPlayerTurn = player === 'X';
      updateStatus();
    } else if (data.type === 'move') {
      board[data.index] = data.player;
      render();
      checkWinner();
      isPlayerTurn = data.player !== player;
      updateStatus();
    } else if (data.type === 'status') {
      statusEl.textContent = data.message;
    } else if (data.type === 'gameover') {
      showWinLine(data.winningCombo);
      statusEl.textContent = data.winner ? `Player ${data.winner} wins!` : 'Draw!';
    }
  };
};

cells.forEach((cell, i) => {
  cell.onclick = () => {
    if (board[i] !== '') return;

    if (vsAI) {
      if (player !== 'X') return;
      makeMove(i, player);
      const winner = checkWinner();
      if (!winner) aiMove();
    } else {
      if (!isPlayerTurn || !socket) return;
      makeMove(i, player);
      socket.send(JSON.stringify({ type: 'move', index: i }));
      isPlayerTurn = false;
    }
  };
});

function makeMove(index, currentPlayer) {
  if (board[index] !== '') return;
  board[index] = currentPlayer;
  render();
  const win = checkWinner();
  updateStatus();
  return win;
}

function aiMove() {
  const available = board.map((v, i) => v === '' ? i : null).filter(v => v !== null);
  let index;
  aiGames++;
  if (difficulty === 'easy' || aiGames < 3) {
    index = available[Math.floor(Math.random() * available.length)];
  } else {
    index = bestMove();
  }
  makeMove(index, aiPlayer);
}

function bestMove() {
  let bestScore = -Infinity;
  let move;
  for (let i = 0; i < 9; i++) {
    if (board[i] === '') {
      board[i] = aiPlayer;
      let score = minimax(board, 0, false);
      board[i] = '';
      if (score > bestScore) {
        bestScore = score;
        move = i;
      }
    }
  }
  return move;
}

function minimax(newBoard, depth, isMax) {
  const winner = checkWinner(newBoard, true);
  if (winner === aiPlayer) return 10 - depth;
  if (winner === player) return depth - 10;
  if (!newBoard.includes('')) return 0;

  let best = isMax ? -Infinity : Infinity;
  for (let i = 0; i < 9; i++) {
    if (newBoard[i] === '') {
      newBoard[i] = isMax ? aiPlayer : player;
      const score = minimax(newBoard, depth + 1, !isMax);
      newBoard[i] = '';
      best = isMax ? Math.max(best, score) : Math.min(best, score);
    }
  }
  return best;
}

function checkWinner(tempBoard = board, returnOnly = false) {
  for (const combo of winPatterns) {
    const [a, b, c] = combo;
    if (tempBoard[a] && tempBoard[a] === tempBoard[b] && tempBoard[a] === tempBoard[c]) {
      if (!returnOnly) {
        showWinLine(combo);
        statusEl.textContent = `${tempBoard[a]} wins!`;
      }
      return tempBoard[a];
    }
  }
  if (!tempBoard.includes('') && !returnOnly) {
    statusEl.textContent = 'Draw!';
  }
  return null;
}

function updateStatus() {
  statusEl.textContent = `${player}'s turn`;
}

function render() {
  board.forEach((val, i) => cells[i].textContent = val);
}

function resetGame() {
  board = Array(9).fill('');
  render();
  hideWinLine();
  updateStatus();
}

function showWinLine(combo) {
  const positions = [
    [0, 0], [1, 0], [2, 0],
    [0, 1], [1, 1], [2, 1],
    [0, 2], [1, 2], [2, 2]
  ];
  const [a, b] = [positions[combo[0]], positions[combo[2]]];

  const x1 = a[0], y1 = a[1];
  const x2 = b[0], y2 = b[1];

  const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
  const length = Math.hypot(x2 - x1, y2 - y1) * 100 + 100;

  winLine.style.top = `${(y1 + 0.5) * 33.33}%`;
  winLine.style.left = `${(x1 + 0.5) * 33.33}%`;
  winLine.style.width = `${length}%`;
  winLine.style.transform = `rotate(${angle}deg) translateX(-50%)`;
  winLine.classList.add('show');
}

function hideWinLine() {
  winLine.classList.remove('show');
}
