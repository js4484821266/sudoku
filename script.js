// Confetti Animation
class ConfettiEffect {
    constructor() {
        this.canvas = document.getElementById('confetti-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.animationId = null;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createParticle() {
        const colors = ['#667eea', '#764ba2', '#f093fb', '#10b981', '#f59e0b', '#ef4444'];
        return {
            x: Math.random() * this.canvas.width,
            y: -10,
            size: Math.random() * 8 + 4,
            speedY: Math.random() * 3 + 2,
            speedX: Math.random() * 2 - 1,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 10 - 5
        };
    }

    launch() {
        this.particles = [];
        const numParticles = 150;
        for (let i = 0; i < numParticles; i++) {
            setTimeout(() => {
                this.particles.push(this.createParticle());
            }, i * 10);
        }
        this.animate();
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles.forEach((particle, index) => {
            particle.y += particle.speedY;
            particle.x += particle.speedX;
            particle.rotation += particle.rotationSpeed;
            
            this.ctx.save();
            this.ctx.translate(particle.x, particle.y);
            this.ctx.rotate((particle.rotation * Math.PI) / 180);
            this.ctx.fillStyle = particle.color;
            this.ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
            this.ctx.restore();
            
            if (particle.y > this.canvas.height) {
                this.particles.splice(index, 1);
            }
        });
        
        if (this.particles.length > 0) {
            this.animationId = requestAnimationFrame(() => this.animate());
        }
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.particles = [];
        }
    }
}

// Statistics Manager
class StatsManager {
    constructor() {
        this.stats = this.loadStats();
    }

    loadStats() {
        const stored = localStorage.getItem('sudoku-stats');
        return stored ? JSON.parse(stored) : {
            gamesPlayed: 0,
            gamesCompleted: 0,
            bestTime: null,
            totalTime: 0
        };
    }

    saveStats() {
        localStorage.setItem('sudoku-stats', JSON.stringify(this.stats));
    }

    recordGameStart() {
        this.stats.gamesPlayed++;
        this.saveStats();
    }

    recordGameComplete(time) {
        this.stats.gamesCompleted++;
        this.stats.totalTime += time;
        if (!this.stats.bestTime || time < this.stats.bestTime) {
            this.stats.bestTime = time;
        }
        this.saveStats();
    }

    getStats() {
        return {
            ...this.stats,
            winRate: this.stats.gamesPlayed > 0 
                ? Math.round((this.stats.gamesCompleted / this.stats.gamesPlayed) * 100) 
                : 0
        };
    }

