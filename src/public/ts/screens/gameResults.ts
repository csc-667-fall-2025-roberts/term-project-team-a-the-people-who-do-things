import "../../styles/main.css";

import { api } from "../api.js";

// Types matching the new API response structure
type MovePayload = {
  words: string[];
  score: number;
  tiles: { letter: string }[];
};

type Move = {
  user_id: string;
  display_name: string;
  payload: MovePayload;
  turn_number: number;
};

type Score = {
  user_id: string;
  value: number;
  display_name: string;
};

type GameData = {
  game: {
    id: string;
    status: string;
    max_players: number;
  };
  scores: Score[];
  moves: Move[];
  game_participants: { user_id: string; display_name: string }[];
};

const gameId = window.GAME_ID;

async function init() {
  try {
    const data = (await api.games.get(gameId)) as GameData;

    renderHeader();
    renderWinner(data);
    renderStats(data);
    renderScoreboard(data);
    setupButtons(data);
  } catch (error) {
    console.error("Failed to load results:", error);
    alert("Could not load game results.");
  }
}

function renderHeader() {
  const title = document.getElementById("results-title");
  if (title) title.textContent = "Game Over";
}

function renderWinner(data: GameData) {
  const container = document.getElementById("winner-container");
  if (!container || data.scores.length === 0) return;

  // Sort scores high to low
  const sortedScores = [...data.scores].sort((a, b) => b.value - a.value);
  const winner = sortedScores[0];

  // Check for a tie
  const isDraw = sortedScores.length > 1 && sortedScores[0].value === sortedScores[1].value;

  if (isDraw) {
    container.innerHTML = `
      <div class="text-center animate-bounce-in">
        <h2 class="text-4xl font-extrabold text-slate-800 mb-2">It's a Draw!</h2>
        <p class="text-xl text-slate-600">Well played everyone!</p>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="text-center animate-bounce-in">
        <div class="text-6xl mb-4">👑</div>
        <h2 class="text-4xl font-extrabold text-slate-800 mb-2">${winner.display_name} Wins!</h2>
        <p class="text-2xl text-blue-600 font-bold">${winner.value} points</p>
      </div>
    `;
  }
}

function renderStats(data: GameData) {
  const container = document.getElementById("stats-grid");

  // Safety check: if no moves exist (e.g. empty game), show specific message
  if (!container || !data.moves || data.moves.length === 0) {
    if (container)
      container.innerHTML =
        "<p class='col-span-3 text-center text-gray-500'>No moves were played this game.</p>";
    return;
  }

  // --- Calculate Statistics ---

  let longestWord = "";
  let longestWordPlayer = "";

  let bestTurnScore = -1;
  let bestTurnPlayer = "";
  let bestTurnWord = "";

  data.moves.forEach((move) => {
    const payload = move.payload;
    // Some moves might be skips/exchanges with no payload.words
    if (!payload || !payload.words) return;

    // 1. Check Longest Word
    payload.words.forEach((word) => {
      if (word.length > longestWord.length) {
        longestWord = word;
        longestWordPlayer = move.display_name;
      }
    });

    // 2. Check Best Turn Score
    if (payload.score > bestTurnScore) {
      bestTurnScore = payload.score;
      bestTurnPlayer = move.display_name;
      bestTurnWord = payload.words.join(", ");
    }
  });

  //Render Cards
  container.innerHTML = `
    <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-center">
      <div class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Longest Word</div>
      <div class="text-3xl font-extrabold text-slate-800 mb-1">"${longestWord || "-"}"</div>
      <div class="text-sm text-blue-600 font-medium">${longestWordPlayer || "No words played"}</div>
    </div>

    <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-center">
      <div class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Best Turn</div>
      <div class="text-3xl font-extrabold text-slate-800 mb-1">${bestTurnScore > -1 ? bestTurnScore : 0} pts</div>
      <div class="text-sm text-blue-600 font-medium">${bestTurnWord} (${bestTurnPlayer})</div>
    </div>

    <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-center">
      <div class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Moves</div>
      <div class="text-3xl font-extrabold text-slate-800 mb-1">${data.moves.length}</div>
      <div class="text-sm text-slate-500">Combined turns</div>
    </div>
  `;
}

function renderScoreboard(data: GameData) {
  const list = document.getElementById("final-scores-list");
  if (!list) return;

  const sortedScores = [...data.scores].sort((a, b) => b.value - a.value);

  list.innerHTML = sortedScores
    .map((score, index) => {
      const rank = index + 1;
      let rankBadge = `<span class="text-slate-400 font-bold w-6">#${rank}</span>`;

      // Medals for top 3
      if (rank === 1) rankBadge = `<span class="text-2xl w-8 text-center">🥇</span>`;
      if (rank === 2) rankBadge = `<span class="text-2xl w-8 text-center">🥈</span>`;
      if (rank === 3) rankBadge = `<span class="text-2xl w-8 text-center">🥉</span>`;

      return `
      <div class="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200 shadow-sm mb-3">
        <div class="flex items-center gap-4">
          ${rankBadge}
          <div class="flex flex-col">
            <span class="font-bold text-lg text-slate-800">${score.display_name}</span>
            <span class="text-xs text-slate-500">Player</span>
          </div>
        </div>
        <span class="text-2xl font-bold text-blue-600">${score.value} pts</span>
      </div>
    `;
    })
    .join("");
}

function setupButtons(_data: GameData) {
  // Back to Lobby
  document.getElementById("back-lobby-btn")?.addEventListener("click", () => {
    window.location.href = "/lobby";
  });
}

init();
