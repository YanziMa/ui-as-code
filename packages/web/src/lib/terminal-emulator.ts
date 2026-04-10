/**
 * Terminal Emulator: VT100/ANSI escape sequence parser, virtual terminal buffer,
 * cursor management, text rendering, color support (16/256/RGB), line wrapping,
 * scrollback buffer, input handling, clipboard integration, search, themes.
 */

// --- Types ---

export interface TerminalConfig {
  rows: number;
  cols: number;
  scrollback?: number;
  cursorBlink?: boolean;
  cursorStyle?: "block" | "underline" | "bar";
  fontSize?: number;
  fontFamily?: string;
  theme?: TerminalTheme;
  bell?: "sound" | "visual" | "none";
}

export interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent?: string;
  selectionBackground?: string;
  selectionForeground?: string;
  black: string; red: string; green: string; yellow: string; blue: string; magenta: string; cyan: string; white: string;
  brightBlack: string; brightRed: string; brightGreen: string; brightYellow: string; brightBlue: string; brightMagenta: string; brightCyan: string; brightWhite: string;
}

export interface Cell {
  char: string;
  fg: number;       // Color index or RGB packed
  bg: number;
  bold: boolean;
  dim: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  inverse: boolean;
  hidden: boolean;
  width: number;     // 0=empty, 1=normal, 2=wide (CJK)
}

export interface CursorState {
  row: number;
  col: number;
  savedRow: number;
  savedCol: number;
  visible: boolean;
}

// --- Default Themes ---

export const DEFAULT_THEME: TerminalTheme = {
  background: "#1e1e2e",
  foreground: "#cdd6f4",
  cursor: "#f5e0dc",
  selectionBackground: "#585b70",
  black: "#45475a", red: "#f38ba8", green: "#a6e3a1", yellow: "#f9e2af",
  blue: "#89b4fa", magenta: "#f5c2e7", cyan: "#94e2d5", white: "#bac2de",
  brightBlack: "#585b70", brightRed: "#f38ba8", brightGreen: "#a6e3a1",
  brightYellow: "#f9e2af", brightBlue: "#89b4fa", brightMagenta: "#f5c2e7",
  brightCyan: "#94e2d5", brightWhite: "#a6adc8",
};

export const LIGHT_THEME: TerminalTheme = {
  background: "#eff1f5",
  foreground: "#4c4f69",
  cursor: "#dc8a78",
  selectionBackground: "#bcc0cc",
  black: "#bcc0cc", red: "#d20f39", green: "#40a02b", yellow: "#df8e1d",
  blue: "#1e66f5", magenta: "#ea76cb", cyan: "#179299", white: "#5c5f77",
  brightBlack: "#6c6f85", brightRed: "#d20f39", brightGreen: "#40a02b",
  brightYellow: "#df8e1d", brightBlue: "#1e66f5", brightMagenta: "#ea76cb",
  brightCyan: "#179299", brightWhite: "#acb0be",
};

// --- ANSI Parser ---

type ParseState =
  | "normal"
  | "escape"
  | "csi"        // Control Sequence Introducer
  | "osc"        // Operating System Command
  | "charset"    // Character set designation
  | "dcs"        // Device Control String
  | "string";    // String terminator

interface ParserContext {
  state: ParseState;
  params: string[];
  privateParams: string;
  intermediates: string;
  collect: string;
  oscId?: string;
  oscData: string;
}

export class AnsiParser {
  private handlers: Map<string, (params: string[], data?: string) => void> = new Map();
  private ctx: ParserContext = { state: "normal", params: [], privateParams: "", intermediates: "", collect: "" };

  /** Register handler for an escape sequence */
  on(sequence: string, handler: (params: string[], data?: string) => void): this {
    this.handlers.set(sequence.toLowerCase(), handler);
    return this;
  }

