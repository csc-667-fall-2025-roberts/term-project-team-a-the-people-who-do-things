/* eslint-disable simple-import-sort/imports */
import { api } from "../api.js";
import { socket } from "../socket.js";
import type { NewMessageResponse, GameSummary } from "../../../types/client/socket-events.js";


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

function clearElement(el: Element | null) {
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
}

function createTextElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text: string,
  className?: string
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = text;
  return el;
}

function addChatMessage(message: NewMessageResponse & { game_ID?: string | null }) {
  if (!chatMessages) {
    console.error("chatMessages element not found in addChatMessage");
    return;
  }

  const displayName = message.display_name ?? (message as any).displayName;
  const text = message.message ?? "";

  if (!displayName || !text) {
    console.error("Invalid message format:", message);
    return;
  }

  const messageEl = document.createElement("div");
  messageEl.className = "chat-message p-2";

  const nameEl = document.createElement("strong");
  nameEl.className = "pr-2";
  nameEl.textContent = `${displayName}:`;

  const textEl = document.createElement("span");
  textEl.textContent = text;

  messageEl.appendChild(nameEl);
  messageEl.appendChild(textEl);

  chatMessages.appendChild(messageEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function loadLobbyMessages() {
  if (!chatMessages) {
    console.error("chatMessages element not found");
    return;
  }

  try {
    const { messages } = (await api.chat.getMessages(LOBBY_ID)) as { messages: NewMessageResponse[] };
    clearElement(chatMessages);
    messages.forEach((message) => {
      const normalized = {
        ...message,
        game_ID: (message as any).game_ID ?? (message as any).game_ID ?? null,
      } as NewMessageResponse & { game_ID?: string | null };

      addChatMessage(normalized);
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

  socket.emit("join-lobby", {});
  void loadLobbyMessages();

  chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;
    chatInput.value = "";
    socket.emit("send-message", { game_ID: LOBBY_ID, message });
  });

  //only one listener active for new-message to avoid duplicates
  socket.removeAllListeners("new-message");
  socket.on("new-message", (data: unknown) => {
    const message = data as NewMessageResponse;
    const isLobbyMessage =
      message.game_ID === null || message.game_ID === undefined || String(message.game_ID) === LOBBY_ID;

    if (isLobbyMessage) {
      addChatMessage({ ...message, game_ID: message.game_ID ?? null });
    }
  });
}

function makeGameCard(game: GameSummary): HTMLElement {
  const container = document.createElement("div");
  container.className =
    "flex flex-col justify-between p-5 bg-white border rounded-xl hover:border-blue-400 hover:shadow-md transition-all gap-4 h-full";

  if (game.status === "in_progress" && game.is_my_game) {
    container.classList.add("border-green-400");
    container.classList.add("ring-2");
    container.classList.add("ring-green-200");
  } else {
    container.classList.add("border-slate-200");
  }

  const top = document.createElement("div");

  const header = document.createElement("div");
  header.className = "flex items-center justify-between gap-2";

  const title = document.createElement("h3");
  title.className = "font-bold text-slate-800 text-lg truncate";
  title.textContent = game.title || `${game.creator_name ?? "Player"}'s Game`;
  header.appendChild(title);

  if (game.status === "in_progress" && game.is_my_game) {
    const badge = document.createElement("span");
    badge.className = "px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full";
    badge.textContent = "In Progress";
    header.appendChild(badge);
  }

  top.appendChild(header);

  const meta = document.createElement("div");
  meta.className = "flex items-center gap-2 mt-1";

  const statusDot = document.createElement("span");
  statusDot.className = `w-2 h-2 rounded-full ${game.current_players < game.max_players ? "bg-green-500" : "bg-red-500"}`;
  meta.appendChild(statusDot);

  const counts = document.createElement("span");
  counts.className = "text-sm text-slate-500 font-medium";
  counts.textContent = `${game.current_players} / ${game.max_players} Players`;
  meta.appendChild(counts);

  top.appendChild(meta);

  container.appendChild(top);

  const btn = document.createElement("button");
  const isRejoin = game.status === "in_progress" && game.is_my_game;
  btn.className = isRejoin
    ? "rejoin-game-btn w-full px-6 py-2 text-base font-medium text-white transition-all duration-200 bg-green-600 border-none rounded-md cursor-pointer hover:bg-green-700 hover:-translate-y-px hover:shadow-lg"
    : "join-game-btn w-full px-6 py-2 text-base font-medium text-white transition-all duration-200 bg-blue-600 border-none rounded-md cursor-pointer hover:bg-blue-700 hover:-translate-y-px hover:shadow-lg";

  btn.setAttribute("data-game-id", game.id);
  btn.setAttribute("data-game-status", game.status);
  btn.type = "button";
  btn.textContent = isRejoin ? "Rejoin Game" : "Join Game";

  container.appendChild(btn);

  return container;
}

async function loadGames() {
  if (!gamesContainer) return;
  try {
    const { games } = (await api.games.getLobby()) as { games: GameSummary[] };
    renderGames(games);
  } catch (error) {
    console.error("Failed to load games:", error);
    clearElement(gamesContainer);
    const p = createTextElement("p", "Failed to load games. Please refresh.", "text-red-500 text-center py-8");
    gamesContainer.appendChild(p);
  }
}

function renderGames(games: any[]) {
  if (!gamesContainer) return;

  clearElement(gamesContainer);
  gamesContainer.className = "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3";

  if (games.length === 0) {
    const wrapper = document.createElement("div");
    wrapper.className = "text-center py-12";

    const title = createTextElement("p", "No games available", "text-gray-600 text-lg mb-4");
    const subtitle = createTextElement("p", "Create a new game to get started!", "text-gray-500");

    wrapper.appendChild(title);
    wrapper.appendChild(subtitle);
    gamesContainer.appendChild(wrapper);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const game of games) {
    const card = makeGameCard(game);
    fragment.appendChild(card);
  }

  gamesContainer.appendChild(fragment);
}

gamesContainer?.addEventListener("click", async (event) => {
  const target = event.target as HTMLElement;
  const button = target.closest(".join-game-btn, .rejoin-game-btn") as HTMLElement | null;

  if (!button || !button.dataset.gameId) return;

  const gameId = button.dataset.gameId;
  const isRejoin = button.classList.contains("rejoin-game-btn");

  try {
    if (!isRejoin) {
      await api.games.join(gameId);
      window.location.href = `/game/${gameId}/lobby`;
    } else {
      window.location.href = `/game/${gameId}`;
    }
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

  const maxPlayersInput = document.getElementById("max-players") as HTMLSelectElement | null;
  const timeLimitInput = document.getElementById("time-limit") as HTMLInputElement | null;

  if (!maxPlayersInput || !timeLimitInput) return;

  const maxPlayers = parseInt(maxPlayersInput.value, 10) || 2;
  const timeLimit = parseInt(timeLimitInput.value, 10) || 60;

  try {
    await api.games.create({ maxPlayers, settings: { timeLimit } });
    await loadGames();
    switchTab("join");
  } catch (error) {
    console.error("Failed to create game:", error);
    alert("Failed to create game. Please try again.");
  }
});

function initLobby() {
  initLobbyChat();
  void loadGames();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initLobby();
  });
} else {
  initLobby();
}
