export type JoinGameData = {
  gameId: string;
};

export type MakeMoveData = {
  gameId: string;
  tiles: Tile[];
  words: string[];
  score: number;
};

export type PassTurnData = {
  gameId: string;
};

export type GameParticipant = {
  id: string;
  is_host: boolean;
  user_id: string;
  display_name: string;
};

export type ScoreEntry = {
  user_id: string;
  value: number;
};

export type Scores = {
  userID: string;
  value: number;
  recorded_at: Date;
};

export type SelectedTile = {
  row: number;
  col: number;
  letter: string;
};

export type PlacedTile = {
  letter: string;
  row: number;
  col: number;
};

export type SendMessageData = {
  gameId: string;
  message: string;
};

export type ExchangeTilesData = {
  gameId: string;
  tiles: string[];
};

export type GameStateResponse = {
  board: (Tile | null)[][];
  hand: Tile[];
  currentPlayer: string;
  tilesRemaining: number;
  scores: Record<string, number>;
  gameOver?: boolean;
  winner?: string;
  settings?: Record<string, unknown>;
  turnEndsAt: number
};

export type MoveMadeResponse = {
  gameState: GameStateResponse;
  userId: string;
  tiles: Tile[];
  words: string[];
  score: number;
  currentPlayer: string;
  turnEndsAt: number;
};

export type Tile = {
  letter: string;
  value: number;
  x?: number;
  y?: number;
  isPlaced?: boolean;
  locked?: boolean;
};

export type NewTilesResponse = {
  tiles: Tile[];
};

export type TurnPassedResponse = {
  currentPlayer: string;
  userId: string;
  turnEndsAt: number;
};

export type TurnChangedResponse = {
  currentPlayer: string;
  turnEndsAt?: number;
  reason?: "timeout" | "exchange";
};

export type GameOverResponse = {
  winner: string;
  finalScores: Record<string, number>;
  gameId: string;
  isOver: boolean;
};

export type NewMessageResponse = {
  id: number;
  game_id: string | null;
  user_id: string;
  message: string;
  created_at: string;
  display_name: string;
};

export type ErrorResponse = {
  message: string;
  code?: string;
};

export type GameSummaryResponse = {
  game: {
    id: string;
    game_type: string;
    status: string;
    max_players: number;
    settings: Record<string, unknown>;
    created_at: string;
    started_at?: string;
    ended_at?: string;
    created_by: string;
  };
  game_participants: GameParticipant[];
  scores: ScoreEntry[];
};

export type PlayerJoinedLobbyData = {
  userId: string;
  isHost: boolean;
};

export type PlayerLeftLobbyData = {
  userId: string;
  isHost: boolean;
};

export type GameStartedData = {
  gameId: string;
};

// Socket event map
export type SocketEvents = {
  // Client to Server
  "join-game": JoinGameData;
  "make-move": MakeMoveData;
  "pass-turn": PassTurnData;
  "send-message": SendMessageData;
  "exchange-tiles": ExchangeTilesData;
  "place-tile": PlacedTile;
  "select-tile": SelectedTile;

  // Server to Client
  "game-state": GameStateResponse;
  "move-made": MoveMadeResponse;
  "new-tiles": NewTilesResponse;
  "turn-passed": TurnPassedResponse;
  "turn-changed": TurnChangedResponse;
  "game-over": GameOverResponse;
  "new-message": NewMessageResponse;
  error: ErrorResponse;
  "game-summary": GameSummaryResponse;
  "player-joined-lobby": PlayerJoinedLobbyData;
  "player-left-lobby": PlayerLeftLobbyData;
  "game-started": GameStartedData;
};

export {};
