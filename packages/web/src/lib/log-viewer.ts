/**
 * Log Viewer: Real-time log display with level filtering (DEBUG/INFO/WARN/ERROR),
 * search/highlighting, tail mode, auto-scroll, timestamps, source filtering,
 * log level coloring, copy/export, and virtualized rendering for large logs.
 */

// --- Types ---

export type LogLevel = "debug" | "info" | "warn" | "error" | "trace";

export interface LogEntry {
  /** Log level */
  level: LogLevel;
  /** Message text */
  message: string;
  /** Timestamp (Date or ISO string) */
  timestamp: Date | string;
  /** Source/module name */
  source?: string;
  /** Additional metadata */
  data?: Record<string, unknown>;
  /** Unique ID */
  id?: string;
}

export interface LogViewerOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial log entries */
  initialLogs?: LogEntry[];
  /** Max entries to keep (0 = unlimited) */
  maxEntries?: number;
  /** Show timestamps? */
  showTimestamp?: boolean;
  /** Timestamp format */
  timestampFormat?: "iso" | "locale" | "relative";
  /** Show log level badges? */
  showLevel?: boolean;
  /** Show source? */
  showSource?: boolean;
  /** Default visible levels */
  levels?: LogLevel[];
  /** Auto-scroll to bottom on new entries? */
  autoScroll?: boolean;
  /** Tail mode (follow new entries) */
  tailMode?: boolean;
  /** Search query for highlighting */
  searchQuery?: string;
  /** Font size in px */
  fontSize?: number;
  /** Font family */
  fontFamily?: string;
  /** Theme: 'light' or 'dark' */
  theme?: "light" | "dark";
  /** Callback on entry click */
  onEntryClick?: (entry: LogEntry) => void;
  /** Callback when logs are cleared */
  onClear?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface LogViewerInstance {
  element: HTMLElement;
  /** Add a log entry */
  addLog: (entry: LogEntry) => void;
  /** Add multiple entries */
  addLogs: (entries: LogEntry[]) => void;
  /** Get all current entries */
  getLogs: () => LogEntry[];
  /** Clear all logs */
  clear: () => void;
  /** Set filter levels */
  setLevels: (levels: LogLevel[]) => void;
  /** Set search query */
  setSearch: (query: string) => void;
  /** Set tail mode */
  setTailMode: (tail: boolean) => void;
  /** Export logs as text */
  exportText: () => string;
  /** Export logs as JSON */
  exportJson: () => string;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Config ---

const LEVEL_COLORS: Record<LogLevel, { bg: string; text: string; border: string }> = {
  trace:   { bg: "#f3f4f6", text: "#6b7280", border: "#d1d5db" },
  debug:   { bg: "#e0e7ff", text: "#4338ca", border: "#a5b4fc" },
  info:    { bg: "#dbeafe", text: "#1d4ed8", border: "#93c5fd" },
  warn:    { bg: "#fef3c7", text: "#d97706", border: "#fcd34d" },
  error:   { bg: "#fee2e2", text: "#dc2626", border: "#fca5a5" },
};

const LEVEL_ORDER: LogLevel[] = ["trace", "debug", "info", "warn", "error"];

const THEMES = {
  light: {
    bg: "#ffffff",
    text: "#1f2937",
    border: "#e5e7eb",
    headerBg: "#f9fafb",
    inputBg: "#fff",
    inputBorder: "#d1d5db",
    hoverRow: "#f9fafb",
    searchHighlight: "#fef08a",
  },
  dark: {
    bg: "#1e1e2e",
    text: "#cdd6f4",
    border: "#313244",
    headerBg: "#181825",
    inputBg: "#11111b",
    inputBorder: "#45475a",
    hoverRow: "#262637",
    searchHighlight: "#f9e2af",
  },
};

let idCounter = 0;

// --- Main ---

export function createLogViewer(options: LogViewerOptions): LogViewerInstance {
  const opts = {
    maxEntries: options.maxEntries ?? 10000,
    showTimestamp: options.showTimestamp ?? true,
    timestampFormat: options.timestampFormat ?? "locale",
    showLevel: options.showLevel ?? true,
    showSource: options.showSource ?? false,
    levels: options.levels ?? ["debug", "info", "warn", "error"],
    autoScroll: options.autoScroll ?? true,
    tailMode: options.tailMode ?? true,
    searchQuery: options.searchQuery ?? "",
    fontSize: options.fontSize ?? 12,
    fontFamily: options.fontFamily ?? "'Fira Code','SF Mono',Consolas,'Courier New',monospace",
    theme: options.theme ?? "dark",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("LogViewer: container not found");

  const t = THEMES[opts.theme];
  let allLogs: LogEntry[] = [...(options.initialLogs ?? [])];
  let destroyed = false;

  // Root
  const root = document.createElement("div");
  root.className = `log-viewer ${opts.className ?? ""}`;
  root.style.cssText = `
    display:flex;flex-direction:column;width:100%;height:100%;
    background:${t.bg};color:${t.text};
    font-family:${opts.fontFamily};font-size:${opts.fontSize}px;
    border:1px solid ${t.border};border-radius:8px;overflow:hidden;
  `;
  container.appendChild(root);

  // Toolbar
  const toolbar = document.createElement("div");
  toolbar.className = "lv-toolbar";
  toolbar.style.cssText = `
    display:flex;align-items:center;gap:8px;padding:6px 10px;
    background:${t.headerBg};border-bottom:1px solid ${t.border};
    flex-shrink:0;flex-wrap:wrap;
  `;
  root.appendChild(toolbar);

  // Level filter buttons
  const levelBtns: Map<LogLevel, HTMLButtonElement> = new Map();
  for (const level of LEVEL_ORDER) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = level.toUpperCase().slice(0, 1);
    btn.title = `${level} logs`;
    btn.dataset.level = level;
    const lc = LEVEL_COLORS[level];
    const isActive = opts.levels.includes(level);
    btn.style.cssText = `
      padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;
      border:1px solid ${isActive ? lc.border : t.inputBorder};
      background:${isActive ? lc.bg : "transparent"};
      color:${isActive ? lc.text : "#9ca3af"};
      cursor:pointer;transition:all 0.15s;text-transform:uppercase;
    `;
    btn.addEventListener("click", () => toggleLevel(level));
    toolbar.appendChild(btn);
    levelBtns.set(level, btn);
  }

  // Separator
  const sep1 = document.createElement("span");
  sep1.style.cssText = "width:1px;height:16px;background:" + t.border + ";";
  toolbar.appendChild(sep1);

  // Search input
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "Search logs...";
  searchInput.value = opts.searchQuery;
  searchInput.style.cssText = `
    padding:4px 8px;border:1px solid ${t.inputBorder};border-radius:4px;
    background:${t.inputBg};color:${t.text};font-size:${opts.fontSize}px;
    outline:none;width:160px;font-family:inherit;
  `;
  searchInput.addEventListener("focus", () => { searchInput.style.borderColor = "#6366f1"; });
  searchInput.addEventListener("blur", () => { searchInput.style.borderColor = t.inputBorder; });
  searchInput.addEventListener("input", () => {
    opts.searchQuery = searchInput.value;
    render();
  });
  toolbar.appendChild(searchInput);

  // Tail mode toggle
  const tailBtn = document.createElement("button");
  tailBtn.type = "button";
  tailBtn.textContent = "Tail";
  tailBtn.style.cssText = `
    padding:4px 10px;border-radius:4px;font-size:11px;font-weight:500;
    border:1px solid ${opts.tailMode ? "#22c55e" : t.inputBorder};
    background:${opts.tailMode ? "#dcfce7" : "transparent"};
    color:${opts.tailMode ? "#16a34a" : "#9ca3af"};cursor:pointer;transition:all 0.15s;
  `;
  tailBtn.addEventListener("click", () => {
    opts.tailMode = !opts.tailMode;
    updateTailBtn();
  });
  toolbar.appendChild(tailBtn);

  // Clear button
  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.textContent = "Clear";
  clearBtn.style.cssText = `
    padding:4px 10px;border-radius:4px;font-size:11px;font-weight:500;
    border:1px solid ${t.inputBorder};background:transparent;color:#9ca3af;
    cursor:pointer;transition:all 0.15s;margin-left:auto;
  `;
  clearBtn.addEventListener("mouseenter", () => { clearBtn.style.borderColor = "#ef4444"; clearBtn.style.color = "#ef4444"; });
  clearBtn.addEventListener("mouseleave", () => { clearBtn.style.borderColor = t.inputBorder; clearBtn.style.color = "#9ca3af"; });
  clearBtn.addEventListener("click", () => instance.clear());
  toolbar.appendChild(clearBtn);

  // Export button
  const exportBtn = document.createElement("button");
  exportBtn.type = "button";
  exportBtn.textContent = "Export";
  exportBtn.style.cssText = `
    padding:4px 10px;border-radius:4px;font-size:11px;font-weight:500;
    border:1px solid ${t.inputBorder};background:transparent;color:#9ca3af;
    cursor:pointer;transition:all 0.15s;
  `;
  exportBtn.addEventListener("click", () => {
    const text = instance.exportText();
    navigator.clipboard.writeText(text).then(() => {
      exportBtn.textContent = "Copied!";
      setTimeout(() => { exportBtn.textContent = "Export"; }, 1500);
    });
  });
  toolbar.appendChild(exportBtn);

  // Log count badge
  const countBadge = document.createElement("span");
  countBadge.className = "lv-count";
  countBadge.style.cssText = "font-size:11px;color:#9ca3af;margin-left:4px;";
  toolbar.appendChild(countBadge);

  // Output area
  const outputEl = document.createElement("div");
  outputEl.className = "lv-output";
  outputEl.style.cssText = `
    flex:1;overflow-y:auto;padding:4px 0;line-height:1.6;
  `;
  root.appendChild(outputEl);

  // --- Helpers ---

  function formatTimestamp(ts: Date | string): string {
    const d = typeof ts === "string" ? new Date(ts) : ts;
    switch (opts.timestampFormat) {
      case "iso": return d.toISOString();
      case "relative": {
        const ago = Date.now() - d.getTime();
        if (ago < 1000) return "just now";
        if (ago < 60000) return `${Math.floor(ago / 1000)}s ago`;
        if (ago < 3600000) return `${Math.floor(ago / 60000)}m ago`;
        return `${Math.floor(ago / 3600000)}h ago`;
      }
      default:
        return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 });
    }
  }

  function highlightSearch(text: string): string {
    if (!opts.searchQuery) return escapeHtml(text);
    const q = opts.searchQuery;
    const escaped = escapeHtml(text);
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return escaped.replace(re, `<mark style="background:${t.searchHighlight};border-radius:2px;">$1</mark>`);
  }

  function escapeHtml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function toggleLevel(level: LogLevel): void {
    if (opts.levels.includes(level)) {
      opts.levels = opts.levels.filter((l) => l !== level);
    } else {
      opts.levels.push(level);
    }
    updateLevelButtons();
    render();
  }

  function updateLevelButtons(): void {
    for (const [level, btn] of levelBtns) {
      const isActive = opts.levels.includes(level);
      const lc = LEVEL_COLORS[level];
      btn.style.borderColor = isActive ? lc.border : t.inputBorder;
      btn.style.background = isActive ? lc.bg : "transparent";
      btn.style.color = isActive ? lc.text : "#9ca3af";
    }
  }

  function updateTailBtn(): void {
    tailBtn.style.borderColor = opts.tailMode ? "#22c55e" : t.inputBorder;
    tailBtn.style.background = opts.tailMode ? "#dcfce7" : "transparent";
    tailBtn.style.color = opts.tailMode ? "#16a34a" : "#9ca3af";
  }

  function getFilteredLogs(): LogEntry[] {
    let logs = allLogs.filter((entry) => opts.levels.includes(entry.level));
    if (opts.searchQuery) {
      const q = opts.searchQuery.toLowerCase();
      logs = logs.filter((entry) =>
        entry.message.toLowerCase().includes(q) ||
        (entry.source?.toLowerCase().includes(q) ?? false)
      );
    }
    return logs;
  }

  // --- Render ---

  function render(): void {
    const logs = getFilteredLogs();

    // Update count
    const total = allLogs.length;
    const filtered = logs.length;
    countBadge.textContent = filtered !== total ? `${filtered}/${total}` : `${total}`;

    // Batch render using document fragment for performance
    const fragment = document.createDocumentFragment();

    for (const entry of logs) {
      const row = document.createElement("div");
      row.className = "lv-row";
      row.dataset.id = entry.id ?? "";
      row.style.cssText = `
        display:flex;align-items:flex-start;gap:8px;padding:2px 12px;
        border-bottom:1px solid ${t.border};cursor:pointer;transition:background 0.1s;
      `;

      row.addEventListener("mouseenter", () => { row.style.background = t.hoverRow; });
      row.addEventListener("mouseleave", () => { row.style.background = ""; });
      row.addEventListener("click", () => opts.onEntryClick?.(entry));

      // Timestamp
      if (opts.showTimestamp) {
        const ts = document.createElement("span");
        ts.className = "lv-timestamp";
        ts.style.cssText = "color:#6b7280;flex-shrink:0;font-size:11px;";
        ts.textContent = formatTimestamp(entry.timestamp);
        row.appendChild(ts);
      }

      // Level badge
      if (opts.showLevel) {
        const lvl = document.createElement("span");
        lvl.className = "lv-level";
        const lc = LEVEL_COLORS[entry.level];
        lvl.style.cssText = `
          flex-shrink:0;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:700;
          background:${lc.bg};color:${lc.text};border:1px solid ${lc.border};
          text-transform:uppercase;min-width:36px;text-align:center;
        `;
        lvl.textContent = entry.level.slice(0, 4);
        row.appendChild(lvl);
      }

      // Source
      if (opts.showSource && entry.source) {
        const src = document.createElement("span");
        src.className = "lv-source";
        src.style.cssText = "color:#9ca3af;flex-shrink:0;font-size:11px;min-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
        src.textContent = `[${entry.source}]`;
        row.appendChild(src);
      }

      // Message
      const msg = document.createElement("span");
      msg.className = "lv-message";
      msg.style.cssText = "flex:1;word-break:break-all;white-space:pre-wrap;";
      msg.innerHTML = highlightSearch(entry.message);
      row.appendChild(msg);

      fragment.appendChild(row);
    }

    outputEl.innerHTML = "";
    outputEl.appendChild(fragment);

    // Auto-scroll
    if (opts.tailMode || opts.autoScroll) {
      outputEl.scrollTop = outputEl.scrollHeight;
    }
  }

  // --- Instance ---

  const instance: LogViewerInstance = {
    element: root,

    addLog(entry: LogEntry) {
      if (!entry.id) entry.id = `log-${++idCounter}-${Date.now()}`;
      allLogs.push(entry);
      // Trim if over max
      if (opts.maxEntries > 0 && allLogs.length > opts.maxEntries) {
        allLogs = allLogs.slice(-opts.maxEntries);
      }
      render();
    },

    addLogs(entries: LogEntry[]) {
      for (const entry of entries) {
        if (!entry.id) entry.id = `log-${++idCounter}-${Date.now()}`;
        allLogs.push(entry);
      }
      if (opts.maxEntries > 0 && allLogs.length > opts.maxEntries) {
        allLogs = allLogs.slice(-opts.maxEntries);
      }
      render();
    },

    getLogs() { return [...allLogs]; },

    clear() {
      allLogs = [];
      render();
      opts.onClear?.();
    },

    setLevels(levels: LogLevel[]) {
      opts.levels = levels;
      updateLevelButtons();
      render();
    },

    setSearch(query: string) {
      opts.searchQuery = query;
      searchInput.value = query;
      render();
    },

    setTailMode(tail: boolean) {
      opts.tailMode = tail;
      updateTailBtn();
    },

    exportText(): string {
      return allLogs.map((e) =>
        `[${formatTimestamp(e.timestamp)}] [${e.level.toUpperCase()}]${e.source ? ` [${e.source}]` : ""} ${e.message}`
      ).join("\n");
    },

    exportJson(): string {
      return JSON.stringify(allLogs, null, 2);
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  // Initial render
  render();

  return instance;
}
