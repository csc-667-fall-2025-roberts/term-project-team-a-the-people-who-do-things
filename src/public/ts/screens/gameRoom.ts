import * as ScrabbleConstants from "../../../server/services/scrabbleConstants.js";
import { ChatMessage } from "../../../types/client/dom.js";
import type {
  GameParticipant,
  GameStateResponse,
  MoveMadeResponse,
  ScoreEntry,
  SelectedTile,
} from "../../../types/client/socket-events.js";
import { api } from "../api.js";
import ScrabbleBoard from "../scrabbleBoard.js";
import { socket } from "../socket.js";

const gameId = window.GAME_ID;
const board = new ScrabbleBoard("scrabble-board");
let currentUser: { id: string; display_name: string } | null = null;
let participants: GameParticipant[] = [];

async function init(): Promise<void> {
  const { user } = (await api.auth.me()) as { user: { id: string; display_name: string } };
  currentUser = user;

  // const gameData = (await api.games.get(gameId)) as GameSummaryResponse;
  // renderPlayers(gameData.game_participants);
  // renderScores(gameData.scores);

  socket.emit("join-game", gameId);
}

init().catch((error) => {
  console.error("Failed to initialize:", error);
});
init().catch((error) => {
  console.error("Failed to initialize:", error);
});

function mapErrorMessage(serverMessage: string): string {
  const errorMap: Record<string, string> = {
    invalid_move: "That move is not allowed",
    tiles_already_placed: "Tiles are already placed this turn",
    insufficient_tiles: "Not enough tiles available",
  };

  return errorMap[serverMessage] || "An error occurred. Please try again.";
}

function alert(message: string) {
  const notification = document.createElement("div");
  notification.className = "error-notification";
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => notification.remove(), 5000);
}

document.getElementById("submit-move-btn")?.addEventListener("click", () => {
  const tiles = board.getSelectedTiles() as SelectedTile[];

  tiles.sort((a, b) => {
    if (a.row === b.row) return a.col - b.col;
    return a.row - b.row;
  });

  const words = [tiles.map((tile) => tile.letter).join("")];
  const score = tiles.reduce(
    (sum, tile) => sum + (ScrabbleConstants.LETTER_VALUES[tile.letter] || 0),
    0,
  );

  console.log("Submitting Move:", { gameId, tiles, words, score });

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
  if (hand.length === 0) return;
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

socket.on("new-message", (data: unknown) => {
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
  const scoresContainer = document.getElementById("scores-list");
  if (!scoresContainer) return;

  scoresContainer.innerHTML = Object.entries(scores)
    .map(([userId, score]) => {
      const participant = participants.find((p: GameParticipant) => p.user_id === userId);
      const displayName = participant?.display_name || "Unknown";

      return `
        <div class="score-item ${currentUser?.id === userId ? "current-user" : ""}">
          <span class="player-name">${displayName}</span>
          <span class="score-value">${score}</span>
        </div>
      `;
    })
    .join("");
}

function updateGameInfo(state: GameStateResponse) {
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
//IGNORE THE DUPLICATE WARNING
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
const handlers = {
  gameState: (state: unknown) => {
    const typedState = state as GameStateResponse;
    board.updateBoard(typedState.board);
    board.setHand(typedState.hand);
    updateGameInfo(typedState);
  },
  moveMade: (data: unknown) => {
    const typedData = data as MoveMadeResponse;
    board.updateBoard(typedData.gameState.board);
    updateGameInfo(typedData.gameState);
    updateScores(typedData.gameState.scores);
    
    if (currentUser && typedData.userId === currentUser.id) {
      board.clearSelection();
    }
  },
  newTiles: (data: unknown) => {
    console.log("Received new tiles:", data);
    const typedData = data as { tiles: string[] };
    if (typedData && Array.isArray(typedData.tiles)) {
      board.setHand(typedData.tiles);
    }
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
    alert(userMessage);
  },
  newMessage: (message: unknown) => {
    const typedMessage = message as ChatMessage;
    addChatMessage(typedMessage);
  },
};

socket.on("game-state", handlers.gameState);
socket.on("move-made", handlers.moveMade);
socket.on("new-tiles", handlers.newTiles);
socket.on("turn-passed", handlers.turnPassed);
socket.on("game-over", handlers.gameOver);
socket.on("error", handlers.error);
socket.on("new-message", handlers.newMessage);

window.addEventListener("beforeunload", cleanup);
function cleanup() {
  socket.off("game-state", handlers.gameState);
  socket.off("move-made", handlers.moveMade);
  socket.off("new-tiles", handlers.newTiles);
  socket.off("turn-passed", handlers.turnPassed);
  socket.off("game-over", handlers.gameOver);
  socket.off("error", handlers.error);
  socket.off("new-message", handlers.newMessage);
}
