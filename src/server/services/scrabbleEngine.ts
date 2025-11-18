
// Scrabble board
const BOARD_SIZE = 15;

const LETTER_VALUES = {
    A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8,
    K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1,
    U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10, '*': 0 // * is blank
};

const LETTER_DISTRIBUTION = {
    A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1,
    K: 1, L: 4, M: 2, N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6,
    U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1, '*': 2
};

const PREMIUM_SQUARES = {
    TW: [[0,0], [0,7], [0,14], [7,0], [7,14], [14,0], [14,7], [14,14]], // Triple Word
    DW: [[1,1], [2,2], [3,3], [4,4], [1,13], [2,12], [3,11], [4,10],
        [13,1], [12,2], [11,3], [10,4], [13,13], [12,12], [11,11], [10,10]], // Double Word
    TL: [[1,5], [1,9], [5,1], [5,5], [5,9], [5,13], [9,1], [9,5],
        [9,9], [9,13], [13,5], [13,9]], // Triple Letter
    DL: [[0,3], [0,11], [2,6], [2,8], [3,0], [3,7], [3,14], [6,2],
        [6,6], [6,8], [6,12], [7,3], [7,11], [8,2], [8,6], [8,8],
        [8,12], [11,0], [11,7], [11,14], [12,6], [12,8], [14,3], [14,11]] // Double Letter
};

export class ScrabbleGame {
        gameId: string;
        players: number;
        board: any[][];
        tileBag: any[];
        playerHands: { [playerId: string]: string[] };
        scores: { [playerId: string]: number };
        consecutivePasses: number;

        constructor(gameId: string, players: string[]) {
            this.gameId = gameId;
            this.board = this.createEmptyBoard();
            this.tileBag = this.initializeTileBag();
            this.players = 0;
            this.playerHands = {};
            this.scores = {};
            this.consecutivePasses = 0;

            players.forEach((playerId: string) => {
                this.scores[playerId] = 0;
                this.playerHands[playerId] = this.drawTiles(7);
            });
        }

    createEmptyBoard() {
        return Array(BOARD_SIZE).fill(null).map(() =>
            Array(BOARD_SIZE).fill(null)
        );
    }

    initializeTileBag() {
        const tiles = [];
        for (const [letter, count] of Object.entries(LETTER_DISTRIBUTION)) {
            for (let i = 0; i < count; i++) {
                tiles.push(letter);
            }
        }
        return this.shuffle(tiles);
    }