  /** Parse a chunk of data and dispatch handlers */
  parse(data: string): void {
    for (let i = 0; i < data.length; i++) {
      const ch = data[i]!;
      switch (this.ctx.state) {
        case "normal":
          if (ch === "\x1b") { this.ctx.state = "escape"; }
          else if (ch === "\n") this.dispatch("LF");
          else if (ch === "\r") this.dispatch("CR");
          else if (ch === "\t") this.dispatch("TAB");
          else if (ch === "\x07") this.dispatch("BEL");
          else if (ch === "\x08") this.dispatch("BS");
          else if (ch >= " ") this.dispatch("PRINT", [ch]);
          break;

        case "escape":
          if (ch === "[") { this.ctx.state = "csi"; this.ctx.params = []; this.ctx.privateParams = ""; this.ctx.intermediates = ""; this.ctx.collect = ""; }
          else if (ch === "]") { this.ctx.state = "osc"; this.ctx.oscData = ""; }
          else if (ch === "(" || ch === ")") { this.ctx.state = "charset"; this.ctx.collect = ""; }
          else if (ch === "P") { this.ctx.state = "dcs"; this.ctx.collect = ""; }
          else if (ch === "\\") { this.ctx.state = "normal"; this.dispatch("ST"); }
          else if (ch === "D") { this.ctx.state = "normal"; this.dispatch("IND"); }
          else if (ch === "M") { this.ctx.state = "normal"; this.dispatch("RI"); }
          else if (ch === "E") { this.ctx.state = "normal"; this.dispatch("NEL"); }
          else if (ch === "7") { this.ctx.state = "normal"; this.dispatch("DECSC"); }
          else if (ch === "8") { this.ctx.state = "normal"; this.dispatch("DECRC"); }
          else if (ch === ">") { this.ctx.state = "normal"; this.dispatch("DECKPAM"); }
          else if (ch === "=") { this.ctx.state = "normal"; this.dispatch("DECKPNM"); }
          else { this.ctx.state = "normal"; this.dispatch(`ESC_${ch}`); }
          break;

        case "csi":
          if (ch >= "0" && ch <= "9") { this.ctx.collect += ch; }
          else if (ch === ";") { this.ctx.params.push(this.ctx.collect); this.ctx.collect = ""; }
          else if (ch === "?" || ch === ">" || ch === "!") { this.ctx.privateParams += ch; }
          else if (ch >= " " && ch <= "/") { this.ctx.intermediates += ch; }
          else if (ch >= "@" && ch <= "~") {
            const finalParams = [...this.ctx.params, this.ctx.collect].filter((p) => p !== "");
            const seq = `${this.ctx.privateParams}${this.ctx.intermediates}${ch}`;
            this.dispatch(seq, finalParams);
            this.ctx.state = "normal";
          } else if (ch === "\x1b") { this.ctx.state = "escape"; }
          else { this.ctx.state = "normal"; }
          break;

        case "osc":
          if (ch === "\x07") { this.finishOsc(); this.ctx.state = "normal"; }
          else if (ch === "\x1b" && data[i + 1] === "\\") { i++; this.finishOsc(); this.ctx.state = "normal"; }
          else {
            if (!this.ctx.oscId && ch === ";") { this.ctx.oscId = this.ctx.oscData; this.ctx.oscData = ""; }
            else this.ctx.oscData += ch;
          }
          break;

        case "charset":
          this.ctx.collect += ch;
          this.ctx.state = "normal";
          this.dispatch(`CHARSET_${data[i - 1]}${ch}`);
          break;

        case "dcs":
          if (ch === "\x1b" && data[i + 1] === "\\") { i++; this.ctx.state = "normal"; }
          else this.ctx.collect += ch;
          break;
      }
    }
  }

  private finishOsc(): void {
    const id = this.ctx.oscId ?? "0";
    this.dispatch(`OSC_${id}`, [], this.ctx.oscData);
    this.ctx.oscId = undefined;
    this.ctx.oscData = "";
  }

  private dispatch(seq: string, params?: string[], data?: string): void {
    const handler = this.handlers.get(seq);
    if (handler) handler(params ?? [], data);
  }

  reset(): void { this.ctx = { state: "normal", params: [], privateParams: "", intermediates: "", collect: "" }; }
}

// --- Virtual Terminal Buffer ---

