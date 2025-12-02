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
    <div class="flex items-center justify-between p-4 rounded-lg ${index === 0
					? "bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-400"
					: "bg-gray-50 border border-gray-200"
				}">
      <div class="flex items-center gap-4">
        <span class="text-lg font-bold ${index === 0 ? "text-yellow-600" : "text-gray-600"} min-w-[3rem]">#${index + 1}</span>
        <span class="font-semibold text-gray-900">${participantMap.get(score.user_id) || "Unknown"}</span>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-lg font-bold text-blue-600">${score.value} points</span>
        ${index === 0 ? '<span class="px-3 py-1 bg-yellow-400 text-yellow-900 text-sm font-bold rounded-full">🏆 Winner!</span>' : ""}
      </div>
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
    <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <span class="block text-sm font-medium text-gray-600 mb-1">Game Duration</span>
      <span class="block text-xl font-bold text-gray-900">${duration} minutes</span>
    </div>
    <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <span class="block text-sm font-medium text-gray-600 mb-1">Game Type</span>
      <span class="block text-xl font-bold text-gray-900">${game.max_players || "Unknown"} Players</span>
    </div>
    <div class="p-4 bg-gray-50 rounded-lg border border-gray-200 col-span-full">
      <span class="block text-sm font-medium text-gray-600 mb-1">Started</span>
      <span class="block text-xl font-bold text-gray-900">${startTime.toLocaleString()}</span>
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
