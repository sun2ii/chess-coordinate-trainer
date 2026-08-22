(function () {
  'use strict';

  // ==========================================================================
  // 64-COLOR COORDINATE LEARNING SYSTEM (ROYGBIV)
  // ==========================================================================
  //
  // File hues (ROYGBIV + Pink):
  //   A: 0° (Red)        E: 210° (Blue)
  //   B: 30° (Orange)    F: 260° (Indigo)
  //   C: 60° (Yellow)    G: 290° (Violet)
  //   D: 120° (Green)    H: 330° (Pink)
  //
  // Rank lightness (linear gradient, light to dark):
  //   Rank 1: L=0.90 (lightest)
  //   Rank 2: L=0.81
  //   Rank 3: L=0.73
  //   Rank 4: L=0.64
  //   Rank 5: L=0.56
  //   Rank 6: L=0.47
  //   Rank 7: L=0.39
  //   Rank 8: L=0.30 (darkest)
  //
  const SQUARE_COLORS = {
    a1: '#FFB2DA', a2: '#FF96BE', a3: '#F17BA3', a4: '#D36189', a5: '#B64670', a6: '#992B58', a7: '#7D0841', a8: '#61002B',
    b1: '#FFB6A2', b2: '#FF9A87', b3: '#F77F6D', b4: '#D96454', b5: '#BB4A3B', b6: '#9E2E22', b7: '#810C04', b8: '#650000',
    c1: '#FFC570', c2: '#FFA953', c3: '#EA8E34', c4: '#CD7303', c5: '#B15900', c6: '#943F00', c7: '#792400', c8: '#5E0300',
    d1: '#D1ED74', d2: '#B6D057', d3: '#9CB438', d4: '#82990B', d5: '#697F00', d6: '#526500', d7: '#3B4D00', d8: '#273500',
    e1: '#2BF8FF', e2: '#00DBF7', e3: '#00BFDB', e4: '#00A4BF', e5: '#0089A4', e6: '#006E89', e7: '#00556F', e8: '#003C56',
    f1: '#A3DFFF', f2: '#88C2FF', f3: '#6EA6FF', f4: '#548BE7', f5: '#3B71CA', f6: '#2257AE', f7: '#053D92', f8: '#002377',
    g1: '#DDCCFF', g2: '#C1B0FF', g3: '#A795FE', g4: '#8D7AE1', g5: '#7460C4', g6: '#5D46A8', g7: '#472D8C', g8: '#320F71',
    h1: '#FFB9FF', h2: '#F89DF0', h3: '#DB82D4', h4: '#BE68B8', h5: '#A34E9D', h6: '#873482', h7: '#6C1869', h8: '#520050',
  };

  // Get the unique color for a chess square
  function getSquareColor(squareNum) {
    const fileIndex = Math.floor(squareNum / 10); // 1-8
    const rank = squareNum % 10; // 1-8
    const file = 'abcdefgh'[fileIndex - 1];
    const square = file + rank;
    return SQUARE_COLORS[square] || '#808080'; // fallback gray
  }

  // Overlay modes: Q cycles through these
  // off = no overlay
  // flanks = queenside (orange) vs kingside (cyan) - left/right split
  // ranks = your half (orange) vs their half (blue) - bottom/top split
  // colors = 64-color overlay with full coordinates (A1, B2, etc.)
  const MODES = ['off', 'flanks', 'ranks', 'colors'];
  let currentMode = MODES.indexOf(CONFIG.defaultMode) !== -1 ? MODES.indexOf(CONFIG.defaultMode) : 0;

  // Coordinate display modes: W cycles through these
  const COORD_MODES = ['full', 'file', 'rank']; // A1, A, 1
  let currentCoordMode = COORD_MODES.indexOf(CONFIG.defaultCoordMode) !== -1 ? COORD_MODES.indexOf(CONFIG.defaultCoordMode) : 0;

  // Exam mode: E to toggle
  let examMode = CONFIG.defaultExamMode;

  // File display mode: R to toggle between 'abc' (ABCDEFGH) and 'numeric' (12345678)
  let numericMode = CONFIG.defaultFileMode === 'numeric';
  const FILE_DISPLAY = {
    abc: 'ABCDEFGH',
    numeric: '12345678',
  };
  let examModalEl = null;
  let examInputEl = null;
  let examTargetCoord = null;
  let examBoard = null;
  let examOverlay = null;

  // Status tooltip
  let tooltipEl = null;
  let tooltipTimeout = null;

  function showStatusTooltip() {
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.className = 'coord-trainer-tooltip';
      document.body.appendChild(tooltipEl);
    }

    const overlayMode = MODES[currentMode];
    const coordMode = COORD_MODES[currentCoordMode];
    const sampleFile = numericMode ? '1' : 'A';
    const sampleRank = '1';
    const coordLabel = coordMode === 'full' ? sampleFile + sampleRank : coordMode === 'file' ? sampleFile : sampleRank;

    const examLabel = examMode ? 'on' : 'off';
    const fileLabel = numericMode ? '12345678' : 'abc';
    tooltipEl.innerHTML =
      '<span><span class="label">Q:</span><span class="value">' + overlayMode + '</span></span>' +
      '<span><span class="label">W:</span><span class="value">' + coordLabel + '</span></span>' +
      '<span><span class="label">E:</span><span class="value">' + examLabel + '</span></span>' +
      '<span><span class="label">R:</span><span class="value">' + fileLabel + '</span></span>';

    tooltipEl.classList.add('visible');

    if (tooltipTimeout) clearTimeout(tooltipTimeout);
    tooltipTimeout = setTimeout(() => {
      tooltipEl.classList.remove('visible');
    }, CONFIG.tooltipDuration);
  }

  // Convert Chess.com square class to algebraic notation
  // square-55 → "E5" (file 5 = E, rank 5 = 5)
  function squareToAlgebraic(squareNum) {
    const file = Math.floor(squareNum / 10);
    const rank = squareNum % 10;
    if (file < 1 || file > 8 || rank < 1 || rank > 8) return null;
    const fileChar = String.fromCharCode(64 + file); // 1→A, 2→B, etc.
    return fileChar + rank;
  }

  // Get display character for a file (1-8) based on current mode
  function getFileChar(fileIndex) {
    const chars = numericMode ? FILE_DISPLAY.numeric : FILE_DISPLAY.abc;
    return chars[fileIndex - 1];
  }

  // Get full coordinate display (e.g., "A1" or "1.1")
  function getCoordDisplay(fileIndex, rank) {
    const fileChar = getFileChar(fileIndex);
    return numericMode ? fileChar + '.' + rank : fileChar + rank;
  }

  // Extract square number from element's class list
  function getSquareFromElement(el) {
    const match = el.className.match(/square-(\d{2})/);
    return match ? parseInt(match[1], 10) : null;
  }

  // Check if board is flipped (black at bottom)
  function isBoardFlipped(board) {
    return board.classList.contains('flipped');
  }

  // Get text color (white or black) based on background luminance
  function getTextColor(hexColor) {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    // Relative luminance formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  }

  // Calculate overlay position based on square and board orientation
  function getOverlayPosition(squareNum, flipped) {
    const file = Math.floor(squareNum / 10);
    const rank = squareNum % 10;

    let left, bottom;
    if (flipped) {
      left = (8 - file) * 12.5;
      bottom = (8 - rank) * 12.5;
    } else {
      left = (file - 1) * 12.5;
      bottom = (rank - 1) * 12.5;
    }

    return { left: left + '%', bottom: bottom + '%' };
  }

  // Create exam mode modal
  function createExamModal() {
    if (examModalEl) return;

    examModalEl = document.createElement('div');
    examModalEl.className = 'exam-modal';
    examModalEl.innerHTML =
      '<div class="exam-content">' +
      '<div class="exam-prompt">square?</div>' +
      '<input type="text" class="exam-input" maxlength="3" autocomplete="off" spellcheck="false">' +
      '<div class="exam-feedback"></div>' +
      '</div>';
    document.body.appendChild(examModalEl);

    examInputEl = examModalEl.querySelector('.exam-input');

    // Keyboard mappings based on mode:
    // ABC mode: a-h → A-H
    // Numeric mode: 1-8 → 1-8 (for files)
    const ABC_FILES = {
      'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D',
      'e': 'E', 'f': 'F', 'g': 'G', 'h': 'H',
    };
    const NUMERIC_FILES = {
      '1': '1', '2': '2', '3': '3', '4': '4',
      '5': '5', '6': '6', '7': '7', '8': '8',
    };

    function getFileMap() {
      return numericMode ? NUMERIC_FILES : ABC_FILES;
    }

    examInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        checkExamAnswer();
        e.preventDefault();
        return;
      }
      if (e.key === 'Escape') {
        hideExamModal();
        e.preventDefault();
        return;
      }

      const key = e.key.toLowerCase();
      const currentVal = examInputEl.value;
      const fileMap = getFileMap();
      const isRankKey = /^[1-8]$/.test(key);

      if (numericMode) {
        // Numeric mode: both file and rank are 1-8
        // Display as "4.2" for file 4, rank 2
        if (currentVal.length === 0 && isRankKey) {
          examInputEl.value = key + '.';
          e.preventDefault();
          return;
        }
        if (currentVal.length === 2 && currentVal[1] === '.' && isRankKey) {
          examInputEl.value = currentVal + key;
          e.preventDefault();
          setTimeout(checkExamAnswer, 100);
          return;
        }
      } else {
        // ABC mode: file is a-h, rank is 1-8
        // Allow replacing first character with a new file key
        if (currentVal.length === 1 && fileMap[key]) {
          examInputEl.value = fileMap[key];
          e.preventDefault();
          return;
        }

        // First character: file
        if (currentVal.length === 0 && fileMap[key]) {
          examInputEl.value = fileMap[key];
          e.preventDefault();
          return;
        }

        // Second character: rank
        if (currentVal.length === 1 && isRankKey) {
          examInputEl.value = currentVal + key;
          e.preventDefault();
          setTimeout(checkExamAnswer, 100);
          return;
        }
      }

      // Block other keys
      e.preventDefault();
    });

    // Keep focus on input when clicking anywhere
    examInputEl.addEventListener('blur', () => {
      if (examModalEl && examModalEl.classList.contains('visible')) {
        setTimeout(() => examInputEl.focus(), 0);
      }
    });
  }

  function showExamModal(board, coord) {
    createExamModal();
    examTargetCoord = coord.toUpperCase();
    examBoard = board;

    // Lock the board
    board.style.pointerEvents = 'none';

    // Show modal
    examModalEl.classList.add('visible');
    examInputEl.value = '';
    examInputEl.focus();

    const feedback = examModalEl.querySelector('.exam-feedback');
    feedback.textContent = '';
    feedback.className = 'exam-feedback';
  }

  function checkExamAnswer() {
    if (!examTargetCoord || !examInputEl) return;

    const answer = examInputEl.value.toUpperCase().trim();
    const feedback = examModalEl.querySelector('.exam-feedback');

    // Convert target coord to display format based on mode
    // examTargetCoord is always ABC format like "E4"
    const targetFile = examTargetCoord[0]; // A-H
    const targetRank = examTargetCoord[1]; // 1-8
    const fileIndex = targetFile.charCodeAt(0) - 64; // A=1, B=2, etc.

    let displayTarget;
    if (numericMode) {
      // Numeric mode: A1 → 1.1, E4 → 5.4
      displayTarget = fileIndex + '.' + targetRank;
    } else {
      // ABC mode: keep as is
      displayTarget = examTargetCoord;
    }

    if (answer === displayTarget.toUpperCase()) {
      // Correct
      feedback.textContent = 'Correct!';
      feedback.className = 'exam-feedback correct';

      setTimeout(() => {
        hideExamModal();
      }, 400);
    } else {
      // Wrong
      feedback.textContent = 'Try again';
      feedback.className = 'exam-feedback wrong';
      examInputEl.value = '';
      examInputEl.focus();
    }
  }

  function hideExamModal() {
    if (examModalEl) {
      examModalEl.classList.remove('visible');
    }
    if (examBoard) {
      examBoard.style.pointerEvents = 'auto';
    }
    if (examOverlay) {
      examOverlay.remove();
      examOverlay = null;
    }
    examTargetCoord = null;
    examBoard = null;
  }

  // Global Escape handler for exam modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && examModalEl && examModalEl.classList.contains('visible')) {
      hideExamModal();
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  // Glow the side coordinate labels (file and rank)
  function glowSideCoordinates(squareNum) {
    const coord = squareToAlgebraic(squareNum);
    if (!coord) return;

    const fileLetter = coord[0].toLowerCase(); // a-h
    const rankNumber = coord[1]; // 1-8

    // In numeric mode, file is displayed as 1-8 (a=1, b=2, etc.)
    const fileDisplay = numericMode
      ? String(fileLetter.charCodeAt(0) - 96) // a=1, b=2, ..., h=8
      : fileLetter;

    document.querySelectorAll('.coordinate-grey').forEach((el) => {
      const text = el.textContent.trim().toLowerCase();
      // Check if this element is a file label (has originalFile dataset) or rank label
      const isFileLabel = el.dataset.originalFile;

      if (isFileLabel && text === fileDisplay) {
        el.classList.add('coord-glow');
        setTimeout(() => {
          el.classList.remove('coord-glow');
        }, 1500);
      } else if (!isFileLabel && text === rankNumber) {
        el.classList.add('coord-glow');
        setTimeout(() => {
          el.classList.remove('coord-glow');
        }, 1500);
      }
    });
  }

  // Show coordinate overlay on the destination square
  function showCoordinateOverlay(board, squareNum) {
    const coord = squareToAlgebraic(squareNum);
    if (!coord) return;

    // Remove any existing coordinate overlays immediately
    board.querySelectorAll('.coord-overlay').forEach(el => el.remove());

    // Glow the side labels
    glowSideCoordinates(squareNum);

    const flipped = isBoardFlipped(board);
    const pos = getOverlayPosition(squareNum, flipped);

    const overlay = document.createElement('div');
    overlay.className = 'coord-overlay';

    // Apply unique square color
    const bgColor = getSquareColor(squareNum);
    const textColor = getTextColor(bgColor);
    overlay.style.backgroundColor = bgColor;

    // Exam mode: show colored square without label, keep visible
    if (examMode) {
      overlay.style.left = pos.left;
      overlay.style.bottom = pos.bottom;
      board.appendChild(overlay);
      examOverlay = overlay;
      showExamModal(board, coord);
      return;
    }

    const mode = COORD_MODES[currentCoordMode];
    const fileIndex = coord[0].charCodeAt(0) - 64; // A=1, B=2, etc.
    const displayFile = getFileChar(fileIndex);
    const rank = coord[1];

    if (mode === 'full' || mode === 'file') {
      const fileSpan = document.createElement('span');
      fileSpan.className = 'coord-file';
      fileSpan.style.color = textColor;
      // In numeric mode with full display, add dot after file
      fileSpan.textContent = (numericMode && mode === 'full') ? displayFile + '.' : displayFile;
      overlay.appendChild(fileSpan);
    }

    if (mode === 'full' || mode === 'rank') {
      const rankSpan = document.createElement('span');
      rankSpan.className = 'coord-rank';
      rankSpan.style.color = textColor;
      rankSpan.textContent = rank;
      overlay.appendChild(rankSpan);
    }
    overlay.style.left = pos.left;
    overlay.style.bottom = pos.bottom;

    board.appendChild(overlay);

    setTimeout(() => {
      overlay.classList.add('fade-out');
    }, CONFIG.overlayDuration);

    setTimeout(() => {
      overlay.remove();
    }, CONFIG.overlayDuration + CONFIG.overlayFadeDuration);
  }

  // Create all overlay containers
  function createOverlays(board) {
    const flipped = isBoardFlipped(board);

    // Flanks overlay (queenside vs kingside - 2 color halves)
    const flanksContainer = document.createElement('div');
    flanksContainer.className = 'overlay-container overlay-flanks';
    const queenside = document.createElement('div');
    queenside.className = 'flank flank-queenside';
    const kingside = document.createElement('div');
    kingside.className = 'flank flank-kingside';
    flanksContainer.appendChild(queenside);
    flanksContainer.appendChild(kingside);
    board.appendChild(flanksContainer);

    // Ranks overlay (your half vs their half - 2 color halves)
    const ranksContainer = document.createElement('div');
    ranksContainer.className = 'overlay-container overlay-ranks';
    const lowerHalf = document.createElement('div');
    lowerHalf.className = 'rank-half rank-lower';
    const upperHalf = document.createElement('div');
    upperHalf.className = 'rank-half rank-upper';
    ranksContainer.appendChild(lowerHalf);
    ranksContainer.appendChild(upperHalf);
    board.appendChild(ranksContainer);

    // Colors overlay (64 colors with A1, B2, etc. labels)
    const colorContainer = document.createElement('div');
    colorContainer.className = 'overlay-container overlay-colors';

    // Create 64 color squares
    for (let file = 1; file <= 8; file++) {
      for (let rank = 1; rank <= 8; rank++) {
        const squareNum = file * 10 + rank;
        const fileChar = getFileChar(file);
        const bgColor = getSquareColor(squareNum);
        const textColor = getTextColor(bgColor);

        // Position calculation
        let left, bottom;
        if (flipped) {
          left = (8 - file) * 12.5;
          bottom = (8 - rank) * 12.5;
        } else {
          left = (file - 1) * 12.5;
          bottom = (rank - 1) * 12.5;
        }

        // Color square with full coordinate
        const colorDiv = document.createElement('div');
        colorDiv.className = 'color-square';
        colorDiv.dataset.file = file;
        colorDiv.dataset.rank = rank;
        colorDiv.style.backgroundColor = bgColor;
        colorDiv.style.color = textColor;
        colorDiv.textContent = getCoordDisplay(file, rank);
        colorDiv.style.left = left + '%';
        colorDiv.style.bottom = bottom + '%';
        colorContainer.appendChild(colorDiv);
      }
    }

    board.appendChild(colorContainer);

    // Update overlay positions when board flips
    const flipObserver = new MutationObserver(() => {
      updateColorOverlayPositions(board, colorContainer);
    });
    flipObserver.observe(board, { attributes: true, attributeFilter: ['class'] });
  }

  // Update color overlay positions when board flips
  function updateColorOverlayPositions(board, container) {
    const flipped = isBoardFlipped(board);
    const squares = container.querySelectorAll('.color-square');
    let index = 0;

    for (let file = 1; file <= 8; file++) {
      for (let rank = 1; rank <= 8; rank++) {
        const div = squares[index++];
        if (!div) continue;
        let left, bottom;
        if (flipped) {
          left = (8 - file) * 12.5;
          bottom = (8 - rank) * 12.5;
        } else {
          left = (file - 1) * 12.5;
          bottom = (rank - 1) * 12.5;
        }
        div.style.left = left + '%';
        div.style.bottom = bottom + '%';
      }
    }
  }

  // Update color overlay labels when file display mode changes
  function updateColorOverlayLabels() {
    document.querySelectorAll('.color-square').forEach((div) => {
      const file = parseInt(div.dataset.file, 10);
      const rank = parseInt(div.dataset.rank, 10);
      if (file && rank) {
        div.textContent = getCoordDisplay(file, rank);
      }
    });
  }

  // Update which overlay is visible based on current mode
  function updateOverlayMode() {
    const mode = MODES[currentMode];

    // Hide all overlays first
    document.querySelectorAll('.overlay-container').forEach((container) => {
      container.classList.remove('visible');
    });

    // Show the appropriate overlay
    if (mode === 'flanks') {
      document.querySelectorAll('.overlay-flanks').forEach((c) => c.classList.add('visible'));
    } else if (mode === 'ranks') {
      document.querySelectorAll('.overlay-ranks').forEach((c) => c.classList.add('visible'));
    } else if (mode === 'colors') {
      document.querySelectorAll('.overlay-colors').forEach((c) => c.classList.add('visible'));
    }

    console.log('[Coord Trainer] Mode:', mode);
  }

  // Track piece positions and observe changes
  function observeBoard(board) {
    const piecePositions = new Map();
    let initialized = false;

    function scanPieces() {
      const pieces = board.querySelectorAll('.piece');
      pieces.forEach((piece) => {
        const sq = getSquareFromElement(piece);
        if (sq) piecePositions.set(piece, sq);
      });
    }

    scanPieces();

    // Delay enabling overlays to skip initial load
    setTimeout(() => {
      initialized = true;
    }, 500);

    const observer = new MutationObserver((mutations) => {
      if (!initialized) return;

      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const piece = mutation.target;
          if (!piece.classList.contains('piece')) continue;

          const oldSquare = piecePositions.get(piece);
          const newSquare = getSquareFromElement(piece);

          if (newSquare && newSquare !== oldSquare) {
            piecePositions.set(piece, newSquare);
            showCoordinateOverlay(board, newSquare);
          }
        }

        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1 && node.classList.contains('piece')) {
              const sq = getSquareFromElement(node);
              if (sq) {
                piecePositions.set(node, sq);
                if (initialized) showCoordinateOverlay(board, sq);
              }
            }
          });

          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              piecePositions.delete(node);
            }
          });
        }
      }
    });

    observer.observe(board, {
      attributes: true,
      attributeFilter: ['class'],
      childList: true,
      subtree: true,
    });

    console.log('[Coord Trainer] Observing board:', board);
  }

  // Find and observe all boards on the page
  function initBoards() {
    const selectors = ['wc-chess-board', 'chess-board', '.board'];

    let boards = [];
    for (const sel of selectors) {
      boards = document.querySelectorAll(sel);
      if (boards.length > 0) break;
    }

    if (boards.length === 0) {
      console.log('[Coord Trainer] No board found yet, will retry...');
      return false;
    }

    boards.forEach((board) => {
      if (!board.dataset.coordTrainerInit) {
        board.dataset.coordTrainerInit = 'true';
        board.style.position = 'relative';
        createOverlays(board);
        observeBoard(board);
        setupRightClick(board);
      }
    });

    return true;
  }

  // Right-click to show coordinate (but not exam mode)
  function setupRightClick(board) {
    board.addEventListener('contextmenu', (e) => {
      // Skip if exam mode is on - exam only triggers on piece moves
      if (examMode) return;

      const rect = board.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Calculate which square was clicked (0-7 for both)
      const squareSize = rect.width / 8;
      let fileIndex = Math.floor(x / squareSize); // 0-7
      let rankIndex = 7 - Math.floor(y / squareSize); // 0-7, flipped because y=0 is top

      // Adjust for flipped board
      const flipped = isBoardFlipped(board);
      if (flipped) {
        fileIndex = 7 - fileIndex;
        rankIndex = 7 - rankIndex;
      }

      // Convert to square number (file 1-8, rank 1-8)
      const file = fileIndex + 1;
      const rank = rankIndex + 1;
      const squareNum = file * 10 + rank;

      showCoordinateOverlay(board, squareNum);
    });
  }

  // Toggle overlay mode with Q key
  function setupKeyboardToggle() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'q' || e.key === 'Q') {
        currentMode = (currentMode + 1) % MODES.length;
        updateOverlayMode();
        showStatusTooltip();
      }

      if (e.key === 'w' || e.key === 'W') {
        currentCoordMode = (currentCoordMode + 1) % COORD_MODES.length;
        showStatusTooltip();
      }

      if (e.key === 'e' || e.key === 'E') {
        examMode = !examMode;
        showStatusTooltip();
        console.log('[Coord Trainer] Exam mode:', examMode ? 'ON' : 'OFF');
      }

      if (e.key === 'r' || e.key === 'R') {
        numericMode = !numericMode;
        updateBoardFileLabels();
        updateColorOverlayLabels();
        showStatusTooltip();
        console.log('[Coord Trainer] File display:', numericMode ? 'NUMERIC' : 'ABC');
      }
    });
  }

  // Map ABC to numeric for board edge labels (a=1., b=2., ..., h=8.)
  const ABC_TO_NUMERIC = { a: '1.', b: '2.', c: '3.', d: '4.', e: '5.', f: '6.', g: '7.', h: '8.' };

  // Update Chess.com board edge file labels based on numericMode
  function updateBoardFileLabels() {
    document.querySelectorAll('.coordinate-grey').forEach((el) => {
      const text = el.textContent.trim().toLowerCase();
      // Only convert if it's a valid source character
      // Use dataset to track original value and prevent double-conversion
      if (!el.dataset.originalFile) {
        // First time seeing this element - store original if it's a file letter
        if (/^[a-h]$/.test(text)) {
          el.dataset.originalFile = text;
        }
      }

      const original = el.dataset.originalFile;
      if (original) {
        el.textContent = numericMode ? ABC_TO_NUMERIC[original] : original;
      }
    });
  }

  // Fix Chess.com's coordinate positions
  function fixCoordinates() {
    document.querySelectorAll('.coordinate-grey').forEach((el) => {
      const text = el.textContent.trim();

      // Use dataset.originalFile to identify file labels (set by updateBoardFileLabels)
      // If not set yet, check if it's a letter (original Chess.com format)
      const isFileLabel = el.dataset.originalFile || /^[a-hA-H]$/.test(text);
      const isRankLabel = /^[1-8]$/.test(text) && !el.dataset.originalFile;

      // Rank numbers (1-8): set x=0
      if (isRankLabel) {
        el.setAttribute('x', '0');
      }

      // File labels: set y=100, adjust x
      if (isFileLabel) {
        el.setAttribute('y', '100');
        if (!el.dataset.xFixed) {
          const currentX = parseFloat(el.getAttribute('x')) || 0;
          el.setAttribute('x', (currentX - 1.15).toString());
          el.dataset.xFixed = 'true';
        }
      }
    });
  }

  // Run fix a few times at startup to catch Chess.com's delayed rendering
  function initCoordinateFixes() {
    fixCoordinates();
    if (numericMode) updateBoardFileLabels();
    setTimeout(() => { fixCoordinates(); if (numericMode) updateBoardFileLabels(); }, 500);
    setTimeout(() => { fixCoordinates(); if (numericMode) updateBoardFileLabels(); }, 1500);
    setTimeout(() => { fixCoordinates(); if (numericMode) updateBoardFileLabels(); }, 3000);
  }

  // Initialize
  function init() {
    setupKeyboardToggle();
    initCoordinateFixes();

    if (!initBoards()) {
      const retryInterval = setInterval(() => {
        if (initBoards()) {
          clearInterval(retryInterval);
        }
      }, 1000);

      setTimeout(() => clearInterval(retryInterval), 30000);
    }

    const bodyObserver = new MutationObserver(() => {
      initBoards();
    });

    bodyObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
