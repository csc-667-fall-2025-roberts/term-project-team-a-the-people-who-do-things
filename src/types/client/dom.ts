import type { Tile } from "./socket-events.js";

export type ElementByID<T extends HTMLElement = HTMLElement> = T | null;

export type ChatMessage = {
  id: number;
  game_ID: string | null;
  user_ID: string;
  message: string;
  created_at: string;
  display_name: string;
};

export type Users = {
  id: string;
  display_name: string;
  email: string;
};

// Game state interface
export type GameState = {
  board: (Tile | null)[][];
  hand: Tile[];
  currentPlayer: string;
  tilesRemaining: number;
  scores: Record<string, number>;
  gameOver?: boolean;
  winner?: string;
};

// API response wrappers
export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export {};
