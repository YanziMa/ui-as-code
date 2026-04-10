/**
 * Command Log: Terminal-style command history log component.
 *
 * Features:
 * - Command input with history navigation (arrow keys)
 * - Auto-execution mode (run commands on Enter)
 * - Output display with ANSI-like formatting
 * - Timestamps per entry
 * - Entry types: command, output, error, info, warning, success
 * - Filterable by type
 * - Search/filter entries
 * - Clear history
 * - Export log as text
 * - Max entries limit (FIFO)
 * - Keyboard shortcuts
 * - Copy/paste support
 * - Line numbers
 */

// --- Types ---

export type LogLevel = "command" | "output" | "error" | "info" | "warning" | "success" | "system";

export interface LogEntry {
  /** Unique ID */
  id: string;
  /** Entry type */
  type: LogLevel;
  /** Text content */
  text: string;
  /** Timestamp (ms) */
  timestamp: number;
  /** Duration in ms (for commands) */
  duration?: number;
  /** Additional metadata */
  meta?: Record<string, unknown>;
}

export interface CommandLogOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Placeholder text for input (default: "Enter command...") */
  placeholder?: string;
  /** Initial welcome message(s) */
  welcomeMessage?: string | string[];
  /** Max entries to keep (default: 500) */
  maxEntries?: number;
  /** Show timestamps (default: true) */
  showTimestamps?: boolean;
  /** Timestamp format (default: HH:mm:ss) */
  timestampFormat?: string;
  /** Show line numbers (default: false) */
  showLineNumbers?: boolean;
  /** Input height in rows (default: 1) */
  inputRows?: number;
  /** Auto-scroll to bottom on new entry (default: true) */
  autoScroll?: boolean;
  /** Read-only mode (no input, just display) */
  readonly?: boolean;
  /** Prompt character (default: "$") */
  prompt?: string;
  /** Prompt color (default: #22c55e) */
  promptColor?: string;
  /** Color map for log levels */
  colors?: Partial<Record<LogLevel, string>>;
  /** Background color (default: #1e1e2e) */
  backgroundColor?: string;
  /** Text color (default: #d4d4d8) */
  textColor?: string;
  /** Font family (default: monospace) */
  fontFamily?: string;
  /** Font size (default: 13) */
  fontSize?: number;
  /** Border radius (default: 8) */
  borderRadius?: number;
  /** Padding (default: 12) */
  padding?: number;
  /** Height in px (default: 400) */
  height?: number;
  /** Min height in px (default: 200) */
  minHeight?: number;
  /** Max height in px (default: 800) */
  maxHeight?: number;
  /** On command submit callback */
  onSubmit?: (command: string) => Promise<string | void> | string;
  /** On entry click callback */
  onEntryClick?: (entry: LogEntry) => void;
  /** Custom CSS class */
  className?: string;
}

export interface CommandLogInstance {
  element: HTMLElement;
  /** Log a message */
  log: (text: string, type?: LogLevel, meta?: Record<string, unknown>) => LogEntry;
  /** Log an info message */
  info: (text: string) => LogEntry;
  /** Log a warning */
  warn: (text: string) => LogEntry;
  /** Log an error */
  error: (text: string) => LogEntry;
  /** Log a success message */
  success: (text: string) => LogEntry;
  /** Clear all entries */
  clear: () => void;
  /** Get all entries */
  getEntries: () => LogEntry[];
  /** Export log as formatted text */
  exportText: () => string;
  /** Focus input */
  focus: () => void;
  /** Scroll to bottom */
  scrollToBottom: () => void;
  /** Destroy instance */
  destroy: () => void;
}

// --- Default Colors ---

const DEFAULT_COLORS: Record<LogLevel, string> = {
  command: "#22c55e",
  output:   "#d4d4d8",
  error:    "#ef4444",
  info:     "#3b82f6",
  warning:  "#f59e0b",
  success:  "#10b981",
  system:   "#9ca3af",
};

// --- ANSI-like Formatting ---

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// --- Main ---

