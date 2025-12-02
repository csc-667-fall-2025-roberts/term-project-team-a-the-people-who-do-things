import { ScrabbleGame } from './scrabbleEngine.js';

class GameManager {
  games: Map<string, ScrabbleGame>;
  constructor() {
    this.games = new Map();
  }

  createGame(gameId: string, players: string[]): ScrabbleGame {
    if (this.games.has(gameId)) {
      throw new Error(`Game ${gameId} already exists`);
    }
    const game = new ScrabbleGame(gameId, players);
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