export class TerminalBuffer {
  private lines: Cell[][];
  private altLines: Cell[][] | null = null;
  private usingAltScreen = false;
  public cursor: CursorState;
  public config: TerminalConfig;
  public theme: TerminalTheme;
  private scrollback: Cell[][];
  private savedAttrs: Partial<Cell> = {};
  private originMode = false;
  private wrapNext = false;
  private insertMode = false;
  private tabStops: Set<number>;

  // SGR state
  private currentFg = -1;   // -1 = default
  private currentBg = -1;
  private bold = false;
  private dim = false;
  private italic = false;
  private underline = false;
  private strikethrough = false;
  private inverse = false;
  private hidden = false;

  constructor(config: TerminalConfig) {
    this.config = config;
    this.theme = config.theme ?? DEFAULT_THEME;
    this.cursor = { row: 0, col: 0, savedRow: 0, savedCol: 0, visible: true };
    this.lines = this.createEmptyBuffer();
    this.scrollback = [];
    this.tabStops = new Set(Array.from({ length: Math.floor(config.cols / 8) }, (_, i) => (i + 1) * 8));
  }

  get rows(): number { return this.config.rows; }
  get cols(): number { return this.config.cols; }

  /** Get the active screen buffer */
  get activeLines(): Cell[][] { return this.usingAltScreen && this.altLines ? this.altLines : this.lines; }

  set activeLines(lines: Cell[][]) {
    if (this.usingAltScreen) this.altLines = lines; else this.lines = lines;
  }

  /** Get cell at position */
  getCell(row: number, col: number): Cell {
    const buf = this.activeLines;
    if (row < 0 || row >= buf.length || col < 0 || col >= this.config.cols) return this.emptyCell();
    return buf[row][col];
  }

  /** Set cell at position */
  setCell(row: number, col: number, cell: Partial<Cell>): void {
    const buf = this.activeLines;
    if (row < 0 || row >= buf.length || col < 0 || col >= this.config.cols) return;
    Object.assign(buf[row][col], cell);
  }

  /** Write character at cursor position and advance */
  writeChar(ch: string): void {
    const buf = this.activeLines;
    if (this.wrapNext) {
      this.wrapNext = false;
      this.cursor.col = 0;
      this.lineFeed();
    }

    if (this.cursor.col >= this.config.cols) {
      if (this.config.cols > 0) this.cursor.col = this.config.cols - 1;
      this.wrapNext = true;
    }

    if (this.cursor.row < 0 || this.cursor.row >= buf.length) return;

    const cell: Cell = {
      char: ch,
      fg: this.currentFg,
      bg: this.currentBg,
      bold: this.bold,
      dim: this.dim,
      italic: this.italic,
      underline: this.underline,
      strikethrough: this.strikethrough,
      inverse: this.inverse,
      hidden: this.hidden,
      width: isWideChar(ch) ? 2 : 1,
    };

    if (this.insertMode) {
      // Insert mode: shift characters right
      buf[this.cursor.row].splice(this.cursor.col, 0, cell);
      buf[this.cursor.row].pop();
    } else {
      buf[this.cursor.row][this.cursor.col] = cell;
      if (cell.width === 2 && this.cursor.col + 1 < this.config.cols) {
        buf[this.cursor.row][this.cursor.col + 1] = { ...cell, width: 0 };
      }
    }

    this.cursor.col += cell.width;
  }

  /** Line feed - move cursor down, scroll if needed */
  lineFeed(): void {
    const bottom = this.originMode ? this.config.rows - 1 : this.config.rows - 1;
    if (this.cursor.row >= bottom) {
      this.scrollUp(1);
    } else {
      this.cursor.row++;
    }
  }

  /** Scroll up n lines into scrollback */
  scrollUp(n = 1): void {
    const buf = this.activeLines;
    for (let i = 0; i < n; i++) {
      const removed = buf.shift()!;
      this.scrollback.push(removed);
      buf.push(this.createEmptyLine());
    }
    // Limit scrollback size
    const maxScroll = this.config.scrollback ?? 1000;
    while (this.scrollback.length > maxScroll) this.scrollback.shift();
  }

  /** Scroll down n lines */
  scrollDown(n = 1): void {
    const buf = this.activeLines;
    for (let i = 0; i < n; i++) {
      buf.pop();
      buf.unshift(this.createEmptyLine());
    }
  }

