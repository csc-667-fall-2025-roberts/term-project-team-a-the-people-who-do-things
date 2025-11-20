import e from "express";
import { type } from "os";
import type { Tile, PremiumType, SelectedTile } from "../../types/client/dom.ts";


class ScrabbleBoard {
  container: HTMLElement | null;
  boardSize: number;
  board: (Tile | null)[][];
  selectedTiles: SelectedTile[];
  hand: Tile[];

  constructor(containerId: string) {
    this.container = document.getElementById(containerId);
    this.boardSize = 15;
    this.board = Array(this.boardSize)
      .fill(null)
      .map(() => Array(this.boardSize).fill(null));
    this.selectedTiles = [];
    this.hand = [];
    this.render();
  }

  render(): void {
    if (!this.container) return;

    this.container.innerHTML = "";
    this.container.className = "scrabble-board";

    for (let row = 0; row < this.boardSize; row++) {
      for (let col = 0; col < this.boardSize; col++) {
        const cell = document.createElement("div");
        cell.className = "board-cell";
        cell.dataset.row = row.toString();
        cell.dataset.col = col.toString();

        const premium = this.getPremiumType(row, col);
        if (premium) {
          cell.classList.add(premium);
        }

        if (row === 7 && col === 7) {
          cell.classList.add("center");
        }

        cell.addEventListener("click", () => this.handleCellClick(row, col));
        cell.addEventListener("dragover", (e) => e.preventDefault());
        cell.addEventListener("drop", (e) => this.handleDrop(e, row, col));

        if (this.board[row][col]) {
          const tile = document.createElement("div");
          tile.className = "tile";
          tile.textContent = this.board[row][col]?.letter || "";
          cell.appendChild(tile);
        }

        this.container.appendChild(cell);
      }
    }
  }
    handleCellClick(_row: number, _col: number): any {
        throw new Error("Method not implemented.");
    }
    // handleDrop(e: DragEvent, row: number, col: number): any {
    //     throw new Error("Method not implemented.");
    // }
    // handleCellClick(row: number, col: number): any {
    //     throw new Error("Method not implemented.");
    // }

  getPremiumType(row: number, col: number): PremiumType | null {
    const premiums: Record<PremiumType, number[][]> = {
     
    for (const [type, positions] of Object.entries(premiums)) {
      if (positions.some(([r, c]) => r === row && c === col)) {
        return type as PremiumType;
      }
    }
    return null;
  }

  handleCellClick(row: number, col: number): void {
    // Implementation for cell click handling
  }

  handleDrop(e: DragEvent, row: number, col: number): void {
    e.preventDefault();
    if (!e.dataTransfer) return;

    const letter = e.dataTransfer.getData("letter");
    if (_letter && !this.board[row][col]) {
      this.placeTile(row, col, letter);
    }
  }

  placeTile(row: number, col: number, letter: string): void {
    // Find the tile value for this letter (simplified - you may need proper letter values)
    const letterValues: Record<string, number> = {
    
    this.board[row][col] = { letter, value: letterValues[letter] || 0 };
    this.selectedTiles.push({ row, col, letter });
    this.render();
  }

  removeTile(row: number, col: number): void {
    const tile = this.board[row][col];
    if (!tile) return;

    this.board[row][col] = null;
    this.selectedTiles = this.selectedTiles.filter((t) => t.row !== row || t.col !== col);

    // Return tile to hand
    this.hand.push(tile);
    this.render();
  }

  updateBoard(boardState: (Tile | null)[][]): void {
    this.board = boardState;
    this.render();
  }

  setHand(tiles: Tile[]): void {
    this.hand = tiles;
    this.renderHand();
  }

  renderHand(): void {
    const handContainer = document.getElementById("player-hand");
    if (!handContainer) return;

    handContainer.innerHTML = "";

    this.hand.forEach((tile) => {
      const tileElement = document.createElement("div");
      tileElement.className = "tile";
      tileElement.textContent = tile.letter;
      tileElement.draggable = true;

      tileElement.addEventListener("dragstart", (e) => {
        if (e.dataTransfer) {
          e.dataTransfer.setData("letter", tile.letter);
        }
      });

      handContainer.appendChild(tileElement);
    });
  }

  getSelectedTiles(): SelectedTile[] {
    return this.selectedTiles;
  }

  clearSelection(): void {
    this.selectedTiles = [];
  }
}

export default ScrabbleBoard;
