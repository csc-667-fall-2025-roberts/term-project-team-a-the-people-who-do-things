import { api } from '../api.js';
import { socket } from '../socket.js';

const gamesContainer = document.getElementById('games-container');
const createGameBtn = document.getElementById('create-game-btn');
const createGameModal = document.getElementById('create-game-modal');
const createGameForm = document.getElementById('create-game-form');

async function loadGames() {
    try {
        const {games: games} = await api.games.getLobby();
        renderGames(games);
    } catch (error) {
        console.error('Failed to load games:', error);
    }
}

function renderGames(games) {
    if (games.length === 0) {
        gamesContainer.innerHTML = '<p class="no-games">No games available. Create one!</p>';
        return;
    }

    gamesContainer.innerHTML = games.map(game => `
    <div class="game-card" data-game-id="${game.id}">
      <h3>${game.creator_name}'s Game</h3>
      <p>Players: ${game.current_players}/${game.max_players}</p>
      <button class="btn btn-primary join-game-btn" data-game-id="${game.id}">
        Join Game
      </button>
    </div>
  `).join('');

    document.querySelectorAll('.join-game-btn').forEach(btn => {
        btn.addEventListener('click', joinGame);
    });
}

async function joinGame(e) {
    const gameId = e.target.dataset.gameId;

    try {
        await api.games.join(gameId);
        window.location.href = `/game/${gameId}`;
    } catch (error) {
        alert(error.message);
    }
}

createGameBtn.addEventListener('click', () => {
    createGameModal.style.display = 'block';
});

createGameModal.querySelector('.close').addEventListener('click', () => {
    createGameModal.style.display = 'none';
});

createGameForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const maxPlayers = parseInt(document.getElementById('max-players').value);
    const timeLimit = parseInt(document.getElementById('time-limit').value);

    try {
        const { game } = await api.games.create(maxPlayers, { timeLimit });
        window.location.href = `/game/${game.id}`;
    } catch (error) {
        alert(error.message);
    }
});

// Socket events
socket.on('game-created', () => {
    loadGames();
});

socket.on('game-started', ({ gameId }) => {
    loadGames();
});

// Initial load
loadGames();

// Refresh every 5 seconds
setInterval(loadGames, 5000);