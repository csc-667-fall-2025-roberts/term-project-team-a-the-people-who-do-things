console.log("gameLobby.ts script loaded!");

import { api } from "../api.js";
import { socket } from "../socket.js";

type GameParticipant = {
  id: string;
  display_name: string;
  is_host?: boolean;
};

type LobbyChatMessage = {
  id?: string;
  display_name: string;
  message: string;
  game_id: string | null;
};

declare global {
  interface Window {
    GAME_ID: string;
  }
}

const gameId = window.GAME_ID;
console.log("gameLobby.ts: gameId constant =", gameId);

if (!gameId) {
  console.error("gameLobby.ts: ERROR - window.GAME_ID is not set!");
}

let currentUser: { id: string; display_name: string } | null = null;
let isHost = false;

const playersList = document.getElementById("players-list");
const startGameBtn = document.getElementById("start-game-btn");
const waitingMessage = document.getElementById("waiting-message");
const gameIdDisplay = document.getElementById("game-id-display");
const playerCountDisplay = document.getElementById("player-count");
const maxPlayersDisplay = document.getElementById("max-players-display");

// Chat elements
const chatForm = document.getElementById("chat-form") as HTMLFormElement | null;
const chatInput = document.getElementById("chat-message-input") as HTMLInputElement | null;
const chatMessages = document.getElementById("chat-messages");

console.log("gameLobby.ts: DOM elements found:", {
  playersList: !!playersList,
  startGameBtn: !!startGameBtn,
  waitingMessage: !!waitingMessage,
  gameIdDisplay: !!gameIdDisplay,
  playerCountDisplay: !!playerCountDisplay,
  maxPlayersDisplay: !!maxPlayersDisplay,
  chatForm: !!chatForm,
  chatInput: !!chatInput,
  chatMessages: !!chatMessages,
});

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

  // Remove the "Chat room initialized..." message if it exists
  const initMessage = chatMessages.querySelector(".text-center.text-xs.text-gray-400");
  if (initMessage) initMessage.remove();

  const messageEl = document.createElement("div");
  messageEl.className = "p-2 rounded bg-gray-100 mb-2";
  messageEl.innerHTML = `
        <div class="flex items-start gap-2 max-w-full break-words">
            <span class="font-semibold text-blue-600 flex-shrink-0">${escapeHtml(message.display_name)}:</span>
            <span class="text-gray-700">${escapeHtml(message.message)}</span>
        </div>
    `;
  chatMessages.appendChild(messageEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function loadGameLobbyData() {
  try {
    console.log("Loading game lobby data for gameId:", gameId);
    
    const { user } = (await api.auth.me()) as { user: { id: string; display_name: string } };
    currentUser = user;
    console.log("Current user:", currentUser);

    const response = (await api.games.get(gameId)) as {
      game: { max_players: number; created_by: string };
      game_participants: Array<{ id: string; user_id: string; display_name: string; is_host: boolean }>;
    };

    console.log("API response:", response);
    console.log("Game:", response.game);
    console.log("Participants raw:", response.game_participants);

    const { game, game_participants } = response;

    if (!game) {
      console.error("Game not found in response");
      alert("Game not found");
      return;
    }

    // Map user_id to id for the GameParticipant type
    const participants: GameParticipant[] = (game_participants || []).map((p) => ({
      id: p.id || p.user_id,
      display_name: p.display_name,
      is_host: p.is_host,
    }));

    console.log("Mapped participants:", participants);

    // Check if user is host - check both created_by and is_host flag
    const userParticipant = participants.find((p) => p.id === currentUser.id);
    isHost = (game.created_by === currentUser.id) || (userParticipant?.is_host === true);
    console.log("Is host check:", {
      created_by: game.created_by,
      currentUser_id: currentUser.id,
      userParticipant,
      isHost,
    });

    if (gameIdDisplay) gameIdDisplay.textContent = gameId;
    if (maxPlayersDisplay) maxPlayersDisplay.textContent = game.max_players.toString();

    renderPlayers(participants, game.max_players);
    updateStartButtonVisibility();
    initLobbyChat();

    socket.emit("join-game-lobby", gameId); // New socket event for game lobby
  } catch (error) {
    console.error("Failed to load game lobby data:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    alert("Failed to load game lobby. Please check console for details.");
  }
}

function renderPlayers(participants: GameParticipant[], maxPlayers: number) {
  console.log("renderPlayers called with:", { participants, maxPlayers, playersList: !!playersList });
  
  if (!playersList) {
    console.error("playersList element not found!");
    return;
  }

  if (playerCountDisplay) {
    playerCountDisplay.textContent = participants.length.toString();
    console.log("Set player count to:", participants.length);
  }

  if (maxPlayersDisplay) {
    maxPlayersDisplay.textContent = maxPlayers.toString();
    console.log("Set max players to:", maxPlayers);
  }

  if (participants.length === 0) {
    console.log("No participants, showing waiting message");
    playersList.innerHTML = `<p class="text-gray-500 text-center py-4">Waiting for players...</p>`;
    return;
  }

  console.log("Rendering", participants.length, "participants");
  const html = participants
    .map(
      (participant) => `
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border ${
          participant.is_host ? "border-blue-500 bg-blue-50" : "border-gray-200"
        }">
          <span class="font-medium text-gray-800">${escapeHtml(participant.display_name)}</span>
          ${participant.is_host ? '<span class="bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded-full">Host</span>' : ""}
        </div>
      `,
    )
    .join("");
  
  console.log("Generated HTML:", html);
  playersList.innerHTML = html;
}

function updateStartButtonVisibility() {
  if (startGameBtn) {
    if (isHost) {
      startGameBtn.classList.remove("hidden");
      if (waitingMessage) waitingMessage.classList.add("hidden");
    } else {
      startGameBtn.classList.add("hidden");
      if (waitingMessage) waitingMessage.classList.remove("hidden");
    }
  }
}

async function loadChatMessages() {
  if (!chatMessages) return;

  try {
    const { messages } = (await api.chat.getMessages(gameId)) as { messages: LobbyChatMessage[] };
    chatMessages.innerHTML = "";
    
    // Remove the "Chat room initialized..." message
    const initMessage = chatMessages.querySelector(".text-center.text-xs.text-gray-400");
    if (initMessage) initMessage.remove();

    messages.forEach((message) => {
      addChatMessage({
        ...message,
        game_id: message.game_id ?? gameId,
      });
    });
  } catch (error) {
    console.error("Failed to load chat messages:", error);
  }
}

function initLobbyChat() {
  if (!chatForm || !chatInput || !chatMessages) {
    console.error("Chat elements not found for game lobby chat");
    return;
  }

  // Load existing messages
  void loadChatMessages();

  // Handle sending messages
  chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;
    chatInput.value = "";
    socket.emit("send-message", { gameId, message });
  });

  // Listen for new messages
  socket.on("new-message", (data: unknown) => {
    const message = data as LobbyChatMessage & { game_id?: string | null };
    // Check if message belongs to this game
    if (message && (message.game_id === gameId || String(message.game_id) === String(gameId))) {
      addChatMessage(message as LobbyChatMessage);
    }
  });
}

