// ============================================================
// STRANDS GAME - CUSTOMIZE YOUR PUZZLE HERE!
// ============================================================
//
// To make your own puzzle, edit:
//   1. PUZZLE_CONFIG.theme  - The clue shown at the top
//   2. MANUAL_GRID          - The 8x6 letter grid
//   3. WORDS                - The theme words with their paths
// ============================================================

const PUZZLE_CONFIG = {
    theme: "Our love 💕",
    rows: 8,
    cols: 6,
};

const MANUAL_GRID = [
    "MINEOC",
    "TSEIEA",
    "HONEYN",
    "ICESKA",
    "PHGNIT",
    "ANBATO",
    "IESKEO",
    "ABELLP",
];

const WORDS = [
    {
        word: "ICESKATING",
        isSpangram: true,
        path: [[3,0],[3,1],[3,2],[3,3],[3,4],[3,5],[4,5],[4,4],[4,3],[4,2]]
    },
    {
        word: "OCEAN",
        isSpangram: false,
        path: [[0,4],[0,5],[1,4],[1,5],[2,5]]
    },
    {
        word: "HONEY",
        isSpangram: false,
        path: [[2,0],[2,1],[2,2],[2,3],[2,4]]
    },
    {
        word: "OOP",
        isSpangram: false,
        path: [[5,5],[6,5],[7,5]]
    },
    {
        word: "BASKET",
        isSpangram: false,
        path: [[5,2],[5,3],[6,2],[6,3],[6,4],[5,4]]
    },
    {
        word: "PHANIE",
        isSpangram: false,
        path: [[4,0],[4,1],[5,0],[5,1],[6,0],[6,1]]
    },
    {
        word: "ABELL",
        isSpangram: false,
        path: [[7,0],[7,1],[7,2],[7,3],[7,4]]
    },
    {
        word: "MINEIEST",
        isSpangram: false,
        path: [[0,0],[0,1],[0,2],[0,3],[1,3],[1,2],[1,1],[1,0]]
    },
];

// Dictionary is loaded from dictionary.js (88,000+ English words)

// ============================================================
// GAME STATE
// ============================================================

let grid = [];
let selectedCells = [];
let foundWords = [];           // theme words found
let nonThemeWordsFound = [];   // valid english words found (not theme)
let hintCharges = 0;           // hints available to use
let hintsUsed = 0;             // total hints used
let isDragging = false;
let totalWords = WORDS.length;
let revealedWords = [];        // words whose letters are circled as hints
let currentHintWord = null;    // the word currently being animated by hint
let hintLoopInterval = null;   // interval ID for the looping hint animation
let hintLoopIndex = 0;         // current letter index in the hint loop

let svgOverlay = null;
let dragThreshold = 8; // pixels before we consider it a drag vs tap
let pointerStart = null; // {x, y} where pointer went down
let didDrag = false;

// ============================================================
// INITIALIZATION
// ============================================================

function init() {
    buildGrid();
    renderGrid();
    createSvgOverlay();
    updateProgress();
    updateHintButton();
    updateHintPill();
    setupEventListeners();

    document.getElementById('themeText').textContent = PUZZLE_CONFIG.theme;
    document.getElementById('totalCount').textContent = totalWords;
}

function buildGrid() {
    grid = [];
    for (let r = 0; r < PUZZLE_CONFIG.rows; r++) {
        const row = [];
        for (let c = 0; c < PUZZLE_CONFIG.cols; c++) {
            row.push({
                letter: MANUAL_GRID[r][c],
                row: r,
                col: c,
                found: false,
                spangram: false,
                selected: false,
                hinted: false,
                element: null,
            });
        }
        grid.push(row);
    }
}

function renderGrid() {
    const gridEl = document.getElementById('grid');
    gridEl.innerHTML = '';
    gridEl.style.gridTemplateColumns = `repeat(${PUZZLE_CONFIG.cols}, 1fr)`;
    gridEl.style.gridTemplateRows = `repeat(${PUZZLE_CONFIG.rows}, 1fr)`;

    for (let r = 0; r < PUZZLE_CONFIG.rows; r++) {
        for (let c = 0; c < PUZZLE_CONFIG.cols; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = grid[r][c].letter;
            cell.dataset.row = r;
            cell.dataset.col = c;
            grid[r][c].element = cell;
            gridEl.appendChild(cell);
        }
    }
}

