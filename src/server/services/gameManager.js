import ScrabbleGame from './scrabbleEngine.js';

class GameManager {
    constructor() {
        this.games = new Map();
    }

    createGame(gameId, players) {
        const game = new ScrabbleGame(gameId, players);
        this.games.set(gameId, game);
        return game;
    }

    getGame(gameId) {
        return this.games.get(gameId);
    }

    removeGame(gameId) {
        this.games.delete(gameId);
    }
}

export default new GameManager();