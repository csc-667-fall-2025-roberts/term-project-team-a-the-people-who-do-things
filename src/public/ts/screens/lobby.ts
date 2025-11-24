import { api } from "../api.ts";
import { socket } from "../socket.ts";

type GameSummary = {
  id: string;
  creator_name: string;
  current_players: number;
  max_players: number;
};

type LobbyChatMessage = {
  id?: string;
  display_name: string;
  message: string;
  game_id: string | null;
};

const gamesContainer = document.getElementById("games-container");
const createGameBtn = document.getElementById("create-game-btn");
const createGameModal = document.getElementById("create-game-modal");
const createGameForm = document.getElementById("create-game-form") as HTMLFormElement | null;


const chatForm = document.getElementById("chat-form") as HTMLFormElement | null;
const chatInput = document.getElementById("chat-message-input") as HTMLInputElement | null;
const chatMessages = document.getElementById("chat-messages");
const LOBBY_ID = "lobby";

// Escape HTML to prevent XSS
function escapeHtml(text: string) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function addChatMessage(message: LobbyChatMessage) {
  if (!chatMessages) {
    console.error("chatMessages element not found in addChatMessage");
    return;
  }

  if (!message?.display_name || !message.message) {
    console.error("Invalid message format:", message);
    return;
  }

  const messageEl = document.createElement("div");
  messageEl.className = "chat-message";
  messageEl.innerHTML = `
        <strong>${escapeHtml(message.display_name)}:</strong>
        <span>${escapeHtml(message.message)}</span>
    `;
  chatMessages.appendChild(messageEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Load existing lobby messages
async function loadLobbyMessages() {
  try {
    const { messages } = (await api.chat.getMessages(LOBBY_ID)) as { messages: LobbyChatMessage[] };
    console.log("Loaded lobby messages:", messages);
    if (!chatMessages) {
      console.error("chatMessages element not found");
      return;
    }
    chatMessages.innerHTML = "";
    messages.forEach((message) => {
      console.log("Adding message:", message);
      addChatMessage({
        ...message,
        game_id: message.game_id ?? null,
      });
    });
  } catch (error) {
    console.error("Failed to load lobby messages:", error);
  }
}

function initLobbyChat() {

  if (!chatForm || !chatInput || !chatMessages) {
    console.error("Chat elements not found:", {
      chatForm: !!chatForm,
      chatInput: !!chatInput,
      chatMessages: !!chatMessages,
    });
    return;
  }

  console.log("Initializing lobby chat...");

  // Join lobby room
  socket.emit("join-lobby");
  console.log("Joined lobby room");

  // Load existing messages
  void loadLobbyMessages();

  // Handle sending messages
  chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const message = chatInput.value.trim();
    if (!message) return;

    chatInput.value = "";
    socket.emit("send-message", { gameId: LOBBY_ID, message });
  });

  socket.removeAllListeners("new-message");
  socket.on("new-message", (data: unknown) => {
    const message = data as LobbyChatMessage;

    console.log("Received new-message event:", message);
    console.log("Message game_id:", message.game_id, "Type:", typeof message.game_id);

    const isLobbyMessage =
      message.game_id === null || message.game_id === undefined || message.game_id === LOBBY_ID;

    if (isLobbyMessage) {
      console.log("Adding lobby message to UI");
      addChatMessage({ ...message, game_id: message.game_id ?? null });
    } else {
      console.log("Ignoring non-lobby message, game_id:", message.game_id);
    }
  });
}

// Load games
async function loadGames() {
  try {
    const { games } = (await api.games.getLobby()) as { games: GameSummary[] };
    renderGames(games);
  } catch (error) {
    console.error("Failed to load games:", error);
    if (gamesContainer) {
      gamesContainer.innerHTML = '<p class="text-red-500 text-center py-8">Failed to load games. Please refresh.</p>';
    }
  }
}

function renderGames(games: GameSummary[]) {
  if (!gamesContainer) return;

  if (games.length === 0) {
    gamesContainer.innerHTML = `
      <div class="text-center py-12">
        <p class="text-gray-600 text-lg mb-4">No games available</p>
        <p class="text-gray-500">Create a new game to get started!</p>
      </div>
    `;
    return;
  }

  gamesContainer.innerHTML = games
    .map(
      (game) => `
    <div class="game-card" data-game-id="${game.id}">
      <h3>${game.creator_name}'s Game</h3>
      <p>Players: ${game.current_players}/${game.max_players}</p>
      <button class="btn btn-primary join-game-btn" data-game-id="${game.id}">
        Join Game
      </button>
    </div>
  `,
    )
    .join("");

  document.querySelectorAll<HTMLButtonElement>(".join-game-btn").forEach((button) => {
    button.addEventListener("click", joinGame);
  });
}

async function joinGame(event: Event) {
  const target = event.currentTarget as HTMLElement | null;
  const gameId = target?.dataset.gameId;
  if (!gameId) return;

  try {
    await api.games.join(gameId);
    window.location.href = `/game/${gameId}`;
  } catch (error) {
    if (error instanceof Error) {
      alert(error.message);
    } else {
      alert("Failed to join game. Please try again.");
    }
  }
}

createGameBtn?.addEventListener("click", () => {
  if (createGameModal) {
    createGameModal.setAttribute("style", "display: block;");
  }
});

createGameModal
  ?.querySelector<HTMLButtonElement>(".close")
  ?.addEventListener("click", () => createGameModal.setAttribute("style", "display: none;"));

createGameForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const maxPlayersInput = document.getElementById("max-players") as HTMLSelectElement | null;
  const timeLimitInput = document.getElementById("time-limit") as HTMLInputElement | null;
  if (!maxPlayersInput || !timeLimitInput) return;

  const maxPlayers = parseInt(maxPlayersInput.value, 10);
  const timeLimit = parseInt(timeLimitInput.value, 10);

  try {
    const { game } = (await api.games.create(maxPlayers, { timeLimit })) as {
      game: { id: string };
    };
    window.location.href = `/game/${game.id}`;
  } catch (error) {
    if (error instanceof Error) {
      alert(error.message);
    } else {
      alert("Failed to create game. Please try again.");
    }
  }
});

// Socket events
socket.on("game-created", () => {
  void loadGames();
});

socket.on("game-started", () => {
  void loadGames();
});

// Wait for DOM to be ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    void loadGames();
    initLobbyChat();
  });
} else {
  void loadGames();
  initLobbyChat();
}

// Refresh every 5 seconds
setInterval(() => {
  void loadGames();
}, 5000);
