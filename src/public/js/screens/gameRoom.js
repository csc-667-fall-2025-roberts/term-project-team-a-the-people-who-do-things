import { api } from '../api.js';
import { socket } from '../socket.ts';
import ScrabbleBoard from '../scrabbleBoard.js';

const gameId = window.GAME_ID;
const board = new ScrabbleBoard('scrabble-board');

let gameState = null;
let currentUser = null;

async function init() {
    try {
        const { user } = await api.auth.me();
        currentUser = user;

        const gameData = await api.games.get(gameId);
        renderPlayers(gameData.game_participants);
        renderScores(gameData.scores);

        socket.emit('join-game', gameId);
    } catch (error) {
        console.error('Failed to initialize:', error);
    }
}

// Socket events
socket.on('game-state', (state) => {
    gameState = state;
    board.updateBoard(state.board);
    board.setHand(state.hand);
    updateGameInfo(state);
});

socket.on('move-made', (data) => {
    board.updateBoard(data.gameState.board);
    updateGameInfo(data.gameState);
    updateScores(data.gameState.scores);

    if (data.userId === currentUser.id) {
        board.clearSelection();
    }
});

socket.on('new-tiles', (data) => {
    board.setHand(data.tiles);
});

socket.on('turn-passed', (data) => {
    updateCurrentTurn(data.currentPlayer);
});

socket.on('game-over', (data) => {
    window.location.href = `/game/${gameId}/results`;
});

socket.on('error', (data) => {
    alert(data.message);
});

document.getElementById('submit-move-btn').addEventListener('click', () => {
    const tiles = board.getSelectedTiles();

    if (tiles.length === 0) {
        alert('Please place tiles on the board');
        return;
    }

    const words = [tiles.map(t => t.letter).join('')];
    const score = tiles.reduce((sum, t) => sum + (LETTER_VALUES[t.letter] || 0), 0);

    socket.emit('make-move', {
        gameId,
        tiles,
        words,
        score
    });
});

document.getElementById('pass-btn').addEventListener('click', () => {
    if (confirm('Are you sure you want to pass your turn?')) {
        socket.emit('pass-turn', { gameId });
    }
});

document.getElementById('exchange-btn').addEventListener('click', () => {
    // TODO: Implement tile exchange UI
    alert('Select tiles to exchange (Oh wait..)');
});

document.getElementById('shuffle-btn').addEventListener('click', () => {
    const hand = board.hand;
    board.setHand(shuffleArray([...hand]));
});

// Chat
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-message-input');
const chatMessages = document.getElementById('chat-messages');

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const message = chatInput.value.trim();
    if (!message) return;

    socket.emit('send-message', { gameId, message });
    chatInput.value = '';
});

socket.on('new-message', (message) => {
    addChatMessage(message);
});

function addChatMessage(message) {
    const messageEl = document.createElement('div');
    messageEl.className = 'chat-message';
    messageEl.innerHTML = `
    <strong>${message.display_name}:</strong>
    <span>${escapeHtml(message.message)}</span>
  `;
    chatMessages.appendChild(messageEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderPlayers(participants) {
    const playersList = document.getElementById('players-list');
    playersList.innerHTML = participants.map(p => `
    <div class="player-item ${p.is_host ? 'host' : ''}">
      <span>${p.display_name}</span>
      ${p.is_host ? '<span class="badge">Host</span>' : ''}
    </div>
  `).join('');
}

function renderScores(scores) {
    updateScores(scores.reduce((acc, s) => {
        acc[s.user_id] = s.value;
        return acc;
    }, {}));
}

function updateScores(scores) {
    console.log('Scores:', scores);
}

function updateGameInfo(state) {
    document.getElementById('tiles-remaining').textContent = state.tilesRemaining;
    updateCurrentTurn(state.currentPlayer);
}

function updateCurrentTurn(playerId) {
    let playerName;
    playerName = playerId === currentUser.id ? 'Your turn' : 'Opponent\'s turn';
    document.getElementById('current-turn').textContent = playerName;
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

const LETTER_VALUES = {
    A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8,
    K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1,
    U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10
};

init().then(r => {

});