export const api = {
  async request(url: string | URL | RequestInfo, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options as { headers?: Record<string, string> }).headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Request failed");
    }

    return data;
  },

  auth: {
    signup(email: string, password: string, displayName: string) {
      return api.request("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, displayName }),
      });
    },

    login(email: string, password: string) {
      return api.request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },

    logout() {
      return api.request("/api/auth/logout", {
        method: "POST",
      });
    },

    me() {
      return api.request("/api/auth/me");
    },
  },

  games: {
    getLobby() {
      return api.request("/api/games/lobby");
    },

    create: (data: { maxPlayers: number; settings: any }) =>
      fetch("/api/games/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to create game");
        return res.json();
      }),

    join(gameId: string) {
      return api.request(`/api/games/${gameId}/join`, {
        method: "POST",
      });
    },

    get(gameId: string) {
      return api.request(`/api/games/${gameId}`);
    },

    start(gameId: string) {
      return api.request(`/api/games/${gameId}/start`, {
        method: "POST",
      });
    },
  },

  chat: {
    getMessages(gameId: string, before: string | null = null) {
      const params = new URLSearchParams();
      if (before) params.set("before", before);
      return api.request(`/api/chat/${gameId}?${params}`);
    },
    //TODO  Unused function sendMessage
    sendMessage(gameId: string) {
      return api.request(`/api/chat/${gameId}`, {
        method: "POST",
        body: JSON.stringify({ message: gameId }),
      });
    },
  },
};