function createSvgOverlay() {
    if (svgOverlay) svgOverlay.remove();
    svgOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgOverlay.classList.add('line-overlay');
    document.querySelector('.grid-container').appendChild(svgOverlay);
}

// ============================================================
// EVENT LISTENERS
// ============================================================

function setupEventListeners() {
    const gridEl = document.getElementById('grid');

    gridEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    gridEl.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    document.getElementById('hintButton').addEventListener('click', useHint);

    // Gift button opens the Valentine's book
    document.getElementById('giftBtn').addEventListener('click', openGiftBook);
    document.getElementById('closeBookBtn').addEventListener('click', closeBook);
    document.getElementById('bookOverlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('bookOverlay') || e.target === document.getElementById('bookScene')) {
            closeBook();
        }
    });

    document.getElementById('helpBtn').addEventListener('click', () => {
        document.getElementById('helpOverlay').classList.add('active');
    });
    document.getElementById('closeHelpBtn').addEventListener('click', () => {
        document.getElementById('helpOverlay').classList.remove('active');
    });
    document.getElementById('helpOverlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('helpOverlay')) {
            document.getElementById('helpOverlay').classList.remove('active');
        }
    });

    let currentPage = 0;
    document.getElementById('helpNextBtn').addEventListener('click', () => {
        currentPage = Math.min(currentPage + 1, 1);
        updateHelpPage(currentPage);
    });
    document.getElementById('helpBackBtn').addEventListener('click', () => {
        currentPage = Math.max(currentPage - 1, 0);
        updateHelpPage(currentPage);
    });
    document.querySelectorAll('.dot').forEach(dot => {
        dot.addEventListener('click', () => {
            currentPage = parseInt(dot.dataset.dot);
            updateHelpPage(currentPage);
        });
    });

    document.getElementById('playAgainBtn').addEventListener('click', () => {
        document.getElementById('winOverlay').classList.remove('active');
        resetGame();
    });
}

function updateHelpPage(page) {
    document.querySelectorAll('.help-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.dot').forEach(d => d.classList.remove('active'));
    document.querySelector(`.help-page[data-page="${page}"]`).classList.add('active');
    document.querySelector(`.dot[data-dot="${page}"]`).classList.add('active');
}

// ============================================================
// CELL SELECTION
// ============================================================

function getCellAt(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    if (el && el.classList.contains('cell')) {
        return {
            row: parseInt(el.dataset.row),
            col: parseInt(el.dataset.col),
        };
    }
    return null;
}

function isAdjacent(cell1, cell2) {
    const dr = Math.abs(cell1.row - cell2.row);
    const dc = Math.abs(cell1.col - cell2.col);
    return dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0);
}

function trySelectCell(row, col) {
    const cellData = grid[row][col];
    // Allow selecting any cell, even already-found ones

    const alreadyIdx = selectedCells.findIndex(c => c.row === row && c.col === col);
    if (alreadyIdx !== -1) {
        if (alreadyIdx < selectedCells.length - 1) {
            for (let i = selectedCells.length - 1; i > alreadyIdx; i--) {
                const c = selectedCells[i];
                grid[c.row][c.col].selected = false;
                grid[c.row][c.col].element.classList.remove('selected');
            }
            selectedCells = selectedCells.slice(0, alreadyIdx + 1);
            drawLines();
            updateCurrentWord();
        }
        return false;
    }

    if (selectedCells.length > 0) {
        const last = selectedCells[selectedCells.length - 1];
        if (!isAdjacent(last, { row, col })) return false;
    }

    // Stop the hint loop animation as soon as user starts tracing
    if (hintLoopInterval) stopHintLoop();

    selectedCells.push({ row, col });
    cellData.selected = true;
    cellData.element.classList.add('selected');
    drawLines();
    updateCurrentWord();
    return true;
}

function clearSelection() {
    selectedCells.forEach(c => {
        grid[c.row][c.col].selected = false;
        grid[c.row][c.col].element.classList.remove('selected');
    });
    selectedCells = [];
    drawLines();
    updateCurrentWord();
}

function updateCurrentWord() {
    const el = document.getElementById('currentWord');
    if (selectedCells.length === 0) {
        el.textContent = '';
    } else {
        el.textContent = selectedCells.map(c => grid[c.row][c.col].letter).join('');
    }
}