  /** Erase in display (modes: 0=cursor to end, 1=start to cursor, 2=all) */
  eraseDisplay(mode = 0): void {
    const buf = this.activeLines;
    switch (mode) {
      case 0:
        // Clear from cursor to end of screen
        for (let c = this.cursor.col; c < this.config.cols; c++) this.setCell(this.cursor.row, c, this.emptyCell());
        for (let r = this.cursor.row + 1; r < this.config.rows; r++)
          for (let c = 0; c < this.config.cols; c++) buf[r][c] = this.emptyCell();
        break;
      case 1:
        // Clear from start to cursor
        for (let r = 0; r < this.cursor.row; r++)
          for (let c = 0; c < this.config.cols; c++) buf[r][c] = this.emptyCell();
        for (let c = 0; c <= this.cursor.col; c++) this.setCell(this.cursor.row, c, this.emptyCell());
        break;
      case 2:
        // Clear entire screen
        for (let r = 0; r < this.config.rows; r++)
          for (let c = 0; c < this.config.cols; c++) buf[r][c] = this.emptyCell();
        break;
    }
  }

  /** Erase in line (modes: 0=cursor to end, 1=start to cursor, 2=all) */
  eraseLine(mode = 0): void {
    switch (mode) {
      case 0:
        for (let c = this.cursor.col; c < this.config.cols; c++) this.setCell(this.cursor.row, c, this.emptyCell());
        break;
      case 1:
        for (let c = 0; c <= this.cursor.col; c++) this.setCell(this.cursor.row, c, this.emptyCell());
        break;
      case 2:
        for (let c = 0; c < this.config.cols; c++) this.setCell(this.cursor.row, c, this.emptyCell());
        break;
    }
  }

  /** Insert n blank lines at cursor */
  insertLines(n = 1): void {
    const buf = this.activeLines;
    for (let i = 0; i < n; i++) {
      buf.splice(this.cursor.row, 0, this.createEmptyLine());
      buf.pop();
    }
  }

  /** Delete n lines at cursor */
  deleteLines(n = 1): void {
    const buf = this.activeLines;
    for (let i = 0; i < n; i++) {
      buf.splice(this.cursor.row, 1);
      buf.push(this.createEmptyLine());
    }
  }

  /** Insert n blank chars at cursor */
  insertChars(n = 1): void {
    const buf = this.activeLines;
    for (let i = 0; i < n; i++) {
      buf[this.cursor.row].splice(this.cursor.col, 0, this.emptyCell());
      buf[this.cursor.row].pop();
    }
  }

  /** Delete n chars at cursor */
  deleteChars(n = 1): void {
    const buf = this.activeLines;
    for (let i = 0; i < n; i++) {
      buf[this.cursor.row].splice(this.cursor.col, 1);
      buf[this.cursor.row].push(this.emptyCell());
    }
  }

  /** Move cursor to position */
  moveCursor(row: number, col: number): void {
    this.cursor.row = Math.max(0, Math.min(row, this.config.rows - 1));
    this.cursor.col = Math.max(0, Math.min(col, this.config.cols - 1));
    this.wrapNext = false;
  }

  /** Move cursor relative */
  cursorUp(n = 1): void { this.cursor.row = Math.max(0, this.cursor.row - n); this.wrapNext = false; }
  cursorDown(n = 1): void { this.cursor.row = Math.min(this.config.rows - 1, this.cursor.row + n); this.wrapNext = false; }
  cursorForward(n = 1): void { this.cursor.col = Math.min(this.config.cols - 1, this.cursor.col + n); this.wrapNext = false; }
  cursorBack(n = 1): void { this.cursor.col = Math.max(0, this.cursor.col - n); this.wrapNext = false; }

  /** Save/restore cursor position */
  saveCursor(): void { this.savedCursor = { row: this.cursor.row, col: this.cursor.col, savedRow: this.cursor.savedRow, savedCol: this.cursor.savedCol, visible: this.cursor.visible }; }
  restoreCursor(): void { if (this.savedCursor) Object.assign(this.cursor, this.savedCursor); }
  private savedCursor: CursorState | null = null;

