import { date } from "zod";
import * as ScrabbleConstants from "../../../server/services/scrabbleConstants.js";
import { ChatMessage } from "../../../types/client/dom.js";
import type {
  GameParticipant,
  GameStateResponse,
  GameSummaryResponse,
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
let playerScores: Record<string, number> = {};
let currentPlayerId: string | null = null;
let turnTimer: number | null = null;
let timeLeft = 0;
let turnDuration = 0;
async function init(): Promise<void> {
  const { user } = (await api.auth.me()) as { user: { id: string; display_name: string } };
  currentUser = user;

  const gameData = (await api.games.get(gameId)) as GameSummaryResponse;
  // Read time limit from settings (default to 60 if missing)
  const settings = (gameData.game as any).settings;
  if (settings && settings.timeLimit) {
    turnDuration = Number(settings.timeLimit);
    console.log("Timer set to:", turnDuration);
  }

  // Save the participants so 'updateScores' knows thier names
  participants = gameData.game_participants;

  renderPlayers(gameData.game_participants);
  renderScores(gameData.scores);
  await loadChatHistory();

  socket.emit("join-game", { gameId });

  // Initialize timer display
  updateTimerDisplay();
}

init().catch((error) => {
  console.error("Failed to initialize:", error);
});

function mapErrorMessage(serverMessage: string): string {
  if (serverMessage.startsWith("Invalid word")) {
    return `${serverMessage} - not a valid Scrabble word!`;
  }
  if (serverMessage.startsWith("Tiles must be")) {
    return serverMessage;
  }
  if (serverMessage.startsWith("Not your turn")) {
    return "Wait for your turn!";
  }
  if (serverMessage.startsWith("Tile not in hand")) {
    return "You don't have that tile!";
  }
  if (serverMessage.startsWith("First word must")) {
    return "First word must cover the center square!";
  }
  if (serverMessage.startsWith("Must place")) {
    return "You must place at least one tile!";
  }

  const errorMap: Record<string, string> = {
    invalid_move: "That move is not allowed",
    tiles_already_placed: "Tiles are already placed this turn",
    insufficient_tiles: "Not enough tiles available",
  };

  return errorMap[serverMessage] || serverMessage || "An error occurred. Please try again.";
}

function showNotification(message: string, type: "error" | "success" | "info" = "error") {
  document.querySelectorAll(".game-notification").forEach((el) => el.remove());

  const notification = document.createElement("div");

  const colors = {
    error: { bg: "#ef4444", text: "#ffffff" },
    success: { bg: "#22c55e", text: "#ffffff" },
    info: { bg: "#3b82f6", text: "#ffffff" },
  };
  const color = colors[type];

  notification.className = "game-notification";
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    background-color: ${color.bg};
    color: ${color.text};
    padding: 12px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 9999;
    font-weight: 600;
    font-size: 16px;
    text-align: center;
    animation: slideDown 0.3s ease-out;
  `;
  notification.textContent = message;

  if (!document.getElementById("notification-styles")) {
    const style = document.createElement("style");
    style.id = "notification-styles";
    style.textContent = `
      @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.transition = "opacity 0.5s";
    notification.style.opacity = "0";
    setTimeout(() => notification.remove(), 500);
  }, 4000);
}

function alert(message: string) {
  showNotification(message, "error");
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

  //console.log("Submitting Move:", { gameId, tiles, words, score });

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
  if (!currentUser || currentPlayerId !== currentUser.id) {
    alert("You can only exchange tiles on your turn.");
    return;
  }

  const hand = board.getHand();
  if (!hand || hand.length === 0) {
    alert("You have no tiles to exchange.");
    return;
  }

  const confirmExchange = confirm(
    "Exchange all tiles in your hand for new ones? This will use your turn.",
  );
  if (!confirmExchange) return;

  const tilesToExchange = hand.map((t) => t.letter);

  socket.emit("exchange-tiles", {
    gameId,
    tiles: tilesToExchange,
  });
});

document.getElementById("shuffle-btn")?.addEventListener("click", () => {
  const hand = board.getHand();
  if (hand.length === 0) return;
  board.setHand(shuffleArray(hand));
});

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

