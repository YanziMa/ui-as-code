/**
 * LED Matrix: Dot-matrix LED display component with text/pattern rendering,
 * multi-color support, scroll animation, brightness control, custom fonts
 * (5x7 / 8x8), blink effects, and frame-by-frame API.
 */

// --- Types ---

export type LEDColor = "red" | "green" | "blue" | "yellow" | "cyan" | "magenta" | "white" | "orange" | "off";

export interface LEDMatrixOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Number of columns (LEDs wide) */
  cols?: number;
  /** Number of rows (LEDs high) */
  rows?: number;
  /** LED size (px, includes gap) */
  ledSize?: number;
  /** Gap between LEDs (px) */
  gap?: number;
  /** LED corner radius ratio (0-1) */
  ledRadius?: number;
  /** Default LED color when on */
  color?: string;
  /** Off LED color */
  offColor?: string;
  /** Background color of the matrix panel */
  background?: string;
  /** Panel border radius */
  borderRadius?: number;
  /** Panel border style ("none" | "thin" | "thick" | "bezel") */
  borderStyle?: string;
  /** Border color */
  borderColor?: string;
  /** Brightness (0-1) */
  brightness?: number;
  /** Initial text to display */
  text?: string;
  /** Scroll speed (pixels per second for marquee) */
  scrollSpeed?: number;
  /** Scroll mode ("none" | "left" | "right" | "bounce") */
  scrollMode?: string;
  /** Font: built-in font name or custom 2D array per character */
  font?: string;
  /** Blink effect? ("none" | "slow" | "fast" | "custom") */
  blinkMode?: string;
  /** Blink interval (ms) */
  blinkInterval?: number;
  /** Animation enabled? */
  animate?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Frame update callback (for custom patterns) */
  onFrame?: (matrix: LEDColor[][]) => LEDColor[][];
  /** Text change callback */
  onTextComplete?: () => void;
}

export interface LEDMatrixInstance {
  element: HTMLElement;
  /** Set pixel at position */
  setPixel: (col: number, row: number, color: LEDColor) => void;
  /** Set entire matrix from 2D array */
  setMatrix: (matrix: LEDColor[][]) => void;
  /** Clear all pixels */
  clear: () => void;
  /** Display text */
  setText: (text: string) => void;
  /** Fill entire matrix with color */
  fill: (color: LEDColor) => void;
  /** Draw a pattern (icon/sprite) */
  drawPattern: (pattern: number[][], offsetX?: number, offsetY?: number) => void;
  /** Start/stop scrolling */
  startScroll: () => void;
  stopScroll: () => void;
  /** Set brightness */
  setBrightness: (value: number) => void;
  /** Get current matrix state */
  getMatrix: () => LEDColor[][];
  /** Destroy */
  destroy: () => void;
}

// --- Color Map ---

const COLOR_MAP: Record<LEDColor, string> = {
  red: "#ef4444",
  green: "#22c55e",
  blue: "#3b82f6",
  yellow: "#eab308",
  cyan: "#06b6d4",
  magenta: "#d946ef",
  white: "#f9fafb",
  orange: "#f97316",
  off: "transparent",
};

// --- Built-in 5x7 Font (ASCII printable subset) ---

