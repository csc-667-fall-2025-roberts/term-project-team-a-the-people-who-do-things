import { api } from '../api.js';
import { socket } from '../socket.ts';

const gamesContainer = document.getElementById('games-container');
const createGameBtn = document.getElementById('create-game-btn');
const createGameModal = document.getElementById('create-game-modal');
const createGameForm = document.getElementById('create-game-form');

// Chat setup
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-message-input');
const chatMessages = document.getElementById('chat-messages');
const LOBBY_ID = 'lobby';

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add chat message to the UI
function addChatMessage(message) {
    if (!chatMessages) {
        console.error('chatMessages element not found in addChatMessage');
        return;
    }
    
    if (!message || !message.display_name || !message.message) {
        console.error('Invalid message format:', message);
        return;
    }
    
    const messageEl = document.createElement('div');
    messageEl.className = 'chat-message';
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
        const { messages } = await api.chat.getMessages(LOBBY_ID);
        console.log('Loaded lobby messages:', messages);
        if (!chatMessages) {
            console.error('chatMessages element not found');
            return;
        }
        chatMessages.innerHTML = '';
        messages.forEach(message => {
            console.log('Adding message:', message);
            addChatMessage(message);
        });
    } catch (error) {
        console.error('Failed to load lobby messages:', error);
    }
}

// Initialize lobby chat
function initLobbyChat() {
    // Check if chat elements exist
    if (!chatForm || !chatInput || !chatMessages) {
        console.error('Chat elements not found:', {
            chatForm: !!chatForm,
            chatInput: !!chatInput,
            chatMessages: !!chatMessages
        });
        return;
    }
    
    console.log('Initializing lobby chat...');
    
    // Join lobby room
    socket.emit('join-lobby');
    console.log('Joined lobby room');
    
    // Load existing messages
    loadLobbyMessages();
    
    // Handle sending messages
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const message = chatInput.value.trim();
        if (!message) return;
        
        // Clear input immediately for better UX
        chatInput.value = '';
        
        // Send message via socket
        socket.emit('send-message', { gameId: LOBBY_ID, message });
        console.log('Sent message:', message);
    });
    
    // Listen for new messages - remove any existing listeners first to avoid duplicates
    socket.removeAllListeners('new-message');
    socket.on('new-message', (message) => {
        console.log('Received new-message event:', message);
        console.log('Message game_id:', message.game_id, 'Type:', typeof message.game_id);
        
        // Only show messages if we're in the lobby (check if game_id is null or undefined)
        if (message.game_id === null || message.game_id === undefined || message.game_id === 'lobby') {
            console.log('Adding lobby message to UI');
            addChatMessage(message);
        } else {
            console.log('Ignoring non-lobby message, game_id:', message.game_id);
        }
    });
}

// Cleanup when leaving the page
window.addEventListener('beforeunload', () => {
    socket.emit('leave-lobby');
});

async function loadGames() {
    try {
        const {games: games} = await api.games.getLobby();
        renderGames(games);
    } catch (error) {
        console.error('Failed to load games:', error);
    }
}

function renderGames(games) {
    if (games.length === 0) {
        gamesContainer.innerHTML = '<p class="no-games">No games available. Create one!</p>';
        return;
    }

    gamesContainer.innerHTML = games.map(game => `
    <div class="game-card" data-game-id="${game.id}">
      <h3>${game.creator_name}'s Game</h3>
      <p>Players: ${game.current_players}/${game.max_players}</p>
      <button class="btn btn-primary join-game-btn" data-game-id="${game.id}">
        Join Game
      </button>
    </div>
  `).join('');

    document.querySelectorAll('.join-game-btn').forEach(btn => {
        btn.addEventListener('click', joinGame);
    });
}

async function joinGame(e) {
    const gameId = e.target.dataset.gameId;

    try {
        await api.games.join(gameId);
        window.location.href = `/game/${gameId}`;
    } catch (error) {
        alert(error.message);
    }
}

createGameBtn.addEventListener('click', () => {
    createGameModal.style.display = 'block';
});

createGameModal.querySelector('.close').addEventListener('click', () => {
    createGameModal.style.display = 'none';
});

createGameForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const maxPlayers = parseInt(document.getElementById('max-players').value);
    const timeLimit = parseInt(document.getElementById('time-limit').value);

    try {
        const { game } = await api.games.create(maxPlayers, { timeLimit });
        window.location.href = `/game/${game.id}`;
    } catch (error) {
        alert(error.message);
    }
});

// Socket events
socket.on('game-created', () => {
    loadGames();
});

socket.on('game-started', ({ gameId }) => {
    loadGames();
});

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        loadGames();
        initLobbyChat();
    });
} else {
    loadGames();
    initLobbyChat();
}

// Refresh every 5 seconds
setInterval(loadGames, 5000);