// ============================================================
// DRAW LINES
// ============================================================

function getCellCenter(row, col) {
    const el = grid[row][col].element;
    const containerRect = document.querySelector('.grid-container').getBoundingClientRect();
    const cellRect = el.getBoundingClientRect();
    return {
        x: cellRect.left + cellRect.width / 2 - containerRect.left,
        y: cellRect.top + cellRect.height / 2 - containerRect.top,
    };
}

function drawLines() {
    if (!svgOverlay) return;
    svgOverlay.innerHTML = '';
    if (selectedCells.length < 2) return;

    const containerRect = document.querySelector('.grid-container').getBoundingClientRect();
    svgOverlay.setAttribute('width', containerRect.width);
    svgOverlay.setAttribute('height', containerRect.height);
    svgOverlay.style.width = containerRect.width + 'px';
    svgOverlay.style.height = containerRect.height + 'px';

    for (let i = 0; i < selectedCells.length - 1; i++) {
        const from = getCellCenter(selectedCells[i].row, selectedCells[i].col);
        const to = getCellCenter(selectedCells[i + 1].row, selectedCells[i + 1].col);

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', from.x);
        line.setAttribute('y1', from.y);
        line.setAttribute('x2', to.x);
        line.setAttribute('y2', to.y);
        line.setAttribute('stroke', 'rgba(255, 77, 109, 0.5)');
        line.setAttribute('stroke-width', '3');
        line.setAttribute('stroke-linecap', 'round');
        svgOverlay.appendChild(line);
    }
}

// ============================================================
// MOUSE HANDLERS (supports tap-to-select AND drag)
// ============================================================

function onMouseDown(e) {
    e.preventDefault();
    const cell = getCellAt(e.clientX, e.clientY);
    if (!cell) return;
    pointerStart = { x: e.clientX, y: e.clientY };
    didDrag = false;
    isDragging = true;
    // Don't select here — wait for mouseUp (tap) or mouseMove (drag)
}

function onMouseMove(e) {
    if (!isDragging) return;
    e.preventDefault();

    // Check if we've moved enough to be considered a drag
    if (pointerStart) {
        const dx = e.clientX - pointerStart.x;
        const dy = e.clientY - pointerStart.y;
        if (Math.sqrt(dx * dx + dy * dy) > dragThreshold) {
            // This is a drag! If we haven't started dragging yet, start fresh
            if (!didDrag) {
                didDrag = true;
                clearSelection();
                const startCell = getCellAt(pointerStart.x, pointerStart.y);
                if (startCell) trySelectCell(startCell.row, startCell.col);
            }
        }
    }

    if (didDrag) {
        const cell = getCellAt(e.clientX, e.clientY);
        if (!cell) return;
        trySelectCell(cell.row, cell.col);
    }
}

function onMouseUp(e) {
    if (!isDragging) return;
    isDragging = false;

    if (didDrag) {
        // Drag completed - submit the word
        if (selectedCells.length >= 3) {
            submitWord();
        } else {
            clearSelection();
        }
    } else {
        // It was a tap/click - use pointerStart position (more reliable)
        const cell = pointerStart ? getCellAt(pointerStart.x, pointerStart.y) : getCellAt(e.clientX, e.clientY);
        if (!cell) { pointerStart = null; didDrag = false; return; }
        handleTap(cell.row, cell.col);
    }
    pointerStart = null;
    didDrag = false;
}

// ============================================================
// TOUCH HANDLERS (supports tap-to-select AND drag)
// ============================================================

function onTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const cell = getCellAt(touch.clientX, touch.clientY);
    if (!cell) return;
    pointerStart = { x: touch.clientX, y: touch.clientY };
    didDrag = false;
    isDragging = true;
    // Don't select here — wait for touchEnd (tap) or touchMove (drag)
}

function onTouchMove(e) {
    e.preventDefault();
    if (!isDragging) return;
    const touch = e.touches[0];

    if (pointerStart) {
        const dx = touch.clientX - pointerStart.x;
        const dy = touch.clientY - pointerStart.y;
        if (Math.sqrt(dx * dx + dy * dy) > dragThreshold) {
            if (!didDrag) {
                didDrag = true;
                clearSelection();
                const startCell = getCellAt(pointerStart.x, pointerStart.y);
                if (startCell) trySelectCell(startCell.row, startCell.col);
            }
        }
    }

    if (didDrag) {
        const cell = getCellAt(touch.clientX, touch.clientY);
        if (!cell) return;
        trySelectCell(cell.row, cell.col);
    }
}

