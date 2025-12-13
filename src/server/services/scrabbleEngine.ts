/**
 * term-project-team-a-the-people-who-do-things/src/server/services/scrabbleEngine.ts
 *
 * Simplified Scrabble game engine.
 *
 * Clean, readable implementations of:
 *  - board initialization and tile bag management
 *  - move validation
 *  - word formation (main + cross words)
 *  - scoring (including premium squares and bingo)
 *  - player actions (applyMove, pass, exchange)
 */

import { isValidWord } from "./dictionary.js";
import {
  BOARD_SIZE,
  LETTER_DISTRIBUTION,
  LETTER_VALUES,
  PREMIUM_SQUARES,
} from "./scrabbleConstants.js";

export type PlacedTile = { letter: string; row: number; col: number };
export type WordCell = { letter: string; row: number; col: number; isNew: boolean };
export type FormedWord = { word: string; cells: WordCell[] };

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

    for (const p of players) {
      this.scores[p] = 0;
      this.playerHands[p] = this.drawTiles(7);
    }
  }

  createEmptyBoard(): (string | null)[][] {
    return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
  }

  initializeTileBag(): string[] {
    const tiles: string[] = [];
    for (const [letter, count] of Object.entries(LETTER_DISTRIBUTION)) {
      for (let i = 0; i < (count as number); i++) tiles.push(letter);
    }
    return this.shuffle(tiles);
  }

  shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  drawTiles(count: number): string[] {
    const drawn: string[] = [];
    while (drawn.length < count && this.tileBag.length > 0) {
      const t = this.tileBag.pop();
      if (t) drawn.push(t);
    }
    return drawn;
  }

  getPremiumSquareType(row: number, col: number): string | null {
    for (const [type, positions] of Object.entries(PREMIUM_SQUARES)) {
      if (positions.some(([r, c]: [number, number]) => r === row && c === col)) return type;
    }
    return null;
  }


  private isPlayersTurn(playerId: string): boolean {
    return this.players[this.currentPlayerIndex] === playerId;
  }

  private tilesFromHandValid(playerId: string, tiles: PlacedTile[]): boolean {
    const hand = [...(this.playerHands[playerId] ?? [])];
    for (const t of tiles) {
      const idx = hand.indexOf(t.letter);
      if (idx === -1) return false;
      hand.splice(idx, 1);
    }
    return true;
  }

  private singleLine(tiles: PlacedTile[]): { ok: boolean; horizontal: boolean | null } {
    const rows = new Set(tiles.map((t) => t.row));
    const cols = new Set(tiles.map((t) => t.col));
    if (rows.size > 1 && cols.size > 1) return { ok: false, horizontal: null };
    return { ok: true, horizontal: rows.size === 1 };
  }

  private continuity(tiles: PlacedTile[], horizontal: boolean): boolean {
    if (tiles.length === 0) return false;
    if (horizontal) {
      const row = tiles[0].row;
      const sortedCols = tiles.map((t) => t.col).sort((a, b) => a - b);
      const start = sortedCols[0];
      const end = sortedCols[sortedCols.length - 1];
      for (let c = start; c <= end; c++) {
        if (!this.board[row][c] && !tiles.some((t) => t.row === row && t.col === c)) return false;
      }
      return true;
    } else {
      const col = tiles[0].col;
      const sortedRows = tiles.map((t) => t.row).sort((a, b) => a - b);
      const start = sortedRows[0];
      const end = sortedRows[sortedRows.length - 1];
      for (let r = start; r <= end; r++) {
        if (!this.board[r][col] && !tiles.some((t) => t.row === r && t.col === col)) return false;
      }
      return true;
    }
  }

  private boardIsEmpty(): boolean {
    return this.board.every((row) => row.every((cell) => !cell));
  }


  validateMove(playerId: string, tiles: PlacedTile[]): { valid: boolean; error?: string } {
    if (!this.isPlayersTurn(playerId)) return { valid: false, error: "Not your turn" };
    if (!tiles || tiles.length === 0)
      return { valid: false, error: "Must place at least one tile" };
    if (!this.tilesFromHandValid(playerId, tiles))
      return { valid: false, error: "Tile not in hand" };

    const line = this.singleLine(tiles);
    if (!line.ok) return { valid: false, error: "Tiles must be in a single row or column" };
    const horizontal = !!line.horizontal;

    if (!this.continuity(tiles, horizontal))
      return { valid: false, error: "Tiles must be continuous" };

    if (this.boardIsEmpty()) {
      const center = Math.floor(BOARD_SIZE / 2);
      const coversCenter = tiles.some((t) => t.row === center && t.col === center);
      if (!coversCenter) return { valid: false, error: "First word must cover center square" };
    }

    const formed = this.getFormedWords(tiles);
    for (const f of formed) {
      if (!isValidWord(f.word)) return { valid: false, error: `Invalid word: ${f.word}` };
    }

    return { valid: true };
  }


  private scoreWord(cells: WordCell[]): number {
    let letterSum = 0;
    let wordMul = 1;
    for (const cell of cells) {
      let val = LETTER_VALUES[cell.letter] || 0;
      if (cell.isNew) {
        const premium = this.getPremiumSquareType(cell.row, cell.col);
        if (premium === "DL") val *= 2;
        if (premium === "TL") val *= 3;
        if (premium === "DW") wordMul *= 2;
        if (premium === "TW") wordMul *= 3;
      }
      letterSum += val;
    }
    return letterSum * wordMul;
  }

  calculateScore(tiles: PlacedTile[]): number {
    const formed = this.getFormedWords(tiles);
    let total = 0;
    for (const f of formed) total += this.scoreWord(f.cells);
    if (tiles.length === 7) total += 50; // bingo
    return total;
  }


  private scanMainHorizontal(tiles: PlacedTile[], row: number): FormedWord {
    const cols = tiles.map((t) => t.col);
    const minCol = Math.min(...cols);
    const maxCol = Math.max(...cols);

    let start = minCol;
    while (start > 0 && this.board[row][start - 1]) start--;
    let end = maxCol;
    while (end < BOARD_SIZE - 1 && this.board[row][end + 1]) end++;

    let word = "";
    const cells: WordCell[] = [];
    for (let c = start; c <= end; c++) {
      const boardLetter = this.board[row][c];
      const tile = tiles.find((t) => t.row === row && t.col === c);
      const letter = boardLetter ?? tile?.letter ?? "";
      word += letter;
      cells.push({ letter, row, col: c, isNew: !!tile });
    }
    return { word, cells };
  }

  private scanMainVertical(tiles: PlacedTile[], col: number): FormedWord {
    const rows = tiles.map((t) => t.row);
    const minRow = Math.min(...rows);
    const maxRow = Math.max(...rows);

    let start = minRow;
    while (start > 0 && this.board[start - 1][col]) start--;
    let end = maxRow;
    while (end < BOARD_SIZE - 1 && this.board[end + 1][col]) end++;

    let word = "";
    const cells: WordCell[] = [];
    for (let r = start; r <= end; r++) {
      const boardLetter = this.board[r][col];
      const tile = tiles.find((t) => t.row === r && t.col === col);
      const letter = boardLetter ?? tile?.letter ?? "";
      word += letter;
      cells.push({ letter, row: r, col, isNew: !!tile });
    }
    return { word, cells };
  }

  private buildVerticalCross(tile: PlacedTile): FormedWord | null {
    const c = tile.col;
    const r = tile.row;
    const neighborUp = r > 0 && !!this.board[r - 1][c];
    const neighborDown = r < BOARD_SIZE - 1 && !!this.board[r + 1][c];
    if (!neighborUp && !neighborDown) return null;

    let start = r;
    while (start > 0 && this.board[start - 1][c]) start--;
    let end = r;
    while (end < BOARD_SIZE - 1 && this.board[end + 1][c]) end++;

    let word = "";
    const cells: WordCell[] = [];
    for (let rr = start; rr <= end; rr++) {
      const boardLetter = this.board[rr][c];
      const isNew = rr === r;
      const letter = boardLetter ?? (isNew ? tile.letter : "");
      word += letter;
      cells.push({ letter, row: rr, col: c, isNew });
    }
    return { word, cells };
  }

  private buildHorizontalCross(tile: PlacedTile): FormedWord | null {
    const c = tile.col;
    const r = tile.row;
    const neighborLeft = c > 0 && !!this.board[r][c - 1];
    const neighborRight = c < BOARD_SIZE - 1 && !!this.board[r][c + 1];
    if (!neighborLeft && !neighborRight) return null;

    let start = c;
    while (start > 0 && this.board[r][start - 1]) start--;
    let end = c;
    while (end < BOARD_SIZE - 1 && this.board[r][end + 1]) end++;

    let word = "";
    const cells: WordCell[] = [];
    for (let cc = start; cc <= end; cc++) {
      const boardLetter = this.board[r][cc];
      const isNew = cc === c;
      const letter = boardLetter ?? (isNew ? tile.letter : "");
      word += letter;
      cells.push({ letter, row: r, col: cc, isNew });
    }
    return { word, cells };
  }


  getFormedWords(tiles: PlacedTile[]): FormedWord[] {
    const result: FormedWord[] = [];
    if (!tiles || tiles.length === 0) return result;

    const rows = new Set(tiles.map((t) => t.row));
    const horizontal = rows.size === 1;

    if (horizontal) {
      const row = tiles[0].row;
      result.push(this.scanMainHorizontal(tiles, row));
      for (const t of tiles) {
        const cross = this.buildVerticalCross(t);
        if (cross && cross.word.length > 1) result.push(cross);
      }
    } else {
      const col = tiles[0].col;
      result.push(this.scanMainVertical(tiles, col));
      for (const t of tiles) {
        const cross = this.buildHorizontalCross(t);
        if (cross && cross.word.length > 1) result.push(cross);
      }
    }

    return result;
  }

  applyMove(
    playerId: string,
    tiles: PlacedTile[],
    score: number,
  ): { newTiles: string[]; currentPlayer: string } {
    for (const t of tiles) this.board[t.row][t.col] = t.letter;

    const hand = this.playerHands[playerId];
    for (const t of tiles) {
      const idx = hand.indexOf(t.letter);
      if (idx !== -1) hand.splice(idx, 1);
    }

    const newTiles = this.drawTiles(tiles.length);
    this.playerHands[playerId].push(...newTiles);

    this.scores[playerId] = (this.scores[playerId] || 0) + score;

    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.consecutivePasses = 0;

    return { newTiles, currentPlayer: this.players[this.currentPlayerIndex] };
  }

  pass(playerId: string): {
    valid: boolean;
    error?: string;
    gameOver?: boolean;
    currentPlayer?: string;
  } {
    if (!this.isPlayersTurn(playerId)) return { valid: false, error: "Not your turn" };
    this.consecutivePasses++;
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    if (this.consecutivePasses >= this.players.length) return { valid: true, gameOver: true };
    return { valid: true, currentPlayer: this.players[this.currentPlayerIndex] };
  }

  exchangeTiles(
    playerId: string,
    tilesToExchange: string[],
  ): { valid: boolean; error?: string; newTiles?: string[]; currentPlayer?: string } {
    if (!this.isPlayersTurn(playerId)) return { valid: false, error: "Not your turn" };
    if (this.tileBag.length < tilesToExchange.length)
      return { valid: false, error: "Not enough tiles in bag" };

    const hand = this.playerHands[playerId];
    for (const letter of tilesToExchange) {
      const idx = hand.indexOf(letter);
      if (idx === -1) return { valid: false, error: "Tile not in hand" };
      hand.splice(idx, 1);
    }

    const newTiles = this.drawTiles(tilesToExchange.length);
    hand.push(...newTiles);

    this.tileBag.push(...tilesToExchange);
    this.tileBag = this.shuffle(this.tileBag);

    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;

    return { valid: true, newTiles, currentPlayer: this.players[this.currentPlayerIndex] };
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
    return this.playerHands[playerId] ?? [];
  }
}

export default ScrabbleGame;
