import type { SelectedTile, Tile} from "../../types/client/socket-events.js";
import { LETTER_VALUES, BOARD_SIZE, PREMIUM_SQUARES } from "../../server/services/scrabbleConstants.js";

type PremiumSquare = 'TW' | 'DW' | 'TL' | 'DL';

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
    
            // Reset container and apply Grid layout
            this.container.innerHTML = "";
            this.container.className = "grid gap-[2px] bg-slate-800 p-[3px] rounded-lg shadow-xl w-full aspect-square max-w-[85vh] mx-auto";            // Tailwind doesn't support grid-cols-15 by default, so we use inline style or a custom config
            this.container.style.gridTemplateColumns = `repeat(${this.boardSize}, 1fr)`;
            this.container.style.gridTemplateRows = `repeat(${this.boardSize}, 1fr)`;
    
            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize; col++) {
                    const cell = document.createElement("div");
                    
                    // Base cell styles: Flexbox for centering content, relative for positioning tiles
                    cell.className = "relative flex items-center justify-center select-none text-[2.2vmin] font-bold text-slate-700/60";                    
                    cell.dataset.row = row.toString();
                    cell.dataset.col = col.toString();
    
                    // --- 1. COLOR LOGIC (Tailwind) ---
                    const premiumTile = this.getPremiumTile(row, col);
                    
                    // Default Color
                    let bgColor = "bg-slate-200"; 
    
                    // Map 'TW', 'DL', etc. to Tailwind Colors
                    if (premiumTile) {
                        switch (premiumTile) {
                            case 'TW': // Triple Word
                                bgColor = "bg-red-500 text-white/90";
                                cell.innerText = "TW";
                                break;
                            case 'DW': // Double Word
                                bgColor = "bg-pink-400 text-white/90";
                                cell.innerText = "DW";
                                break;
                            case 'TL': // Triple Letter
                                bgColor = "bg-blue-500 text-white/90";
                                cell.innerText = "TL";
                                break;
                            case 'DL': // Double Letter
                                bgColor = "bg-sky-300 text-slate-700";
                                cell.innerText = "DL";
                                break;
                        }
                    }
    
                    // Center Star Override
                    if (row === 7 && col === 7) {
                        bgColor = "bg-pink-400 text-white";
                        cell.innerText = "★";
                        cell.style.fontSize = "16px";
                    }
    
                    // Apply the calculated background class
                    cell.className += ` ${bgColor}`;
    
                    // --- 2. EVENTS ---
                    cell.addEventListener("click", () => this.handleCellClick(row, col));
                    cell.addEventListener("dragover", (e) => e.preventDefault());
                    cell.addEventListener("drop", (e) => this.handleDrop(e, row, col));
    
                    // --- 3. RENDER TILE (If occupied) ---
                    if (this.board[row][col]) {
                        // Create the physical tile element
                        const tile = document.createElement("div");
                        
                        // Tile Styling: Beige square, shadow, centered text
                        tile.className = "absolute inset-[1px] bg-amber-100 rounded-sm shadow-sm border-b-2 border-amber-200 flex items-center justify-center z-10 cursor-pointer hover:-translate-y-[1px] transition-transform";
                        
                        // Letter
                        const letterSpan = document.createElement("span");
                        letterSpan.className = "text-sm sm:text-base font-bold text-slate-900";
                        letterSpan.textContent = this.board[row][col]?.letter || "";
                        
                        // Point Value (tiny number in bottom right)
                        const valueSpan = document.createElement("span");
                        valueSpan.className = "absolute bottom-0.5 right-0.5 text-[7px] leading-none font-medium text-slate-500";
                        valueSpan.textContent = (this.board[row][col]?.value || 0).toString();
    
                        tile.appendChild(letterSpan);
                        tile.appendChild(valueSpan);
                        
                        // Clear the background text (TW/DL) so the tile covers it cleanly
                        cell.innerText = ""; 
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
            // Ensure the hand container handles flex/grid layout via Tailwind in EJS, 
            // or force it here:
            handContainer.className = "flex gap-2 justify-center flex-wrap";
    
            this.hand.forEach((tile) => {
                const tileElement = document.createElement("div");
                
                // Same styling as the board tiles, but bigger (w-10 h-10)
                tileElement.className = "relative w-10 h-10 bg-amber-100 rounded shadow-md border-b-4 border-amber-300 flex items-center justify-center cursor-grab active:cursor-grabbing hover:-translate-y-1 transition-transform";
                
                tileElement.draggable = true;
    
                // Letter
                const letterSpan = document.createElement("span");
                letterSpan.className = "text-lg font-bold text-slate-900";
                letterSpan.textContent = tile.letter;
    
                // Value
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

