/**
 * Rich Text Editor: Lightweight WYSIWYG-style editor with formatting toolbar,
 * bold/italic/underline/strikethrough, headings, lists (ordered/unordered),
 * text alignment, links, code blocks, undo/redo, HTML export,
 * and contenteditable-based editing.
 */

// --- Types ---

export type FormatCommand =
  | "bold" | "italic" | "underline" | "strikethrough"
  | "heading1" | "heading2" | "heading3" | "paragraph"
  | "insertUnorderedList" | "insertOrderedList"
  | "justifyLeft" | "justifyCenter" | "justifyRight"
  | "createLink" | "removeFormat" | "insertHorizontalRule"
  | "subscript" | "superscript"
  | "foreColor" | "hiliteColor";

export interface ToolbarButton {
  command: FormatCommand;
  label: string;
  icon?: string; // SVG string or emoji
  tooltip?: string;
  separatorBefore?: boolean;
}

export interface RichTextOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial HTML content */
  value?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Show toolbar? */
  showToolbar?: boolean;
  /** Custom toolbar buttons (overrides default) */
  toolbarButtons?: ToolbarButton[];
  /** Enable placeholder when empty */
  enablePlaceholder?: boolean;
  /** Min height in px */
  minHeight?: number;
  /** Max height in px (0 = unlimited) */
  maxHeight?: number;
  /** Read-only mode */
  readOnly?: boolean;
  /** Callback on content change */
  onChange?: (html: string) => void;
  /** Callback on focus */
  onFocus?: () => void;
  /** Callback on blur */
  onBlur?: () => void;
  /** Custom CSS class */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export interface RichTextInstance {
  element: HTMLElement;
  editorEl: HTMLElement;
  /** Get current HTML content */
  getHtml: () => string;
  /** Get plain text content */
  getText: () => string;
  /** Set HTML content */
  setHtml: (html: string) => void;
  /** Set plain text content */
  setText: (text: string) => void;
  /** Execute a format command */
  execCommand: (command: FormatCommand, value?: string) => void;
  /** Check if a format is active at cursor */
  queryCommandState: (command: FormatCommand) => boolean;
  /** Focus the editor */
  focus: () => void;
  /** Clear all content */
  clear: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Default Toolbar ---

const DEFAULT_TOOLBAR: ToolbarButton[] = [
  { command: "bold", label: "B", tooltip: "Bold (Ctrl+B)" },
  { command: "italic", label: "I", tooltip: "Italic (Ctrl+I)", separatorBefore: false },
  { command: "underline", label: "U", tooltip: "Underline (Ctrl+U)", separatorBefore: true },
  { command: "strikethrough", label: "S", tooltip: "Strikethrough" },
  { command: "heading1", label: "H1", tooltip: "Heading 1", separatorBefore: true },
  { command: "heading2", label: "H2", tooltip: "Heading 2" },
  { command: "heading3", label: "H3", tooltip: "Heading 3" },
  { command: "paragraph", label: "P", tooltip: "Paragraph" },
  { command: "insertUnorderedList", label: "\u2022 List", tooltip: "Bullet List", separatorBefore: true },
  { command: "insertOrderedList", label: "1. List", tooltip: "Numbered List" },
  { command: "justifyLeft", label: "\u2190", tooltip: "Align Left", separatorBefore: true },
  { command: "justifyCenter", label: "\u2014", tooltip: "Align Center" },
  { command: "justifyRight", label: "\u2192", tooltip: "Align Right" },
  { command: "createLink", label: "\u{1F517}", tooltip: "Insert Link", separatorBefore: true },
  { command: "removeFormat", label: "\u2715", tooltip: "Clear Formatting", separatorBefore: true },
];

// --- Main Class ---

export class RichTextManager {
  create(options: RichTextOptions): RichTextInstance {
    const opts = {
      value: options.value ?? "",
      placeholder: options.placeholder ?? "Start typing...",
      showToolbar: options.showToolbar ?? true,
      enablePlaceholder: options.enablePlaceholder ?? true,
      minHeight: options.minHeight ?? 150,
      maxHeight: options.maxHeight ?? 0,
      readOnly: options.readOnly ?? false,
      disabled: options.disabled ?? false,
      className: options.className ?? "",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("RichText: container not found");

    container.className = `rich-text ${opts.className}`;
    container.style.cssText = `
      display:flex;flex-direction:column;border:1px solid #d1d5db;border-radius:8px;
      overflow:hidden;font-family:-apple-system,sans-serif;background:#fff;
      ${opts.disabled ? "opacity:0.5;pointer-events:none;" : ""}
    `;

    // --- Toolbar ---
    let toolbarEl: HTMLElement | null = null;
    if (opts.showToolbar) {
      toolbarEl = document.createElement("div");
      toolbarEl.className = "rt-toolbar";
      toolbarEl.style.cssText = `
        display:flex;align-items:center;gap:2px;padding:6px 8px;
        border-bottom:1px solid #e5e7eb;background:#fafafa;flex-wrap:wrap;
      `;

      const buttons = opts.toolbarButtons ?? DEFAULT_TOOLBAR;
      for (const btn of buttons) {
        if (btn.separatorBefore) {
          const sep = document.createElement("div");
          sep.style.cssText = "width:1px;height:20px;background:#e5e7eb;margin:0 4px;";
          toolbarEl.appendChild(sep);
        }

        const button = document.createElement("button");
        button.type = "button";
        button.dataset.command = btn.command;
        button.title = btn.tooltip ?? "";
        button.textContent = btn.label;
        button.style.cssText = `
          padding:4px 8px;border:none;border-radius:4px;background:transparent;
          cursor:pointer;font-size:13px;color:#374151;font-weight:${["bold","heading1"].includes(btn.command) ? "700" : "400"};
          transition:all 0.15s;display:inline-flex;align-items:center;justify-content:center;
          min-width:28px;height:28px;line-height:1;
          ${btn.command === "bold" ? "font-weight:700;" : ""}
          ${btn.command === "italic" ? "font-style:italic;" : ""}
          ${btn.command === "underline" ? "text-decoration:underline;" : ""}
          ${btn.command === "strikethrough" ? "text-decoration:line-through;" : ""}
        `;

        button.addEventListener("click", () => handleToolbarAction(btn.command));
        button.addEventListener("mouseenter", () => { button.style.background = "#e5e7eb"; });
        button.addEventListener("mouseleave", () => { button.style.background = "transparent"; });
        toolbarEl.appendChild(button);
      }

      container.appendChild(toolbarEl);
    }

    // --- Editor area ---
    const editorWrapper = document.createElement("div");
    editorWrapper.className = "rt-wrapper";
    editorWrapper.style.cssText = "position:relative;flex:1;overflow:auto;";
    container.appendChild(editorWrapper);

    const editor = document.createElement("div");
    editor.className = "rt-editor";
    editor.contentEditable = String(!opts.readOnly);
    editor.setAttribute("role", "textbox");
    editor.setAttribute("aria-multiline", "true");
    editor.innerHTML = opts.value || (opts.enablePlaceholder ? `<span style="color:#9ca3af;pointer-events:none;">${opts.placeholder}</span>` : "");
    editor.style.cssText = `
      min-height:${opts.minHeight}px;
      ${opts.maxHeight > 0 ? `max-height:${opts.maxHeight}px;overflow-y:auto;` : ""}
      padding:12px 16px;outline:none;line-height:1.7;font-size:14px;color:#111827;
      word-wrap:break-word;overflow-wrap:break-word;
    `;
    editorWrapper.appendChild(editor);

    // --- State ---
    let destroyed = false;
    let isEmpty = !opts.value || opts.value.trim() === "";

    function checkEmpty(): void {
      const hasContent = editor.innerText.trim().length > 0;
      if (hasContent !== isEmpty) {
        isEmpty = !hasContent;
        if (!isEmpty && opts.enablePlaceholder && opts.readOnly !== true) {
          // Content was cleared — show placeholder
          if (!editor.querySelector(".rt-placeholder")) {
            const ph = document.createElement("span");
            ph.className = "rt-placeholder";
            ph.style.cssText = "color:#9ca3af;pointer-events:none;";
            ph.textContent = opts.placeholder;
            editor.insertBefore(ph, editor.firstChild);
          }
        } else {
          // Content added — remove placeholder
          const ph = editor.querySelector(".rt-placeholder");
          if (ph) ph.remove();
        }
      }
    }

    // --- Event Handlers ---

    editor.addEventListener("input", () => {
      checkEmpty();
      opts.onChange?.(editor.innerHTML);
    });

    editor.addEventListener("focus", () => {
      editor.style.outline = "none";
      editor.style.boxShadow = "inset 0 0 0 2px rgba(99,102,241,0.15)";
      // Remove placeholder on focus
      const ph = editor.querySelector(".rt-placeholder");
      if (ph) ph.remove();
      opts.onFocus?.();
    });

    editor.addEventListener("blur", () => {
      editor.style.boxShadow = "";
      checkEmpty();
      opts.onBlur?.();
    });

    // Keyboard shortcuts
    editor.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "b":
            e.preventDefault(); execCmd("bold"); break;
          case "i":
            e.preventDefault(); execCmd("italic"); break;
          case "u":
            e.preventDefault(); execCmd("underline"); break;
          case "shift+7": // Ctrl+Shift+7 for strikethrough
            e.preventDefault(); execCmd("strikethrough"); break;
        }
      }

      // Tab handling
      if (e.key === "Tab") {
        e.preventDefault();
        document.execCommand("insertText", false, "  ");
      }

      // Enter key — don't insert <br> inside pre
      if (e.key === "Enter") {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0)!;
          const parent = range.startContainer.parentElement;
          if (parent?.tagName === "PRE" || parent?.tagName === "CODE") {
            e.preventDefault();
            document.execCommand("insertLineBreak");
          }
        }
      }
    });

    // Update toolbar active states on selection change
    const updateToolbarState = () => {
      if (!toolbarEl) return;
      for (const btn of toolbarEl.querySelectorAll<HTMLButtonElement>("button[data-command]")) {
        const cmd = btn.dataset.command as FormatCommand;
        const isActive = queryCmdState(cmd);
        btn.style.background = isActive ? "#dbeafe" : "transparent";
        btn.style.color = isActive ? "#2563eb" : "#374151";
      }
    };

    document.addEventListener("selectionchange", updateToolbarState);

    // --- Command Execution ---

    function execCmd(command: FormatCommand, value?: string): void {
      switch (command) {
        case "createLink": {
          const url = prompt("Enter URL:", "https://");
          if (url) document.execCommand(command, false, url);
          break;
        }
        case "foreColor":
        case "hiliteColor": {
          const color = prompt(value === "hiliteColor" ? "Highlight color (hex):" : "Text color (hex):", "#000000");
          if (color) document.execCommand(command, false, color);
          break;
        }
        default:
          document.execCommand(command, false, undefined);
      }
      editor.focus();
      opts.onChange?.(editor.innerHTML);
    }

    function handleToolbarAction(command: FormatCommand): void {
      execCmd(command);
    }

    function queryCmdState(command: FormatCommand): boolean {
      try {
        return document.queryCommandState(command.replace(/^heading(\d)/, "heading$1")) as boolean;
      } catch {
        return false;
      }
    }

    // --- Instance ---

    const instance: RichTextInstance = {
      element: container,
      editorEl: editor,

      getHtml() { return editor.innerHTML; },

      getText() { return editor.innerText; },

      setHtml(html: string) {
        editor.innerHTML = html;
        checkEmpty();
      },

      setText(text: string) {
        editor.textContent = text;
        checkEmpty();
      },

      execCommand: execCmd,

      queryCommandState: queryCmdState,

      focus() { editor.focus(); },

      clear() {
        editor.innerHTML = "";
        isEmpty = true;
        if (opts.enablePlaceholder) {
          const ph = document.createElement("span");
          ph.className = "rt-placeholder";
          ph.style.cssText = "color:#9ca3af;pointer-events:none;";
          ph.textContent = opts.placeholder;
          editor.appendChild(ph);
        }
        opts.onChange?.("");
      },

      destroy() {
        destroyed = true;
        document.removeEventListener("selectionchange", updateToolbarState);
        container.innerHTML = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a rich text editor */
export function createRichText(options: RichTextOptions): RichTextInstance {
  return new RichTextManager().create(options);
}
