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
const joinTab = document.getElementById("join-tab");
const createTab = document.getElementById("create-tab");
const joinTabContent = document.getElementById("join-tab-content");
const createTabContent = document.getElementById("create-tab-content");
const createGameForm = document.getElementById("create-game-form") as HTMLFormElement | null;

// Chat setup
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

// Add chat message to the UI
function addChatMessage(message: LobbyChatMessage) {
  if (!chatMessages) {
    console.error("chatMessages element not found");
    return;
  }

  if (!message?.display_name || !message.message) {
    console.error("Invalid message format:", message);
    return;
  }

  const messageEl = document.createElement("div");
  messageEl.className = "chat-message mb-3 p-2 bg-gray-50 rounded";
  messageEl.innerHTML = `
    <div class="flex items-start gap-2" style="max-width: 100%; word-wrap: break-word;">
      <span class="font-semibold text-blue-600" style="flex-shrink: 0;">${escapeHtml(message.display_name)}:</span>
      <span class="text-gray-700" style="word-wrap: break-word; overflow-wrap: break-word; max-width: 100%;">${escapeHtml(message.message)}</span>
    </div>
  `;
  chatMessages.appendChild(messageEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Load existing lobby messages
async function loadLobbyMessages() {
  try {
    const { messages } = (await api.chat.getMessages(LOBBY_ID)) as { messages: LobbyChatMessage[] };
    if (!chatMessages) return;
    
    chatMessages.innerHTML = "";
    messages.forEach((message) => {
      addChatMessage({
        ...message,
        game_id: message.game_id ?? null,
      });
    });
  } catch (error) {
    console.error("Failed to load lobby messages:", error);
  }
}

// Initialize lobby chat
function initLobbyChat() {
  if (!chatForm || !chatInput || !chatMessages) {
    console.error("Chat elements not found");
    return;
  }

  // Join lobby room
  socket.emit("join-lobby");

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

  // Listen for new messages
  socket.removeAllListeners("new-message");
  socket.on("new-message", (message: LobbyChatMessage) => {
    const isLobbyMessage =
      message.game_id === null || message.game_id === undefined || message.game_id === LOBBY_ID;

    if (isLobbyMessage) {
      addChatMessage({ ...message, game_id: message.game_id ?? null });
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

// Render games
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
    <div class="game-card-item hover:shadow-md transition-shadow">
      <div class="flex justify-between items-center">
        <div>
          <h3 class="font-semibold text-lg text-gray-800">${escapeHtml(game.creator_name)}'s Game</h3>
          <p class="text-gray-600 text-sm mt-1">Players: ${game.current_players}/${game.max_players}</p>
        </div>
        <button class="join-game-btn" data-game-id="${game.id}">
          JOIN
        </button>
      </div>
    </div>
  `,
    )
    .join("");

  // Add event listeners to join buttons
  document.querySelectorAll<HTMLButtonElement>(".join-game-btn").forEach((button) => {
    button.addEventListener("click", joinGame);
  });
}

// Join game
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

// Tab switching
function switchTab(tab: "join" | "create") {
  // Update tab buttons
  if (tab === "join") {
    joinTab?.classList.add("lobby-tab-active");
    createTab?.classList.remove("lobby-tab-active");
    joinTabContent?.classList.add("lobby-tab-content-active");
    createTabContent?.classList.remove("lobby-tab-content-active");
  } else {
    createTab?.classList.add("lobby-tab-active");
    joinTab?.classList.remove("lobby-tab-active");
    createTabContent?.classList.add("lobby-tab-content-active");
    joinTabContent?.classList.remove("lobby-tab-content-active");
  }
}

joinTab?.addEventListener("click", () => switchTab("join"));
createTab?.addEventListener("click", () => switchTab("create"));

// Create game form handler
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

// Initialize on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    void loadGames();
    initLobbyChat();
  });
} else {
  void loadGames();
  initLobbyChat();
}

// Refresh games every 5 seconds
setInterval(() => {
  void loadGames();
}, 5000);
