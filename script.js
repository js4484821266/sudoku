// Sudoku Game Logic
class SudokuGame {
    constructor() {
        this.board = Array(9).fill(null).map(() => Array(9).fill(0));
        this.solution = Array(9).fill(null).map(() => Array(9).fill(0));
        this.prefilled = Array(9).fill(null).map(() => Array(9).fill(false));
        this.difficulty = 'medium';
        this.init();
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
    }

    newGame() {
        this.generateSudoku();
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
                    // Shuffle numbers for randomness
                    const shuffled = numbers.sort(() => Math.random() - 0.5);
                    
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
                
                if (this.prefilled[row][col]) {
                    cell.classList.add('prefilled');
                }
                
                const input = document.createElement('input');
                input.type = 'text';
                input.maxLength = 1;
                input.dataset.row = row;
                input.dataset.col = col;
                
                if (this.board[row][col] !== 0) {
                    input.value = this.board[row][col];
                }
                
                if (this.prefilled[row][col]) {
                    input.readOnly = true;
                }
                
                input.addEventListener('input', (e) => this.handleInput(e));
                
                cell.appendChild(input);
                boardElement.appendChild(cell);
            }
        }
    }

    handleInput(e) {
        const input = e.target;
        const value = input.value;
        
        // Only allow numbers 1-9
        if (value && (!/^[1-9]$/.test(value))) {
            input.value = '';
            return;
        }
        
        const row = parseInt(input.dataset.row);
        const col = parseInt(input.dataset.col);
        
        this.board[row][col] = value ? parseInt(value) : 0;
        
        // Remove any previous error/correct highlighting
        input.parentElement.classList.remove('error', 'correct');
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
                const cell = document.querySelector(`input[data-row="${row}"][data-col="${col}"]`).parentElement;
                
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