function onTouchEnd(e) {
    if (!isDragging) return;
    isDragging = false;

    if (didDrag) {
        if (selectedCells.length >= 3) {
            submitWord();
        } else {
            clearSelection();
        }
    } else if (pointerStart) {
        // Tap!
        const cell = getCellAt(pointerStart.x, pointerStart.y);
        if (cell) {
            handleTap(cell.row, cell.col);
        }
    }
    pointerStart = null;
    didDrag = false;
}

// ============================================================
// TAP-TO-SELECT LOGIC
// ============================================================

function handleTap(row, col) {
    // If nothing selected, select this cell
    if (selectedCells.length === 0) {
        trySelectCell(row, col);
        return;
    }

    // Check if tapping the last selected cell = submit the word
    const last = selectedCells[selectedCells.length - 1];
    if (last.row === row && last.col === col) {
        // Double-tap last cell = submit
        if (selectedCells.length >= 3) {
            submitWord();
        } else {
            clearSelection();
        }
        return;
    }

    // Check if tapping an already-selected cell (not last) = backtrack
    const alreadyIdx = selectedCells.findIndex(c => c.row === row && c.col === col);
    if (alreadyIdx !== -1 && alreadyIdx < selectedCells.length - 1) {
        // Remove everything after this cell
        for (let i = selectedCells.length - 1; i > alreadyIdx; i--) {
            const c = selectedCells[i];
            grid[c.row][c.col].selected = false;
            grid[c.row][c.col].element.classList.remove('selected');
        }
        selectedCells = selectedCells.slice(0, alreadyIdx + 1);
        drawLines();
        updateCurrentWord();
        return;
    }

    // Try to add cell if adjacent
    if (isAdjacent(last, { row, col })) {
        trySelectCell(row, col);
    } else {
        // Not adjacent - start new selection from this cell
        clearSelection();
        trySelectCell(row, col);
    }
}

// ============================================================
// WORD SUBMISSION
// ============================================================

function submitWord() {
    const selectedWord = selectedCells.map(c => grid[c.row][c.col].letter).join('');

    // 1. Check if it's a theme word (match by word AND exact cells)
    const themeMatch = WORDS.find(w => {
        if (foundWords.includes(w.word)) return false;
        if (w.word !== selectedWord) return false;
        if (w.path.length !== selectedCells.length) return false;
        const selectedSet = selectedCells.map(c => `${c.row},${c.col}`).sort().join('|');
        const pathSet = w.path.map(p => `${p[0]},${p[1]}`).sort().join('|');
        return selectedSet === pathSet;
    });

    if (themeMatch) {
        // Found a theme word!
        foundWords.push(themeMatch.word);

        // Clear the user's selection highlights first
        selectedCells.forEach(c => {
            grid[c.row][c.col].selected = false;
            grid[c.row][c.col].element.classList.remove('selected');
        });

        // Each non-spangram word gets a unique color shade
        const wordIndex = WORDS.filter(w => !w.isSpangram).indexOf(themeMatch);
        const colorClass = themeMatch.isSpangram ? 'spangram-found' : `found found-color-${wordIndex % 7}`;

        // Stop hint loop if this is the currently-hinted word
        if (currentHintWord && currentHintWord.word === themeMatch.word) {
            stopHintLoop();
            currentHintWord = null;
        }

        // Always highlight the DEFINED path cells (for correct board coverage)
        const pathCells = themeMatch.path;
        pathCells.forEach(([r, c]) => {
            grid[r][c].found = true;
            grid[r][c].hinted = false;
            grid[r][c].element.classList.remove('selected', 'hint-circled', 'hint-pulse');
            colorClass.split(' ').forEach(cls => grid[r][c].element.classList.add(cls));
            if (themeMatch.isSpangram) {
                grid[r][c].spangram = true;
            }
        });

        animateFound(pathCells, themeMatch.isSpangram);
        selectedCells = [];
        drawLines();
        updateCurrentWord();
        updateProgress();

        if (foundWords.length === WORDS.length) {
            setTimeout(showWin, 1200);
        }
        return;
    }

    // 2. Check if it's already been found (theme or non-theme)
    const alreadyFoundTheme = WORDS.find(w => w.word === selectedWord && foundWords.includes(w.word));
    const alreadyFoundNonTheme = nonThemeWordsFound.includes(selectedWord);
    if (alreadyFoundTheme || alreadyFoundNonTheme) {
        showAlreadyFound();
        animateWrong();
        setTimeout(clearSelection, 800);
        return;
    }

    // 3. Check if it's a valid English word (non-theme)
    if (selectedWord.length >= 3 && DICTIONARY.has(selectedWord)) {
        nonThemeWordsFound.push(selectedWord);

        // Show the word was valid but not a theme word
        showNonThemeWord(selectedWord);

        // Every 2 non-theme words = earn a hint
        if (nonThemeWordsFound.length % 2 === 0) {
            hintCharges++;
            updateHintButton();
            showEarnedHint();
        }

        updateHintPill();

        clearSelection();
        return;
    }

    // 4. Not a valid word at all
    animateWrong();
    setTimeout(clearSelection, 400);
}

