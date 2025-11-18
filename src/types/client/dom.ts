// DOM type helpers
export type ElementById<T extends HTMLElement = HTMLElement> = T | null;

// Chat message interface
export interface ChatMessage {
  id: number;
  game_id: string | null;
  user_id: string;
  message: string;
  created_at: string;
  display_name: string;
}

// Game participant interface
export interface GameParticipant {
  id: string;
  display_name: string;
  is_host: boolean;
  user_id: string;
}

// Score interface
export interface Score {
  user_id: string;
  value: number;
}

// User interface
export interface User {
  id: string;
  display_name: string;
  email: string;
}

// Tile interface
export interface Tile {
  letter: string;
  value: number;
  x?: number;
  y?: number;
  isPlaced?: boolean;
}

// Game state interface
export interface GameState {
  board: (Tile | null)[][];
  hand: Tile[];
  currentPlayer: string;
  tilesRemaining: number;
  scores: { [userId: string]: number };
  gameOver?: boolean;
  winner?: string;
}

// API response wrappers
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Letter values constant type
export type LetterValues = {
  [K in
    | "A"
    | "B"
    | "C"
    | "D"
    | "E"
    | "F"
    | "G"
    | "H"
    | "I"
    | "J"
    | "K"
    | "L"
    | "M"
    | "N"
    | "O"
    | "P"
    | "Q"
    | "R"
    | "S"
    | "T"
    | "U"
    | "V"
    | "W"
    | "X"
    | "Y"
    | "Z"]: number;
};

export {};
