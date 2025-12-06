// DOM type helpers
//CLIENT SIDE DOM AND DATA TYPES
import type { Tile } from "./socket-events.js";

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

// User interface
export interface Users {
  id: string;
  display_name: string;
  email: string;
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

export {};
