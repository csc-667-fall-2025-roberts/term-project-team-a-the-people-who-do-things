class ScrabbleBoard {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.boardSize = 15;
        this.board = Array(this.boardSize).fill(null).map(() =>
            Array(this.boardSize).fill(null)
        );
        this.selectedTiles = [];
        this.hand = [];
        this.render();
    }

    render() {
        this.container.innerHTML = '';
        this.container.className = 'scrabble-board';

        for (let row = 0; row < this.boardSize; row++) for (let col = 0; col < this.boardSize; col++) {
            const cell = document.createElement('div');
            cell.className = 'board-cell';
            cell.dataset.row = row;
            cell.dataset.col = col;

            const premium = this.getPremiumType(row, col);
            if (premium) {
                cell.classList.add(premium);
            }

            if (row === 7 && col === 7) {
                cell.classList.add('center');
            }

            cell.addEventListener('click', () => this.handleCellClick(row, col));
            cell.addEventListener('dragover', (e) => e.preventDefault());
            cell.addEventListener('drop', (e) => this.handleDrop(e, row, col));

            if (this.board[row][col]) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.textContent = this.board[row][col];
                cell.appendChild(tile);
            }

            this.container.appendChild(cell);
        }
    }

    getPremiumType(row, col) {
        const premiums = {
            TW: [[0,0], [0,7], [0,14], [7,0], [7,14], [14,0], [14,7], [14,14]],
            DW: [[1,1], [2,2], [3,3], [4,4], [1,13], [2,12], [3,11], [4,10],
                [13,1], [12,2], [11,3], [10,4], [13,13], [12,12], [11,11], [10,10]],
            TL: [[1,5], [1,9], [5,1], [5,5], [5,9], [5,13], [9,1], [9,5],
                [9,9], [9,13], [13,5], [13,9]],
            DL: [[0,3], [0,11], [2,6], [2,8], [3,0], [3,7], [3,14], [6,2],
                [6,6], [6,8], [6,12], [7,3], [7,11], [8,2], [8,6], [8,8],
                [8,12], [11,0], [11,7], [11,14], [12,6], [12,8], [14,3], [14,11]]
        };

        for (const [type, positions] of Object.entries(premiums)) {
            if (positions.some(([r, c]) => r === row && c === col)) {
                return type;
            }
        }
        return null;
    }

    handleCellClick(row, col) {

    }

    handleDrop(e, row, col) {
        e.preventDefault();
        const letter = e.dataTransfer.getData('letter');
        if (letter && !this.board[row][col]) {
            this.placeTile(row, col, letter);
        }
    }

    placeTile(row, col, letter) {
        this.board[row][col] = letter;
        this.selectedTiles.push({ row, col, letter });
        this.render();
    }

    removeTile(row, col) {
        const letter = this.board[row][col];
        this.board[row][col] = null;
        this.selectedTiles = this.selectedTiles.filter(t =>
            t.row !== row || t.col !== col
        );
        this.hand.push(letter);
        this.render();
    }

    updateBoard(boardState) {
        this.board = boardState;
        this.render();
    }

    setHand(tiles) {
        this.hand = tiles;
        this.renderHand();
    }

    renderHand() {
        const handContainer = document.getElementById('player-hand');
        if (!handContainer) return;

        handContainer.innerHTML = '';

        this.hand.forEach(letter => {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.textContent = letter;
            tile.draggable = true;

            tile.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('letter', letter);
            });

            handContainer.appendChild(tile);
        });
    }

    getSelectedTiles() {
        return this.selectedTiles;
    }

    clearSelection() {
        this.selectedTiles = [];
    }
}

export default ScrabbleBoard