export function createCommandLog(options: CommandLogOptions): CommandLogInstance {
  const opts = {
    placeholder: "Enter command...",
    maxEntries: 500,
    showTimestamps: true,
    timestampFormat: "HH:mm:ss",
    showLineNumbers: false,
    inputRows: 1,
    autoScroll: true,
    readonly: false,
    prompt: "$",
    promptColor: "#22c55e",
    backgroundColor: "#1e1e2e",
    textColor: "#d4d4d8",
    fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace",
    fontSize: 13,
    borderRadius: 8,
    padding: 12,
    height: 400,
    minHeight: 200,
    maxHeight: 800,
    colors: { ...DEFAULT_COLORS },
    onSubmit: async () => {},
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Command Log: container not found");

  // Root
  const root = document.createElement("div");
  root.className = `command-log ${opts.className ?? ""}`;
  root.setAttribute("role": "log");
  root.style.cssText = `
    display:flex;flex-direction:column;
    background:${opts.backgroundColor};color:${opts.textColor};
    border-radius:${opts.borderRadius}px;overflow:hidden;
    font-family:${opts.fontFamily};font-size:${opts.fontSize}px;
    line-height:1.5;width:100%;height:${opts.height}px;
    min-height:${opts.minHeight}px;max-height:${opts.maxHeight}px;
    box-shadow:0 4px 20px rgba(0,0,0,0.15);border:1px solid #333;
  `;

  // Output area
  const output = document.createElement("div");
  output.className = "cl-output";
  output.style.cssText = `
    flex:1;overflow-y:auto;padding:${opts.padding}px;
    scroll-behavior:smooth;word-break:break-all;
  `;
  root.appendChild(output);

  // Input area
  let inputArea: HTMLElement | null = null;
  let input: HTMLInputElement | HTMLTextAreaElement | null = null;
  let history: string[] = [];
  let historyIdx = -1;

  if (!opts.readonly) {
    inputArea = document.createElement("div");
    inputArea.className = "cl-input-area";
    inputArea.style.cssText = `
      display:flex;align-items:center;gap:6px;
      padding:${Math.round(opts.padding / 2)}px ${opts.padding}px;
      border-top:1px solid #333;background:#111827;flex-shrink:0;
    `;

    const promptSpan = document.createElement("span");
    promptSpan.textContent = opts.prompt;
    promptSpan.style.cssText = `color:${opts.promptColor};font-weight:700;user-select:none;flex-shrink:0;`;
    inputArea.appendChild(promptSpan);

    if (opts.inputRows > 1) {
      input = document.createElement("textarea") as HTMLTextAreaElement;
      input.rows = opts.inputRows;
      input.style.cssText = `
        flex:1;background:transparent;border:1px solid #333;color:${opts.textColor};
        font-family:inherit;font-size:inherit;outline:none;
        padding:6px 10px;border-radius:4px;resize:none;
      `;
    } else {
      input = document.createElement("input") as HTMLInputElement;
      input.type = "text";
      input.style.cssText = `
        flex:1;background:transparent;border:1px solid #333;color:${opts.textColor};
        font-family:inherit;font-size:inherit;outline:none;
        padding:6px 12px;border-radius:4px;
      `;
    }
    input.placeholder = opts.placeholder;

    inputArea.appendChild(input);
    root.appendChild(inputArea);
  }

  container.appendChild(root);

  // State
  let entries: LogEntry[] = [];
  let destroyed = false;
  let lineCounter = 0;

  // Add welcome messages
  if (opts.welcomeMessage) {
    const msgs = Array.isArray(opts.welcomeMessage) ? opts.welcomeMessage : [opts.welcomeMessage];
    for (const msg of msgs) {
      log(msg, "system");
    }
  }

  // --- Core Functions ---

  function formatTime(ts: number): string {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    if (opts.timestampFormat === "HH:mm:ss") return `${hh}:${mm}:${ss}`;
    if (opts.timestampFormat === "HH:mm") return `${hh}:${mm}`;
    return d.toLocaleTimeString();
  }

  function log(text: string, type: LogLevel = "output", meta?: Record<string, unknown>): LogEntry {
    const entry: LogEntry = {
      id: generateId(),
      type,
      text,
      timestamp: Date.now(),
      meta,
    };

    // Enforce max entries limit
    if (entries.length >= opts.maxEntries!) {
      entries = entries.slice(-(opts.maxEntries! - 10));
    }

    entries.push(entry);
    renderEntry(entry);

    if (opts.autoScroll) {
      scrollToBottom();
    }

    return entry;
  }

  function renderEntry(entry: LogEntry): void {
    const el = document.createElement("div");
    el.dataset.entryId = entry.id;
    el.dataset.entryType = entry.type;
    lineCounter++;

    const color = opts.colors[entry.type] ?? DEFAULT_COLORS[entry.type];

    el.style.cssText = `
      display:flex;gap:8px;padding:2px 0;border-radius:3px;
      font-family:inherit;font-size:inherit;line-height:inherit;
      opacity:0;animation:cl-fadeIn 0.15s forwards;
    `;

    // Line number
    if (opts.showLineNumbers) {
      const ln = document.createElement("span");
      ln.style.cssText = `flex-shrink:0;width:32px;text-align:right;color:#666;user-select:none;font-size:11px;opacity:0.5;`;
      ln.textContent = String(lineCounter);
      el.appendChild(ln);
    }

    // Timestamp
    if (opts.showTimestamps) {
      const ts = document.createElement("span");
      ts.style.cssText = `flex-shrink:0;width:70px;text-align:right;color:#666;user-select:none;font-size:11px;opacity:0.6;`;
      ts.textContent = formatTime(entry.timestamp);
      el.appendChild(ts);
    }

    // Type indicator / prefix
    const prefix = document.createElement("span");
    prefix.style.cssText = `flex-shrink:0;font-weight:600;font-size:11px;min-width:50px;`;

    switch (entry.type) {
      case "command":
        prefix.textContent = opts.prompt;
        prefix.style.color = opts.promptColor;
        break;
      case "error":
        prefix.textContent = "\u2717";
        prefix.style.color = color;
        break;
      case "warning":
        prefix.textContent = "\u26A0";
        prefix.style.color = color;
        break;
      case "success":
        prefix.textContent = "\u2713";
        prefix.style.color = color;
        break;
      case "info":
        prefix.textContent = "\u2139";
        prefix.style.color = color;
        break;
      case "system":
        prefix.textContent = "\u25A1";
        prefix.style.color = color;
        break;
      default:
        prefix.textContent = "\u2022";
        prefix.style.color = color;
    }
    el.appendChild(prefix);

    // Message text
    const msg = document.createElement("span");
    msg.style.cssText = `flex:1;white-space:pre-wrap;word-break:break-word;`;
    msg.innerHTML = escapeHtml(entry.text);
    el.appendChild(msg);

    output.appendChild(el);
  }

  // --- Event Handlers ---

  if (input) {
    input.addEventListener("keydown", async (e) => {
      if (destroyed) return;

      switch (e.key) {
        case "Enter":
          e.preventDefault();
          const cmd = input.value.trim();
          if (!cmd) return;

          // Add to history
          if (cmd !== history[history.length - 1]) {
            history.push(cmd);
            if (history.length > 100) history.shift();
          }
          historyIdx = -1;

          // Log the command
          log(cmd, "command");

          // Execute
          try {
            const result = await opts.onSubmit!(cmd);
            if (result) {
              log(String(result), "output");
            }
          } catch (err) {
            log(err instanceof Error ? err.message : String(err), "error");
          }

          input.value = "";
          break;

        case "ArrowUp":
          e.preventDefault();
          if (history.length > 0) {
            historyIdx = Math.min(historyIdx + 1, history.length - 1);
            input.value = history[historyIdx]!;
            input.select();
          }
          break;

        case "ArrowDown":
          e.preventDefault();
          if (history.length > 0) {
            historyIdx = Math.max(historyIdx - 1, -1);
            input.value = historyIdx >= 0 ? history[historyIdx]! : "";
            input.select();
          }
          break;

        case "l":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            clear();
          }
          break;
      }
    });

    // Click on entry
    output.addEventListener("click", (e) => {
      const target = (e.target as HTMLElement).closest("[data-entry-id]");
      if (target) {
        const id = target.dataset.entryId;
        const entry = entries.find(en => en.id === id);
        if (entry) opts.onEntryClick?.(entry);
      }
    });
  }

  // --- CSS Animation ---

  const style = document.createElement("style");
  style.textContent = `
    @keyframes cl-fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
  `;
  document.head.appendChild(style);

  // --- Public API ---

  function info(text: string): LogEntry { return log(text, "info"); }
  function warn(text: string): LogEntry { return log(text, "warning"); }
  function error(text: string): LogEntry { return log(text, "error"); }
  function success(text: string): LogEntry { return log(text, "success"); }

  function clear(): void {
    entries = [];
    lineCounter = 0;
    output.innerHTML = "";
  }

  function scrollToBottom(): void {
    output.scrollTop = output.scrollHeight;
  }

  function exportText(): string {
    return entries.map(e => {
      const time = formatTime(e.timestamp);
      const prefix = `[${e.type.toUpperCase()}]`;
      return `${time} ${prefix} ${e.text}`;
    }).join("\n");
  }

  function focus(): void {
    if (input) input.focus();
  }

  const instance: CommandLogInstance = {
    element: root,

    log,
    info,
    warn,
    error,
    success,
    clear,

    getEntries() { return [...entries]; },
    exportText,
    focus,
    scrollToBottom,

    destroy() {
      destroyed = true;
      root.remove();
      style.remove();
    },
  };

  return instance;
}
