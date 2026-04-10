/**
 * Terminal Emulator: Web-based terminal with command history, tab completion,
 * ANSI escape sequence parsing, customizable prompt, themes, copy-on-select,
 * scrollback buffer, and plugin system for custom commands.
 */

// --- Types ---

export interface TerminalLine {
  /** Raw content (may contain ANSI codes) */
  content: string;
  /** Rendered HTML (ANSI stripped/converted) */
  html: string;
  /** Timestamp */
  timestamp: number;
  /** Line type */
  type: "input" | "output" | "error" | "system";
}

export interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  selectionBackground: string;
  selectionForeground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

export interface TerminalCommand {
  /** Command name */
  name: string;
  /** Description for help */
  description?: string;
  /** Usage string */
  usage?: string;
  /** Handler function */
  handler: (args: string[], terminal: TerminalInstance) => void | Promise<void>;
  /** Auto-complete suggestions */
  completions?: (partial: string) => string[];
}

export interface TerminalOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Welcome message(s) shown on init */
  welcomeMessage?: string | string[];
  /** Custom prompt string (supports variables like {cwd}) */
  prompt?: string;
  /** Initial working directory display */
  cwd?: string;
  /** Username display */
  user?: string;
  /** Hostname display */
  host?: string;
  /** Theme */
  theme?: Partial<TerminalTheme>;
  /** Font size in px (default: 13) */
  fontSize?: number;
  /** Font family */
  fontFamily?: string;
  /** Scrollback buffer size (lines) */
  scrollbackSize?: number;
  /** Max output lines before truncating */
  maxOutputLines?: number;
  /** Echo input? (default: true) */
  echoInput?: boolean;
  /** Enable command history (up/down arrows) */
  enableHistory?: boolean;
  /** Max history entries */
  maxHistory?: number;
  /** Enable tab completion */
  enableTabCompletion?: boolean;
  /** Blink cursor? */
  blinkCursor?: boolean;
  /** Show title bar? */
  showTitleBar?: boolean;
  /** Title bar text */
  title?: string;
  /** Custom commands registry */
  commands?: TerminalCommand[];
  /** Default handler for unknown commands */
  onCommand?: (input: string, args: string[], terminal: TerminalInstance) => void;
  /** Callback when terminal is cleared */
  onClear?: () => void;
  /** Callback on resize */
  onResize?: (cols: number, rows: number) => void;
  /** Custom CSS class */
  className?: string;
}