function renderPlayers(participantsList: GameParticipant[]) {
  const playersList = document.getElementById("players-list");
  if (!playersList) return;

  const sorted = [...participantsList].sort((a, b) => {
    const scoreA = playerScores[a.user_id] || 0;
    const scoreB = playerScores[b.user_id] || 0;
    return scoreB - scoreA;
  });

  playersList.innerHTML = sorted
    .map((participant, index) => {
      const isMe = currentUser && participant.user_id === currentUser.id;
      const score = playerScores[participant.user_id] || 0;
      const isLeader = index === 0 && score > 0;

      let containerClass = "bg-white border-slate-200";
      if (isMe) containerClass = "bg-blue-50 border-blue-300";
      if (isLeader && !isMe) containerClass = "bg-yellow-50 border-yellow-300";
      if (isLeader && isMe)
        containerClass = "bg-gradient-to-r from-blue-50 to-yellow-50 border-yellow-300";

      return `
        <div class="flex items-center justify-between p-3 border rounded-lg shadow-sm ${containerClass}">
          <div class="flex items-center gap-2 min-w-0">
            ${isLeader ? '<span class="text-yellow-500">👑</span>' : ""}
            <span class="text-sm font-bold text-slate-700 truncate">
              ${escapeHtml(participant.display_name)}
            </span>
            ${isMe ? '<span class="text-xs text-blue-500">(you)</span>' : ""}
          </div>
          <span class="text-lg font-bold text-blue-600 ml-2">${score}</span>
        </div>
      `;
    })
    .join("");
}

function renderScores(scores: ScoreEntry[]) {
  playerScores = scores.reduce<Record<string, number>>((acc, scoreEntry) => {
    acc[scoreEntry.user_id] = scoreEntry.value;
    return acc;
  }, {});
  renderPlayers(participants);
}

function updateScores(scores: Record<string, number>) {
  playerScores = { ...playerScores, ...scores };
  renderPlayers(participants);
}

function updateGameInfo(state: GameStateResponse) {
  const tilesRemainingEl = document.getElementById("tiles-remaining");
  if (tilesRemainingEl) {
    tilesRemainingEl.textContent = state.tilesRemaining.toString();
  }
  updateCurrentTurn(state.currentPlayer, state.turnEndsAt);
}

async function loadChatHistory() {
  try {
    const { messages } = (await api.chat.getMessages(gameId)) as { messages: ChatMessage[] };

    const chatMessages = document.getElementById("chat-messages");
    if (chatMessages) chatMessages.innerHTML = "";

    messages.forEach(addChatMessage);
  } catch (error) {
    console.error("Failed to load chat history:", error);
  }
}

function updateCurrentTurn(playerId: string, turnEndsAt: number) {
//   console.log("DEBUG: updateCurrentTurn called with:", { playerId, turnEndsAt });
  if (!currentUser) return;
  const currentTurnEl = document.getElementById("current-turn");
  if (!currentTurnEl) return;

  currentPlayerId = playerId;
  const isCurrentUser = playerId === currentUser.id;
  currentTurnEl.textContent = isCurrentUser ? "Your turn" : "Opponent's turn";

  const submitBtn = document.getElementById("submit-move-btn") as HTMLButtonElement | null;
  const passBtn = document.getElementById("pass-btn") as HTMLButtonElement | null;

  if (submitBtn) {
    submitBtn.disabled = !isCurrentUser;
    submitBtn.classList.toggle("opacity-50", !isCurrentUser);
    submitBtn.classList.toggle("cursor-not-allowed", !isCurrentUser);
  }

  if (passBtn) {
    passBtn.disabled = !isCurrentUser;
    passBtn.classList.toggle("opacity-50", !isCurrentUser);
    passBtn.classList.toggle("cursor-not-allowed", !isCurrentUser);
  }

  if (turnEndsAt) {
    startTimer(turnEndsAt);
  } else {
    if (turnTimer !== null) {
      clearInterval(turnTimer);
      turnTimer = null;
    }
    timeLeft = 0; 
    updateTimerDisplay();
  }
}