  /** Tab forward/backward */
  tabForward(n = 1): void {
    for (let i = 0; i < n; i++) {
      let nextTab = this.config.cols;
      for (const ts of this.tabStops) { if (ts > this.cursor.col) { nextTab = ts; break; } }
      this.cursor.col = nextTab;
      if (this.cursor.col >= this.config.cols) { this.cursor.col = this.config.cols - 1; this.wrapNext = true; }
    }
  }
  tabBackward(n = 1): void {
    for (let i = 0; i < n; i++) {
      let prevTab = 0;
      for (const ts of this.tabStops) { if (ts < this.cursor.col) prevTab = ts; }
      this.cursor.col = prevTab;
    }
  }

  /** Set tab stop at current column */
  setTabStop(): void { this.tabStops.add(this.cursor.col); }
  clearTabStop(mode = 0): void {
    if (mode === 0) this.tabStops.delete(this.cursor.col);
    else if (mode === 3) this.tabStops.clear();
  }

  /** Switch to alternate screen buffer */
  useAltScreen(use: boolean): void {
    if (use && !this.altLines) this.altLines = this.createEmptyBuffer();
    this.usingAltScreen = use;
    if (!use) this.cursor.row = 0; this.cursor.col = 0;
  }

  /** Set SGR (Select Graphic Rendition) attributes */
  setSGR(params: number[]): void {
    let i = 0;
    while (i < params.length) {
      const p = params[i++];
      switch (p) {
        case 0: this.resetAttrs(); break;
        case 1: this.bold = true; break;
        case 2: this.dim = true; break;
        case 3: this.italic = true; break;
        case 4: this.underline = true; break;
        case 5: this.blinkSlow = true; break;
        case 6: this.blinkFast = true; break;
        case 7: this.inverse = true; break;
        case 8: this.hidden = true; break;
        case 9: this.strikethrough = true; break;
        case 22: this.bold = false; this.dim = false; break;
        case 23: this.italic = false; break;
        case 24: this.underline = false; break;
        case 25: this.blinkSlow = false; this.blinkFast = false; break;
        case 27: this.inverse = false; break;
        case 28: this.hidden = false; break;
        case 29: this.strikethrough = false; break;
        case 30: case 31: case 32: case 33: case 34: case 35: case 36: case 37:
          this.currentFg = p - 30; break;
        case 38:
          // Extended foreground color
          if (params[i] === 2) { i++; const r = params[i++] ?? 0; const g = params[i++] ?? 0; const b = params[i++] ?? 0; this.currentFg = packRgb(r, g, b); }
          else if (params[i] === 5) { i++; this.currentFg = params[i++] ?? -1; }
          break;
        case 39: this.currentFg = -1; break;
        case 40: case 41: case 42: case 43: case 44: case 45: case 46: case 47:
          this.currentBg = p - 40; break;
        case 48:
          if (params[i] === 2) { i++; const r = params[i++] ?? 0; const g = params[i++] ?? 0; const b = params[i++] ?? 0; this.currentBg = packRgb(r, g, b); }
          else if (params[i] === 5) { i++; this.currentBg = params[i++] ?? -1; }
          break;
        case 49: this.currentBg = -1; break;
        case 90: case 91: case 92: case 93: case 94: case 95: case 96: case 97:
          this.currentFg = p - 90 + 8; break;
        case 100: case 101: case 102: case 103: case 104: case 105: case 106: case 107:
          this.currentBg = p - 100 + 8; break;
      }
    }
  }
  private blinkSlow = false;
  private blinkFast = false;

  private resetAttrs(): void {
    this.currentFg = -1; this.currentBg = -1;
    this.bold = false; this.dim = false; this.italic = false;
    this.underline = false; this.strikethrough = false;
    this.inverse = false; this.hidden = false;
    this.blinkSlow = false; this.blinkFast = false;
  }

  /** Get scrollback buffer contents */
  getScrollback(): Cell[][] { return [...this.scrollback]; }

  /** Clear entire buffer */
  reset(): void {
    this.lines = this.createEmptyBuffer();
    this.scrollback = [];
    this.cursor = { row: 0, col: 0, savedRow: 0, savedCol: 0, visible: true };
    this.resetAttrs();
    this.wrapNext = false;
    this.insertMode = false;
    this.originMode = false;
  }

