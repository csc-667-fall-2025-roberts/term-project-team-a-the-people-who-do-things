import { beforeEach, describe, expect, it } from "vitest";

import { ScrabbleGame } from "./scrabbleEngine.js";

describe("ScrabbleGame - scoring and cross-word behavior", () => {
  let game: ScrabbleGame;
  const playerA = "playerA";
  const playerB = "playerB";

  beforeEach(() => {
    // Two-player game
    game = new ScrabbleGame("score-game", [playerA, playerB]);

    game.board[0][0] = "Z";
  });

  it("applies triple-letter (TL) correctly to a single letter in a word", () => {
    const row = 1;
    const tiles = [
      { letter: "C", row, col: 4 },
      { letter: "A", row, col: 5 }, // TL should apply here
      { letter: "T", row, col: 6 },
    ];

    game.playerHands[playerA] = ["C", "A", "T", "X", "Y", "Z", "Q"];

    const validation = game.validateMove(playerA, tiles);
    expect(validation.valid).toBe(true);

    // Calculate score: C=3, A=1 (TL -> *3 = 3), T=1 => total = 3 + 3 + 1 = 7
    const score = game.calculateScore(tiles);
    expect(score).toBe(7);
  });

  it("applies double-word (DW) multiplier to the whole word", () => {
    const tiles = [
      { letter: "T", row: 4, col: 4 }, // DW applies here to the entire word
      { letter: "O", row: 5, col: 4 },
    ];

    game.playerHands[playerA] = ["T", "O", "A", "B", "C", "D", "E"];

    const validation = game.validateMove(playerA, tiles);
    expect(validation.valid).toBe(true);

    const score = game.calculateScore(tiles);
    expect(score).toBe(4);
  });

  it("counts both main and cross words (including premium squares) when a tile forms a cross-word", () => {
    game.board[0][5] = "A";
    game.board[2][5] = "T";

    const tiles = [{ letter: "R", row: 1, col: 5 }];

    game.playerHands[playerA] = ["R", "A", "B", "C", "D", "E", "F"];

    const score = game.calculateScore(tiles);
    expect(score).toBe(8);
  });
});