// ============================================================
// NON-THEME WORD FEEDBACK
// ============================================================

function showAlreadyFound() {
    const label = document.createElement('div');
    label.className = 'word-label already-found-label';
    label.textContent = 'Already found!';
    document.querySelector('.photo-frame').appendChild(label);
    requestAnimationFrame(() => label.classList.add('show'));
    setTimeout(() => {
        label.classList.remove('show');
        setTimeout(() => label.remove(), 300);
    }, 1000);
}

function showNonThemeWord(word) {
    // Show a label popup so the user sees it was recognized
    showWordLabel(word, false, true);
    // Update the hint progress counter
    updateNonThemeCounter();
}

function updateNonThemeCounter() {
    const el = document.getElementById('nonThemeCount');
    if (el) {
        const remaining = 2 - (nonThemeWordsFound.length % 2);
        if (remaining === 2 && nonThemeWordsFound.length > 0) {
            el.textContent = 'Hint earned!';
        } else {
            el.textContent = `${remaining} more word${remaining !== 1 ? 's' : ''} for a hint`;
        }
    }
}

function updateHintPill() {
    const btn = document.getElementById('hintButton');
    if (!btn) return;
    const progress = nonThemeWordsFound.length % 2; // 0 or 1
    // 0 words toward next hint = 0%, 1 word = 50%
    const pct = (progress / 2) * 100;
    btn.style.setProperty('--hint-fill', pct + '%');

    if (progress > 0 && hintCharges <= 0) {
        btn.classList.add('filling');
    } else {
        btn.classList.remove('filling');
    }
}

function showEarnedHint() {
    // Flash the button to full then reset
    const btn = document.getElementById('hintButton');
    if (btn) {
        btn.style.setProperty('--hint-fill', '100%');
        setTimeout(() => {
            btn.style.setProperty('--hint-fill', '0%');
            btn.classList.remove('filling');
        }, 1200);
    }

    const banner = document.createElement('div');
    banner.className = 'hint-earned-banner';
    banner.textContent = '💡 Hint earned!';
    document.getElementById('app').appendChild(banner);
    requestAnimationFrame(() => banner.classList.add('show'));
    setTimeout(() => {
        banner.classList.remove('show');
        setTimeout(() => banner.remove(), 300);
    }, 1500);
}

// ============================================================
// HINTS - circles letters of an unfound word
// ============================================================

function useHint() {
    if (hintCharges <= 0) return;

    // Stage 2: If there's already a circled (stage 1) word that's unfound,
    // use this hint to start the looping letter-by-letter animation
    if (currentHintWord && !foundWords.includes(currentHintWord.word) && !hintLoopInterval) {
        hintCharges--;
        hintsUsed++;
        updateHintButton();
        startHintLoop(currentHintWord);
        return;
    }

    // If already looping on an unfound word, don't consume another charge
    if (currentHintWord && !foundWords.includes(currentHintWord.word) && hintLoopInterval) {
        return;
    }

    // Stage 1: Circle all letters of the next unfound word
    const target = WORDS.find(w =>
        !foundWords.includes(w.word) && !revealedWords.includes(w.word)
    );
    if (!target) return;

    hintCharges--;
    hintsUsed++;
    revealedWords.push(target.word);
    updateHintButton();

    // Just circle all the letters at once — no looping animation yet
    currentHintWord = target;
    target.path.forEach(([r, c]) => {
        grid[r][c].hinted = true;
        grid[r][c].element.classList.add('hint-circled');
    });
}