  /** Resize terminal */
  resize(rows: number, cols: number): void {
    this.config.rows = rows;
    this.config.cols = cols;
    // Adjust existing content
    for (const line of this.lines) {
      while (line.length < cols) line.push(this.emptyCell());
      if (line.length > cols) line.length = cols;
    }
    while (this.lines.length < rows) this.lines.push(this.createEmptyLine());
    if (this.lines.length > rows) this.lines.length = rows;
    // Clamp cursor
    this.cursor.row = Math.min(this.cursor.row, rows - 1);
    this.cursor.col = Math.min(this.cursor.col, cols - 1);
  }

  // --- Internal ---

  private createEmptyBuffer(): Cell[][] {
    return Array.from({ length: this.config.rows }, () => this.createEmptyLine());
  }

  private createEmptyLine(): Cell[] {
    return Array.from({ length: this.config.cols }, () => this.emptyCell());
  }

  private emptyCell(): Cell {
    return { char: " ", fg: -1, bg: -1, bold: false, dim: false, italic: false, underline: false, strikethrough: false, inverse: false, hidden: false, width: 1 };
  }
}

function isWideChar(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return (code >= 0x1100 && (code <= 0x115f || code === 0x2329 || code === 0x232a ||
    (code >= 0x2e80 && code <= 0x303e) || (code >= 0x3400 && code <= 0x4db5) ||
    (code >= 0x4e00 && code <= 0x9fff) || (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe30 && code <= 0xfe4f) || (code >= 0xff00 && code <= 0xff60)));
}

function packRgb(r: number, g: number, b: number): number {
  return 0x1000000 + (r << 16) + (g << 8) + b;
}

/** Unpack RGB from packed value */
export function unpackRgb(color: number): { r: number; g: number; b: number } | null {
  if (color < 0x1000000) return null;
  return { r: (color >> 16) & 0xff, g: (color >> 8) & 0xff, b: color & 0xff };
}

/** Resolve color index to hex string using theme */
export function resolveColor(color: number, theme: TerminalTheme, isFg = true): string {
  if (color < 0) return isFg ? theme.foreground : theme.background;
  if (color < 16) {
    const colors = [
      theme.black, theme.red, theme.green, theme.yellow, theme.blue, theme.magenta, theme.cyan, theme.white,
      theme.brightBlack, theme.brightRed, theme.brightGreen, theme.brightYellow,
      theme.brightBlue, theme.brightMagenta, theme.brightCyan, theme.brightWhite,
    ];
    return colors[color] ?? "#ffffff";
  }
  if (color < 256) {
    // 216-color cube + 24 grayscale
    if (color < 216) {
      const nr = (color / 36) % 6; const ng = (color / 6) % 6; const nb = color % 6;
      const r = nr === 0 ? 0 : nr * 40 + 55;
      const g = ng === 0 ? 0 : ng * 40 + 55;
      const b = nb === 0 ? 0 : nb * 40 + 55;
      return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    }
    const gray = (color - 216) * 10 + 8;
    const v = gray.toString(16).padStart(2, "0");
    return `#${v}${v}${v}`;
  }
  const rgb = unpackRgb(color);
  return rgb ? `#${rgb.r.toString(16).padStart(2, "0")}${rgb.g.toString(16).padStart(2, "0")}${rgb.b.toString(16).padStart(2, "0")}` : "#ffffff";
}

// --- Terminal Emulator (combines parser + buffer) ---

export class TerminalEmulator {
  buffer: TerminalBuffer;
  parser: AnsiParser;
  private onDataListeners = new Set<(data: string) => void>();
  private onTitleListeners = new Set<(title: string) => void>();
  private onBellListeners = new Set<() => void>();
  private onResizeListeners = new Set<(rows: number, cols: number) => void>();
  private title = "";

  constructor(config: TerminalConfig) {
    this.buffer = new TerminalBuffer(config);
    this.parser = new AnsiParser();
    this.setupDefaultHandlers();
  }

