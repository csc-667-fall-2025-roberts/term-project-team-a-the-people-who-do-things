import {
  GameStartedData,
  PlayerJoinedLobbyData,
  PlayerLeftLobbyData,
} from "../../../types/client/socket-events.js";
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

const gameId = window.GAME_ID;
console.log("gameLobby.ts: window.GAME_ID =", window.GAME_ID);

if (!gameId) {
  console.error(
    "gameLobby.ts: ERROR - window.GAME_ID is not set! Bailing out of game lobby script.",
  );
} else {
  let currentUser: { id: string; display_name: string } | null = null;
  let isHost = false;
  let currentMaxPlayers = 0;
  let currentParticipantCount = 0;

  const startGameBtn = document.getElementById("start-game-btn");
  const waitingMessage = document.getElementById("waiting-message");
  const gameIdDisplay = document.getElementById("game-id-display");

  const maxPlayersDisplay = document.getElementById("max-players-display");

  const chatForm = document.getElementById("chat-form") as HTMLFormElement | null;
  const chatInput = document.getElementById("chat-message-input") as HTMLInputElement | null;
  const chatMessages = document.getElementById("chat-messages");

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

      const { user } = await api.auth.me();
      if (!user) {
        console.error("User not logged in!");
        window.location.href = "/login";
      }
      currentUser = user;

      const response = await api.games.get(gameId);

      const { game, game_participants } = response;

      if (!game) {
        console.error("Game not found in response");
        alert("Game not found");
        return;
      }

      const participants: GameParticipant[] = Array.from(
        new Map<string, GameParticipant>(
          (game_participants || [])
            .filter((p: GameParticipant) => p && p.id && p.display_name)
            .map((p: GameParticipant) => [
              String(p.id),
              {
                id: String(p.id),
                display_name: p.display_name,
                is_host: p.is_host,
              } as GameParticipant,
            ]),
        ).values(),
      );

      const userParticipant = participants.find((p) => p.id === currentUser?.id);
      isHost = game.created_by === currentUser!.id || userParticipant?.is_host === true;
      if (gameIdDisplay) gameIdDisplay.textContent = gameId;
      if (maxPlayersDisplay) maxPlayersDisplay.textContent = game.max_players.toString();

      currentMaxPlayers = game.max_players;
      currentParticipantCount = participants.length;

      renderPlayers(participants, game.max_players);
      updateStartButtonVisibility();
      initLobbyChat();

      socket.emit("join-game-lobby", { gameId });
    } catch (error) {
      console.error("Failed to load game lobby data:", error);
      console.error("Error details:", error instanceof Error ? error.message : String(error));
      alert("Failed to load game lobby. Please check console for details.");
    }
  }

  function renderPlayers(participants: GameParticipant[], maxPlayers: number) {
    const safePlayersList = document.getElementById("players-list");
    const safePlayerCountDisplay = document.getElementById("player-count");
    const safeMaxPlayersDisplay = document.getElementById("max-players-display");

    if (!safePlayersList) {
      console.error("playersList element NOT found!");
      return;
    }

    if (safePlayerCountDisplay) {
      safePlayerCountDisplay.textContent = participants.length.toString();
    }

    if (safeMaxPlayersDisplay) {
      safeMaxPlayersDisplay.textContent = maxPlayers.toString();
    }

    if (participants.length === 0) {
      safePlayersList.innerHTML = `<p class="text-gray-500 text-center py-4">Waiting for players...</p>`;
      return;
    }

    const isOverCapacity = participants.length > maxPlayers;

    let html = "";

    if (isOverCapacity) {
      html += `
      <div class="p-3 mb-3 bg-red-100 border border-red-400 rounded-lg">
        <p class="text-red-800 font-semibold text-sm">⚠️ Too many players!</p>
        <p class="text-red-700 text-xs">This lobby has ${participants.length} players but only supports ${maxPlayers}. Some players must leave before the game can start.</p>
      </div>
    `;
    }

    html += participants
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
    safePlayersList.innerHTML = html;
  }

  function updateStartButtonVisibility() {
    if (startGameBtn) {
      const isOverCapacity = currentParticipantCount > currentMaxPlayers;

      if (isHost) {
        startGameBtn.classList.remove("hidden");
        if (waitingMessage) waitingMessage.classList.add("hidden");

        if (isOverCapacity) {
          (startGameBtn as HTMLButtonElement).disabled = true;
          startGameBtn.classList.add("opacity-50", "cursor-not-allowed");
          startGameBtn.title = "Too many players in lobby";
        } else {
          (startGameBtn as HTMLButtonElement).disabled = false;
          startGameBtn.classList.remove("opacity-50", "cursor-not-allowed");
          startGameBtn.title = "";
        }
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

      const initMessage = chatMessages.querySelector(".text-center.text-xs.text-gray-400");
      if (initMessage) initMessage.remove();

      messages.forEach((message) => {
        addChatMessage({
          ...message,
          game_id: gameId,
        });
      });
    } catch {}
  }

  function initLobbyChat() {
    if (!chatForm || !chatInput || !chatMessages) {
      return;
    }

    void loadChatMessages();

    chatForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = chatInput.value.trim();
      if (!message) return;
      chatInput.value = "";
      socket.emit("send-message", { gameId, message });
    });
    socket.on("new-message", (data: unknown) => {
      const message = data as LobbyChatMessage & { game_id?: string | null };
      if (message && (message.game_id === gameId || String(message.game_id) === String(gameId))) {
        addChatMessage(message as LobbyChatMessage);
      }
    });
  }

  startGameBtn?.addEventListener("click", async () => {
    if (isHost) {
      if (currentParticipantCount > currentMaxPlayers) {
        alert(
          `Cannot start game: Too many players (${currentParticipantCount}/${currentMaxPlayers}). Some players must leave first.`,
        );
        return;
      }

      try {
        await api.games.start(gameId);
      } catch (error) {
        console.error("Failed to start game:", error);
        alert("Failed to start game. Please try again.");
      }
    }
  });

  socket.on("player-joined-lobby", (_data: PlayerJoinedLobbyData) => {
    void loadGameLobbyData();
  });
  socket.on("player-left-lobby", (_data: PlayerLeftLobbyData) => {
    void loadGameLobbyData();
  });
  socket.on("game-started", (data: GameStartedData) => {
    if (data.gameId === gameId) {
      window.location.href = `/game/${gameId}`;
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      void loadGameLobbyData();
    });
  } else {
    void loadGameLobbyData();
  }

  window.addEventListener("beforeunload", () => {
    if (gameId) {
      socket.emit("leave-game-lobby", gameId);
    }
  });
}
