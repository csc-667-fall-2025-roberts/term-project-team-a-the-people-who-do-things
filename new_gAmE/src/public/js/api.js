export const api = {
    async request(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    },

    auth: {
        signup(email, password, displayName) {
            return api.request('/api/auth/signup', {
                method: 'POST',
                body: JSON.stringify({ email, password, displayName })
            });
        },

        login(email, password) {
            return api.request('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
        },

        logout() {
            return api.request('/api/auth/logout', {
                method: 'POST'
            });
        },

        me() {
            return api.request('/api/auth/me');
        }
    },

    games: {
        getLobby() {
            return api.request('/api/games/lobby');
        },

        create(maxPlayers, settings) {
            return api.request('/api/games/create', {
                method: 'POST',
                body: JSON.stringify({ maxPlayers, settings })
            });
        },

        join(gameId) {
            return api.request(`/api/games/${gameId}/join`, {
                method: 'POST'
            });
        },

        get(gameId) {
            return api.request(`/api/games/${gameId}`);
        },

        start(gameId) {
            return api.request(`/api/games/${gameId}/start`, {
                method: 'POST'
            });
        }
    },

    chat: {
        getMessages(gameId, before = null) {
            const params = new URLSearchParams();
            if (before) params.set('before', before);
            return api.request(`/api/chat/${gameId}?${params}`);
        },

        sendMessage(gameId, message) {
            return api.request(`/api/chat/${gameId}`, {
                method: 'POST',
                body: JSON.stringify({ message })
            });
        }
    }
};