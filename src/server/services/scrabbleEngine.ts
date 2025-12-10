// noinspection DuplicatedCode

import { isValidWord } from "./dictionary.js";
import {
  BOARD_SIZE,
  LETTER_DISTRIBUTION,
  LETTER_VALUES,
  PREMIUM_SQUARES,
} from "./scrabbleConstants.js";

export class ScrabbleGame {
  gameId: string;
  board: (string | null)[][];
  tileBag: string[];
  players: string[];
  currentPlayerIndex: number;
  playerHands: Record<string, string[]>;
  scores: Record<string, number>;
  consecutivePasses: number;

  constructor(gameId: string, players: string[], board: (string | null)[][] | null = null) {
    this.gameId = gameId;
    this.board = board ?? this.createEmptyBoard();
    this.tileBag = this.initializeTileBag();
    this.players = players;
    this.currentPlayerIndex = 0;
    this.playerHands = {};
    this.scores = {};
    this.consecutivePasses = 0;

    players.forEach((playerId: string) => {
      this.scores[playerId] = 0;
      this.playerHands[playerId] = this.drawTiles(7);
    });
  }

  createEmptyBoard(): (string | null)[][] {
    return Array(BOARD_SIZE)
      .fill(null)
      .map(() => Array(BOARD_SIZE).fill(null));
  }

  initializeTileBag(): string[] {
    const tiles: string[] = [];
    for (const [letter, count] of Object.entries(LETTER_DISTRIBUTION)) {
      const numCount = count;
      for (let i = 0; i < numCount; i++) {
        tiles.push(letter);
      }
    }
    return this.shuffle(tiles);
  }
  //IGNORE THE DUPLICATE WARNING
  shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  drawTiles(count: number): string[] {
    const drawn: string[] = [];
    for (let i = 0; i < count && this.tileBag.length > 0; i++) {
      const tile = this.tileBag.pop();
      if (tile) drawn.push(tile);
    }
    return drawn;
  }

  getPremiumSquareType(row: number, col: number): string | null {
    for (const [type, positions] of Object.entries(PREMIUM_SQUARES)) {
      const posArray = positions;
      if (posArray.some(([r, c]: [number, number]) => r === row && c === col)) {
        return type;
      }
    }
    return null;
  }

  validateMove(
    playerId: string,
    tiles: { letter: string; row: number; col: number }[],
  ): { valid: boolean; error?: string } {
    // tiles: [{ letter, row, col }]

    if (this.players[this.currentPlayerIndex] !== playerId) {
      return { valid: false, error: "Not your turn" };
    }

    if (tiles.length === 0) {
      return { valid: false, error: "Must place at least one tile" };
    }

    // Check tiles in hand
    const hand = this.playerHands[playerId];
    const usedLetters = tiles.map((t) => t.letter);
    const handCopy = [...hand];

    for (const letter of usedLetters) {
      const index = handCopy.indexOf(letter);
      if (index === -1) {
        return { valid: false, error: "Tile not in hand" };
      }
      handCopy.splice(index, 1);
    }

    const rows = [...new Set(tiles.map((t) => t.row))];
    const cols = [...new Set(tiles.map((t) => t.col))];

    if (rows.length > 1 && cols.length > 1) {
      return { valid: false, error: "Tiles must be in a single row or column" };
    }

    // continuity
    if (rows.length === 1) {
      const sortedCols = cols.sort((a, b) => a - b);
      const row = rows[0];
      for (let i = sortedCols[0]; i <= sortedCols[sortedCols.length - 1]; i++) {
        if (!this.board[row][i] && !tiles.some((t) => t.row === row && t.col === i)) {
          return { valid: false, error: "Tiles must be continuous" };
        }
      }
    } else {
      const sortedRows = rows.sort((a, b) => a - b);
      const col = cols[0];
      for (let i = sortedRows[0]; i <= sortedRows[sortedRows.length - 1]; i++) {
        if (!this.board[i][col] && !tiles.some((t) => t.row === i && t.col === col)) {
          return { valid: false, error: "Tiles must be continuous" };
        }
      }
    }

    // must cover center
    const boardEmpty = this.board.every((row) => row.every((cell) => !cell));
    if (boardEmpty) {
      const coversCenter = tiles.some((t) => t.row === 7 && t.col === 7);
      if (!coversCenter) {
        return { valid: false, error: "First word must cover center square" };
      }
    }

    // NEEDS isValidWord function. Using mock function
    const formedWords = this.getFormedWords(tiles);

    // We iterate through every word formed (Main + Cross words)
    for (const { word } of formedWords) {
      // We use your temporary (or real) dictionary checker
      if (!isValidWord(word)) {
        return { valid: false, error: `Invalid word: ${word}` };
      }
    }

    return { valid: true };
  }

