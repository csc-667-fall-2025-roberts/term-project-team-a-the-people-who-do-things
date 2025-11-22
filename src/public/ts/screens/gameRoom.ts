import { api } from "../api.ts";
import ScrabbleBoard from "../scrabbleBoard.ts";
import { socket } from "../socket.ts";

type SelectedTile = {
  row: number;
  col: number;
  letter: string;
};

type GameParticipant = {
  id: string;
  display_name: string;
  is_host?: boolean;
};

type ScoreEntry = {
  user_id: string;
  value: number;
};

type GameStatePayload = {
  board: string[][];
  hand: string[];
  scores: Record<string, number>;
  currentPlayer: string;
  tilesRemaining: number;
};

type MoveMadePayload = {
  userId: string;
  gameState: GameStatePayload;
};

type ChatMessage = {
  display_name: string;
  message: string;
};

type GameSummaryResponse = {
  game_participants: GameParticipant[];
  scores: ScoreEntry[];
};

declare global {
  interface Window {
    GAME_ID: string;
  }
}

const gameId = window.GAME_ID;
const board = new ScrabbleBoard("scrabble-board");

let gameState: GameStatePayload | null = null;
let currentUser: { id: string; display_name: string } | null = null;

async function init() {
  try {
    const { user } = (await api.auth.me()) as { user: { id: string; display_name: string } };
    currentUser = user;

    const gameData = (await api.games.get(gameId)) as GameSummaryResponse;
    renderPlayers(gameData.game_participants);
    renderScores(gameData.scores);

    socket.emit("join-game", gameId);
  } catch (error) {
    console.error("Failed to initialize:", error);
  }
}

// Socket events
socket.on("game-state", (data: any) => {
  const state = data as GameStatePayload;
  gameState = state;
  board.updateBoard(state.board);
  board.setHand(state.hand);
  updateGameInfo(state);
});

socket.on("move-made", (data: any) => {
  const move = data as MoveMadePayload;
  board.updateBoard(move.gameState.board);
  updateGameInfo(move.gameState);
  updateScores(move.gameState.scores);

  if (currentUser && move.userId === currentUser.id) {
    board.clearSelection();
  }
});

socket.on("new-tiles", (data: any) => {
  const hand = data as { tiles: string[] };
  board.setHand(hand.tiles);
});

socket.on("turn-passed", (data: any) => {
  const turn = data as { currentPlayer: string };
  updateCurrentTurn(turn.currentPlayer);
});

socket.on("game-over", () => {
  window.location.href = `/game/${gameId}/results`;
});

socket.on("error", (data: any) => {
  const error = data as { message: string };
  alert(error.message);
});

document.getElementById("submit-move-btn")?.addEventListener("click", () => {
  const tiles = board.getSelectedTiles() as SelectedTile[];

  if (tiles.length === 0) {
    alert("Please place tiles on the board");
    return;
  }

  const words = [tiles.map((tile) => tile.letter).join("")];
  const score = tiles.reduce(
    (sum, tile) => sum + (LETTER_VALUES[tile.letter as LetterKey] || 0),
    0,
  );

  socket.emit("make-move", {
    gameId,
    tiles,
    words,
    score,
  });
});

document.getElementById("pass-btn")?.addEventListener("click", () => {
  if (confirm("Are you sure you want to pass your turn?")) {
    socket.emit("pass-turn", { gameId });
  }
});

document.getElementById("exchange-btn")?.addEventListener("click", () => {
  alert("Select tiles to exchange (feature coming soon).");
});

document.getElementById("shuffle-btn")?.addEventListener("click", () => {
  const hand = board.getHand();
  board.setHand(shuffleArray(hand));
});

// Chat
const chatForm = document.getElementById("chat-form") as HTMLFormElement | null;
const chatInput = document.getElementById("chat-message-input") as HTMLInputElement | null;
const chatMessages = document.getElementById("chat-messages");

chatForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!chatInput) return;
  const message = chatInput.value.trim();
  if (!message) return;

  socket.emit("send-message", { gameId, message });
  chatInput.value = "";
});

socket.on("new-message", (data: any) => {
  const message = data as ChatMessage;
  addChatMessage(message);
});

function addChatMessage(message: ChatMessage) {
  if (!chatMessages) return;
  const messageEl = document.createElement("div");
  messageEl.className = "chat-message";
  messageEl.innerHTML = `
    <strong>${escapeHtml(message.display_name)}:</strong>
    <span>${escapeHtml(message.message)}</span>
  `;
  chatMessages.appendChild(messageEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderPlayers(participants: GameParticipant[]) {
  const playersList = document.getElementById("players-list");
  if (!playersList) return;

  playersList.innerHTML = participants
    .map(
      (participant) => `
    <div class="player-item ${participant.is_host ? "host" : ""}">
      <span>${participant.display_name}</span>
      ${participant.is_host ? '<span class="badge">Host</span>' : ""}
    </div>
  `,
    )
    .join("");
}

function renderScores(scores: ScoreEntry[]) {
  const aggregated = scores.reduce<Record<string, number>>((acc, scoreEntry) => {
    acc[scoreEntry.user_id] = scoreEntry.value;
    return acc;
  }, {});
  updateScores(aggregated);
}

function updateScores(scores: Record<string, number>) {
  console.log("Scores:", scores);
}

function updateGameInfo(state: GameStatePayload) {
  const tilesRemainingEl = document.getElementById("tiles-remaining");
  if (tilesRemainingEl) {
    tilesRemainingEl.textContent = state.tilesRemaining.toString();
  }
  updateCurrentTurn(state.currentPlayer);
}

function updateCurrentTurn(playerId: string) {
  if (!currentUser) return;
  const currentTurnEl = document.getElementById("current-turn");
  if (!currentTurnEl) return;

  const isCurrentUser = playerId === currentUser.id;
  currentTurnEl.textContent = isCurrentUser ? "Your turn" : "Opponent's turn";
}

function shuffleArray<T>(array: T[]) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function escapeHtml(text: string) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

const LETTER_VALUES = {
  A: 1,
  B: 3,
  C: 3,
  D: 2,
  E: 1,
  F: 4,
  G: 2,
  H: 4,
  I: 1,
  J: 8,
  K: 5,
  L: 1,
  M: 3,
  N: 1,
  O: 1,
  P: 3,
  Q: 10,
  R: 1,
  S: 1,
  T: 1,
  U: 1,
  V: 4,
  W: 4,
  X: 8,
  Y: 4,
  Z: 10,
} as const;

type LetterKey = keyof typeof LETTER_VALUES;

void init();
