/**
 * Rich Text Editor: Lightweight WYSIWYG editor with formatting toolbar,
 * bold/italic/underline/strikethrough, headings, lists, links, images,
 * code blocks, alignment, text color, undo/redo, keyboard shortcuts,
 * and HTML export/import.
 */

// --- Types ---

export type EditorFormat =
  | "bold" | "italic" | "underline" | "strikethrough"
  | "heading1" | "heading2" | "heading3" | "paragraph"
  | "unorderedList" | "orderedList"
  | "justifyLeft" | "justifyCenter" | "justifyRight"
  | "quote" | "code" | "link" | "image"
  | "textColor" | "backgroundColor"
  | "undo" | "redo";

export interface ToolbarButton {
  format: EditorFormat;
  label: string;
  icon?: string;
  title?: string;
  shortcut?: string;
}

export interface RichTextEditorOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial HTML content */
  content?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Show toolbar? (default: true) */
  showToolbar?: boolean;
  /** Custom toolbar buttons (null = default set) */
  buttons?: ToolbarButton[] | null;
  /** Enable link insertion dialog? */
  enableLinks?: boolean;
  /** Enable image insertion? */
  enableImages?: boolean;
  /** Max height in px (0 = no limit) */
  maxHeight?: number;
  /** Min height in px */
  minHeight?: number;
  /** Read-only mode */
  readonly?: boolean;
  /** Callback on content change */
  onChange?: (html: string, text: string) => void;
  /** Callback on focus */
  onFocus?: () => void;
  /** Callback on blur */
  onBlur?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface RichTextEditorInstance {
  element: HTMLElement;
  editorEl: HTMLDivElement;
  /** Get HTML content */
  getHTML: () => string;
  /** Get plain text content */
  getText: () => string;
  /** Set HTML content */
  setHTML: (html: string) => void;
  /** Set plain text content */
  setText: (text: string) => void;
  /** Execute a format command */
  execCommand: (format: EditorFormat, value?: string) => void;
  /** Check if a format is active at cursor */
  isFormatActive: (format: EditorFormat) => boolean;
  /** Focus the editor */
  focus: () => void;
  /** Clear all content */
  clear: () => void;
  /** Destroy instance */
  destroy: () => void;
}

// --- Default Toolbar ---

const DEFAULT_BUTTONS: ToolbarButton[] = [
  { format: "undo", label: "\u21A6", title: "Undo", shortcut: "Ctrl+Z" },
  { format: "redo", label: "\u21A9", title: "Redo", shortcut: "Ctrl+Y" },
  { format: "separator", label: "|" },
  { format: "bold", label: "<b>B</b>", title: "Bold", shortcut: "Ctrl+B" },
  { format: "italic", label: "<i>I</i>", title: "Italic", shortcut: "Ctrl+I" },
  { format: "underline", label: "<u>U</u>", title: "Underline", shortcut: "Ctrl+U" },
  { format: "strikethrough", label: "<s>S</s>", title: "Strikethrough" },
  { format: "separator", label: "|" },
  { format: "heading1", label: "H1", title: "Heading 1" },
  { format: "heading2", label: "H2", title: "Heading 2" },
  { format: "heading3", label: "H3", title: "Heading 3" },
  { format: "paragraph", label: "P", title: "Paragraph" },
  { format: "separator", label: "|" },
  { format: "unorderedList", label: "\u2022 List", title: "Bullet List" },
  { format: "orderedList", label: "1. List", title: "Numbered List" },
  { format: "separator", label: "|" },
  { format: "justifyLeft", label: "\u2190", title: "Align Left" },
  { format: "justifyCenter", label: "\u2248", title: "Align Center" },
  { format: "justifyRight", label: "\u2192", title: "Align Right" },
  { format: "separator", label: "|" },
  { format: "quote", label: "\u201C\u201D", title: "Block Quote" },
  { format: "code", label: "</>", title: "Code Block" },
  { format: "link", label: "\u{1F517}", title: "Insert Link" },
  { format: "image", label: "\u{1F5BC}", title: "Insert Image" },
];

// --- Main Factory ---

