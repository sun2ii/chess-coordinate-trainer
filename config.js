// Chess Coordinate Trainer - User Configuration

const CONFIG = {
  // overlay : 'off' | 'flanks' | 'ranks' | 'colors'
  defaultMode: 'off',

  // 'full' (A1) | 'file' (A) | 'rank' (1)
  defaultCoordMode: 'full',

  // E : Exam mode on startup
  defaultExamMode: false,

  // R: file display mode - 'abc' (ABCDEFGH) or 'numeric' (12345678)
  // numeric: a1=11, b5=25, e4=54, h8=88
  defaultFileMode: 'numeric',

  // Status tooltip duration in milliseconds
  tooltipDuration: 1200,

  // Coordinate overlay: how long before fade starts (ms)
  overlayDuration: 1200,

  // Coordinate overlay: fade animation duration (ms)
  overlayFadeDuration: 200,
};