  calculateScore(tiles: { letter: string; row: number; col: number }[]): number {
    let totalScore = 0;

    // 1. Get all words formed (Main + Cross words) with their cell details
    const words = this.getFormedWords(tiles);

    for (const wordObj of words) {
      let wordScore = 0;
      let wordMultiplier = 1;

      for (const cell of wordObj.cells) {
        let letterScore = LETTER_VALUES[cell.letter] || 0;

        // ONLY apply premiums if the tile is NEW (part of the current move)
        if (cell.isNew) {
          const premium = this.getPremiumSquareType(cell.row, cell.col);

          if (premium === "DL") letterScore *= 2;
          if (premium === "TL") letterScore *= 3;
          if (premium === "DW") wordMultiplier *= 2;
          if (premium === "TW") wordMultiplier *= 3;
        }

        wordScore += letterScore;
      }

      // Multiply the total word score
      totalScore += wordScore * wordMultiplier;
    }

    // 50-point bonus for using all 7 tiles (Bingo)
    if (tiles.length === 7) {
      totalScore += 50;
    }

    return totalScore;
  }

  getFormedWords(tiles: { letter: string; row: number; col: number }[]): {
    word: string;
    cells: { letter: string; row: number; col: number; isNew: boolean }[];
  }[] {
    const formedWords: {
      word: string;
      cells: { letter: string; row: number; col: number; isNew: boolean }[];
    }[] = [];

    // 1. Identify Direction
    const rows = [...new Set(tiles.map((t) => t.row))];
    const isHorizontal = rows.length === 1;

    // PHASE 1: MAIN WORD SCAN
    if (isHorizontal) {
      const row = rows[0];
      const minCol = Math.min(...tiles.map((t) => t.col));
      const maxCol = Math.max(...tiles.map((t) => t.col));

      // Scan Left
      let startCol = minCol;
      while (startCol > 0 && this.board[row][startCol - 1]) {
        startCol--;
      }

      // Scan Right
      let endCol = maxCol;
      while (endCol < BOARD_SIZE - 1 && this.board[row][endCol + 1]) {
        endCol++;
      }

      // Capture Word AND Cells
      let word = "";
      const cells: { letter: string; row: any; col: number; isNew: boolean }[] = [];
      for (let c = startCol; c <= endCol; c++) {
        const boardLetter = this.board[row][c];
        const tile = tiles.find((t) => t.row === row && t.col === c);
        const letter = boardLetter || tile?.letter || "";

        word += letter;
        cells.push({ letter, row, col: c, isNew: !!tile });
      }
      formedWords.push({ word, cells });
    } else {
      // Vertical Logic
      const cols = [...new Set(tiles.map((t) => t.col))];
      const col = cols[0];
      const minRow = Math.min(...tiles.map((t) => t.row));
      const maxRow = Math.max(...tiles.map((t) => t.row));

      // Scan Up
      let startRow = minRow;
      while (startRow > 0 && this.board[startRow - 1][col]) {
        startRow--;
      }

      // Scan Down
      let endRow = maxRow;
      while (endRow < BOARD_SIZE - 1 && this.board[endRow + 1][col]) {
        endRow++;
      }

      // Capture Word AND Cells
      let word = "";
      const cells: { letter: string; row: number; col: any; isNew: boolean }[] = [];
      for (let r = startRow; r <= endRow; r++) {
        const boardLetter = this.board[r][col];
        const tile = tiles.find((t) => t.row === r && t.col === col);
        const letter = boardLetter || tile?.letter || "";

        word += letter;
        cells.push({ letter, row: r, col, isNew: !!tile });
      }
      formedWords.push({ word, cells });
    }

    // PHASE 2: PERPENDICULAR SCANS
    for (const tile of tiles) {
      const isPerpendicularVertical = isHorizontal;
      let hasNeighbor = false;
      let start = -1;
      let end = -1;
      let fixedIndex = -1;

      if (isPerpendicularVertical) {
        fixedIndex = tile.col;
        const r = tile.row;
        const neighborUp = r > 0 && this.board[r - 1][fixedIndex] !== null;
        const neighborDown = r < BOARD_SIZE - 1 && this.board[r + 1][fixedIndex] !== null;

        if (neighborUp || neighborDown) {
          hasNeighbor = true;
          let cursor = r;
          while (cursor > 0 && this.board[cursor - 1][fixedIndex]) cursor--;
          start = cursor;

          cursor = r;
          while (cursor < BOARD_SIZE - 1 && this.board[cursor + 1][fixedIndex]) cursor++;
          end = cursor;
        }
      } else {
        fixedIndex = tile.row;
        const c = tile.col;
        const neighborLeft = c > 0 && this.board[fixedIndex][c - 1] !== null;
        const neighborRight = c < BOARD_SIZE - 1 && this.board[fixedIndex][c + 1] !== null;

        if (neighborLeft || neighborRight) {
          hasNeighbor = true;
          let cursor = c;
          while (cursor > 0 && this.board[fixedIndex][cursor - 1]) cursor--;
          start = cursor;

          cursor = c;
          while (cursor < BOARD_SIZE - 1 && this.board[fixedIndex][cursor + 1]) cursor++;
          end = cursor;
        }
      }

      if (hasNeighbor && start !== -1 && end !== -1) {
        let crossWord = "";
        const crossCells: { letter: string; row: number; col: number; isNew: boolean }[] = [];

        if (isPerpendicularVertical) {
          for (let r = start; r <= end; r++) {
            const boardLetter = this.board[r][fixedIndex];
            const t = tiles.find((t) => t.row === r && t.col === fixedIndex);
            const letter = boardLetter || t?.letter || "";
            crossWord += letter;
            crossCells.push({ letter, row: r, col: fixedIndex, isNew: !!t });
          }
        } else {
          for (let c = start; c <= end; c++) {
            const boardLetter = this.board[fixedIndex][c];
            const t = tiles.find((t) => t.row === fixedIndex && t.col === c);
            const letter = boardLetter || t?.letter || "";
            crossWord += letter;
            crossCells.push({ letter, row: fixedIndex, col: c, isNew: !!t });
          }
        }
        formedWords.push({ word: crossWord, cells: crossCells });
      }
    }

    return formedWords;
  }