export interface TerminalInstance {
  element: HTMLElement;
  /** Write output to terminal */
  write: (text: string, type?: "output" | "error" | "system") => void;
  /** Write a newline + text */
  writeln: (text: string, type?: "output" | "error" | "system") => void;
  /** Clear the screen */
  clear: () => void;
  /** Set the prompt string */
  setPrompt: (prompt: string) => void;
  /** Set cwd display */
  setCwd: (cwd: string) => void;
  /** Focus the terminal input */
  focus: () => void;
  /** Blur the terminal input */
  blur: () => void;
  /** Register a new command */
  registerCommand: (cmd: TerminalCommand) => void;
  /** Unregister a command */
  unregisterCommand: (name: string) => void;
  /** Get all lines */
  getLines: () => TerminalLine[];
  /** Get current input value */
  getInput: () => string;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Default Themes ---

const DEFAULT_THEME: TerminalTheme = {
  background: "#1e1e2e",
  foreground: "#cdd6f4",
  cursor: "#f5e0dc",
  selectionBackground: "#585b70",
  selectionForeground: "#cdd6f4",
  black: "#45475a",
  red: "#f38ba8",
  green: "#a6e3a1",
  yellow: "#f9e2af",
  blue: "#89b4fa",
  magenta: "#f5c2e7",
  cyan: "#94e2d5",
  white: "#bac2de",
  brightBlack: "#585b70",
  brightRed: "#f38ba8",
  brightGreen: "#a6e3a1",
  brightYellow: "#f9e2af",
  brightBlue: "#89b4fa",
  brightMagenta: "#f5c2e7",
  brightCyan: "#94e2d5",
  brightWhite: "#a6adc8",
};

const LIGHT_THEME: TerminalTheme = {
  ...DEFAULT_THEME,
  background: "#ffffff",
  foreground: "#1e1e2e",
  black: "#4a4a4a",
  white: "#1e1e2e",
  brightBlack: "#6e6e6e",
  brightWhite: "#4a4a4a",
};

// --- ANSI Parser ---

interface AnsiState {
  fg: string | null;
  bg: string | null;
  bold: boolean;
  dim: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
}

function parseAnsi(text: string, theme: TerminalTheme): string {
  const state: AnsiState = { fg: null, bg: null, bold: false, dim: false, italic: false, underline: false, strikethrough: false };
  let result = "";
  let i = 0;

  while (i < text.length) {
    if (text[i] === "\x1b" && text[i + 1] === "[") {
      // Parse CSI sequence
      i += 2;
      let seq = "";
      while (i < text.length && text[i] !== "m" && text[i] !== "A" && text[i] !== "B" && text[i] !== "C" && text[i] !== "D" && text[i] !== "J" && text[i] !== "K") {
        seq += text[i];
        i++;
      }
      if (text[i] === "m") { // SGR
        applySgr(seq, state, theme);
        i++;
      } else {
        i++; // skip non-SGR sequences
      }
    } else if (text[i] === "\n") {
      result += "<br>";
      i++;
    } else if (text[i] === "\r") {
      i++;
    } else if (text[i] === "\t") {
      result += "&nbsp;&nbsp;&nbsp;&nbsp;";
      i++;
    } else {
      result += escapeHtmlChar(text[i]);
      i++;
    }
  }

  return closeStyles(result, state);
}

function applySgr(seq: string, state: AnsiState, theme: TerminalTheme): void {
  if (!seq || seq === "0") {
    Object.assign(state, { fg: null, bg: null, bold: false, dim: false, italic: false, underline: false, strikethrough: false });
    return;
  }

  const codes = seq.split(";").map(Number);
  for (const code of codes) {
    switch (code) {
      case 0: Object.assign(state, { fg: null, bg: null, bold: false, dim: false, italic: false, underline: false, strikethrough: false }); break;
      case 1: state.bold = true; break;
      case 2: state.dim = true; break;
      case 3: state.italic = true; break;
      case 4: state.underline = true; break;
      case 9: state.strikethrough = true; break;
      case 22: state.bold = false; state.dim = false; break;
      case 23: state.italic = false; break;
      case 24: state.underline = false; break;
      case 29: state.strikethrough = false; break;
      case 30: state.fg = theme.black; break;
      case 31: state.fg = theme.red; break;
      case 32: state.fg = theme.green; break;
      case 33: state.fg = theme.yellow; break;
      case 34: state.fg = theme.blue; break;
      case 35: state.fg = theme.magenta; break;
      case 36: state.fg = theme.cyan; break;
      case 37: state.fg = theme.white; break;
      case 39: state.fg = null; break;
      case 40: state.bg = theme.black; break;
      case 41: state.bg = theme.red; break;
      case 42: state.bg = theme.green; break;
      case 43: state.bg = theme.yellow; break;
      case 44: state.bg = theme.blue; break;
      case 45: state.bg = theme.magenta; break;
      case 46: state.bg = theme.cyan; break;
      case 47: state.bg = theme.white; break;
      case 49: state.bg = null; break;
      case 90: state.fg = theme.brightBlack; break;
      case 91: state.fg = theme.brightRed; break;
      case 92: state.fg = theme.brightGreen; break;
      case 93: state.fg = theme.brightYellow; break;
      case 94: state.fg = theme.brightBlue; break;
      case 95: state.fg = theme.brightMagenta; break;
      case 96: state.fg = theme.brightCyan; break;
      case 97: state.fg = theme.brightWhite; break;
      case 100: state.bg = theme.brightBlack; break;
      case 101: state.bg = theme.brightRed; break;
      case 102: state.bg = theme.brightGreen; break;
      case 103: state.bg = theme.brightYellow; break;
      case 104: state.bg = theme.brightBlue; break;
      case 105: state.bg = theme.brightMagenta; break;
      case 106: state.bg = theme.brightCyan; break;
      case 107: state.bg = theme.brightWhite; break;
    }
  }
}

function openStyles(state: AnsiState): string {
  const parts: string[] = [];
  if (state.fg) parts.push(`color:${state.fg}`);
  if (state.bg) parts.push(`background-color:${state.bg}`);
  if (state.bold) parts.push("font-weight:bold");
  if (state.dim) parts.push("opacity:0.65");
  if (state.italic) parts.push("font-style:italic");
  if (state.underline) parts.push("text-decoration:underline");
  if (state.strikethrough) parts.push("text-decoration:line-through");
  return parts.length > 0 ? `<span style="${parts.join(";")}">` : "";
}

function closeStyles(html: string, state: AnsiState): string {
  const hasStyle = state.fg || state.bg || state.bold || state.dim || state.italic || state.underline || state.strikethrough;
  return hasStyle ? `${openStyles(state)}${html}</span>` : html;
}

function escapeHtmlChar(char: string): string {
  switch (char) {
    case "&": return "&amp;";
    case "<": return "&lt;";
    case ">": return "&gt;";
    case '"': return "&quot;";
    default: return char;
  }
}

// --- Built-in Commands ---

const BUILTIN_COMMANDS: TerminalCommand[] = [
  {
    name: "help",
    description: "Show available commands",
    handler(_args, term) {
      const cmds = (term as any)._commands as Map<string, TerminalCommand>;
      let output = "Available commands:\n";
      for (const [name, cmd] of cmds) {
        output += `  ${name.padEnd(12)}${cmd.description ?? ""}\n`;
      }
      term.writeln(output);
    },
  },
  {
    name: "clear",
    description: "Clear the screen",
    handler(_args, term) {
      term.clear();
    },
  },
  {
    name: "echo",
    description: "Print text to output",
    handler(args, _term) {
      writelnDirect(args.join(" "));
    },
  },
  {
    name: "date",
    description: "Show current date/time",
    handler(_args, term) {
      term.writeln(new Date().toString());
    },
  },
  {
    name: "history",
    description: "Show command history",
    handler(_args, term) {
      const hist = (term as any)._history as string[];
      hist.forEach((entry: string, i: number) => term.writeln(`  ${i + 1}  ${entry}`));
    },
  },
  {
    name: "pwd",
    description: "Print working directory",
    handler(_args, term) {
      term.writeln((term as any).cwd ?? "~");
    },
  },
  {
    name: "whoami",
    description: "Print current user",
    handler(_args, term) {
      term.writeln((term as any).user ?? "guest");
    },
  },
];

// Temporary helper for echo
let writelnDirect: (text: string) => void;

// --- Main Factory ---

export function createTerminal(options: TerminalOptions): TerminalInstance {
  const opts = {
    prompt: options.prompt ?? "\\u@\\h:\\w\\$ ",
    cwd: options.cwd ?? "~",
    user: options.user ?? "guest",
    host: options.host ?? "localhost",
    fontSize: options.fontSize ?? 13,
    fontFamily: options.fontFamily ?? "'SF Mono','Fira Code',Consolas,'Courier New',monospace",
    scrollbackSize: options.scrollbackSize ?? 5000,
    maxOutputLines: options.maxOutputLines ?? 10000,
    echoInput: options.echoInput ?? true,
    enableHistory: options.enableHistory ?? true,
    maxHistory: options.maxHistory ?? 200,
    enableTabCompletion: options.enableTabCompletion ?? true,
    blinkCursor: options.blinkCursor ?? true,
    showTitleBar: options.showTitleBar ?? true,
    title: options.title ?? "Terminal",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Terminal: container not found");

  const theme: TerminalTheme = { ...DEFAULT_THEME, ...options.theme };
  const commands = new Map<string, TerminalCommand>();
  const history: string[] = [];
  let historyIndex = -1;

  // Register built-ins then custom
  for (const cmd of BUILTIN_COMMANDS) commands.set(cmd.name, cmd);
  for (const cmd of options.commands ?? []) commands.set(cmd.name, cmd);

  let destroyed = false;
  let currentInput = "";
  let cursorPosition = 0;
  let lines: TerminalLine[] = [];

  // Create DOM
  container.className = `terminal ${opts.className ?? ""}`;
  container.style.cssText = `
    display:flex;flex-direction:column;width:100%;height:100%;
    border-radius:8px;overflow:hidden;font-family:${opts.fontFamily};
    font-size:${opts.fontSize}px;background:${theme.background};color:${theme.foreground};
  `;

  // Title bar
  let titleBar: HTMLElement | null = null;
  if (opts.showTitleBar) {
    titleBar = document.createElement("div");
    titleBar.className = "terminal-titlebar";
    titleBar.style.cssText = `
      display:flex;align-items:center;gap:8px;padding:8px 12px;
      background:#181825;border-bottom:1px solid #313244;flex-shrink:0;
    `;
    const dots = document.createElement("div");
    dots.style.cssText = "display:flex;gap:6px;";
    ["#f38ba8", "#f9e2af", "#a6e3a1"].forEach((color) => {
      const dot = document.createElement("span");
      dot.style.cssText = `width:12px;height:12px;border-radius:50%;background:${color};`;
      dots.appendChild(dot);
    });
    const titleText = document.createElement("span");
    titleText.textContent = opts.title;
    titleText.style.cssText = "flex:1;font-size:12px;color:#a6adc8;";
    titleBar.append(dots, titleText);
    container.appendChild(titleBar);
  }

  // Output area
  const outputEl = document.createElement("div");
  outputEl.className = "terminal-output";
  outputEl.style.cssText = `
    flex:1;overflow-y:auto;padding:8px 12px;outline:none;
    white-space:pre-wrap;word-break:break-all;line-height:1.5;
  `;
  outputEl.setAttribute("tabindex", "0");
  container.appendChild(outputEl);

  // Input line
  const inputLine = document.createElement("div");
  inputLine.className = "terminal-input-line";
  inputLine.style.cssText = `
    display:flex;align-items:center;padding:4px 12px 8px;
    border-top:1px solid #313244;min-height:28px;flex-shrink:0;
  `;
  container.appendChild(inputLine);

  // Prompt element
  const promptEl = document.createElement("span");
  promptEl.className = "terminal-prompt";
  promptEl.style.cssText = `color:green;user-select:none;white-space:nowrap;margin-right:4px;`;

  // Input element (hidden, used for capturing keyboard)
  const hiddenInput = document.createElement("input");
  hiddenInput.type = "text";
  hiddenInput.autocomplete = "off";
  hiddenInput.spellcheck = false;
  hiddenInput.style.cssText = `
    position:absolute;opacity:0;width:0;height:0;padding:0;border:none;outline:none;
  `;
  container.appendChild(hiddenInput);

  // Cursor element
  const cursorEl = document.createElement("span");
  cursorEl.className = "terminal-cursor";
  cursorEl.textContent = "\u2588"; // Full block
  cursorEl.style.cssText = `
    color:${theme.cursor};${opts.blinkCursor ? "animation:blink 1s step-end infinite;" : ""}
  `;

  // Input display area
  const inputDisplay = document.createElement("span");
  inputDisplay.className = "terminal-input-display";
  inputDisplay.style.cssText = "flex:1;outline:none;";

  inputLine.append(promptEl, inputDisplay, cursorEl);

  // Inject blink keyframe
  if (!document.getElementById("terminal-blink-styles")) {
    const style = document.createElement("style");
    style.id = "terminal-blink-styles";
    style.textContent = "@keyframes blink { 50% { opacity: 0; } }";
    document.head.appendChild(style);
  }

  // --- Prompt Rendering ---

  function renderPrompt(): string {
    let p = opts.prompt;
    p = p.replace(/\\u/g, opts.user);
    p = p.replace(/\\h/g, opts.host);
    p = p.replace(/\\w/g, opts.cwd);
    p = p.replace(/\$/g, "");
    return p;
  }

  // --- Output Management ---

  function addLine(content: string, type: TerminalLine["type"] = "output"): void {
    const html = parseAnsi(content, theme);
    const line: TerminalLine = { content, html, timestamp: Date.now(), type };
    lines.push(line);

    // Trim to max lines
    if (lines.length > opts.scrollbackSize) {
      lines = lines.slice(lines.length - opts.scrollbackSize);
    }

    renderOutput();
  }

  function renderOutput(): void {
    let html = "";
    for (const line of lines) {
      const prefix = line.type === "error" ? '<span style="color:' + theme.red + ';">' :
                     line.type === "system" ? '<span style="color:' + theme.cyan + ';opacity:0.7;">' :
                     line.type === "input" ? '<span style="color:' + theme.green + ';">' : "";
      const suffix = prefix ? "</span>" : "";
      html += prefix + line.html + suffix + "\n";
    }
    outputEl.innerHTML = html;
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  // --- Input Handling ---

  function updateInputDisplay(): void {
    const before = escapeInput(currentInput.slice(0, cursorPosition));
    const after = escapeInput(currentInput.slice(cursorPosition));
    inputDisplay.innerHTML = before;
    // Insert cursor after the "before" part
    inputDisplay.appendChild(cursorEl);
    const afterSpan = document.createElement("span");
    afterSpan.textContent = after;
    inputDisplay.appendChild(afterSpan);
  }

  function escapeInput(text: string): string {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function handleKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case "Enter":
        e.preventDefault();
        executeInput();
        break;
      case "ArrowUp":
        e.preventDefault();
        navigateHistory(-1);
        break;
      case "ArrowDown":
        e.preventDefault();
        navigateHistory(1);
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (cursorPosition > 0) cursorPosition--;
        updateInputDisplay();
        break;
      case "ArrowRight":
        e.preventDefault();
        if (cursorPosition < currentInput.length) cursorPosition++;
        updateInputDisplay();
        break;
      case "Home":
        e.preventDefault();
        cursorPosition = 0;
        updateInputDisplay();
        break;
      case "End":
        e.preventDefault();
        cursorPosition = currentInput.length;
        updateInputDisplay();
        break;
      case "Backspace":
        e.preventDefault();
        if (cursorPosition > 0) {
          currentInput = currentInput.slice(0, cursorPosition - 1) + currentInput.slice(cursorPosition);
          cursorPosition--;
          updateInputDisplay();
        }
        break;
      case "Delete":
        e.preventDefault();
        if (cursorPosition < currentInput.length) {
          currentInput = currentInput.slice(0, cursorPosition) + currentInput.slice(cursorPosition + 1);
          updateInputDisplay();
        }
        break;
      case "Tab":
        e.preventDefault();
        if (opts.enableTabCompletion) handleTabComplete();
        break;
      case "l":
        if (e.ctrlKey) { e.preventDefault(); clear(); }
        break;
      case "c":
        if (e.ctrlKey) {
          e.preventDefault();
          currentInput = "";
          cursorPosition = 0;
          addLine("^C", "system");
          updateInputDisplay();
        }
        break;
      case "a":
        if (e.ctrlKey) { e.preventDefault(); cursorPosition = 0; updateInputDisplay(); }
        break;
      case "e":
        if (e.ctrlKey) { e.preventDefault(); cursorPosition = currentInput.length; updateInputDisplay(); }
        break;
      default:
        // Regular character input handled by input event
        break;
    }
  }

  function executeInput(): void {
    const input = currentInput.trim();

    if (opts.echoInput) {
      addLine(renderPrompt() + input, "input");
    }

    if (input) {
      history.unshift(input);
      if (history.length > opts.maxHistory) history.pop();
      historyIndex = -1;
      processCommand(input);
    }

    currentInput = "";
    cursorPosition = 0;
    updateInputDisplay();
  }

  async function processCommand(rawInput: string): Promise<void> {
    const parts = rawInput.match(/\S+|"[^"]*"|'[^']*'/g) ?? [];
    const cmdName = parts[0]?.toLowerCase().replace(/^["']|["']$/g, "") ?? "";
    const args = parts.slice(1).map((s) => s.replace(/^["']|["']$/g, ""));

    const cmd = commands.get(cmdName);
    if (cmd) {
      try {
        await cmd.handler(args, instance);
      } catch (err) {
        writeln(`Error: ${err instanceof Error ? err.message : String(err)}`, "error");
      }
    } else if (opts.onCommand) {
      opts.onCommand(rawInput, args, instance);
    } else {
      writeln(`Command not found: ${cmdName}. Type 'help' for available commands.`, "error");
    }
  }

  function navigateHistory(direction: number): void {
    if (history.length === 0) return;

    historyIndex += direction;
    if (historyIndex < 0) historyIndex = 0;
    if (historyIndex >= history.length) historyIndex = history.length - 1;

    currentInput = history[historyIndex] ?? "";
    cursorPosition = currentInput.length;
    updateInputDisplay();
  }

  function handleTabComplete(): void {
    const partial = currentInput.slice(0, cursorPosition);
    const lastWord = partial.split(/\s+/).pop() ?? "";

    if (!lastWord) return;

    // Check command names first
    const matches = Array.from(commands.keys())
      .filter((name) => name.startsWith(lastWord.toLowerCase()));

    if (matches.length === 1) {
      const match = matches[0]!;
      const before = currentInput.slice(0, cursorPosition - lastWord.length);
      const after = currentInput.slice(cursorPosition);
      currentInput = before + match + after;
      cursorPosition = before.length + match.length;
      updateInputDisplay();
    } else if (matches.length > 1) {
      writeln(matches.join("  "), "system");
    } else {
      // Try command-specific completions
      const cmdParts = partial.split(/\s+/);
      const cmdName = cmdParts[0]?.toLowerCase();
      const cmd = commands.get(cmdName ?? "");
      if (cmd?.completions) {
        const suggestions = cmd.completions(lastWord);
        if (suggestions.length === 1) {
          const before = currentInput.slice(0, cursorPosition - lastWord.length);
          const after = currentInput.slice(cursorPosition);
          currentInput = before + suggestions[0]! + after;
          cursorPosition = before.length + suggestions[0]!.length;
          updateInputDisplay();
        } else if (suggestions.length > 1) {
          writeln(suggestions.join("  "), "system");
        }
      }
    }
  }

  // --- Event Binding ---

  outputEl.addEventListener("click", () => hiddenInput.focus());
  inputLine.addEventListener("click", () => hiddenInput.focus());

  hiddenInput.addEventListener("keydown", handleKeydown);
  hiddenInput.addEventListener("input", () => {
    // Sync from hidden input (for IME etc.)
    if (hiddenInput.value !== currentInput) {
      currentInput = hiddenInput.value;
      cursorPosition = currentInput.length;
      updateInputDisplay();
    }
  });

  // Prevent actual typing into hidden input from showing
  hiddenInput.addEventListener("beforeinput", (e) => {
    if (e.inputType === "insertText" && e.data) {
      const pos = cursorPosition;
      currentInput = currentInput.slice(0, pos) + e.data + currentInput.slice(pos);
      cursorPosition = pos + e.data.length;
      updateInputDisplay();
      hiddenInput.value = ""; // keep hidden input empty
    }
  });

  // --- Instance ---

  const instance: TerminalInstance & { _commands: Map<string, TerminalCommand>; _history: string[]; cwd: string; user: string } = {
    element: container,

    write(text, type = "output") {
      addLine(text, type);
    },

    writeln(text, type = "output") {
      addLine(text + "\n", type);
    },

    clear() {
      lines = [];
      outputEl.innerHTML = "";
      opts.onClear?.();
    },

    setPrompt(prompt: string) {
      opts.prompt = prompt;
      promptEl.textContent = renderPrompt();
    },

    setCwd(cwd: string) {
      opts.cwd = cwd;
      instance.cwd = cwd;
      promptEl.textContent = renderPrompt();
    },

    focus() { hiddenInput.focus(); },

    blur() { hiddenInput.blur(); },

    registerCommand(cmd: TerminalCommand) {
      commands.set(cmd.name, cmd);
    },

    unregisterCommand(name: string) {
      commands.delete(name);
    },

    getLines() { return [...lines]; },

    getInput() { return currentInput; },

    destroy() {
      destroyed = true;
      container.innerHTML = "";
      container.style.cssText = "";
    },

    // Internal references
    _commands: commands,
    _history: history,
    cwd: opts.cwd,
    user: opts.user,
  };

  // Setup echo helper reference
  writelnDirect = (text: string) => instance.writeln(text);

  // Initialize
  promptEl.textContent = renderPrompt();
  updateInputDisplay();

  // Show welcome messages
  if (opts.welcomeMessage) {
    const messages = Array.isArray(opts.welcomeMessage) ? opts.welcomeMessage : [opts.welcomeMessage];
    for (const msg of messages) {
      instance.writeln(msg, "system");
    }
  }

  // Auto-focus
  setTimeout(() => hiddenInput.focus(), 50);

  return instance;
}
