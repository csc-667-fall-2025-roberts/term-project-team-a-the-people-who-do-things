import ScrabbleGame, {ScrabbleGame} from './scrabbleEngine.ts';
import type { Games } from './types/express.d.ts';

interface Game {
    gameId: string;
}

class GameManager {

    games: Games;
    constructor() {
        this.games = new Map();
    }

    createGame(gameId: string, players: any[]) {
        const game = new ScrabbleGame(gameId, players);
        this.games.set(gameId, game);
        return game;
    }

    getGame(gameId: string):ScrabbleGame {
        return this.games.get(gameId);
    }

    removeGame = ({gameId}: Game): ScrabbleGame => this.games.delete(gameId);

    get removeGame(): ({gameId}: Game) => ScrabbleGame {
        return this._removeGame;
    }

    set removeGame(value: ({gameId}: Game) => ScrabbleGame) {
        this._removeGame = value;
    }
}

export default new GameManager();