import type { RestoredGameState } from "./scrabbleEngine.js";
import { ScrabbleGame } from "./scrabbleEngine.js";

class GameManager {
  games: Map<string, ScrabbleGame>;
  constructor() {
    this.games = new Map();
  }

  createGame(
    gameId: string,
    players: string[],
    boardState?: (string | null)[][] | null,
    settings: Record<string, unknown> = {}
  ): ScrabbleGame {
    if (this.games.has(gameId)) {
      throw new Error(`Game ${gameId} already exists`);
    }
    const game = new ScrabbleGame(gameId, players, boardState, settings);
    this.games.set(gameId, game);
    return game;
  }

  restoreGame(gameId: string, players: string[], state: RestoredGameState): ScrabbleGame {
    const existing = this.games.get(gameId);
    if (existing) {
      return existing;
    }
    
    // Restore from database state
    const game = ScrabbleGame.restore(gameId, players, state, settings);
    this.games.set(gameId, game);
    return game;
  }

  getGame(gameId: string): ScrabbleGame | undefined {
    return this.games.get(gameId);
  }

  gameOver(gameId: string): boolean {
    return this.games.delete(gameId);
  }
}

export default new GameManager();
