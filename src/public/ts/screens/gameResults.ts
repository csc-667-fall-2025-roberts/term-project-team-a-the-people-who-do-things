import { GameParticipant, ScoreEntry } from "../../../types/client/socket-events.js";
import { api } from "../api.js";

const gameId = window.GAME_ID;

interface GameResultData {
  game_participants: GameParticipant[];
  scores: ScoreEntry[];
  started_at?: string;
  ended_at?: string;
  max_players?: number;
}

async function loadResults() {
  try {
    const gameData = (await api.games.get(gameId)) as GameResultData;
    renderScores(gameData.scores, gameData.game_participants);
    if (gameData.started_at && gameData.ended_at && gameData.max_players) {
      renderStats(gameData);
    }
  } catch (error) {
    console.error("Failed to load results:", error);
  }
}

function renderScores(scores: ScoreEntry[], participants: GameParticipant[]) {
  const scoresList = document.getElementById("scores-list");
  if (!scoresList) return;

  const participantMap = new Map(participants.map((p) => [p.user_id, p.display_name]));

  const sortedScores = [...scores].sort((a, b) => b.value - a.value);

  scoresList.innerHTML = sortedScores
    .map(
      (score, index) => `
    <div class="score-item ${index === 0 ? "winner" : ""}">
      <span class="rank">#${index + 1}</span>
      <span class="player-name">${participantMap.get(score.user_id) || "Unknown"}</span>
      <span class="score-value">${score.value} points</span>
      ${index === 0 ? '<span class="badge gold">Winner!</span>' : ""}
    </div>
  `,
    )
    .join("");
}

function renderStats(game: GameResultData) {
  const statsContainer = document.getElementById("stats-container");
  if (!statsContainer || !game.started_at || !game.ended_at) return;

  const startTime = new Date(game.started_at);
  const endTime = new Date(game.ended_at);
  const duration = Math.max(1, Math.floor((endTime.getTime() - startTime.getTime()) / 1000 / 60));

  statsContainer.innerHTML = `
    <div class="stat-item">
      <span class="stat-label">Game Duration:</span>
      <span class="stat-value">${duration} minutes</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Game Type:</span>
      <span class="stat-value">${game.max_players || "Unknown"} Players</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Started:</span>
      <span class="stat-value">${startTime.toLocaleString()}</span>
    </div>
  `;
}

document.getElementById("rematch-btn")?.addEventListener("click", async () => {
  try {
    const currentGame = (await api.games.get(gameId)) as GameResultData;
    const { game: newGame } = (await api.games.create(currentGame.max_players || 2, {})) as {
      game: { id: string };
    };
    window.location.href = `/game/${newGame.id}`;
  } catch (error) {
    if (error instanceof Error) {
      alert(`Failed to create rematch: ${error.message}`);
    } else {
      alert("Failed to create rematch. Please try again.");
    }
  }
});

void loadResults();
