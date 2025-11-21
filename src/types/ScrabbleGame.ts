export interface PlacedTile {
  letter: string;
  row: number;
  col: number;
  isBlank?: boolean;
}

export interface MoveResult {
  valid: boolean;
  error?: string;
  currentPlayer?: string;
  gameOver?: boolean;
}

export interface ApplyMoveResult {
  newTiles: string[];
  currentPlayer: string;
}

export interface ExchangeResult {
  valid: boolean;
  error?: string;
  newTiles?: string[];
  currentPlayer?: string;
}

export interface ScrabbleGameState {
  board: (string | null)[][];
  currentPlayer: string;
  scores: { [playerId: string]: number };
  tilesRemaining: number;
}

export interface IScrabbleGame {
  gameId: string;
  board: (string | null)[][];
  tileBag: string[];
  players: string[];
  currentPlayerIndex: number;
  playerHands: { [playerId: string]: string[] };
  scores: { [playerId: string]: number };
  consecutivePasses: number;

  createEmptyBoard(): (string | null)[][];
  initializeTileBag(): string[];
  shuffle<T>(array: T[]): T[];
  drawTiles(count: number): string[];
  getPremiumSquareType(row: number, col: number): string | null;
  validateMove(playerId: string, tiles: PlacedTile[]): { valid: boolean; error?: string };
  calculateScore(tiles: PlacedTile[]): number;
  getFormedWords(tiles: PlacedTile[]): string[];
  applyMove(playerId: string, tiles: PlacedTile[], score: number): ApplyMoveResult;
  pass(playerId: string): MoveResult;
  exchangeTiles(playerId: string, tilesToExchange: string[]): ExchangeResult;
  getGameState(): ScrabbleGameState;
  getPlayerHand(playerId: string): string[];
}