const FONT_5X7: Record<string, number[][]> = {
  " ": [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],
  "!": [[1],[1],[1],[0],[0],[0],[1]],
  '"': [[1,0,1],[1,0,1],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]],
  "#": [[0,1,0,1,0],[1,1,1,1,1],[0,1,0,1,0],[0,1,0,1,0],[1,1,1,1,1],[0,1,0,1,0],[0,1,0,1,0]],
  "$": [[0,1,1,1,0],[1,0,1,0,1],[1,0,1,0,1],[0,1,1,1,0],[1,0,1,0,1],[1,0,1,0,1],[0,1,1,1,0]],
  "%": [[1,0,0,0,1],[0,0,1,0,0],[0,0,0,1,0],[0,0,1,0,0],[0,0,0,1,0],[0,0,1,0,0],[1,0,0,0,1]],
  "&": [[0,1,1,0,0],[1,0,0,1,0],[0,1,1,0,0],[1,0,1,0,1],[1,0,0,0,1],[1,0,1,0,1],[0,1,0,1,0]],
  "'": [[0,1,0],[0,1,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]],
  "(": [[0,0,1,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,0,1,0,0]],
  ")": [[0,0,1,0,0],[0,0,0,1,0],[0,0,0,1,0],[0,0,0,1,0],[0,0,0,1,0],[0,0,0,1,0],[0,0,1,0,0]],
  "*": [[0,0,1,0,0],[1,0,1,0,1],[1,1,1,1,1],[0,1,1,1,0],[1,1,1,1,1],[1,0,1,0,1],[0,0,1,0,0]],
  "+": [[0,0,0,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,0,0,0]],
  ",": [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,1,0,0],[0,1,0,0,0]],
  "-": [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[1,1,1,1,1],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],
  ".": [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,1,0,0],[0,1,1,0,0]],
  "/": [[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],
  "0": [[0,1,1,0,0],[1,0,0,1,1],[1,0,1,0,1],[1,0,0,1,1],[1,0,0,0,1],[0,1,1,0,0],[0,0,0,0,0]],
  "1": [[0,0,1,0,0],[0,1,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1]],
  "2": [[0,1,1,0,0],[1,0,0,1,1],[0,0,0,0,1],[0,0,1,0,0],[0,1,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
  "3": [[0,1,1,0,0],[1,0,0,1,1],[0,0,0,0,1],[0,0,1,1,0],[0,0,0,0,1],[1,0,0,1,1],[0,1,1,0,0]],
  "4": [[0,0,0,1,0],[0,0,1,1,0],[0,1,0,1,0],[1,0,0,1,0],[1,1,1,1,1],[0,0,0,1,0],[0,0,0,1,0]],
  "5": [[1,1,1,1,1],[1,0,0,0,0],[1,1,1,0,0],[0,0,0,1,0],[0,0,0,0,1],[1,0,0,1,1],[0,1,1,0,0]],
  "6": [[0,0,1,1,0],[0,1,0,0,0],[1,0,0,0,0],[1,1,1,0,0],[1,0,0,1,1],[0,1,1,0,0],[0,0,0,0,0]],
  "7": [[1,1,1,1,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0]],
  "8": [[0,1,1,0,0],[1,0,0,1,1],[0,1,1,0,0],[1,0,0,1,1],[1,0,0,1,1],[0,1,1,0,0],[0,0,0,0,0]],
  "9": [[0,1,1,0,0],[1,0,0,1,1],[1,0,0,0,1],[0,1,1,1,1],[0,0,0,0,1],[0,0,1,0,0],[0,1,1,0,0]],
  ":": [[0,0,0,0,0],[0,1,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,1,0,0,0],[0,0,0,0,0]],
  ";": [[0,0,0,0,0],[0,0,1,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,1,0,0],[0,1,0,0,0]],
  "<": [[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,0,0,0,0],[0,1,0,0,0],[0,0,1,0,0],[0,0,0,1,0]],
  "=": [[0,0,0,0,0],[0,0,0,0,0],[1,1,1,1,1],[0,0,0,0,0],[1,1,1,1,1],[0,0,0,0,0],[0,0,0,0,0]],
  ">": [[1,0,0,0,0],[0,1,0,0,0],[0,0,1,0,0],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,0,0,0,0]],
  "?": [[0,1,1,0,0],[1,0,0,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,0,1,0],[0,0,0,0,0],[0,0,1,0,0]],
  "@": [[0,1,1,0,0],[1,0,0,1,1],[1,0,1,0,1],[1,0,1,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0]],
  "A": [[0,1,1,0,0],[1,0,0,1,1],[1,0,0,1,1],[1,1,1,1,1],[1,0,0,1,1],[1,0,0,1,1],[1,0,0,1,1]],
  "B": [[1,1,1,0,0],[1,0,0,1,1],[1,0,0,1,1],[1,1,1,0,0],[1,0,0,1,1],[1,0,0,1,1],[1,1,1,0,0]],
  "C": [[0,1,1,0,0],[1,0,0,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,1,1],[0,1,1,0,0]],
  "D": [[1,1,1,0,0],[1,0,0,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,1,1],[1,1,1,0,0]],
  "E": [[1,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
  "F": [[1,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]],
  "G": [[0,1,1,0,0],[1,0,0,1,1],[1,0,0,0,0],[1,0,0,1,0],[1,0,0,1,1],[1,0,0,1,1],[0,1,1,0,1]],
  "H": [[1,0,0,1,1],[1,0,0,1,1],[1,0,0,1,1],[1,1,1,1,1],[1,0,0,1,1],[1,0,0,1,1],[1,0,0,1,1]],
  "I": [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1]],
  "J": [[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[1,0,0,0,1],[1,0,0,1,1],[0,1,1,0,0]],
  "K": [[1,0,0,1,0],[1,0,1,0,0],[1,1,0,0,0],[1,0,0,0,0],[1,1,0,0,0],[1,0,1,0,0],[1,0,0,1,0]],
  "L": [[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
  "M": [[1,0,0,0,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  "N": [[1,0,0,0,1],[1,1,0,0,1],[1,1,1,0,1],[1,0,1,1,1],[1,0,0,1,1],[1,0,0,0,1],[1,0,0,0,1]],
  "O": [[0,1,1,0,0],[1,0,0,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,1,1],[0,1,1,0,0]],
  "P": [[1,1,1,0,0],[1,0,0,1,1],[1,0,0,1,1],[1,1,1,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]],
  "Q": [[0,1,1,0,0],[1,0,0,1,1],[1,0,0,0,1],[1,0,0,1,0],[1,0,0,1,0],[1,0,0,1,0],[0,1,0,1,0]],
  "R": [[1,1,1,0,0],[1,0,0,1,1],[1,0,0,1,1],[1,1,1,0,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,1,0]],
  "S": [[0,1,1,0,0],[1,0,0,1,1],[0,1,1,0,0],[0,0,0,1,0],[0,0,1,0,0],[1,0,0,1,1],[0,1,1,0,0]],
  "T": [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
  "U": [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  "V": [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,1,0,1,0],[0,1,0,1,0],[0,0,1,0,0]],
  "W": [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,0,1,0,1],[1,1,0,1,1],[1,0,0,0,1]],
  "X": [[1,0,0,0,1],[1,0,0,0,1],[0,1,1,0,0],[0,1,1,0,0],[0,1,1,0,0],[1,0,0,0,1],[1,0,0,0,1]],
  "Y": [[1,0,0,0,1],[1,0,0,0,1],[0,1,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
  "Z": [[1,1,1,1,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
};

// --- Main Factory ---

export function createLEDMatrix(options: LEDMatrixOptions): LEDMatrixInstance {
  const opts = {
    cols: options.cols ?? 24,
    rows: options.rows ?? 7,
    ledSize: options.ledSize ?? 12,
    gap: options.gap ?? 2,
    ledRadius: options.ledRadius ?? 0.3,
    color: options.color ?? "#22c55e",
    offColor: options.offColor ?? "#1a1a2e",
    background: options.background ?? "#0a0a14",
    borderRadius: options.borderRadius ?? 8,
    borderStyle: options.borderStyle ?? "bezel",
    borderColor: options.borderColor ?? "#333355",
    brightness: options.brightness ?? 1,
    text: options.text ?? "",
    scrollSpeed: options.scrollSpeed ?? 60,
    scrollMode: options.scrollMode ?? "none",
    font: options.font ?? "5x7",
    blinkMode: options.blinkMode ?? "none",
    blinkInterval: options.blinkInterval ?? 500,
    animate: options.animate ?? true,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("LEDMatrix: container not found");

  let destroyed = false;
  let matrix: LEDColor[][] = [];
  let blinkOn = true;
  let blinkTimer: ReturnType<typeof setInterval> | null = null;
  let scrollOffset = 0;
  let scrollTimer: ReturnType<typeof requestAnimationFrame> | null = null;
  let animFrameId: ReturnType<typeof requestAnimationFrame> | null = null;

  // Initialize matrix
  function initMatrix(): void {
    matrix = Array.from({ length: opts.rows }, () =>
      Array.from({ length: opts.cols }, () => "off")
    );
  }
  initMatrix();

  // Root element
  const root = document.createElement("div");
  root.className = `led-matrix ${opts.className}`;
  root.style.cssText = `
    display:inline-block;padding:${opts.borderStyle === "bezel" ? "10px" : opts.borderStyle === "thick" ? "6px" : "3px"};
    background:${opts.background};border-radius:${opts.borderRadius}px;
    ${opts.borderStyle !== "none" ? `border:2px solid ${opts.borderColor};` : ""}
    box-shadow:0 4px 20px rgba(0,0,0,0.4);
  `;

  // Grid container
  const grid = document.createElement("div");
  grid.style.cssText = `display:grid;grid-template-columns:repeat(${opts.cols}, ${opts.ledSize}px);gap:${opts.gap}px;`;
  root.appendChild(grid);

  // Create LED elements
  const leds: HTMLDivElement[][] = [];
  for (let r = 0; r < opts.rows; r++) {
    leds[r] = [];
    for (let c = 0; c < opts.cols; c++) {
      const led = document.createElement("div");
      led.style.cssText = `
        width:${opts.ledSize}px;height:${opts.ledSize}px;border-radius:${opts.ledSize * opts.ledRadius}px;
        background:${opts.offColor};transition:background 0.08s ease, box-shadow 0.08s ease;
        box-shadow:none;
      `;
      led.dataset.col = String(c);
      led.dataset.row = String(r);
      grid.appendChild(led);
      leds[r]![c] = led;
    }
  }

  container.appendChild(root);

  // --- Rendering ---

  function render(): void {
    if (!blinkOn && opts.blinkMode !== "none") return;

    for (let r = 0; r < opts.rows; r++) {
      for (let c = 0; c < opts.cols; c++) {
        const colorKey = matrix[r]?.[c] ?? "off";
        const led = leds[r]?.[c];
        if (!led) continue;

        const isOn = colorKey !== "off";
        const colorStr = isOn ? (COLOR_MAP[colorKey] ?? opts.color) : opts.offColor;

        led.style.background = colorStr;
        if (isOn) {
          const rgb = hexToRgb(colorStr);
          if (rgb) {
            led.style.boxShadow = `0 0 ${Math.round(opts.ledSize * 0.5)}px rgba(${rgb.r},${rgb.g},${rgb.b},${opts.brightness * 0.7})`;
          }
        } else {
          led.style.boxShadow = "none";
        }
      }
    }
  }

  function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!m) return null;
    return { r: parseInt(m[1]!, 16), g: parseInt(m[2]!, 16), b: parseInt(m[3]!, 16) };
  }

  // --- Text Rendering ---

  function renderTextToBuffer(text: string): LEDColor[][] {
    const buf: LEDColor[][] = Array.from({ length: opts.rows }, () =>
      Array.from({ length: opts.cols }, () => "off")
    );

    const charWidth = opts.font === "5x7" ? 5 : 6;
    const charGap = 1;
    let colCursor = 0;

    for (const ch of text) {
      const glyph = FONT_5X7[ch.toUpperCase()] ?? FONT_5X7["?"];
      for (let row = 0; row < Math.min(glyph.length, opts.rows); row++) {
        for (let col = 0; col < Math.min(glyph[row]!.length, charWidth); col++) {
          const targetCol = colCursor + col;
          if (targetCol >= 0 && targetCol < opts.cols && row < opts.rows) {
            buf[row]![targetCol] = glyph[row]![col]! ? ("on" as LEDColor) : "off";
          }
        }
      }
      colCursor += charWidth + charGap;
    }

    return buf;
  }

  // --- Scroll ---

  function startScrollLoop(): void {
    stopScroll();
    if (opts.scrollMode === "none" || !opts.text) return;

    const fullBuf = renderTextToBuffer(opts.text + "   ");
    const totalWidth = fullBuf[0]?.length ?? 0;

    function tick(): void {
      if (destroyed || opts.scrollMode === "none") return;

      // Copy visible portion into matrix
      for (let r = 0; r < opts.rows; r++) {
        for (let c = 0; c < opts.cols; c++) {
          const srcIdx = Math.floor(scrollOffset) + c;
          matrix[r]![c] = (srcIdx >= 0 && srcIdx < totalWidth)
            ? (fullBuf[r]?.[srcIdx] ?? "off")
            : "off";
        }
      }

      render();
      scrollOffset += opts.scrollSpeed / 60; // ~60fps

      if (scrollMode === "bounce") {
        if (scrollOffset >= totalWidth - opts.cols || scrollOffset <= 0) {
          opts.scrollSpeed = -opts.scrollSpeed;
        }
      } else if (scrollOffset > totalWidth) {
        scrollOffset = -opts.cols;
      }

      scrollTimer = requestAnimationFrame(tick);
    }

    scrollTimer = requestAnimationFrame(tick);
  }

  function stopScroll(): void {
    if (scrollTimer != null) { cancelAnimationFrame(scrollTimer); scrollTimer = null; }
  }

  // --- Blink ---

  function startBlink(): void {
    stopBlink();
    if (opts.blinkMode === "none") return;
    blinkTimer = setInterval(() => {
      blinkOn = !blinkOn;
      render();
    }, opts.blinkInterval);
  }

  function stopBlink(): void {
    if (blinkTimer != null) { clearInterval(blinkTimer); blinkTimer = null; }
    blinkOn = true;
  }

  // --- Initial setup ---

  if (opts.text) {
    if (opts.scrollMode !== "none") {
      startScrollLoop();
    } else {
      const textBuf = renderTextToBuffer(opts.text);
      for (let r = 0; r < Math.min(textBuf.length, opts.rows); r++) {
        for (let c = 0; c < Math.min(textBuf[r]!.length, opts.cols); c++) {
          matrix[r]![c] = textBuf[r]![c]!;
        }
      }
    }
  }

  startBlink();
  render();

  // --- Public API ---

  const instance: LEDMatrixInstance = {
    element: root,

    setPixel(col: number, row: number, color: LEDColor) {
      if (row >= 0 && row < opts.rows && col >= 0 && col < opts.cols) {
        matrix[row]![col] = color;
        render();
      }
    },

    setMatrix(newMatrix: LEDColor[][]) {
      matrix = newMatrix.map(row => [...row]);
      render();
    },

    clear() {
      initMatrix();
      render();
    },

    setText(text: string) {
      opts.text = text;
      if (opts.scrollMode !== "none") {
        scrollOffset = 0;
        startScrollLoop();
      } else {
        stopScroll();
        const textBuf = renderTextToBuffer(text);
        initMatrix();
        for (let r = 0; r < Math.min(textBuf.length, opts.rows); r++) {
          for (let c = 0; c < Math.min(textBuf[r]!.length, opts.cols); c++) {
            matrix[r]![c] = textBuf[r]![c]!;
          }
        }
        render();
      }
    },

    fill(color: LEDColor) {
      for (let r = 0; r < opts.rows; r++)
        for (let c = 0; c < opts.cols; c++)
          matrix[r]![c] = color;
      render();
    },

    drawPattern(pattern: number[][], offsetX = 0, offsetY = 0) {
      for (let r = 0; r < pattern.length; r++) {
        for (let c = 0; c < (pattern[r]?.length ?? 0); c++) {
          const tr = r + offsetY;
          const tc = c + offsetX;
          if (tr >= 0 && tr < opts.rows && tc >= 0 && tc < opts.cols) {
            matrix[tr]![tc] = pattern[r]![c]! ? "red" : "off";
          }
        }
      }
      render();
    },

    startScroll: startScrollLoop,
    stopScroll,

    setBrightness(value: number) {
      opts.brightness = Math.max(0, Math.min(1, value));
      render();
    },

    getMatrix: () => matrix.map(r => [...r]),

    destroy() {
      destroyed = true;
      stopBlink();
      stopScroll();
      if (animFrameId != null) cancelAnimationFrame(animFrameId);
      root.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
