
let mode = "";
let ws;
let board = [];
let currentPlayer = 'X';
let playerMark = '';
let score = { wins: 0, losses: 0, draws: 0 };

function initBoard() {
  const boardEl = document.getElementById('board');
  boardEl.innerHTML = '';
  board = Array(9).fill('');
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;
    cell.onclick = () => handleClick(i);
    boardEl.appendChild(cell);
  }
}

function updateStatus(msg) {
  document.getElementById('status').textContent = msg;
}

function updateBoard(index, player) {
  board[index] = player;
  const cell = document.querySelector(`.cell[data-index='${index}']`);
  if (cell) cell.textContent = player;
}

function updateScores() {
  document.getElementById('wins').textContent = score.wins;
  document.getElementById('losses').textContent = score.losses;
  document.getElementById('draws').textContent = score.draws;
}

function handleClick(i) {
  if (board[i] !== '') return;

  if (mode === 'ai') {
    makeMove(i, currentPlayer);
    if (!checkEnd(currentPlayer)) {
      setTimeout(() => {
        const move = aiMove();
        makeMove(move, 'O');
        checkEnd('O');
      }, 500);
    }
  } else if (mode === 'online' || mode === 'friend') {
    ws.send(JSON.stringify({ type: 'move', index: i }));
  }
}

function makeMove(i, player) {
  board[i] = player;
  updateBoard(i, player);
}

function checkEnd(player) {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  if (wins.some(w => w.every(i => board[i] === player))) {
    updateStatus(player === playerMark ? "You Win!" : "You Lose!");
    if (player === playerMark) score.wins++; else score.losses++;
    updateScores();
    disableBoard();
    return true;
  }
  if (!board.includes('')) {
    updateStatus("Draw!");
    score.draws++;
    updateScores();
    return true;
  }
  return false;
}

function aiMove() {
  const empty = board.map((v, i) => v === '' ? i : -1).filter(i => i >= 0);
  return empty[Math.floor(Math.random() * empty.length)];
}

function disableBoard() {
  document.querySelectorAll('.cell').forEach(c => c.classList.add('disabled'));
}

function startAI() {
  mode = 'ai';
  playerMark = 'X';
  currentPlayer = 'X';
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('game').classList.remove('hidden');
  updateScores();
  updateStatus("Your turn");
  initBoard();
}

function startOnline() {
  mode = 'online';
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('game').classList.remove('hidden');
  updateScores();
  initBoard();

  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${protocol}://${location.host}`);

  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (data.type === 'start') {
      playerMark = data.player;
      updateStatus(playerMark === 'X' ? "Your turn" : "Opponent's turn");
    }
    if (data.type === 'status') updateStatus(data.message);
    if (data.type === 'move') {
      makeMove(data.index, data.player);
    }
    if (data.type === 'gameover') {
      if (data.winner === playerMark) score.wins++;
      else if (data.winner === null) score.draws++;
      else score.losses++;
      updateScores();
      updateStatus(data.winner ? `${data.winner} Wins` : "Draw");
      disableBoard();
    }
    if (data.type === 'waiting') updateStatus(data.message);
  };
}

function startFriend() {
  alert("Play with Friends coming soon (room code support).");
}

function goToMenu() {
  document.getElementById('game').classList.add('hidden');
  document.getElementById('menu').classList.remove('hidden');
}