function startHintLoop(target) {
    // Clear any existing hint loop
    stopHintLoop();

    hintLoopIndex = 0;

    // Animate letters one at a time in sequence, looping
    function pulseNext() {
        if (!currentHintWord || foundWords.includes(currentHintWord.word)) {
            stopHintLoop();
            return;
        }

        const path = currentHintWord.path;

        // Remove pulse from ALL cells of this word
        path.forEach(([r, c]) => {
            grid[r][c].element.classList.remove('hint-pulse');
        });

        // Pulse the current letter
        const [r, c] = path[hintLoopIndex];
        grid[r][c].element.classList.add('hint-pulse');

        // Advance to next letter (loop back to start)
        hintLoopIndex = (hintLoopIndex + 1) % path.length;
    }

    // Pulse the first letter immediately
    pulseNext();

    // Then continue looping — slower pace (600ms)
    hintLoopInterval = setInterval(pulseNext, 600);
}

function stopHintLoop() {
    if (hintLoopInterval) {
        clearInterval(hintLoopInterval);
        hintLoopInterval = null;
    }

    // Remove pulse class from all hinted cells
    if (currentHintWord) {
        currentHintWord.path.forEach(([r, c]) => {
            grid[r][c].element.classList.remove('hint-pulse');
        });
    }
}

function updateHintButton() {
    const btn = document.getElementById('hintButton');
    if (hintCharges > 0) {
        btn.textContent = `Hint (${hintCharges})`;
        btn.classList.add('has-hints');
        btn.classList.remove('filling');
        btn.style.setProperty('--hint-fill', '0%');
        btn.disabled = false;
    } else {
        btn.textContent = 'Hint';
        btn.classList.remove('has-hints');
        btn.disabled = true;
    }
}

// ============================================================
// ANIMATIONS
// ============================================================

function animateFound(cells, isSpangram) {
    cells.forEach(([r, c], i) => {
        setTimeout(() => {
            const el = grid[r][c].element;
            el.classList.add('pop');
            setTimeout(() => el.classList.remove('pop'), 300);
        }, i * 60);
    });

    if (cells.length > 0) {
        showWordLabel(cells.map(([r, c]) => grid[r][c].letter).join(''), isSpangram, false);
    }
}

function showWordLabel(word, isSpangram, isNonTheme) {
    const label = document.createElement('div');
    label.className = 'word-label';
    if (isSpangram) label.classList.add('spangram-label');
    if (isNonTheme) label.classList.add('nontheme-label');
    label.textContent = word;
    document.querySelector('.photo-frame').appendChild(label);
    requestAnimationFrame(() => label.classList.add('show'));
    setTimeout(() => {
        label.classList.remove('show');
        setTimeout(() => label.remove(), 300);
    }, 1200);
}

function animateWrong() {
    selectedCells.forEach(c => {
        grid[c.row][c.col].element.classList.add('wrong');
    });
    setTimeout(() => {
        selectedCells.forEach(c => {
            if (grid[c.row] && grid[c.row][c.col]) {
                grid[c.row][c.col].element.classList.remove('wrong');
            }
        });
    }, 400);
}

// ============================================================
// PROGRESS & WIN
// ============================================================

function updateProgress() {
    document.getElementById('foundCount').textContent = foundWords.length;
}

function showWin() {
    document.getElementById('winHints').textContent = hintsUsed;
    document.getElementById('winOverlay').classList.add('active');
}

function resetGame() {
    stopHintLoop();
    currentHintWord = null;
    foundWords = [];
    nonThemeWordsFound = [];
    hintCharges = 0;
    hintsUsed = 0;
    revealedWords = [];
    selectedCells = [];
    isDragging = false;
    buildGrid();
    renderGrid();
    createSvgOverlay();
    updateProgress();
    updateHintButton();
    updateNonThemeCounter();
    updateHintPill();
}

// ============================================================
// VALENTINE'S BOOK / GIFT
// ============================================================

