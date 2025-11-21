type JsonRecord = Record<string, unknown>;

type RequestOptions = RequestInit & {
  headers?: Record<string, string>;
};

async function request<TResponse = JsonRecord>(
  url: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const data = (await response.json()) as JsonRecord;

  if (!response.ok) {
    throw new Error((data?.error as string) || "Request failed");
  }

  return data as TResponse;
}

export const api = {
  request,
  auth: {
    signup(email: string, password: string, displayName: string) {
      return request("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, displayName }),
      });
    },

    login(email: string, password: string) {
      return request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },

    logout() {
      return request("/api/auth/logout", {
        method: "POST",
      });
    },

    me() {
      return request("/api/auth/me");
    },
  },

  games: {
    getLobby() {
      return request("/api/games/lobby");
    },

    create(maxPlayers: number, settings: JsonRecord) {
      return request("/api/games/create", {
        method: "POST",
        body: JSON.stringify({ maxPlayers, settings }),
      });
    },

    join(gameId: string) {
      return request(`/api/games/${gameId}/join`, {
        method: "POST",
      });
    },

    get(gameId: string) {
      return request(`/api/games/${gameId}`);
    },

    start(gameId: string) {
      return request(`/api/games/${gameId}/start`, {
        method: "POST",
      });
    },
  },

  chat: {
    getMessages(gameId: string, before: string | null = null) {
      const params = new URLSearchParams();
      if (before) params.set("before", before);
      return request(`/api/chat/${gameId}?${params}`);
    },

    sendMessage(gameId: string, message: string) {
      return request(`/api/chat/${gameId}`, {
        method: "POST",
        body: JSON.stringify({ message }),
      });
    },
  },
};


