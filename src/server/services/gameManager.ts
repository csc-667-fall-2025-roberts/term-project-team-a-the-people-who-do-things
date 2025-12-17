import { ScrabbleGame, RestoredGameState } from "./scrabbleEngine.js";

class GameManager {
  games: Map<string, ScrabbleGame>;
  constructor() {
    this.games = new Map();
  }

  createGame(
    gameId: string,
    players: string[],
    boardState?: (string | null)[][] | null,
  ): ScrabbleGame {
    if (this.games.has(gameId)) {
      throw new Error(`Game ${gameId} already exists`);
    }
    const game = new ScrabbleGame(gameId, players, boardState);
    this.games.set(gameId, game);
    return game;
  }

  // Restore a game from database state
  restoreGame(
    gameId: string,
    players: string[],
    state: RestoredGameState,
  ): ScrabbleGame {
    // If game already exists in memory, return it
    const existing = this.games.get(gameId);
    if (existing) {
      return existing;
    }
    
    // Restore from database state
    const game = ScrabbleGame.restore(gameId, players, state);
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
