import { RestoredGameState, ScrabbleGame } from "./scrabbleEngine.js";
import { Server } from "socket.io";

class GameManager {
  games: Map<string, ScrabbleGame>;
  private turnTimers: Map<string, NodeJS.Timeout>;
  private turnEndTimes: Map<string, number> = new Map();

  constructor() {
    this.games = new Map();
    this.turnTimers = new Map();
  }

  getGame(gameId: string): ScrabbleGame | undefined {
    return this.games.get(gameId);
    }
  createGame(
    gameId: string,
    players: string[],
    boardState?: (string | null)[][] | null,
    settings: Record<string, unknown> = {},
  ): ScrabbleGame {
    if (this.games.has(gameId)) {
      throw new Error(`Game ${gameId} already exists`);
    }
    const game = new ScrabbleGame(gameId, players, boardState, settings);
    this.games.set(gameId, game);
    return game;
  }

  restoreGame(
    gameId: string,
    players: string[],
    state: RestoredGameState,
    settings: Record<string, unknown> = {},
  ): ScrabbleGame {
    // If game already exists in memory, return it
    const existing = this.games.get(gameId);
    if (existing) {
      return existing;
    }

    // Restore from database state
    const game = ScrabbleGame.restore(gameId, players, state, settings);
    this.games.set(gameId, game);
    return game;
  }

  startTurnTimer(gameId: string, io: Server, durationSeconds: number) {
    this.stopTurnTimer(gameId);

    const turnEndsAt = Date.now() + (durationSeconds * 1000);
    this.turnEndTimes.set(gameId, turnEndsAt);

    const timeout = setTimeout(() => {
      this.handleAutoPass(gameId, io);
    }, (durationSeconds + 2) * 1000);

    this.turnTimers.set(gameId, timeout);
  }

  getTurnEndTime(gameId: string): number | undefined {
    return this.turnEndTimes.get(gameId);
  }

  stopTurnTimer(gameId: string) {
    const existing = this.turnTimers.get(gameId);
    if (existing) {
      clearTimeout(existing);
      this.turnTimers.delete(gameId);
      this.turnEndTimes.delete(gameId);
    }
  }

    private handleAutoPass(gameId: string, io: Server) {
        const game = this.getGame(gameId);
        if (!game) return;

        const currentPlayerId = game.players[game.currentPlayerIndex];
        const result = game.pass(currentPlayerId);

        if (result.valid) {
            if (result.gameOver) {
            this.stopTurnTimer(gameId);
            io.to(gameId).emit("game-over", { scores: game.scores });
            } else {
                const limit = Number(game.settings.timeLimit) || 60;

                const turnEndsAt = Date.now() + (limit * 1000);
                io.to(gameId).emit("turn-changed", {
                    currentPlayer: result.currentPlayer,
                    turnEndsAt,
                    reason: "timeout"
                });
            
            this.startTurnTimer(gameId, io, limit);
            }
        }
    }
}

export default new GameManager();
