(function () {
  'use strict';

  // Overlay modes: Q cycles through these
  const MODES = ['off', 'flanks', 'ranks'];
  let currentMode = 1;

  // Coordinate display modes: W cycles through these
  const COORD_MODES = ['full', 'file', 'rank']; // A1, A, 1
  let currentCoordMode = 0;

  // Exam mode: E to toggle
  let examMode = false;
  let examModalEl = null;
  let examInputEl = null;
  let examTargetCoord = null;
  let examBoard = null;

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
    const coordLabel = coordMode === 'full' ? 'A1' : coordMode === 'file' ? 'A' : '1';

    const examLabel = examMode ? 'on' : 'off';
    tooltipEl.innerHTML =
      '<span><span class="label">Q:</span><span class="value">' + overlayMode + '</span></span>' +
      '<span><span class="label">W:</span><span class="value">' + coordLabel + '</span></span>' +
      '<span><span class="label">E:</span><span class="value">' + examLabel + '</span></span>';

    tooltipEl.classList.add('visible');

    if (tooltipTimeout) clearTimeout(tooltipTimeout);
    tooltipTimeout = setTimeout(() => {
      tooltipEl.classList.remove('visible');
    }, 1200);
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

  // Extract square number from element's class list
  function getSquareFromElement(el) {
    const match = el.className.match(/square-(\d{2})/);
    return match ? parseInt(match[1], 10) : null;
  }

  // Check if board is flipped (black at bottom)
  function isBoardFlipped(board) {
    return board.classList.contains('flipped');
  }

  // Get quadrant color based on square position
  function getQuadrantColor(squareNum) {
    const file = Math.floor(squareNum / 10);
    const rank = squareNum % 10;
    const isQueenside = file <= 4;
    const isLowerHalf = rank <= 4;

    if (isQueenside && isLowerHalf) return 'red';
    if (!isQueenside && isLowerHalf) return 'green';
    if (isQueenside) return 'purple';
    return 'blue';
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
      '<div class="exam-prompt">What square?</div>' +
      '<input type="text" class="exam-input" maxlength="2" autocomplete="off" spellcheck="false">' +
      '<div class="exam-feedback"></div>' +
      '</div>';
    document.body.appendChild(examModalEl);

    examInputEl = examModalEl.querySelector('.exam-input');

    examInputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        checkExamAnswer();
      }
      if (e.key === 'Escape') {
        // Allow escape to cancel (optional - remove if you want 100% strict)
      }
    });

    examInputEl.addEventListener('input', () => {
      // Auto-submit when 2 characters entered
      if (examInputEl.value.length === 2) {
        setTimeout(checkExamAnswer, 100);
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

    if (answer === examTargetCoord) {
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
    examTargetCoord = null;
    examBoard = null;
  }

  // Glow the side coordinate labels (file letter and rank number)
  function glowSideCoordinates(squareNum) {
    const coord = squareToAlgebraic(squareNum);
    if (!coord) return;

    const fileLetter = coord[0].toLowerCase();
    const rankNumber = coord[1];

    document.querySelectorAll('.coordinate-grey').forEach((el) => {
      const text = el.textContent.trim().toLowerCase();
      if (text === fileLetter || text === rankNumber) {
        el.classList.add('coord-glow');
        setTimeout(() => {
          el.classList.remove('coord-glow');
        }, 700);
      }
    });
  }

  // Show coordinate overlay on the destination square
  function showCoordinateOverlay(board, squareNum) {
    const coord = squareToAlgebraic(squareNum);
    if (!coord) return;

    // Exam mode: show modal instead of overlay
    if (examMode) {
      showExamModal(board, coord);
      return;
    }

    // Glow the side labels
    glowSideCoordinates(squareNum);

    const flipped = isBoardFlipped(board);
    const pos = getOverlayPosition(squareNum, flipped);

    const overlay = document.createElement('div');
    const quadrantColor = getQuadrantColor(squareNum);
    overlay.className = 'coord-overlay ' + quadrantColor;

    const mode = COORD_MODES[currentCoordMode];

    if (mode === 'full' || mode === 'file') {
      const fileSpan = document.createElement('span');
      fileSpan.className = 'coord-file';
      fileSpan.textContent = coord[0];
      overlay.appendChild(fileSpan);
    }

    if (mode === 'full' || mode === 'rank') {
      const rankSpan = document.createElement('span');
      rankSpan.className = 'coord-rank';
      rankSpan.textContent = coord[1];
      overlay.appendChild(rankSpan);
    }
    overlay.style.left = pos.left;
    overlay.style.bottom = pos.bottom;

    board.appendChild(overlay);

    setTimeout(() => {
      overlay.classList.add('fade-out');
    }, 700);

    setTimeout(() => {
      overlay.remove();
    }, 1100);
  }

  // Create all overlay containers for different modes
  function createOverlays(board) {
    // Mode 1: 4 Quadrants (disabled but kept for reference)
    const quadContainer = document.createElement('div');
    quadContainer.className = 'overlay-container overlay-quadrants';
    ['red', 'green', 'purple', 'blue'].forEach((color) => {
      const div = document.createElement('div');
      div.className = 'quadrant quadrant-' + color;
      quadContainer.appendChild(div);
    });
    board.appendChild(quadContainer);

    // Mode 2: Flanks (Queenside vs Kingside) - default ON
    const flankContainer = document.createElement('div');
    flankContainer.className = 'overlay-container overlay-flanks visible';
    ['queenside', 'kingside'].forEach((side) => {
      const div = document.createElement('div');
      div.className = 'flank flank-' + side;
      flankContainer.appendChild(div);
    });
    board.appendChild(flankContainer);

    // Mode 3: Ranks (Your half vs Their half)
    const rankContainer = document.createElement('div');
    rankContainer.className = 'overlay-container overlay-ranks';
    ['lower', 'upper'].forEach((half) => {
      const div = document.createElement('div');
      div.className = 'rank-half rank-' + half;
      rankContainer.appendChild(div);
    });
    board.appendChild(rankContainer);

    // Mode 4: Files (8 stripes)
    const fileContainer = document.createElement('div');
    fileContainer.className = 'overlay-container overlay-files';
    for (let i = 1; i <= 8; i++) {
      const div = document.createElement('div');
      div.className = 'file-stripe file-' + i;
      fileContainer.appendChild(div);
    }
    board.appendChild(fileContainer);

    // Mode 5: Center vs Edge
    const centerContainer = document.createElement('div');
    centerContainer.className = 'overlay-container overlay-center';
    const edge = document.createElement('div');
    edge.className = 'center-edge';
    const center = document.createElement('div');
    center.className = 'center-core';
    centerContainer.appendChild(edge);
    centerContainer.appendChild(center);
    board.appendChild(centerContainer);
  }

  // Update which overlay is visible based on current mode
  function updateOverlayMode() {
    const mode = MODES[currentMode];

    document.querySelectorAll('.overlay-container').forEach((container) => {
      container.classList.remove('visible');
    });

    if (mode !== 'off') {
      document.querySelectorAll('.overlay-' + mode).forEach((container) => {
        container.classList.add('visible');
      });
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

  // Right-click to show coordinate
  function setupRightClick(board) {
    board.addEventListener('contextmenu', (e) => {
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
    });
  }

  // Fix Chess.com's coordinate positions
  function fixCoordinates() {
    document.querySelectorAll('.coordinate-grey').forEach((el) => {
      const text = el.textContent.trim();

      // Rank numbers (1-8): set x=0
      if (/^[1-8]$/.test(text)) {
        el.setAttribute('x', '0');
      }

      // File letters (a-h): set y=100, subtract 1.15 from x (only once)
      if (/^[a-hA-H]$/.test(text)) {
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
    setTimeout(fixCoordinates, 500);
    setTimeout(fixCoordinates, 1500);
    setTimeout(fixCoordinates, 3000);
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