function openGiftBook() {
    const overlay = document.getElementById('bookOverlay');
    const gift = document.getElementById('giftPackage');
    const bookWrapper = document.getElementById('bookWrapper');

    // Reset states
    gift.className = 'gift-package';
    bookWrapper.className = 'book-wrapper';

    // Show overlay
    overlay.classList.add('active');

    // Step 1: After a beat, open the lid
    setTimeout(() => {
        gift.classList.add('opening');
    }, 400);

    // Step 2: Book emerges, gift shrinks away
    setTimeout(() => {
        gift.classList.add('shrink');
        bookWrapper.classList.add('emerge');
    }, 1000);
}

function closeBook() {
    const overlay = document.getElementById('bookOverlay');
    overlay.classList.remove('active');
}

// ============================================================
// ROSE PETALS
// ============================================================

let petalsActive = false;
let petalTimeout = null;
let petalInterval = null;
let activePetals = []; // track live petals for animation frame
let petalAnimFrame = null;

const PETAL_COLORS = [
    '#ff6b8a',  // hot pink
    '#ff8fa3',  // soft pink
    '#ffb3c1',  // blush
    '#f4845f',  // coral
    '#e07be0',  // orchid
    '#c9a0dc',  // lavender
    '#ff4d6d',  // deep pink
    '#ffa0b4',  // rose
    '#ff7eb3',  // candy pink
    '#d4a0a0',  // dusty rose
];

function getHeaderBottom() {
    const header = document.querySelector('header');
    const headerRect = header.getBoundingClientRect();
    const appRect = document.getElementById('app').getBoundingClientRect();
    return {
        y: headerRect.bottom - appRect.top,
        width: appRect.width,
    };
}

function createPetal(container, headerInfo) {
    const petal = document.createElement('div');
    petal.className = 'petal';
    const inner = document.createElement('div');
    inner.className = 'petal-inner';
    const shape = document.createElement('div');
    shape.className = 'petal-shape';

    // Random color
    const color = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
    shape.style.background = `linear-gradient(135deg, ${color}, ${color}cc)`;

    // Random size
    const size = 10 + Math.random() * 8;
    petal.style.width = size + 'px';
    petal.style.height = size + 'px';

    // Spin speed
    const spinDuration = 2 + Math.random() * 3;
    petal.style.setProperty('--spin-duration', spinDuration + 's');

    inner.appendChild(shape);
    petal.appendChild(inner);
    container.appendChild(petal);

    // Spawn along the header bottom line — random x position across the width
    const startX = Math.random() * headerInfo.width;
    const startY = headerInfo.y;

    // Start with a slight downward velocity + gentle random horizontal drift
    const vx = (Math.random() - 0.5) * 40;
    const vy = 15 + Math.random() * 30; // already moving down — no pause!

    const petalData = {
        el: petal,
        x: startX,
        y: startY,
        vx: vx,
        vy: vy,
        gravity: 35 + Math.random() * 25,
        swaySpeed: 1.5 + Math.random() * 2,
        swayAmount: 20 + Math.random() * 30,
        drag: 0.97 - Math.random() * 0.02,
        time: 0,
        opacity: 0,
        fadeIn: true,
        size: size,
    };

    activePetals.push(petalData);

    petal.style.left = startX + 'px';
    petal.style.top = startY + 'px';
    petal.style.opacity = '0';
}

let lastTime = 0;

function animatePetals(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // cap delta
    lastTime = timestamp;

    const appHeight = document.getElementById('app').offsetHeight;

    for (let i = activePetals.length - 1; i >= 0; i--) {
        const p = activePetals[i];
        p.time += dt;

        // Fade in quickly
        if (p.fadeIn) {
            p.opacity = Math.min(1, p.opacity + dt * 6);
            if (p.opacity >= 1) p.fadeIn = false;
        }

        // Apply gravity
        p.vy += p.gravity * dt;

        // Apply drag (air resistance)
        p.vx *= p.drag;
        p.vy *= p.drag;

        // Sway side to side
        const sway = Math.sin(p.time * p.swaySpeed) * p.swayAmount * dt;

        // Update position
        p.x += p.vx * dt + sway;
        p.y += p.vy * dt;

        // Fade out near the bottom
        if (p.y > appHeight - 120) {
            p.opacity = Math.max(0, p.opacity - dt * 1.5);
        }

        // Update element
        p.el.style.transform = `translate(${p.x - p.size / 2}px, ${p.y - p.size / 2}px)`;
        p.el.style.left = '0';
        p.el.style.top = '0';
        p.el.style.opacity = p.opacity;

        // Remove if off screen or fully faded
        if (p.y > appHeight + 20 || p.opacity <= 0) {
            p.el.remove();
            activePetals.splice(i, 1);
        }
    }

    // Keep animating if there are petals
    if (activePetals.length > 0 || petalsActive) {
        petalAnimFrame = requestAnimationFrame(animatePetals);
    } else {
        petalAnimFrame = null;
        lastTime = 0;
        // All petals gone — hide the stop button
        hideStopBtn();
    }
}

