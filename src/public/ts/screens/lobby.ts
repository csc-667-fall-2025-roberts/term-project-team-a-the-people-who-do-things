import { api } from "../api.js";
import { socket } from "../socket.js";

type GameSummary = {
  id: string;
  title: string;
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
const createGameForm = document.getElementById("create-game-form") as HTMLFormElement | null;

const chatForm = document.getElementById("chat-form") as HTMLFormElement | null;
const chatInput = document.getElementById("chat-message-input") as HTMLInputElement | null;
const chatMessages = document.getElementById("chat-messages");
const LOBBY_ID = "lobby";

const joinTab = document.getElementById("join-tab");
const createTab = document.getElementById("create-tab");
const joinContent = document.getElementById("join-tab-content");
const createContent = document.getElementById("create-tab-content");

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

async function loadLobbyMessages() {
  try {
    const { messages } = (await api.chat.getMessages(LOBBY_ID)) as { messages: LobbyChatMessage[] };
    if (!chatMessages) {
      console.error("chatMessages element not found");
      return;
    }
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

function switchTab(tab: "join" | "create") {
  if (!joinTab || !createTab || !joinContent || !createContent) return;
  const activeClasses = ["text-blue-600", "border-blue-600", "bg-white", "font-bold"];
  const inactiveClasses = [
    "text-slate-500",
    "border-transparent",
    "font-medium",
    "hover:text-slate-700",
    "hover:bg-slate-50",
  ];

  if (tab === "join") {
    joinTab.classList.remove(...inactiveClasses);
    joinTab.classList.add(...activeClasses);
    createTab.classList.remove(...activeClasses);
    createTab.classList.add(...inactiveClasses);
    joinContent.classList.remove("hidden");
    createContent.classList.add("hidden");
  } else {
    createTab.classList.remove(...inactiveClasses);
    createTab.classList.add(...activeClasses);
    joinTab.classList.remove(...activeClasses);
    joinTab.classList.add(...inactiveClasses);
    createContent.classList.remove("hidden");
    joinContent.classList.add("hidden");
  }
}

joinTab?.addEventListener("click", () => switchTab("join"));
createTab?.addEventListener("click", () => switchTab("create"));

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

  socket.emit("join-lobby", {});
  console.log("Joined lobby room");

  void loadLobbyMessages();

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

    // console.log("Received new-message event:", message);
    // console.log("Message game_id:", message.game_id, "Type:", typeof message.game_id);

    const isLobbyMessage =
      message.game_id === null || message.game_id === string || message.game_id === LOBBY_ID;

    if (isLobbyMessage) {
      console.log("Adding lobby message to UI");
      addChatMessage({ ...message, game_id: message.game_id ?? null });
    } else {
      //console.log("Ignoring non-lobby message, game_id:", message.game_id);
    }
  });
}

async function loadGames() {
  try {
    const { games } = (await api.games.getLobby()) as { games: GameSummary[] };
    renderGames(games);
  } catch (error) {
    console.error("Failed to load games:", error);
    if (gamesContainer) {
      gamesContainer.innerHTML =
        '<p class="text-red-500 text-center py-8">Failed to load games. Please refresh.</p>';
    }
  }
}

function renderGames(games: GameSummary[]) {
  if (!gamesContainer) return;

  gamesContainer.className = "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3";
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
    <div class="flex flex-col justify-between p-5 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all gap-4 h-full">
      
      <div>
        <h3 class="font-bold text-slate-800 text-lg truncate">${escapeHtml(game.title || game.creator_name + "'s Game")}</h3>
        <div class="flex items-center gap-2 mt-1">
            <span class="w-2 h-2 rounded-full ${game.current_players < game.max_players ? "bg-green-500" : "bg-red-500"}"></span>
            <span class="text-sm text-slate-500 font-medium">${game.current_players} / ${game.max_players} Players</span>
        </div>
      </div>

      <button 
        class="join-game-btn w-full px-6 py-2 text-base font-medium text-white transition-all duration-200 bg-blue-600 border-none rounded-md cursor-pointer hover:bg-blue-700 hover:-translate-y-px hover:shadow-lg" 
        data-game-id="${game.id}"
      >
        Join Game
      </button>
    </div>
  `,
    )
    .join("");
}

gamesContainer?.addEventListener("click", async (event) => {
  const target = event.target as HTMLElement;
  const button = target.closest(".join-game-btn") as HTMLElement | null;

  if (!button || !button.dataset.gameId) return;

  const gameId = button.dataset.gameId;

  try {
    await api.games.join(gameId);
    window.location.href = `/game/${gameId}/lobby`;
  } catch (error) {
    if (error instanceof Error) {
      alert(error.message);
    } else {
      alert("Failed to join game.");
    }
  }
});

createGameForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  // 1. Get all input elements
  const maxPlayersInput = document.getElementById("max-players") as HTMLSelectElement | null;
  const timeLimitInput = document.getElementById("time-limit") as HTMLInputElement | null;
  const titleInput = document.getElementById("game-title") as HTMLInputElement | null;

  if (!maxPlayersInput || !timeLimitInput) return;

  // 2. Read values
  const maxPlayers = parseInt(maxPlayersInput.value, 10);
  const timeLimit = parseInt(timeLimitInput.value, 10);
  const title = titleInput?.value.trim() || "";

  // Disable button to prevent double-clicks
  const submitBtn = createGameForm.querySelector('button[type="submit"]') as HTMLButtonElement;
  if (submitBtn) submitBtn.disabled = true;

  try {
    // 3. Send to Server (Refactored to pass a single object)
    //
    const { game } = (await api.games.create({
      title,
      maxPlayers,
      settings: { timeLimit },
    })) as {
      game: { id: string };
    };

    window.location.href = `/game/${game.id}/lobby`;
  } catch (error) {
    console.error("Failed to create game:", error);
    alert(error instanceof Error ? error.message : "Failed to create game");
    if (submitBtn) submitBtn.disabled = false;
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
    switchTab("join");
  });
} else {
  void loadGames();
  initLobbyChat();
  switchTab("join");
}

// Refresh every 5 seconds
setInterval(() => {
  void loadGames();
}, 5000);