export function createRichTextEditor(options: RichTextEditorOptions): RichTextEditorInstance {
  const opts = {
    content: options.content ?? "",
    placeholder: options.placeholder ?? "Start typing...",
    showToolbar: options.showToolbar ?? true,
    buttons: options.buttons ?? DEFAULT_BUTTONS,
    enableLinks: options.enableLinks ?? true,
    enableImages: options.enableImages ?? true,
    maxHeight: options.maxHeight ?? 0,
    minHeight: options.minHeight ?? 150,
    readonly: options.readonly ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("RichTextEditor: container not found");

  container.className = `rich-text-editor ${opts.className}`;
  container.style.cssText = `
    border:1px solid #d1d5db;border-radius:10px;overflow:hidden;
    font-family:-apple-system,sans-serif;font-size:14px;color:#374151;
    ${opts.readonly ? "opacity:0.8;" : ""}
  `;

  // --- Toolbar ---

  let toolbarEl: HTMLElement | null = null;

  if (opts.showToolbar && !opts.readonly) {
    toolbarEl = document.createElement("div");
    toolbarEl.className = "rte-toolbar";
    toolbarEl.style.cssText = `
      display:flex;flex-wrap:wrap;gap:2px;padding:6px 8px;
      background:#f9fafb;border-bottom:1px solid #e5e7eb;align-items:center;
    `;
    container.appendChild(toolbarEl);

    for (const btn of opts.buttons!) {
      if ((btn as any).format === "separator") {
        const sep = document.createElement("span");
        sep.style.cssText = "width:1px;height:20px;background:#d1d5db;margin:0 4px;";
        toolbarEl.appendChild(sep);
        continue;
      }

      const button = document.createElement("button");
      button.type = "button";
      button.innerHTML = btn.label;
      button.title = btn.title ?? btn.format;
      button.dataset.format = btn.format;
      button.style.cssText = `
        padding:4px 8px;border:none;border-radius:4px;background:transparent;
        cursor:pointer;font-size:13px;color:#374151;line-height:1.4;
        transition:background 0.1s;display:inline-flex;align-items:center;min-width:28px;
        justify-content:center;
      `;

      button.addEventListener("click", () => handleToolbarAction(btn.format));
      button.addEventListener("mouseenter", () => { button.style.background = "#e5e7eb"; });
      button.addEventListener("mouseleave", () => {
        if (!isFormatActive(btn.format)) button.style.background = "";
        else button.style.background = "#dbeafe";
      });

      toolbarEl.appendChild(button);
    }
  }

  // --- Editor Area ---

  const editorEl = document.createElement("div");
  editorEl.className = "rte-editor";
  editorEl.contentEditable = String(!opts.readonly);
  editorEl.setAttribute("role", "textbox");
  editorEl.setAttribute("aria-multiline", "true");
  editorEl.setAttribute("aria-label", "Rich text editor");
  editorEl.innerHTML = opts.content;
  editorEl.style.cssText = `
    padding:12px 16px;min-height:${opts.minHeight}px;outline:none;line-height:1.6;
    overflow-y:auto;${opts.maxHeight ? `max-height:${opts.maxHeight}px;` : ""}
    word-wrap:break-word;
  `;

  // Placeholder
  if (!editorEl.textContent?.trim()) {
    editorEl.dataset.placeholder = opts.placeholder;
    editorEl.style.color = "#9ca3af";
  }

  container.appendChild(editorEl);

  // State
  let destroyed = false;

  // --- Placeholder Logic ---

  function updatePlaceholder(): void {
    const hasContent = editorEl.innerText.trim().length > 0;
    if (hasContent) {
      editorEl.removeAttribute("data-placeholder");
      editorEl.style.color = "";
    } else {
      editorEl.dataset.placeholder = opts.placeholder;
      editorEl.style.color = "#9ca3af";
    }
  }

  // --- Format Commands ---

  function handleToolbarAction(format: EditorFormat): void {
    switch (format) {
      case "undo":
        document.execCommand("undo", false);
        break;
      case "redo":
        document.execCommand("redo", false);
        break;
      case "bold":
        document.execCommand("bold", false);
        break;
      case "italic":
        document.execCommand("italic", false);
        break;
      case "underline":
        document.execCommand("underline", false);
        break;
      case "strikethrough":
        document.execCommand("strikeThrough", false);
        break;
      case "heading1":
        document.execCommand("formatBlock", false, "h1");
        break;
      case "heading2":
        document.execCommand("formatBlock", false, "h2");
        break;
      case "heading3":
        document.execCommand("formatBlock", false, "h3");
        break;
      case "paragraph":
        document.execCommand("formatBlock", false, "p");
        break;
      case "unorderedList":
        document.execCommand("insertUnorderedList", false);
        break;
      case "orderedList":
        document.execCommand("insertOrderedList", false);
        break;
      case "justifyLeft":
        document.execCommand("justifyLeft", false);
        break;
      case "justifyCenter":
        document.execCommand("justifyCenter", false);
        break;
      case "justifyRight":
        document.execCommand("justifyRight", false);
        break;
      case "quote":
        document.execCommand("formatBlock", false, "blockquote");
        break;
      case "code": {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const code = document.createElement("code");
          code.style.cssText = "background:#f3f4f6;padding:2px 4px;border-radius:3px;font-family:monospace;font-size:0.9em;";
          const range = sel.getRangeAt(0);
          range.surroundContents(code);
        }
        break;
      }
      case "link":
        if (opts.enableLinks) insertLink();
        break;
      case "image":
        if (opts.enableImages) insertImage();
        break;
      default:
        return;
    }
    editorEl.focus();
    fireChange();
  }

  function insertLink(): void {
    const url = prompt("Enter URL:", "https://");
    if (url) {
      document.execCommand("createLink", false, url);
      fireChange();
    }
  }

  function insertImage(): void {
    const url = prompt("Enter image URL:", "");
    if (url) {
      document.execCommand("insertImage", false, url);
      fireChange();
    }
  }

  function isFormatActive(format: EditorFormat): boolean {
    switch (format) {
      case "bold": return document.queryCommandState("bold");
      case "italic": return document.queryCommandState("italic");
      case "underline": return document.queryCommandState("underline");
      case "strikethrough": return document.queryCommandState("strikeThrough");
      case "unorderedList": return document.queryCommandState("insertUnorderedList");
      case "orderedList": return document.queryCommandState("insertOrderedList");
      case "justifyLeft": return document.queryCommandState("justifyLeft");
      case "justifyCenter": return document.queryCommandState("justifyCenter");
      case "justifyRight": return document.queryCommandState("justifyRight");
      default: return false;
    }
  }

  // --- Keyboard Shortcuts ---

  function handleKeydown(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case "b":
          e.preventDefault();
          document.execCommand("bold", false);
          fireChange();
          break;
        case "i":
          e.preventDefault();
          document.execCommand("italic", false);
          fireChange();
          break;
        case "u":
          e.preventDefault();
          document.execCommand("underline", false);
          fireChange();
          break;
      }
    }

    // Tab key handling
    if (e.key === "Tab") {
      e.preventDefault();
      document.execCommand(e.shiftKey ? "outdent" : "indent", false);
    }
  }

  // --- Event Handlers ---

  function fireChange(): void {
    updatePlaceholder();
    updateToolbarState();
    opts.onChange?.(getHTML(), getText());
  }

  function updateToolbarState(): void {
    if (!toolbarEl) return;
    const buttons = toolbarEl.querySelectorAll<HTMLElement>("[data-format]");
    for (const btn of buttons) {
      const fmt = btn.dataset.format as EditorFormat;
      if (isFormatActive(fmt)) {
        btn.style.background = "#dbeafe";
        btn.style.color = "#1d4ed8";
      } else {
        btn.style.background = "";
        btn.style.color = "";
      }
    }
  }

  // Bind events
  editorEl.addEventListener("input", fireChange);
  editorEl.addEventListener("keydown", handleKeydown);
  editorEl.addEventListener("focus", () => { opts.onFocus?.(); });
  editorEl.addEventListener("blur", () => { opts.onBlur?.(); });

  // Prevent drag of images
  editorEl.addEventListener("dragstart", (e) => {
    if ((e.target as HTMLElement).tagName === "IMG") e.preventDefault();
  });

  // Initial state
  updatePlaceholder();

  // --- Public API ---

  const instance: RichTextEditorInstance = {
    element: container,
    editorEl,

    getHTML() { return editorEl.innerHTML; },

    getText() { return editorEl.innerText || ""; },

    setHTML(html: string) {
      editorEl.innerHTML = html;
      updatePlaceholder();
      fireChange();
    },

    setText(text: string) {
      editorEl.textContent = text;
      updatePlaceholder();
      fireChange();
    },

    execCommand(format: EditorFormat, value?: string) {
      if (value !== undefined) {
        document.execCommand(format, false, value);
      } else {
        handleToolbarAction(format);
      }
      fireChange();
    },

    isFormatActive,

    focus() { editorEl.focus(); },

    clear() {
      editorEl.innerHTML = "";
      updatePlaceholder();
      fireChange();
    },

    destroy() {
      destroyed = true;
      editorEl.removeEventListener("input", fireChange);
      editorEl.removeEventListener("keydown", handleKeydown);
      container.innerHTML = "";
      container.style.cssText = "";
    },
  };

  return instance;
}
