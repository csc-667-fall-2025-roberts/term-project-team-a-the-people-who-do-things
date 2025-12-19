import {
  BOARD_SIZE,
  LETTER_VALUES,
  PREMIUM_SQUARES,
} from "../../server/services/scrabbleConstants.js";
import type { SelectedTile, Tile } from "../../types/client/socket-events.js";

type PremiumSquare = "TW" | "DW" | "TL" | "DL";

class ScrabbleBoard {
  container: HTMLElement | null;
  boardSize: typeof BOARD_SIZE;
  board: (Tile | null)[][];
  selectedTiles: SelectedTile[];
  hand: Tile[];

  constructor(containerId: string) {
    this.container = document.getElementById(containerId);
    this.boardSize = BOARD_SIZE;
    this.board = Array(this.boardSize)
      .fill(null)
      .map(() => Array(this.boardSize).fill(null));
    this.selectedTiles = [];
    this.hand = [];
    this.render();
  }

  render(): void {
    if (!this.container) return;

    this.clearContainer();
    this.setContainerAttributes();
    for (let row = 0; row < this.boardSize; row++) {
      for (let col = 0; col < this.boardSize; col++) {
        const cell = this.createCellElement(row, col);

        const tileData = this.board[row][col];
        if (tileData) {
          this.renderTileInCell(cell, tileData, row, col);
        }

        this.container.appendChild(cell);
      }
    }
  }

  private clearContainer(): void {
    if (!this.container) return;
    this.container.innerHTML = "";
  }

  private setContainerAttributes(): void {
    if (!this.container) return;
    this.container.className =
      "grid gap-[2px] bg-slate-800 p-[3px] rounded-lg shadow-xl w-full aspect-square max-w-[65vh] mx-auto mb-6";
    this.container.style.gridTemplateColumns = `repeat(${this.boardSize}, 1fr)`;
    this.container.style.gridTemplateRows = `repeat(${this.boardSize}, 1fr)`;
  }

  private createCellElement(row: number, col: number): HTMLElement {
    const cell = document.createElement("div");
    cell.className =
      "relative flex items-center justify-center select-none text-[2.2vmin] font-bold text-slate-700/60";
    cell.dataset.row = row.toString();
    cell.dataset.col = col.toString();

    this.applyPremiumStyles(cell, row, col);

    const center = Math.floor(this.boardSize / 2);
    if (row === center && col === center) {
      cell.classList.remove("text-slate-700/60");
      cell.classList.add("text-white");
      cell.innerText = "★";
      cell.style.fontSize = "16px";
      cell.className = cell.className.replace(/bg-[^\s]+/g, "");
      cell.className += " bg-pink-400";
    }

    this.setupCellEvents(cell, row, col);

    return cell;
  }

  private applyPremiumStyles(cell: HTMLElement, row: number, col: number): void {
    const premiumTile = this.getPremiumTile(row, col);
    let bgColor = "bg-slate-200";

    if (premiumTile) {
      switch (premiumTile) {
        case "TW":
          bgColor = "bg-red-500 text-white/90";
          cell.innerText = "TW";
          break;
        case "DW":
          bgColor = "bg-pink-400 text-white/90";
          cell.innerText = "DW";
          break;
        case "TL":
          bgColor = "bg-blue-500 text-white/90";
          cell.innerText = "TL";
          break;
        case "DL":
          bgColor = "bg-sky-300 text-slate-700";
          cell.innerText = "DL";
          break;
      }
    }

    cell.className += ` ${bgColor}`;
  }

  private setupCellEvents(cell: HTMLElement, row: number, col: number): void {
    cell.addEventListener("click", () => this.handleCellClick(row, col));
    cell.addEventListener("dragover", (e) => e.preventDefault());
    cell.addEventListener("drop", (e) => this.handleDrop(e as DragEvent, row, col));
  }

  private renderTileInCell(cell: HTMLElement, tileData: Tile, row: number, col: number): void {
    const tile = document.createElement("div");

    if (tileData.locked) {
      tile.className =
        "absolute inset-[1px] bg-amber-200 rounded-sm shadow-sm flex items-center justify-center z-10";
    } else {
      tile.className =
        "absolute inset-[1px] bg-amber-100 rounded-sm shadow-sm border-b-2 border-amber-200 flex items-center justify-center z-10 cursor-pointer hover:-translate-y-[1px] transition-transform";

      tile.addEventListener("click", (e) => {
        e.stopPropagation();
        this.handleCellClick(row, col);
      });
    }

    const letterSpan = document.createElement("span");
    letterSpan.className = "text-sm font-bold sm:text-base text-slate-900";
    letterSpan.textContent = tileData.letter || "";

    const valueSpan = document.createElement("span");
    valueSpan.className =
      "absolute bottom-0.5 right-0.5 text-[7px] leading-none font-medium text-slate-500";
    valueSpan.textContent = (tileData.value || 0).toString();

    tile.appendChild(letterSpan);
    tile.appendChild(valueSpan);

    cell.innerText = "";
    cell.appendChild(tile);
  }