    shuffle(array: any[]) {
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
                drawn.push(this.tileBag.pop());
            }
            return drawn;
        }

    getPremiumSquareType(row: number, col: number): string | null {
        for (const [type, positions] of Object.entries(PREMIUM_SQUARES)) {
            if (positions.some(([r, c]) => r === row && c === col)) {
                return type;
            }
        }
        return null;
    }

    validateMove(playerId: string, tiles: number) {
        // tiles: [{ letter, row, col, isBlank }]

        if (this.players[ScrabbleGame.players] !== playerId) {
            return { valid: false, error: 'Not your turn' };
        }

        if (tiles.length === 0) {
            return { valid: false, error: 'Must place at least one tile' };
        }

        // Check tiles in hand
        const hand = this.playerHands[playerId];
        const usedLetters = tiles.map(t => t.isBlank ? '*' : t.letter);
        const handCopy = [...hand];

        for (const letter of usedLetters) {
            const index = handCopy.indexOf(letter);
            if (index === -1) {
                return { valid: false, error: 'Tile not in hand' };
            }
            handCopy.splice(index, 1);
        }

        const rows = [...new Set(tiles.map(t => t.row))];
        const cols = [...new Set(tiles.map(t => t.col))];

        if (rows.length > 1 && cols.length > 1) {
            return { valid: false, error: 'Tiles must be in a single row or column' };
        }

        // continuity
        if (rows.length === 1) {
            const sortedCols = cols.sort((a, b) => a - b);
            const row = rows[0];
            for (let i = sortedCols[0]; i <= sortedCols[sortedCols.length - 1]; i++) {
                if (!this.board[row][i] && !tiles.some(t => t.row === row && t.col === i)) {
                    return { valid: false, error: 'Tiles must be continuous' };
                }
            }
        } else {
            const sortedRows = rows.sort((a, b) => a - b);
            const col = cols[0];
            for (let i = sortedRows[0]; i <= sortedRows[sortedRows.length - 1]; i++) {
                if (!this.board[i][col] && !tiles.some(t => t.row === i && t.col === col)) {
                    return { valid: false, error: 'Tiles must be continuous' };
                }
            }
        }

        // must cover center
        const boardEmpty = this.board.every(row => row.every(cell => !cell));
        if (boardEmpty) {
            const coversCenter = tiles.some(t => t.row === 7 && t.col === 7);
            if (!coversCenter) {
                return { valid: false, error: 'First word must cover center square' };
            }
        }

        return { valid: true };
    }

        calculateScore(tiles: any[]) {
            let score = 0;
            let wordMultiplier = 1;

            for (const tile of tiles) {
                let letterScore: number = LETTER_VALUES[tile.letter as keyof typeof LETTER_VALUES];
                const premium = this.getPremiumSquareType(tile.row, tile.col);

                if (!this.board[tile.row][tile.col]) { // Only count premium on new tiles
                    if (premium === 'DL') letterScore *= 2;
                    if (premium === 'TL') letterScore *= 3;
                    if (premium === 'DW') wordMultiplier *= 2;
                    if (premium === 'TW') wordMultiplier *= 3;
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

    getFormedWords(tiles: number) {
        // need full word detection logic
        const words = [];

        // main word
        const rows = [...new Set(tiles.map(t => t.row))];
        const cols = [...new Set(tiles.map(t => t.col))];

        if (rows.length === 1) {
            const row = rows[0];
            const minCol = Math.min(...cols);
            const maxCol = Math.max(...cols);
            let word = '';
            for (let c = minCol; c <= maxCol; c++) {
                word += this.board[row][c] || tiles.find(t => t.row === row && t.col === c)?.letter || '';
            }
            words.push(word);
        } else {
            const col = cols[0];
            const minRow = Math.min(...rows);
            const maxRow = Math.max(...rows);
            let word = '';
            for (let r = minRow; r <= maxRow; r++) {
                word += this.board[r][col] || tiles.find(t => t.row === r && t.col === col)?.letter || '';
            }
            words.push(word);
        }

        return words;
    }

    applyMove(playerId: string, tiles: number, score: number) {
        // place tiles on board
        for (const tile of tiles) {
            this.board[tile.row][tile.col] = tile.letter;
        }

        // remove tiles from hand
        const usedLetters: string = tiles.map(t => t.isBlank ? '*' : t.letter);
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
            currentPlayer: this.players[this.currentPlayerIndex]
        };
    }

    pass(playerId) {
        if (this.players[this.currentPlayerIndex] !== playerId) {
            return { valid: false, error: 'Not your turn' };
        }

        this.consecutivePasses++;
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;

        // game ends if all players pass
        if (this.consecutivePasses >= this.players.length) {
            return { valid: true, gameOver: true };
        }

        return {
            valid: true,
            currentPlayer: this.players[this.currentPlayerIndex]
        };
    }

    exchangeTiles(playerId: string, tilesToExchange: number) {
        if (this.players[this.currentPlayerIndex] !== playerId) {
            return { valid: false, error: 'Not your turn' };
        }

        if (this.tileBag.length < tilesToExchange.length) {
            return { valid: false, error: 'Not enough tiles in bag' };
        }

        // remove tiles from hand
        const hand = this.playerHands[playerId];
        for (const letter of tilesToExchange) {
            const index = hand.indexOf(letter);
            if (index === -1) {
                return { valid: false, error: 'Tile not in hand' };
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
            currentPlayer: this.players[this.currentPlayerIndex]
        };
    }

    getGameState() {
        return {
            board: this.board,
            currentPlayer: this.players[this.currentPlayerIndex],
            scores: this.scores,
            tilesRemaining: this.tileBag.length
        };
    }

    getPlayerHand(playerId: string) {
        return this.playerHands[playerId] || [];
    }
}

export default ScrabbleGame;