  /** Write data to terminal (parses ANSI sequences) */
  write(data: string): void {
    this.parser.parse(data);
  }

  /** Resize terminal */
  resize(rows: number, cols: number): void {
    this.buffer.resize(rows, cols);
    this.onResizeListeners.forEach((l) => l(rows, cols));
  }

  /** Get rendered HTML for display */
  renderHtml(): string {
    const lines = this.buffer.activeLines;
    const html: string[] = [];
    for (let r = 0; r < lines.length; r++) {
      let lineHtml = '<span class="terminal-line">';
      let currentStyle = "";
      for (let c = 0; c < lines[r].length; c++) {
        const cell = lines[r][c];
        if (cell.width === 0) continue; // Skip continuation of wide char
        const style = this.cellStyle(cell);
        if (style !== currentStyle) {
          if (currentStyle) lineHtml += "</span>";
          lineHtml += `<span style="${style}">`;
          currentStyle = style;
        }
        lineHtml += escapeHtml(cell.char);
      }
      if (currentStyle) lineHtml += "</span>";
      lineHtml += "</span>";
      html.push(lineHtml);
    }
    return html.join("\n");
  }

  /** Render to canvas for better performance */
  renderToCanvas(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext("2d")!;
    const cw = this.buffer.config.fontSize ?? 14;
    const ch = Math.round(cw * 1.8);
    canvas.width = this.buffer.cols * cw * 2; // HiDPI
    canvas.height = this.buffer.rows * ch * 2;
    canvas.style.width = `${this.buffer.cols * cw}px`;
    canvas.style.height = `${this.buffer.rows * ch}px`;
    ctx.scale(2, 2);
    ctx.font = `${cw}px ${this.buffer.config.fontFamily ?? "monospace"}`;
    ctx.textBaseline = "top";

    const lines = this.buffer.activeLines;
    for (let r = 0; r < lines.length; r++) {
      for (let c = 0; c < lines[r].length; c++) {
        const cell = lines[r][c];
        if (cell.char === " " && cell.fg < 0 && cell.bg < 0) continue;
        // Background
        if (cell.bg >= 0 || cell.inverse) {
          ctx.fillStyle = resolveColor(cell.inverse ? cell.fg : cell.bg, this.buffer.theme, false);
          ctx.fillRect(c * cw, r * ch, cw, ch);
        }
        // Foreground
        if (cell.char !== " ") {
          ctx.fillStyle = resolveColor(cell.inverse ? cell.bg : cell.fg, this.buffer.theme, true);
          if (cell.bold) ctx.font = `bold ${cw}px ${this.buffer.config.fontFamily ?? "monospace"}`;
          if (cell.italic) ctx.font = `italic ${cw}px ${this.buffer.config.fontFamily ?? "monospace"}`;
          ctx.fillText(cell.char, c * cw, r * ch);
          ctx.font = `${cw}px ${this.buffer.config.fontFamily ?? "monospace"}`;
        }
      }
    }

    // Draw cursor
    if (this.buffer.cursor.visible) {
      ctx.fillStyle = this.buffer.theme.cursor;
      const cx = this.buffer.cursor.col * cw;
      const cy = this.buffer.cursor.row * ch;
      const cs = this.buffer.config.cursorStyle ?? "block";
      if (cs === "block") ctx.fillRect(cx, cy, cw, ch);
      else if (cs === "underline") ctx.fillRect(cx, cy + ch - 2, cw, 2);
      else ctx.fillRect(cx, cy, 2, ch);
    }
  }

  // --- Event listeners ---

  onData(listener: (data: string) => void): () => void { this.onDataListeners.add(listener); return () => this.onDataListeners.delete(listener); }
  onTitle(listener: (title: string) => void): () => void { this.onTitleListeners.add(listener); return () => this.onTitleListeners.delete(listener); }
  onBell(listener: () => void): () => void { this.onBellListeners.add(listener); return () => this.onBellListeners.delete(listener); }
  onResize(listener: (rows: number, cols: number) => void): () => void { this.onResizeListeners.add(listener); return () => this.onResizeListeners.delete(listener); }

  // --- Internal setup ---

