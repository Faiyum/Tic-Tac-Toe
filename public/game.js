let socket;
let roomCode = '';

function startCreateRoom() {
  showScreen(gameScreen);
  socket = new WebSocket('wss://your-deployment-url'); // replace with your backend URL
  socket.onopen = () => socket.send(JSON.stringify({ type: 'create' }));
  setupSocketHandlers();
}

function startJoinRoom() {
  const code = document.getElementById('roomCodeInput').value.trim().toUpperCase();
  if (!code) return alert("Enter a room code!");
  showScreen(gameScreen);
  socket = new WebSocket('wss://your-deployment-url'); // replace with your backend URL
  socket.onopen = () => socket.send(JSON.stringify({ type: 'join', room: code }));
  setupSocketHandlers();
}

function setupSocketHandlers() {
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'created') {
      roomCode = data.room;
      player = data.symbol;
      statusEl.textContent = `Room Code: ${roomCode} - Waiting for a friend...`;
    } else if (data.type === 'start') {
      player = data.symbol;
      statusEl.textContent = data.message;
      currentPlayer = 'X';
    } else if (data.type === 'move') {
      board[data.index] = data.player;
      cells[data.index].textContent = data.player;
      checkWinner();
      currentPlayer = data.player === 'X' ? 'O' : 'X';
      statusEl.textContent = `Player ${currentPlayer}'s turn`;
    } else if (data.type === 'error') {
      alert(data.message);
      location.reload();
    }
  };
}
