// Sudoku Game Logic
class SudokuGame {
    constructor() {
        this.board = Array(9).fill(null).map(() => Array(9).fill(0));
        this.solution = Array(9).fill(null).map(() => Array(9).fill(0));
        this.prefilled = Array(9).fill(null).map(() => Array(9).fill(false));
        this.memos = this.initializeMemos();
        this.difficulty = 'medium';
        this.selectedCell = null;
        this.memoMode = false;
        this.history = [];
        this.maxHistory = 50;
        this.init();
    }

    initializeMemos() {
        return Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set()));
    }

    init() {
        this.setupEventListeners();
        this.newGame();
    }

    setupEventListeners() {
        document.getElementById('newGame').addEventListener('click', () => this.newGame());
        document.getElementById('checkSolution').addEventListener('click', () => this.checkSolution());
        document.getElementById('solve').addEventListener('click', () => this.showSolution());
        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.difficulty = e.target.value;
        });
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('memoToggle').addEventListener('click', () => this.toggleMemoMode());
        
        // Number pad event listeners
        for (let i = 1; i <= 9; i++) {
            document.getElementById(`num${i}`).addEventListener('click', () => this.inputNumber(i));
        }
        document.getElementById('clearBtn').addEventListener('click', () => this.clearCell());
    }

    newGame() {
        this.generateSudoku();
        this.memos = this.initializeMemos();
        this.selectedCell = null;
        this.history = [];
        this.renderBoard();
        this.showMessage('');
    }

    generateSudoku() {
        // Generate a complete valid sudoku
        this.solution = Array(9).fill(null).map(() => Array(9).fill(0));
        this.fillBoard(this.solution);
        
        // Copy solution to board
        this.board = this.solution.map(row => [...row]);
        
        // Remove numbers based on difficulty
        const cellsToRemove = {
            'easy': 35,
            'medium': 45,
            'hard': 55
        }[this.difficulty];
        
        this.prefilled = Array(9).fill(null).map(() => Array(9).fill(true));
        
        let removed = 0;
        while (removed < cellsToRemove) {
            const row = Math.floor(Math.random() * 9);
            const col = Math.floor(Math.random() * 9);
            
            if (this.board[row][col] !== 0) {
                this.board[row][col] = 0;
                this.prefilled[row][col] = false;
                removed++;
            }
        }
    }

    fillBoard(board) {
        // Simple backtracking algorithm to fill the board
        const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (board[row][col] === 0) {
                    // Fisher-Yates shuffle for proper randomization
                    const shuffled = [...numbers];
                    for (let i = shuffled.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                    }
                    
                    for (let num of shuffled) {
                        if (this.isValid(board, row, col, num)) {
                            board[row][col] = num;
                            
                            if (this.fillBoard(board)) {
                                return true;
                            }
                            
                            board[row][col] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }

    isValid(board, row, col, num) {
        // Check row
        for (let x = 0; x < 9; x++) {
            if (board[row][x] === num) return false;
        }
        
        // Check column
        for (let x = 0; x < 9; x++) {
            if (board[x][col] === num) return false;
        }
        
        // Check 3x3 box
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (board[boxRow + i][boxCol + j] === num) return false;
            }
        }
        
        return true;
    }

    renderBoard() {
        const boardElement = document.getElementById('sudoku-board');
        boardElement.innerHTML = '';
        
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                if (this.prefilled[row][col]) {
                    cell.classList.add('prefilled');
                }
                
                // Add click handler for cell selection
                cell.addEventListener('click', () => this.selectCell(row, col));
                
                // Render main number or memo numbers
                if (this.board[row][col] !== 0) {
                    const mainNumber = document.createElement('div');
                    mainNumber.className = 'main-number';
                    mainNumber.textContent = this.board[row][col];
                    cell.appendChild(mainNumber);
                } else if (this.memos[row][col].size > 0) {
                    const memoContainer = document.createElement('div');
                    memoContainer.className = 'memo-container';
                    for (let i = 1; i <= 9; i++) {
                        const memoCell = document.createElement('div');
                        memoCell.className = 'memo-cell';
                        if (this.memos[row][col].has(i)) {
                            memoCell.textContent = i;
                        }
                        memoContainer.appendChild(memoCell);
                    }
                    cell.appendChild(memoContainer);
                }
                
                boardElement.appendChild(cell);
            }
        }
        
        // Highlight selected cell
        if (this.selectedCell) {
            const selectedElement = document.querySelector(
                `.cell[data-row="${this.selectedCell.row}"][data-col="${this.selectedCell.col}"]`
            );
            if (selectedElement) {
                selectedElement.classList.add('selected');
            }
        }
    }

    selectCell(row, col) {
        // Don't allow selecting prefilled cells
        if (this.prefilled[row][col]) {
            return;
        }
        
        this.selectedCell = { row, col };
        this.renderBoard();
    }

    inputNumber(num) {
        if (!this.selectedCell) {
            this.showMessage('Please select a cell first', 'error');
            return;
        }
        
        const { row, col } = this.selectedCell;
        
        if (this.prefilled[row][col]) {
            return;
        }
        
        if (this.memoMode) {
            // Toggle memo number
            this.addToHistory('memo', row, col, new Set(this.memos[row][col]), this.board[row][col]);
            
            if (this.memos[row][col].has(num)) {
                this.memos[row][col].delete(num);
            } else {
                this.memos[row][col].add(num);
            }
        } else {
            // Regular number input
            this.addToHistory('number', row, col, new Set(this.memos[row][col]), this.board[row][col]);
            
            this.board[row][col] = num;
            this.memos[row][col].clear();
            
            // Instant validation
            if (this.solution[row][col] === num) {
                // Correct! Auto-clear memos
                this.autoClearMemos(row, col, num);
                this.showMessage('Correct!', 'success');
            } else {
                this.showMessage('Incorrect - try again', 'error');
            }
        }
        
        this.renderBoard();
    }

    clearCell() {
        if (!this.selectedCell) {
            this.showMessage('Please select a cell first', 'error');
            return;
        }
        
        const { row, col } = this.selectedCell;
        
        if (this.prefilled[row][col]) {
            return;
        }
        
        this.addToHistory('clear', row, col, new Set(this.memos[row][col]), this.board[row][col]);
        
        this.board[row][col] = 0;
        this.memos[row][col].clear();
        this.renderBoard();
    }

    toggleMemoMode() {
        this.memoMode = !this.memoMode;
        const button = document.getElementById('memoToggle');
        button.textContent = this.memoMode ? 'Mode: Memo' : 'Mode: Normal';
        button.classList.toggle('active', this.memoMode);
    }

    addToHistory(action, row, col, memosCopy, previousValue) {
        this.history.push({
            action,
            row,
            col,
            memos: memosCopy,
            value: previousValue
        });
        
        // Keep only last maxHistory entries
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }

    undo() {
        if (this.history.length === 0) {
            this.showMessage('Nothing to undo', 'error');
            return;
        }
        
        const lastAction = this.history.pop();
        const { row, col, memos, value } = lastAction;
        
        this.board[row][col] = value;
        this.memos[row][col] = memos;
        
        this.renderBoard();
        this.showMessage('Undo successful', 'success');
    }

    autoClearMemos(row, col, num) {
        // Clear memo from same row
        for (let c = 0; c < 9; c++) {
            this.memos[row][c].delete(num);
        }
        
        // Clear memo from same column
        for (let r = 0; r < 9; r++) {
            this.memos[r][col].delete(num);
        }
        
        // Clear memo from same 3x3 box
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                this.memos[boxRow + i][boxCol + j].delete(num);
            }
        }
    }

    checkSolution() {
        let isComplete = true;
        let isCorrect = true;
        
        // Clear previous highlighting
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('error', 'correct');
        });
        
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
                
                if (this.board[row][col] === 0) {
                    isComplete = false;
                    continue;
                }
                
                if (this.board[row][col] !== this.solution[row][col]) {
                    isCorrect = false;
                    if (!this.prefilled[row][col]) {
                        cell.classList.add('error');
                    }
                } else if (!this.prefilled[row][col]) {
                    cell.classList.add('correct');
                }
            }
        }
        
        if (!isComplete) {
            this.showMessage('Puzzle is not complete yet!', 'error');
        } else if (isCorrect) {
            this.showMessage('🎉 Congratulations! You solved it!', 'success');
        } else {
            this.showMessage('Some numbers are incorrect. Try again!', 'error');
        }
    }

    showSolution() {
        this.board = this.solution.map(row => [...row]);
        this.renderBoard();
        this.showMessage('Solution revealed!', 'success');
    }

    showMessage(text, type = '') {
        const messageElement = document.getElementById('message');
        messageElement.textContent = text;
        messageElement.className = type;
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new SudokuGame();
});
