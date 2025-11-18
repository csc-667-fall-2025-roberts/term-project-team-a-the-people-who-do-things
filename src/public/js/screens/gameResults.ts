import { api } from '../api.js';

const gameId = window.GAME_ID;

async function loadResults() {
    try {
        const { game, participants, scores } = await api.games.get(gameId);

        renderScores(scores, participants);
        renderStats(game);
    } catch (error) {
        console.error('Failed to load results:', error);
    }
}

function renderScores(scores, _participants) {
    const scoresList = document.getElementById('scores-list');

    const sortedScores = scores.sort((a, b) => b.value - a.value);

    scoresList.innerHTML = sortedScores.map((score, index) => `
    <div class="score-item ${index === 0 ? 'winner' : ''}">
      <span class="rank">#${index + 1}</span>
      <span class="player-name">${score.display_name}</span>
      <span class="score-value">${score.value} points</span>
      ${index === 0 ? '<span class="badge gold">Winner!</span>' : ''}
    </div>
  `).join('');
}

function renderStats(game) {
    const statsContainer = document.getElementById('stats-container');

    const startTime = new Date(game.started_at);
    const endTime = new Date(game.ended_at);
    const duration = Math.floor((endTime - startTime) / 1000 / 60); // minutes

    statsContainer.innerHTML = `
    <div class="stat-item">
      <span class="stat-label">Game Duration:</span>
      <span class="stat-value">${duration} minutes</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Game Type:</span>
      <span class="stat-value">${game.max_players} Players</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Started:</span>
      <span class="stat-value">${startTime.toLocaleString()}</span>
    </div>
  `;
}

document.getElementById('rematch-btn')?.addEventListener('click', async () => {
    try {
        const { game: currentGame } = await api.games.get(gameId);
        const { game: newGame } = await api.games.create(
            currentGame.max_players,
            currentGame.settings_json
        );
        window.location.href = `/game/${newGame.id}`;
    } catch (error) {
        alert('Failed to create rematch: ' + error.message);
    }
});

loadResults();