startGameBtn?.addEventListener("click", async () => {
  if (isHost) {
    try {
      await api.games.start(gameId);
      // Server will emit 'game-started' event, which will redirect players
    } catch (error) {
      console.error("Failed to start game:", error);
      alert("Failed to start game. Please try again.");
    }
  }
});

socket.on("player-joined-lobby", (data: { userId: string; displayName: string; isHost: boolean }) => {
  console.log("Player joined lobby:", data);
  void loadGameLobbyData(); // Reload data to update player list
});

socket.on("player-left-lobby", (data: { userId: string }) => {
  console.log("Player left lobby:", data);
  void loadGameLobbyData(); // Reload data to update player list
});

socket.on("game-started", (data: { gameId: string }) => {
  if (data.gameId === gameId) {
    window.location.href = `/game/${gameId}`; // Redirect to actual game room
  }
});

// Initialize on page load
console.log("gameLobby.ts: Setting up DOMContentLoaded listener");
console.log("gameLobby.ts: window.GAME_ID =", window.GAME_ID);
console.log("gameLobby.ts: gameId =", gameId);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    console.log("gameLobby.ts: DOMContentLoaded fired, calling loadGameLobbyData");
    void loadGameLobbyData();
  });
} else {
  console.log("gameLobby.ts: DOM already loaded, calling loadGameLobbyData immediately");
  void loadGameLobbyData();
}

window.addEventListener("beforeunload", () => {
  socket.emit("leave-game-lobby", gameId);
});

