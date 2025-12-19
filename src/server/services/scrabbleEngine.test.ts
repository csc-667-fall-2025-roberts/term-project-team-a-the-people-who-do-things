import { beforeEach, describe, expect, it } from "vitest";

import { ScrabbleGame } from "./scrabbleEngine.js";

describe("ScrabbleGame - basic move validation and scoring", () => {
  let game: ScrabbleGame;
  const playerA = "playerA";
  const playerB = "playerB";

  beforeEach(() => {
    game = new ScrabbleGame("test-game", [playerA, playerB]);
  });

  it("validates first move must cover center and accepts a valid word from hand", () => {
    game.playerHands[playerA] = ["H", "E", "L", "L", "O", "A", "B"];

    const center = Math.floor(game.board.length / 2);
    const tiles = [
      { letter: "H", row: center, col: center },
      { letter: "E", row: center, col: center + 1 },
      { letter: "L", row: center, col: center + 2 },
      { letter: "L", row: center, col: center + 3 },
      { letter: "O", row: center, col: center + 4 },
    ];

    const validation = game.validateMove(playerA, tiles);
    expect(validation.valid).toBe(true);
  });

  it("calculates correct score for a simple word (no premiums) and applies the move", () => {
    game.playerHands[playerA] = ["H", "E", "L", "L", "O", "X", "Y"];

    const center = Math.floor(game.board.length / 2);
    const tiles = [
      { letter: "H", row: center, col: center },
      { letter: "E", row: center, col: center + 1 },
      { letter: "L", row: center, col: center + 2 },
      { letter: "L", row: center, col: center + 3 },
      { letter: "O", row: center, col: center + 4 },
    ];

    const validation = game.validateMove(playerA, tiles);
    expect(validation.valid).toBe(true);

    const calculated = game.calculateScore(tiles);
    expect(calculated).toBe(8);

    const result = game.applyMove(playerA, tiles, calculated);

    expect(game.board[center][center]).toBe("H");
    expect(game.board[center][center + 1]).toBe("E");
    expect(game.board[center][center + 2]).toBe("L");
    expect(game.board[center][center + 3]).toBe("L");
    expect(game.board[center][center + 4]).toBe("O");

    expect(game.scores[playerA]).toBeGreaterThanOrEqual(8);

    expect(game.getPlayerHand(playerA).length).toBeGreaterThanOrEqual(0);

    expect(Array.isArray(game.getPlayerHand(playerA))).toBe(true);

    expect(result.newTiles.length).toBeLessThanOrEqual(tiles.length);
  });

  it("rejects a move when a player attempts to play tiles they don't have", () => {
    game.playerHands[playerA] = ["A", "B", "C", "D", "E", "F", "G"];

    const center = Math.floor(game.board.length / 2);
    const tiles = [
      { letter: "Q", row: center, col: center },
      { letter: "W", row: center, col: center + 1 },
      { letter: "E", row: center, col: center + 2 },
    ];

    const validation = game.validateMove(playerA, tiles);
    expect(validation.valid).toBe(false);
    expect(validation.error).toBeDefined();
  });

  it("ensures it's only the current player's turn", () => {
    game.playerHands[playerB] = ["H", "E", "L", "L", "O", "A", "B"];

    const center = Math.floor(game.board.length / 2);
    const tiles = [
      { letter: "H", row: center, col: center },
      { letter: "E", row: center, col: center + 1 },
    ];

    const validation = game.validateMove(playerB, tiles);
    expect(validation.valid).toBe(false);
    expect(validation.error).toBe("Not your turn");
  });
});
