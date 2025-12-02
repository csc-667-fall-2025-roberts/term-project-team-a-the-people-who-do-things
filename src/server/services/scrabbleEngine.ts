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
  playerHands: { [playerId: string]: string[] };
  scores: { [playerId: string]: number };
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
      const numCount = count as number;
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
      const posArray = positions as [number, number][];
      if (posArray.some(([r, c]: [number, number]) => r === row && c === col)) {
        return type;
      }
    }
    return null;
  }

  validateMove(
    playerId: string,
    tiles: Array<{ letter: string; row: number; col: number }>,
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
    const usedLetters = tiles.map((t) => (t.letter));
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

    return { valid: true };
  }

  calculateScore(
    tiles: Array<{ letter: string; row: number; col: number }>,
  ): number {
    let score = 0;
    let wordMultiplier = 1;

    for (const tile of tiles) {
      let letterScore: number = LETTER_VALUES[tile.letter as keyof typeof LETTER_VALUES];
      const premium = this.getPremiumSquareType(tile.row, tile.col);

      if (!this.board[tile.row][tile.col]) {
        // Only count premium on new tiles
        if (premium === "DL") letterScore *= 2;
        if (premium === "TL") letterScore *= 3;
        if (premium === "DW") wordMultiplier *= 2;
        if (premium === "TW") wordMultiplier *= 3;
      }

      score += letterScore;
    }

    score *= wordMultiplier;

    // bonus for using all 7 tiles
    if (tiles.length === 7) {
      score += 50;
    }

    return score;
  }

  getFormedWords(
    tiles: Array<{ letter: string; row: number; col: number }>,
  ): string[] {
    // need full word detection logic
    const words = [];

    // main word
    const rows = [...new Set(tiles.map((t) => t.row))];
    const cols = [...new Set(tiles.map((t) => t.col))];

    if (rows.length === 1) {
      const row = rows[0];
      const minCol = Math.min(...cols);
      const maxCol = Math.max(...cols);
      let word = "";
      for (let c = minCol; c <= maxCol; c++) {
        word += this.board[row][c] || tiles.find((t) => t.row === row && t.col === c)?.letter || "";
      }
      words.push(word);
    } else {
      const col = cols[0];
      const minRow = Math.min(...rows);
      const maxRow = Math.max(...rows);
      let word = "";
      for (let r = minRow; r <= maxRow; r++) {
        word += this.board[r][col] || tiles.find((t) => t.row === r && t.col === col)?.letter || "";
      }
      words.push(word);
    }

    return words;
  }

  applyMove(
    playerId: string,
    tiles: Array<{ letter: string; row: number; col: number }>,
    score: number,
  ): { newTiles: string[]; currentPlayer: string } {
    // place tiles on board
    for (const tile of tiles) {
      this.board[tile.row][tile.col] = tile.letter;
    }

    // remove tiles from hand
    const usedLetters: string[] = tiles.map((t) => ( t.letter));
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
    scores: { [playerId: string]: number };
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

export default ScrabbleGame;
