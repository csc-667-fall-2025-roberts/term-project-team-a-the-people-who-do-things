import type { ChatMessage,
  ElementById,
  GameParticipant,
  GameState,
  LetterValues,
  Score,
  Tile,
  User,
} from "../../../types/client/dom.ts";
import type {
  ErrorResponse,
  GameOverResponse,
  GameStateResponse,
  MoveMadeResponse,
  NewMessageResponse,
  NewTilesResponse,
  TurnPassedResponse,
} from "../../../types/client/socket-events.ts";
import { api } from "../api.js";
import ScrabbleBoard from "../scrabbleBoard.ts";
import { socket } from "../socket.ts";

interface SelectedTile {
  row: number;
  col: number;
  letter: string;
}

const gameId: string = window.GAME_ID;
const board = new ScrabbleBoard("scrabble-board");

let gameState: GameState | null = null;
let currentUser: User | null = null;

async function init(): Promise<void> {
  try {
    const { user } = await api.auth.me();
    currentUser = user;

    const gameData = await api.games.get(gameId);
    renderPlayers(gameData.game_participants);
    renderScores(gameData.scores);

    socket.emit("join-game", { gameId });
  } catch (error) {
    console.error("Failed to initialize:", error);
  }
}

// Socket events
socket.on("game-state", (state: GameStateResponse) => {
  gameState = state;
  board.updateBoard(state.board);
  board.setHand(state.hand);
  updateGameInfo(state);
});

socket.on("move-made", (data: MoveMadeResponse) => {
  board.updateBoard(data.gameState.board);
  updateGameInfo(data.gameState);
  updateScores(data.gameState.scores);

  if (data.userId === currentUser?.id) {
    board.clearSelection();
  }
});

socket.on("new-tiles", (data: NewTilesResponse) => {
  board.setHand(data.tiles);
});

socket.on("turn-passed", (data: TurnPassedResponse) => {
  updateCurrentTurn(data.currentPlayer);
});

socket.on("game-over", (data: GameOverResponse) => {
  window.location.href = `/game/${gameId}/results`;
});

socket.on("error", (data: ErrorResponse) => {
  alert(data.message);
});

const submitMoveBtn = document.getElementById("submit-move-btn") as ElementById<HTMLButtonElement>;
submitMoveBtn?.addEventListener("click", () => {
  const selectedTiles = board.getSelectedTiles();

  if (selectedTiles.length === 0) {
    alert("Please place tiles on the board");
    return;
  }

  // Convert SelectedTile[] to Tile[] for the socket event
  const tiles: Tile[] = selectedTiles.map((t: SelectedTile) => ({
    letter: t.letter,
    value: LETTER_VALUES[t.letter as keyof LetterValues] || 0,
    x: t.col,
    y: t.row,
    isPlaced: true,
  }));

  const words = [selectedTiles.map((t: SelectedTile) => t.letter).join("")];
  const score = selectedTiles.reduce(
    (sum: number, t: SelectedTile) => sum + (LETTER_VALUES[t.letter as keyof LetterValues] || 0),
    0,
  );

  socket.emit("make-move", {
    gameId,
    tiles,
    words,
    score,
  });
});

const passBtn = document.getElementById("pass-btn") as ElementById<HTMLButtonElement>;
passBtn?.addEventListener("click", () => {
  if (confirm("Are you sure you want to pass your turn?")) {
    socket.emit("pass-turn", { gameId });
  }
});

const exchangeBtn = document.getElementById("exchange-btn") as ElementById<HTMLButtonElement>;
exchangeBtn?.addEventListener("click", () => {
  // TODO: Implement tile exchange UI
  alert("Select tiles to exchange (Oh wait..)");
});

const shuffleBtn = document.getElementById("shuffle-btn") as ElementById<HTMLButtonElement>;
shuffleBtn?.addEventListener("click", () => {
  const hand = board.hand;
  board.setHand(shuffleArray([...hand]));
});

// Chat
const chatForm = document.getElementById("chat-form") as ElementById<HTMLFormElement>;
const chatInput = document.getElementById("chat-message-input") as ElementById<HTMLInputElement>;
const chatMessages = document.getElementById("chat-messages") as ElementById<HTMLElement>;

chatForm?.addEventListener("submit", async (e: Event) => {
  e.preventDefault();

  const message = chatInput?.value.trim();
  if (!message) return;

  socket.emit("send-message", { gameId, message });
  if (chatInput) {
    chatInput.value = "";
  }
});

socket.on("new-message", (message: NewMessageResponse) => {
  addChatMessage(message);
});

function addChatMessage(message: ChatMessage): void {
  if (!chatMessages) return;

  const messageEl = document.createElement("div");
  messageEl.className = "chat-message";
  messageEl.innerHTML = `
    <strong>${message.display_name}:</strong>
    <span>${escapeHtml(message.message)}</span>
  `;
  chatMessages.appendChild(messageEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderPlayers(participants: GameParticipant[]): void {
  const playersList = document.getElementById("players-list") as ElementById<HTMLElement>;
  if (!playersList) return;

  playersList.innerHTML = participants
    .map(
      (p: GameParticipant) => `
    <div class="player-item ${p.is_host ? "host" : ""}">
      <span>${p.display_name}</span>
      ${p.is_host ? '<span class="badge">Host</span>' : ""}
    </div>
  `,
    )
    .join("");
}

function renderScores(scores: Score[]): void {
  const scoreMap = scores.reduce((acc: { [key: string]: number }, s: Score) => {
    acc[s.user_id] = s.value;
    return acc;
  }, {});
  updateScores(scoreMap);
}

function updateScores(scores: { [userId: string]: number }): void {
  console.log("Scores:", scores);
}

function updateGameInfo(state: GameStateResponse): void {
  const tilesRemainingEl = document.getElementById("tiles-remaining") as ElementById<HTMLElement>;
  if (tilesRemainingEl) {
    tilesRemainingEl.textContent = state.tilesRemaining.toString();
  }
  updateCurrentTurn(state.currentPlayer);
}

function updateCurrentTurn(playerId: string): void {
  const currentTurnEl = document.getElementById("current-turn") as ElementById<HTMLElement>;
  if (!currentTurnEl) return;

  const playerName = playerId === currentUser?.id ? "Your turn" : "Opponent's turn";
  currentTurnEl.textContent = playerName;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

const LETTER_VALUES: LetterValues = {
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
};

init()
  .then(() => {
    console.log("Game room initialized");
  })
  .catch((error) => {
    console.error("Failed to initialize game room:", error);
  });