    reset() {
        this.stats = {
            gamesPlayed: 0,
            gamesCompleted: 0,
            bestTime: null,
            totalTime: 0
        };
        this.saveStats();
    }
}

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
        this.moves = 0;
        this.timerInterval = null;
        this.startTime = null;
        this.elapsedTime = 0;
        this.gameActive = false;
        
        this.confetti = new ConfettiEffect();
        this.statsManager = new StatsManager();
        
        this.init();
    }

    initializeMemos() {
        return Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set()));
    }

    init() {
        this.setupEventListeners();
        this.setupKeyboardNavigation();
        this.loadDarkMode();
        this.newGame();
        
        // Page load animation
        setTimeout(() => {
            document.body.classList.add('loaded');
        }, 100);
    }

    setupEventListeners() {
        document.getElementById('newGame').addEventListener('click', () => this.newGame());
        document.getElementById('checkSolution').addEventListener('click', () => this.checkSolution());
        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.difficulty = e.target.value;
        });
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('memoToggle').addEventListener('click', () => this.toggleMemoMode());
        document.getElementById('hintBtn').addEventListener('click', () => this.showHint());
        
        // Dark mode toggle
        document.getElementById('darkModeToggle').addEventListener('click', () => this.toggleDarkMode());
        
        // Modal controls
        document.getElementById('howToPlayBtn').addEventListener('click', () => this.showModal('howToPlayModal'));
        document.getElementById('statsBtn').addEventListener('click', () => this.showStatsModal());
        
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.remove('show');
            });
        });
        
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        });
        
        // Share button
        document.getElementById('shareBtn').addEventListener('click', () => this.shareAchievement());
        
        // Number pad event listeners
        for (let i = 1; i <= 9; i++) {
            document.getElementById(`num${i}`).addEventListener('click', () => this.inputNumber(i));
        }
        document.getElementById('clearBtn').addEventListener('click', () => this.clearCell());
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (document.querySelector('.modal.show')) return;
            
            // Number input
            if (e.key >= '1' && e.key <= '9') {
                this.inputNumber(parseInt(e.key));
                e.preventDefault();
            }
            
            // Clear cell
            if (e.key === 'Backspace' || e.key === 'Delete') {
                this.clearCell();
                e.preventDefault();
            }
            
            // Arrow key navigation
            if (this.selectedCell && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                let { row, col } = this.selectedCell;
                
                switch (e.key) {
                    case 'ArrowUp': row = Math.max(0, row - 1); break;
                    case 'ArrowDown': row = Math.min(8, row + 1); break;
                    case 'ArrowLeft': col = Math.max(0, col - 1); break;
                    case 'ArrowRight': col = Math.min(8, col + 1); break;
                }
                
                this.selectCell(row, col);
            }
            
            // Toggle memo mode
            if (e.key === 'm' || e.key === 'M') {
                this.toggleMemoMode();
                e.preventDefault();
            }
        });
    }

    toggleDarkMode() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        const icon = document.querySelector('#darkModeToggle .icon');
        icon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    }

    loadDarkMode() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        const icon = document.querySelector('#darkModeToggle .icon');
        icon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    }

    showModal(modalId) {
        document.getElementById(modalId).classList.add('show');
    }

    showStatsModal() {
        const stats = this.statsManager.getStats();
        document.getElementById('gamesPlayed').textContent = stats.gamesPlayed;
        document.getElementById('gamesCompleted').textContent = stats.gamesCompleted;
        document.getElementById('bestTime').textContent = stats.bestTime 
            ? this.formatTime(stats.bestTime) 
            : '--:--';
        document.getElementById('winRate').textContent = stats.winRate + '%';
        this.showModal('statsModal');
    }

    shareAchievement() {
        const stats = this.statsManager.getStats();
        const text = `🎮 I've completed ${stats.gamesCompleted} Sudoku puzzles! Best time: ${
            stats.bestTime ? this.formatTime(stats.bestTime) : 'N/A'
        } ⏱️ #Sudoku`;
        
        if (navigator.share) {
            navigator.share({
                title: 'My Sudoku Achievement',
                text: text,
                url: window.location.href
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(text).then(() => {
                this.showMessage('Achievement copied to clipboard! 📋', 'success');
            });
        }
    }

    startTimer() {
        this.startTime = Date.now() - this.elapsedTime;
        this.timerInterval = setInterval(() => {
            this.elapsedTime = Date.now() - this.startTime;
            this.updateTimerDisplay();
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    resetTimer() {
        this.stopTimer();
        this.elapsedTime = 0;
        this.updateTimerDisplay();
    }

    updateTimerDisplay() {
        const seconds = Math.floor(this.elapsedTime / 1000);
        document.getElementById('timer').textContent = this.formatTime(seconds);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    updateMoveCounter() {
        document.getElementById('moveCounter').textContent = this.moves;
    }

    updateProgress() {
        let filledCells = 0;
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.board[row][col] !== 0) {
                    filledCells++;
                }
            }
        }
        const percentage = Math.round((filledCells / 81) * 100);
        document.getElementById('progressFill').style.width = percentage + '%';
        document.getElementById('progressText').textContent = percentage + '%';
    }

    newGame() {
        this.generateSudoku();
        this.memos = this.initializeMemos();
        this.selectedCell = null;
        this.history = [];
        this.moves = 0;
        this.resetTimer();
        this.gameActive = true;
        this.renderBoard();
        this.showMessage('');
        this.updateMoveCounter();
        this.updateProgress();
        this.startTimer();
        this.statsManager.recordGameStart();
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
                cell.setAttribute('role', 'gridcell');
                cell.setAttribute('tabindex', '0');
                cell.setAttribute('aria-label', `Row ${row + 1}, Column ${col + 1}`);
                
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
            this.moves++;
        } else {
            // Regular number input
            this.addToHistory('number', row, col, new Set(this.memos[row][col]), this.board[row][col]);
            
            this.board[row][col] = num;
            this.memos[row][col].clear();
            this.moves++;
            
            // Instant validation
            if (this.solution[row][col] === num) {
                // Correct! Auto-clear memos
                this.autoClearMemos(row, col, num);
                this.showMessage('Correct! ✓', 'success');
            } else {
                this.showMessage('Try again', 'error');
            }
        }
        
        this.updateMoveCounter();
        this.updateProgress();
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
        this.moves++;
        this.updateMoveCounter();
        this.updateProgress();
        this.renderBoard();
    }

    toggleMemoMode() {
        this.memoMode = !this.memoMode;
        const button = document.getElementById('memoToggle');
        const text = document.getElementById('memoText');
        text.textContent = this.memoMode ? 'Memo' : 'Normal';
        button.classList.toggle('active', this.memoMode);
    }

    showHint() {
        const HINT_PENALTY = 5;
        
        if (!this.selectedCell) {
            // Find a random empty cell
            const emptyCells = [];
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    if (!this.prefilled[row][col] && this.board[row][col] === 0) {
                        emptyCells.push({ row, col });
                    }
                }
            }
            
            if (emptyCells.length === 0) {
                this.showMessage('No empty cells!', 'error');
                return;
            }
            
            const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.selectedCell = randomCell;
        }
        
        const { row, col } = this.selectedCell;
        
        if (this.prefilled[row][col]) {
            this.showMessage('This cell is already filled!', 'error');
            return;
        }
        
        if (this.board[row][col] !== 0) {
            this.showMessage('Clear the cell first for a hint!', 'error');
            return;
        }
        
        this.board[row][col] = this.solution[row][col];
        this.moves += HINT_PENALTY;
        this.updateMoveCounter();
        this.updateProgress();
        this.renderBoard();
        this.showMessage(`Hint used! (+${HINT_PENALTY} moves penalty) 💡`, 'success');
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
        this.moves = Math.max(0, this.moves - 1);
        
        this.updateMoveCounter();
        this.updateProgress();
        this.renderBoard();
        this.showMessage('Undone ↶', 'success');
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
        let hasErrors = false;
        const errorCells = new Set();
        
        // Clear previous highlighting
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('error', 'correct');
        });
        
        // First check if puzzle is complete
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this.board[row][col] === 0) {
                    isComplete = false;
                }
            }
        }
        
        if (!isComplete) {
            this.showMessage('Puzzle is not complete yet!', 'error');
            return;
        }
        
        // Check for duplicates in rows
        for (let row = 0; row < 9; row++) {
            const seen = new Set();
            for (let col = 0; col < 9; col++) {
                const num = this.board[row][col];
                if (seen.has(num)) {
                    hasErrors = true;
                    errorCells.add(`${row}-${col}`);
                    // Also mark the first occurrence
                    for (let c = 0; c < col; c++) {
                        if (this.board[row][c] === num) {
                            errorCells.add(`${row}-${c}`);
                        }
                    }
                } else {
                    seen.add(num);
                }
            }
        }
        
        // Check for duplicates in columns
        for (let col = 0; col < 9; col++) {
            const seen = new Set();
            for (let row = 0; row < 9; row++) {
                const num = this.board[row][col];
                if (seen.has(num)) {
                    hasErrors = true;
                    errorCells.add(`${row}-${col}`);
                    // Also mark the first occurrence
                    for (let r = 0; r < row; r++) {
                        if (this.board[r][col] === num) {
                            errorCells.add(`${r}-${col}`);
                        }
                    }
                } else {
                    seen.add(num);
                }
            }
        }
        
        // Check for duplicates in 3x3 boxes
        for (let boxRow = 0; boxRow < 3; boxRow++) {
            for (let boxCol = 0; boxCol < 3; boxCol++) {
                const seen = new Set();
                const cellsInBox = [];
                
                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 3; j++) {
                        const row = boxRow * 3 + i;
                        const col = boxCol * 3 + j;
                        const num = this.board[row][col];
                        
                        if (seen.has(num)) {
                            hasErrors = true;
                            errorCells.add(`${row}-${col}`);
                            // Also mark the first occurrence in this box
                            for (let cell of cellsInBox) {
                                if (this.board[cell.row][cell.col] === num) {
                                    errorCells.add(`${cell.row}-${cell.col}`);
                                }
                            }
                        } else {
                            seen.add(num);
                        }
                        
                        cellsInBox.push({ row, col });
                    }
                }
            }
        }
        
        // Apply highlighting
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
                const cellKey = `${row}-${col}`;
                
                if (errorCells.has(cellKey)) {
                    if (!this.prefilled[row][col]) {
                        cell.classList.add('error');
                    }
                } else if (!this.prefilled[row][col]) {
                    cell.classList.add('correct');
                }
            }
        }
        
        // Show appropriate message
        if (hasErrors) {
            this.showMessage('Some numbers are incorrect. Try again!', 'error');
        } else {
            this.stopTimer();
            this.gameActive = false;
            this.statsManager.recordGameComplete(Math.floor(this.elapsedTime / 1000));
            this.showMessage('🎉 Congratulations! You solved it!', 'success');
            this.confetti.launch();
            
            setTimeout(() => {
                this.showStatsModal();
            }, 2000);
        }
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