  applyMove(
    playerId: string,
    tiles: { letter: string; row: number; col: number }[],
    score: number,
  ): { newTiles: string[]; currentPlayer: string } {
    // place tiles on board
    for (const tile of tiles) {
      this.board[tile.row][tile.col] = tile.letter;
    }

    // remove tiles from hand
    const usedLetters: string[] = tiles.map((t) => t.letter);
    for (const letter of usedLetters) {
      const index = this.playerHands[playerId].indexOf(letter);
      this.playerHands[playerId].splice(index, 1);
    }

    // draw new tiles
    const newTiles = this.drawTiles(tiles.length);
    this.playerHands[playerId].push(...newTiles);

    // update score
    this.scores[playerId] += score;

    // next player
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.consecutivePasses = 0;

    return {
      newTiles,
      currentPlayer: this.players[this.currentPlayerIndex],
    };
  }

  pass(playerId: string): {
    valid: boolean;
    error?: string;
    gameOver?: boolean;
    currentPlayer?: string;
  } {
    if (this.players[this.currentPlayerIndex] !== playerId) {
      return { valid: false, error: "Not your turn" };
    }

    this.consecutivePasses++;
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;

    // game ends if all players pass
    if (this.consecutivePasses >= this.players.length) {
      return { valid: true, gameOver: true };
    }

    return {
      valid: true,
      currentPlayer: this.players[this.currentPlayerIndex],
    };
  }

  exchangeTiles(
    playerId: string,
    tilesToExchange: string[],
  ): { valid: boolean; error?: string; newTiles?: string[]; currentPlayer?: string } {
    if (this.players[this.currentPlayerIndex] !== playerId) {
      return { valid: false, error: "Not your turn" };
    }

    if (this.tileBag.length < tilesToExchange.length) {
      return { valid: false, error: "Not enough tiles in bag" };
    }

    // remove tiles from hand
    const hand = this.playerHands[playerId];
    for (const letter of tilesToExchange) {
      const index = hand.indexOf(letter);
      if (index === -1) {
        return { valid: false, error: "Tile not in hand" };
      }
      hand.splice(index, 1);
    }

    // Draw new tiles
    const newTiles = this.drawTiles(tilesToExchange.length);
    hand.push(...newTiles);

    // return exchanged tiles to bag
    this.tileBag.push(...tilesToExchange);
    this.tileBag = this.shuffle(this.tileBag);

    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;

    return {
      valid: true,
      newTiles,
      currentPlayer: this.players[this.currentPlayerIndex],
    };
  }

  getGameState(): {
    board: (string | null)[][];
    currentPlayer: string;
    scores: Record<string, number>;
    tilesRemaining: number;
  } {
    return {
      board: this.board,
      currentPlayer: this.players[this.currentPlayerIndex],
      scores: this.scores,
      tilesRemaining: this.tileBag.length,
    };
  }

  getPlayerHand(playerId: string): string[] {
    return this.playerHands[playerId] || [];
  }
}

export default ScrabbleGame; //TODO Unused default export
