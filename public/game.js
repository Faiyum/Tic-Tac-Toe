document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const btnPlayOnline = document.getElementById('btnPlayOnline');
  const btnCreateRoom = document.getElementById('btnCreateRoom');
  const btnJoinRoom = document.getElementById('btnJoinRoom');
  const btnResetStats = document.getElementById('reset-stats'); // fixed id here
  const roomCodeInput = document.getElementById('roomCodeInput');
  const menuMsg = document.getElementById('menuMsg');
  const board = document.getElementById('board'); // container for cells
  const statusText = document.getElementById('status'); // fixed id
  const scoreboardWins = document.getElementById('wins'); // fixed id
  const scoreboardLosses = document.getElementById('losses'); // fixed id
  const scoreboardDraws = document.getElementById('draws'); // fixed id

  let socket = null;
  let roomCode = '';
  let playerSymbol = '';
  let isMyTurn = false;
  let boardState = Array(9).fill('');
  let gameActive = false;

  // Create 9 cells dynamically
  function createBoard() {
    board.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.index = i;
      board.appendChild(cell);
    }
  }

  createBoard();

  const boardCells = document.querySelectorAll('.cell');

  // --- Helper Functions ---
  function setStatus(text) {
    statusText.textContent = text;
  }

  function resetBoard() {
    boardState.fill('');
    boardCells.forEach(cell => {
      cell.textContent = '';
      cell.classList.remove('win');
    });
    gameActive = true;
  }

  function updateScoreboard(winner) {
    let wins = parseInt(localStorage.getItem('wins') || '0');
    let losses = parseInt(localStorage.getItem('losses') || '0');
    let draws = parseInt(localStorage.getItem('draws') || '0');

    if (winner === playerSymbol) {
      wins++;
      localStorage.setItem('wins', wins);
    } else if (winner && winner !== playerSymbol) {
      losses++;
      localStorage.setItem('losses', losses);
    } else {
      draws++;
      localStorage.setItem('draws', draws);
    }

    scoreboardWins.textContent = wins;
    scoreboardLosses.textContent = losses;
    scoreboardDraws.textContent = draws;
  }

  function loadScoreboard() {
    scoreboardWins.textContent = localStorage.getItem('wins') || '0';
    scoreboardLosses.textContent = localStorage.getItem('losses') || '0';
    scoreboardDraws.textContent = localStorage.getItem('draws') || '0';
  }

  function highlightWinLine(indices) {
    indices.forEach(i => boardCells[i].classList.add('win'));
  }

  function checkWin(player) {
    const winConditions = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];
    for (const condition of winConditions) {
      if (condition.every(i => boardState[i] === player)) {
        highlightWinLine(condition);
        return true;
      }
    }
    return false;
  }

  function checkDraw() {
    return boardState.every(cell => cell !== '');
  }

  // --- WebSocket connection and room management ---

  function connectToServer() {
    if (socket) socket.close();
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
        boardState[msg.index] = msg.player;
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
    localStorage.removeItem('wins');
    localStorage.removeItem('losses');
    localStorage.removeItem('draws');
    loadScoreboard();
    menuMsg.textContent = 'Stats reset.';
  };

  boardCells.forEach((cell, idx) => {
    cell.addEventListener('click', () => {
      if (!gameActive || !isMyTurn || boardState[idx] !== '') return;
      boardState[idx] = playerSymbol;
      cell.textContent = playerSymbol;
      isMyTurn = false;
      setStatus("Opponent's turn");
      socket.send(JSON.stringify({ type: 'move', index: idx }));
    });
  });

  // --- Initialize ---

  loadScoreboard();
  setStatus('Click Play Online to connect');
  menuMsg.textContent = 'Ready to play!';
});
