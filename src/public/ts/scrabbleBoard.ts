import type { SelectedTile, Tile} from "../../types/client/socket-events.js";
import { LETTER_VALUES, BOARD_SIZE, PREMIUM_SQUARES } from "../../server/services/scrabbleConstants.js";

type PremiumSquare = 'triple-word' | 'double-word' | 'triple-letter' | 'double-letter';


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

        this.container.innerHTML = "";
        this.container.className = "scrabble-board";

        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                const cell = document.createElement("div");
                cell.className = "board-cell";
                cell.dataset.row = row.toString();
                cell.dataset.col = col.toString();

                const premiumTile = this.getPremiumTile(row, col);
                if (premiumTile) {
                    cell.classList.add(premiumTile);
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


getPremiumTile(row: number, col: number): PremiumSquare | null {
    for (const [type, positions] of Object.entries(PREMIUM_SQUARES)) {
        if (positions.some(([r, c]: [number, number]) => r === row && c === col)) {
            return type as PremiumSquare;
        }
    }
    return null;
}

    handleCellClick(row: number, col: number): void {
        if (this.board[row][col]) {
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
        this.board[row][col] = { letter, value: LETTER_VALUES[letter] || 0 };
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

    setHand(tiles: string[] | Tile[]): void {
        this.hand = typeof tiles[0] === 'string'
            ? (tiles as string[]).map(letter => ({
                letter,
                value: LETTER_VALUES[letter] || 0
              }))
            : tiles as Tile[];
        this.renderHand();
    }

    updateBoard(boardState: (string | Tile | null)[][] | (Tile | null)[][]): void {
        this.board = boardState.map(row =>
            row.map(cell => {
                if (!cell) return null;
                if (typeof cell === 'string') {
                    return { letter: cell, value: LETTER_VALUES[cell] || 0 };
                }
                return cell;
            })
        );
        this.render();
    }

    getHand(): Tile[] {
        return this.hand;
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

