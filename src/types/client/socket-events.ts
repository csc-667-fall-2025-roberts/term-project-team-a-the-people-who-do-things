export type JoinGameData = {
  user_ID: string;
  game_ID: string;
};

export type MakeMoveData = {
  game_ID: string;
  tiles: Tile[];
  words: string[];
  score: number;
};

export type PassTurnData = {
  game_ID: string;
  user_ID: string;
};

export type CurrentPlayerData = {
  game_ID?: string;
  user_ID?: string;
};

export type GameParticipant = {
  id?: string;
  game_ID?: string;
  is_host?: boolean;
  user_ID?: string;
  display_name?: string;
};

export type ScoreEntry = {
  game_ID: string;
  user_ID: string;
  value: number;
  display_name?: string;
};

export type Scores = {
  game_ID: string;
  user_ID: string;
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
  id?: number;
  game_ID?: string | null;
  user_ID?: string;
  message?: string;
  created_at?: string;
  display_name?: string;
};

export type ExchangeTilesData = {
  game_ID: string;
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
};

export type MoveMadeResponse = {
  gameState: GameStateResponse;
  user_ID: string;
  tiles: Tile[];
  words: string[];
  score: number;
  currentPlayer: string;
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
  user_ID: string;
};

export type GameOverResponse = {
  winner: string;
  finalScores: Record<string, number>;
  game_ID: string;
  isOver: boolean;
};

export type GameData = {
  game: {
    id: string;
    winner?: string;
    ended_at?: string;
  };
  moves: {
    payload: {
      words: string[];
      score: number;
    };
    display_name?: string;
  }[];
  participants: GameParticipant[];
  scores: ScoreEntry[];
  user_ID: string;
};

export type NewMessageResponse = {
  id?: number;
  game_ID?: string | null;
  user_ID?: string;
  message?: string;
  created_at?: string;
  display_name?: string;
};

export type ChatMessage = {
  id: number;
  game_ID: string | null;
  user_ID: string;
  message: string;
  created_at: string;
  display_name: string;
};

export type ErrorResponse = {
  message: string;
  code?: string;
};

export type GameSummaryResponse = {
  game_ID: string;
  game_participants: GameParticipant[];
  scores: ScoreEntry[];
};

export type PlayerJoinedLobbyData = {
  user_ID: string;
  isHost: boolean;
};

export type PlayerLeftLobbyData = {
  user_ID: string;
  isHost: boolean;
};

export type GameStartedData = {
  game_ID: string;
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
  "game-over": GameOverResponse;
  "new-message": NewMessageResponse;
  error: ErrorResponse;
  "game-summary": GameSummaryResponse;
  "player-joined-lobby": PlayerJoinedLobbyData;
  "player-left-lobby": PlayerLeftLobbyData;
  "game-started": GameStartedData;
  "current-players": CurrentPlayerData;
};

export {};
