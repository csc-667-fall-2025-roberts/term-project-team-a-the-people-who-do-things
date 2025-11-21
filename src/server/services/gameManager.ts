import ScrabbleGame, * as scrabbleEngine from './scrabbleEngine.ts';
import express from 'express';

interface Game {
  gameId: string;
  players: number;
}

class GameManager {
  games: Map<string, ScrabbleGame>;
  constructor() {
    this.games = new Map();
  }

  createGame(gameId: string, players: string[]) {
    const game = new ScrabbleGame(gameId, players);
    this.games.set(gameId, game);
    return game;
  }

  getGame(gameId: string): ScrabbleGame | undefined {
    return this.games.get(gameId);
  }

  removeGame({ gameId }: Game): boolean {
    return this.games.delete(gameId);
  }
}

export default new GameManager();
