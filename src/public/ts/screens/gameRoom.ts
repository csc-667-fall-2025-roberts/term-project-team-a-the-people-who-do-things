import { api } from "../api.ts";
import { socket } from "../socket.ts";
import ScrabbleBoard from "../scrabbleBoard.ts";
import type { NewTilesResponse } from "../../../types/client/socket-events.ts";

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
socket.on("game-state", (state: unknown) => {
  const typedState: GameStatePayload = state as GameStatePayload;
  gameState = typedState;
  board.updateBoard(typedState.board);
  board.setHand(typedState.hand);
  updateGameInfo(typedState);
});

socket.on("move-made", (data: unknown) => {
    const typedData: MoveMadePayload = data as MoveMadePayload;
  board.updateBoard(typedData.gameState.board);
  updateGameInfo(typedData.gameState);
  updateScores(typedData.gameState.scores);

  if (currentUser && typedData.userId === currentUser.id) {
    board.clearSelection();
  }
});

socket.on("new-tiles", (data: unknown) => {
    const typedData = data as NewTilesResponse;
    board.setHand(typedData.tiles.map(tile => tile.letter));
});

socket.on("turn-passed", (data: unknown) => {
  const typedData = data as { currentPlayer: string };
  updateCurrentTurn(typedData.currentPlayer);
});

socket.on("game-over", () => {
  window.location.href = `/game/${gameId}/results`;
});

socket.on("error", (data: unknown) => {
  const typedData = data as { message: string };
  const userMessage: string = mapErrorMessage(typedData.message);
  showErrorNotification(userMessage);
});

function mapErrorMessage(serverMessage: string): string {
  const errorMap: Record<string, string> = {
    "invalid_move": "That move is not allowed",
    "tiles_already_placed": "Tiles are already placed this turn",
    "insufficient_tiles": "Not enough tiles available",
  };

  return errorMap[serverMessage] || "An error occurred. Please try again.";
}

function showErrorNotification(message: string) {
  const notification = document.createElement("div");
  notification.className = "error-notification";
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => notification.remove(), 5000);
}

document.getElementById("submit-move-btn")?.addEventListener("click", () => {
  const tiles = board.getSelectedTiles() as SelectedTile[];

  if (tiles.length === 0) {
    alert("Please place tiles on the board");
    return;
  }

  const words = [tiles.map((tile) => tile.letter).join("")];
  const score = tiles.reduce((sum, tile) => sum + (LETTER_VALUES[tile.letter as LetterKey] || 0), 0);

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

socket.on("new-message", (message: unknown) => {
  const typedMessage = message as ChatMessage;
  addChatMessage(typedMessage);
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

const handlers = {
  gameState: (state: unknown) => {
    const typedState: GameStatePayload = state as GameStatePayload;
    gameState = typedState;
    board.updateBoard(typedState.board);
    board.setHand(typedState.hand);
    updateGameInfo(typedState);
  },
  moveMade: (data: unknown) => {
    const typedData: MoveMadePayload = data as MoveMadePayload;
    board.updateBoard(typedData.gameState.board);
    updateGameInfo(typedData.gameState);
    updateScores(typedData.gameState.scores);
    if (currentUser && typedData.userId === currentUser.id) {
      board.clearSelection();
    }
  },
  newTiles: (data: unknown) => {
    const typedData = data as NewTilesResponse;
    board.setHand(typedData.tiles.map(tile => tile.letter));
  },
  turnPassed: (data: unknown) => {
    const typedData = data as { currentPlayer: string };
    updateCurrentTurn(typedData.currentPlayer);
  },
  gameOver: () => {
    window.location.href = `/game/${gameId}/results`;
  },
  error: (data: unknown) => {
    const typedData = data as { message: string };
    const userMessage: string = mapErrorMessage(typedData.message);
    showErrorNotification(userMessage);
  },
  newMessage: (message: unknown) => {
    const typedMessage = message as ChatMessage;
    addChatMessage(typedMessage);
  },
};

// Add at the end of the file
window.addEventListener("beforeunload", cleanup);
// Updated cleanup function
function cleanup() {
  socket.off("game-state", handlers.gameState);
  socket.off("move-made", handlers.moveMade);
  socket.off("new-tiles", handlers.newTiles);
  socket.off("turn-passed", handlers.turnPassed);
  socket.off("game-over", handlers.gameOver);
  socket.off("error", handlers.error);
  socket.off("new-message", handlers.newMessage);
}