  private setupDefaultHandlers(): void {
    const buf = this.buffer;

    this.parser.on("PRINT", ([ch]) => buf.writeChar(ch));
    this.parser.on("LF", () => buf.lineFeed());
    this.parser.on("CR", () => { buf.cursor.col = 0; buf.wrapNext = false; });
    this.parser.on("TAB", () => buf.tabForward(1));
    this.parser.on("BEL", () => this.onBellListeners.forEach((l) => l()));
    this.parser.on("BS", () => buf.cursorBack(1));

    // CSI sequences
    this.parser.on("A", (p) => buf.cursorUp(parseInt(p[0]) || 1));
    this.parser.on("B", (p) => buf.cursorDown(parseInt(p[0]) || 1));
    this.parser.on("C", (p) => buf.cursorForward(parseInt(p[0]) || 1));
    this.parser.on("D", (p) => buf.cursorBack(parseInt(p[0]) || 1));
    this.parser.on("H", (p) => { const row = parseInt(p[0]) || 1; const col = parseInt(p[1]) || 1; buf.moveCursor(row - 1, col - 1); });
    this.parser.on("f", (p) => { const row = parseInt(p[0]) || 1; const col = parseInt(p[1]) || 1; buf.moveCursor(row - 1, col - 1); });
    this.parser.on("J", (p) => buf.eraseDisplay(parseInt(p[0]) || 0));
    this.parser.on("K", (p) => buf.eraseLine(parseInt(p[0]) || 0));
    this.parser.on("L", (p) => buf.insertLines(parseInt(p[0]) || 1));
    this.parser.on("M", (p) => buf.deleteLines(parseInt(p[0]) || 1));
    this.parser.on("@", (p) => buf.insertChars(parseInt(p[0]) || 1));
    this.parser.on("P", (p) => buf.deleteChars(parseInt(p[0]) || 1));
    this.parser.on("G", (p) => { buf.cursor.col = (parseInt(p[0]) || 1) - 1; buf.wrapNext = false; });
    this.parser.on("d", (p) => { buf.cursor.row = (parseInt(p[0]) || 1) - 1; });
    this.parser.on("m", (p) => buf.setSGR(p.map((v) => parseInt(v))));
    this.parser.on("s", () => buf.saveCursor());
    this.parser.on("u", () => buf.restoreCursor());
    this.parser.on("l", (p) => { if (p[0] === "?25") buf.cursor.visible = false; });
    this.parser.on("h", (p) => { if (p[0] === "?25") buf.cursor.visible = true; if (p[0] === "?1049") buf.useAltScreen(true); });
    this.parser.on("?1049l", () => buf.useAltScreen(false));

    // OSC sequences
    this.parser.on("OSC_0", (_p, d) => { this.title = d; this.onTitleListeners.forEach((l) => l(d)); });
    this.parser.on("OSC_1", (_p, d) => { this.title = d; this.onTitleListeners.forEach((l) => l(d)); });
    this.parser.on("OSC_2", (_p, d) => { this.title = d; this.onTitleListeners.forEach((l) => l(d)); });

    // ESC sequences
    this.parser.on("DECSC", () => buf.saveCursor());
    this.parser.on("DECRC", () => buf.restoreCursor());
    this.parser.on("IND", () => buf.lineFeed());
    this.parser.on("RI", () => { if (buf.cursor.row === 0) buf.scrollDown(1); else buf.cursor.row--; });
    this.parser.on("NEL", () => { buf.cursor.col = 0; buf.lineFeed(); });
  }

  private cellStyle(cell: Cell): string {
    const parts: string[] = [];
    if (cell.bold) parts.push("font-weight:bold");
    if (cell.italic) parts.push("font-style:italic");
    if (cell.underline) parts.push("text-decoration:underline");
    if (cell.strikethrough) parts.push("text-decoration:line-through");
    const fg = resolveColor(cell.fg, this.buffer.theme, true);
    const bg = resolveColor(cell.bg, this.buffer.theme, false);
    if (fg !== this.buffer.theme.foreground) parts.push(`color:${fg}`);
    if (bg !== this.buffer.theme.background) parts.push(`background-color:${bg}`);
    return parts.join(";");
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