function startTimer(endTime: number) {
    if (turnTimer !== null) clearInterval(turnTimer);

    turnTimer = window.setInterval(() => {
        timeLeft = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    
        updateTimerDisplay();

        if (timeLeft <= 0) {
            clearInterval(turnTimer!);
            turnTimer = null;
        }
    }, 1000);
}

function updateTimerDisplay() {
  const timerEl = document.getElementById("turn-timer");
  if (!timerEl) {
    console.warn("Timer element not found!");
    return;
  }

  const isMyTurn = currentPlayerId === currentUser?.id;

  timerEl.classList.remove("text-red-600", "text-blue-600", "text-slate-600", "text-slate-400");

  if (timeLeft <= 10) {
    timerEl.classList.add("text-red-600", "font-bold");
  } else {
    timerEl.classList.add(isMyTurn ? "text-blue-600" : "text-slate-400");
  }

  timerEl.textContent = `${timeLeft}s`;
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
const handlers = {
  gameState: (state: unknown) => {
    const typedState = state as GameStateResponse;
    if (typedState.settings && (typedState.settings as any).timeLimit) {
      turnDuration = Number((typedState.settings as any).timeLimit);
    //   console.log("Updated turnDuration from settings:", turnDuration);
    }
    board.updateBoard(typedState.board);
    board.setHand(typedState.hand);
    updateGameInfo(typedState);
  },
  moveMade: (data: unknown) => {
    const typedData = data as MoveMadeResponse;
    // console.log("Move made event received:", typedData);

    board.updateBoard(typedData.gameState.board);

    updateGameInfo(typedData.gameState);

    updateScores(typedData.gameState.scores);
    updateCurrentTurn(typedData.currentPlayer, typedData.turnEndsAt);

    if (currentUser && typedData.userId === currentUser.id) {
      board.clearSelection();
    }
  },
  playerJoined: async () => {
    console.log("Another player joined. Refreshing list...");

    try {
      const gameData = (await api.games.get(gameId)) as {
        game_participants: GameParticipant[];
        scores: any[];
      };

      participants = gameData.game_participants;
      renderPlayers(participants);
      renderScores(gameData.scores);
    } catch (e) {
      console.error("Failed to refresh player list:", e);
    }
  },
  newTiles: (data: unknown) => {
    const typedData = data as { tiles: string[] };
    if (typedData && Array.isArray(typedData.tiles)) {
      board.setHand(typedData.tiles);
    }
  },
  tilesExchanged: (data: unknown) => {
    const typedData = data as { newTiles: string[] };
    if (typedData && Array.isArray(typedData.newTiles)) {
      board.setHand(typedData.newTiles);
    }
  },
  turnPassed: (data: unknown) => {
    const typedData = data as { currentPlayer: string, turnEndsAt: number };
    updateCurrentTurn(typedData.currentPlayer, typedData.turnEndsAt);
  },

  turnChanged: (data: unknown) => {
    const typedData = data as { currentPlayer: string,  turnEndsAt: number};
    updateCurrentTurn(typedData.currentPlayer, typedData.turnEndsAt);
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
socket.on("tiles-exchanged", handlers.tilesExchanged);
socket.on("player-joined", handlers.playerJoined);
socket.on("turn-passed", handlers.turnPassed);
socket.on("turn-changed", handlers.turnChanged);
socket.on("game-over", handlers.gameOver);
socket.on("error", handlers.error);
socket.on("new-message", handlers.newMessage);

window.addEventListener("beforeunload", cleanup);
function cleanup() {
  socket.off("game-state", handlers.gameState);
  socket.off("move-made", handlers.moveMade);
  socket.off("new-tiles", handlers.newTiles);
  socket.off("tiles-exchanged", handlers.tilesExchanged);
  socket.off("player-joined-lobby", handlers.playerJoined);
  socket.off("turn-passed", handlers.turnPassed);
  socket.off("game-over", handlers.gameOver);
  socket.off("error", handlers.error);
  socket.off("new-message", handlers.newMessage);
}