  getPremiumTile(row: number, col: number): PremiumSquare | null {
    for (const [type, positions] of Object.entries(PREMIUM_SQUARES)) {
      if (positions.some(([r, c]: [number, number]) => r === row && c === col)) {
        return type as PremiumSquare;
      }
    }
    return null;
  }

  handleCellClick(row: number, col: number): void {
    const tile = this.board[row][col];
    if (tile && !tile.locked) {
      this.removeTile(row, col);
    }
  }

  handleDrop(e: DragEvent, row: number, col: number): void {
    e.preventDefault();
    if (!e.dataTransfer) return;

    const letter = e.dataTransfer.getData("letter");
    if (letter && !this.board[row][col]) {
      this.placeTile(row, col, letter);
    }
  }

  placeTile(row: number, col: number, letter: string): void {
    const handIndex = this.hand.findIndex((t) => t.letter === letter);
    if (handIndex === -1) return;

    this.hand.splice(handIndex, 1);
    this.renderHand();

    this.board[row][col] = {
      letter,
      value: LETTER_VALUES[letter] || 0,
      locked: false,
    };
    this.selectedTiles.push({ row, col, letter });
    this.render();
  }

  removeTile(row: number, col: number): void {
    const tile = this.board[row][col];
    if (!tile || tile.locked) return;

    this.board[row][col] = null;
    this.selectedTiles = this.selectedTiles.filter((t) => t.row !== row || t.col !== col);

    this.hand.push(tile);
    this.renderHand();
    this.render();
  }

  setHand(tiles: string[] | Tile[]): void {
    if (!tiles || tiles.length === 0) {
      this.hand = [];
      this.renderHand();
      return;
    }

    if (typeof tiles[0] === "string") {
      this.hand = (tiles as string[]).map((letter) => ({
        letter: letter,
        value: LETTER_VALUES && LETTER_VALUES[letter] ? LETTER_VALUES[letter] : 0,
      }));
    } else {
      this.hand = tiles as Tile[];
    }

    this.renderHand();
  }

  updateBoard(boardState: (string | Tile | null)[][] | (Tile | null)[][]): void {
    const tilesToReturn: Tile[] = [];
    const remainingSelected: SelectedTile[] = [];

    for (const staged of this.selectedTiles) {
      const newCell = boardState[staged.row][staged.col];
      if (newCell) {
        tilesToReturn.push({
          letter: staged.letter,
          value: LETTER_VALUES[staged.letter] || 0,
        });
      } else {
        remainingSelected.push(staged);
      }
    }

    if (tilesToReturn.length > 0) {
      this.hand.push(...tilesToReturn);
      console.log("Returned tiles to hand:", tilesToReturn.map((t) => t.letter).join(", "));
    }

    this.selectedTiles = remainingSelected;

    this.board = boardState.map((row, rowIdx) =>
      row.map((cell, colIdx) => {
        const staged = remainingSelected.find((s) => s.row === rowIdx && s.col === colIdx);
        if (staged) {
          return { letter: staged.letter, value: LETTER_VALUES[staged.letter] || 0, locked: false };
        }

        if (!cell) return null;
        if (typeof cell === "string") {
          return { letter: cell, value: LETTER_VALUES[cell] || 0, locked: true };
        }
        return { ...cell, locked: true } as Tile;
      }),
    );

    this.renderHand();
    this.render();
  }

  getHand(): Tile[] {
    return this.hand;
  }

  renderHand(): void {
    const handContainer = document.getElementById("player-hand");
    if (!handContainer) return;

    handContainer.innerHTML = "";
    handContainer.className =
      "flex flex-wrap justify-center gap-2 p-4 bg-slate-200/50 rounded-xl shadow-inner min-h-[4rem] items-center w-fit mx-auto";

    this.hand.forEach((tile) => {
      if (!tile || !tile.letter) return;

      const tileElement = document.createElement("div");

      tileElement.className =
        "relative flex items-center justify-center w-10 h-10 transition-transform border-b-4 rounded shadow-md bg-amber-100 border-amber-300 cursor-grab active:cursor-grabbing hover:-translate-y-1";

      tileElement.draggable = true;

      const letterSpan = document.createElement("span");
      letterSpan.className = "text-lg font-bold text-slate-900";
      letterSpan.textContent = tile.letter;

      const valueSpan = document.createElement("span");
      valueSpan.className = "absolute bottom-1 right-1 text-[9px] font-bold text-slate-500";
      valueSpan.textContent = (tile.value || 0).toString();

      tileElement.appendChild(letterSpan);
      tileElement.appendChild(valueSpan);

      tileElement.addEventListener("dragstart", (e) => {
        if (e.dataTransfer) {
          e.dataTransfer.setData("letter", tile.letter);
          e.dataTransfer.effectAllowed = "move";
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
