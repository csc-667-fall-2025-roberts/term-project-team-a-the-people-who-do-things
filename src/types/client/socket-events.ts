export interface JoinGameData {
  gameId: string;
}

export interface MakeMoveData {
  gameId: string;
  tiles: Tile[];
  words: string[];
  score: number;
}

export interface PassTurnData {
  gameId: string;
}

export interface SendMessageData {
  gameId: string;
  message: string;
}

export interface ExchangeTilesData {
  gameId: string;
  tiles: string[];
}

// Socket event response types
export interface GameStateResponse {
  board: (Tile | null)[][];
  hand: Tile[];
  currentPlayer: string;
  tilesRemaining: number;
  scores: { [userId: string]: number };
  gameOver?: boolean;
  winner?: string;
}

export interface MoveMadeResponse {
  gameState: GameStateResponse;
  userId: string;
  tiles: Tile[];
  words: string[];
  score: number;
}

export interface NewTilesResponse {
  tiles: Tile[];
}

export interface TurnPassedResponse {
  currentPlayer: string;
  userId: string;
}

export interface GameOverResponse {
  winner: string;
  finalScores: { [userId: string]: number };
  gameId: string;
}

export interface NewMessageResponse {
  id: number;
  game_id: string | null;
  user_id: string;
  message: string;
  created_at: string;
  display_name: string;
}

export interface ErrorResponse {
  message: string;
  code?: string;
}

// Tile interface 
export interface Tile {
  letter: string;
  value: number;
  x?: number;
  y?: number;
  isPlaced?: boolean;
}

// Socket event map
export interface SocketEvents {
  // Client to Server events
  "join-game": JoinGameData;
  "make-move": MakeMoveData;
  "pass-turn": PassTurnData;
  "send-message": SendMessageData;
  "exchange-tiles": ExchangeTilesData;

  // Server to Client
  "game-state": GameStateResponse;
  "move-made": MoveMadeResponse;
  "new-tiles": NewTilesResponse;
  "turn-passed": TurnPassedResponse;
  "game-over": GameOverResponse;
  "new-message": NewMessageResponse;
  error: ErrorResponse;
}

export {};