function burstPetals() {
    const container = document.getElementById('petalContainer');
    const h = getHeaderBottom();

    // Immediate first wave — petals start falling right away
    for (let i = 0; i < 14; i++) {
        createPetal(container, h);
    }

    // Start animation loop if not running
    if (!petalAnimFrame) {
        lastTime = 0;
        petalAnimFrame = requestAnimationFrame(animatePetals);
    }

    // Continue sprinkling waves from the header line
    let waveCount = 0;
    petalInterval = setInterval(() => {
        if (!petalsActive || waveCount > 5) {
            clearInterval(petalInterval);
            petalInterval = null;
            return;
        }
        const hh = getHeaderBottom();
        for (let i = 0; i < 5; i++) {
            createPetal(container, hh);
        }
        waveCount++;
    }, 700);
}

function showStopBtn() {
    document.getElementById('petalStopBtn').classList.add('visible');
}

function hideStopBtn() {
    document.getElementById('petalStopBtn').classList.remove('visible');
}

function stopPetals() {
    petalsActive = false;
    if (petalTimeout) {
        clearTimeout(petalTimeout);
        petalTimeout = null;
    }
    if (petalInterval) {
        clearInterval(petalInterval);
        petalInterval = null;
    }
    // Don't hide stop btn yet — wait until all petals are gone
}

function clearAllPetals() {
    // Stop everything AND remove all petals instantly
    stopPetals();
    activePetals.forEach(p => p.el.remove());
    activePetals = [];
    if (petalAnimFrame) {
        cancelAnimationFrame(petalAnimFrame);
        petalAnimFrame = null;
        lastTime = 0;
    }
    hideStopBtn();
}

function togglePetals() {
    if (petalsActive) {
        stopPetals();
    } else {
        petalsActive = true;
        showStopBtn();
        burstPetals();

        // Auto-stop spawning after 5 seconds
        petalTimeout = setTimeout(() => {
            stopPetals();
        }, 5000);
    }
}

// ============================================================
// PETAL INTERACTION — swipe/hover to push petals around
// ============================================================

let pointerPos = { x: 0, y: 0 };
let lastPointerPos = { x: 0, y: 0 };
let pointerMoving = false;

function updatePointerForPetals(clientX, clientY) {
    const appRect = document.getElementById('app').getBoundingClientRect();
    lastPointerPos.x = pointerPos.x;
    lastPointerPos.y = pointerPos.y;
    pointerPos.x = clientX - appRect.left;
    pointerPos.y = clientY - appRect.top;
    pointerMoving = true;

    // Push nearby petals away from the cursor
    const pushRadius = 50;
    const pushStrength = 300;

    for (const p of activePetals) {
        const dx = p.x - pointerPos.x;
        const dy = p.y - pointerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < pushRadius && dist > 0) {
            const force = (1 - dist / pushRadius) * pushStrength;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
        }
    }
}

// Mouse move on the petal container area
document.getElementById('app').addEventListener('mousemove', (e) => {
    if (activePetals.length > 0) {
        updatePointerForPetals(e.clientX, e.clientY);
    }
});

// Touch move on the petal container
document.getElementById('app').addEventListener('touchmove', (e) => {
    if (activePetals.length > 0) {
        const touch = e.touches[0];
        updatePointerForPetals(touch.clientX, touch.clientY);
    }
}, { passive: true });

// ============================================================
// START!
// ============================================================

init();

// Set up petal toggle on logo click
document.getElementById('logoBtn').addEventListener('click', togglePetals);

// Stop button clears all petals instantly
document.getElementById('petalStopBtn').addEventListener('click', clearAllPetals);
