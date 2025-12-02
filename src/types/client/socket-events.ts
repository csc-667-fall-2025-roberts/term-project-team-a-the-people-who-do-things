// Socket event data types
//socket communication contracts between client/server
// DEFINE TYPES FOR DATA SENT FROM CLIENT TO SERVER

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

// Game participant interface
export interface GameParticipant {
  id: string;
  is_host: boolean;
  user_id: string;
  display_name: string;
}

export type ScoreEntry = {
  user_id: string;
  value: number;
};

// Score interface
export interface Scores {
  userID: string;
  value: number;
  recorded_at: Date;
}

export interface SelectedTile {
  row: number;
  col: number;
  letter: string;
}

export interface PlacedTile {
  letter: string;
  row: number;
  col: number;
}

//tilesRemaining
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

export interface Tile {
  letter: string;
  value: number;
  x?: number;
  y?: number;
  isPlaced?: boolean;
  locked?: boolean;
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
  isOver: boolean;
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

export interface GameSummaryResponse {
  game_participants: GameParticipant[];
  scores: ScoreEntry[];
}

// Socket event map
export interface SocketEvents {
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
}

export {};
