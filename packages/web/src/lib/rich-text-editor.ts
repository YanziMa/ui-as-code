/**
 * Rich Text Editor: WYSIWYG editor with formatting toolbar, lists,
 * links, images, tables, undo/redo, clean paste, and HTML export.
 */

// --- Types ---

export type EditorCommand =
  | "bold" | "italic" | "underline" | "strikethrough"
  | "heading1" | "heading2" | "heading3"
  | "unorderedList" | "orderedList"
  | "justifyLeft" | "justifyCenter" | "justifyRight" | "justifyFull"
  | "indent" | "outdent"
  | "insertHorizontalRule"
  | "removeFormat"
  | "undo" | "redo";

export interface ToolbarButton {
  command: EditorCommand;
  icon: string;
  title: string;
  /** Show as dropdown? */
  options?: Array<{ label: string; value: string }>;
}

export interface RichTextEditorOptions {
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
  /** Editor height (default: "300px") */
  height?: string;
  /** Read-only mode */
  readOnly?: boolean;
  /** Allow HTML source editing? */
  allowSourceView?: boolean;
  /** Strip pasted styles? */
  cleanPaste?: boolean;
  /** Max character limit (0 = unlimited) */
  maxLength?: number;
  /** Font size in px (default: 14) */
  fontSize?: number;
  /** Theme: "light" | "dark" */
  theme?: "light" | "dark";
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
  getValue: () => string;
  getText: () => string;
  setValue: (html: string) => void;
  clear: () => void;
  execCommand: (command: EditorCommand, value?: string) => void;
  focus: () => void;
  blur: () => void;
  getCharCount: () => number;
  getWordCount: () => number;
  insertHtml: (html: string) => void;
  insertLink: (url: string, text?: string) => void;
  insertImage: (src: string, alt?: string) => void;
  enable: () => void;
  disable: () => void;
  destroy: () => void;
}

// --- Default Toolbar ---

const DEFAULT_TOOLBAR: ToolbarButton[] = [
  { command: "undo", icon: "\u21A9", title: "Undo" },
  { command: "redo", icon: "\u21AA", title: "Redo" },
  { command: "bold", icon: "<b>B</b>", title: "Bold (Ctrl+B)" },
  { command: "italic", icon: "<i>I</i>", title: "Italic (Ctrl+I)" },
  { command: "underline", icon: "<u>U</u>", title: "Underline (Ctrl+U)" },
  { command: "strikethrough", icon: "<s>S</s>", title: "Strikethrough" },
  { command: "removeFormat", icon: "T\u207F", title: "Clear Formatting" },
  { command: "heading1", icon: "H1", title: "Heading 1", options: [
    { label: "Heading 1", value: "h1" },
    { label: "Heading 2", value: "h2" },
    { label: "Heading 3", value: "h3" },
    { label: "Paragraph", value: "p" },
  ]},
  { command: "unorderedList", icon: "\u2022 List", title: "Bullet List" },
  { command: "orderedList", icon: "1. List", title: "Numbered List" },
  { command: "justifyLeft", icon: "\u25C0", title: "Align Left" },
  { command: "justifyCenter", icon: "\u25CF", title: "Align Center" },
  { command: "justifyRight", icon: "\u25B6", title: "Align Right" },
  { command: "indent", icon: "\u21E5 \u21B5", title: "Indent" },
  { command: "outdent", icon: "\u21E4 \u21B5", title: "Outdent" },
  { command: "insertHorizontalRule", icon: "---", title: "Horizontal Rule" },
];

// --- Main Factory ---

export function createRichTextEditor(options: RichTextEditorOptions): RichTextEditorInstance {
  const opts = {
    value: options.value ?? "",
    placeholder: options.placeholder ?? "Start typing...",
    showToolbar: options.showToolbar ?? true,
    height: options.height ?? "300px",
    readOnly: options.readOnly ?? false,
    allowSourceView: options.allowSourceView ?? false,
    cleanPaste: options.cleanPaste ?? true,
    maxLength: options.maxLength ?? 0,
    fontSize: options.fontSize ?? 14,
    theme: options.theme ?? "light",
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("RichTextEditor: container not found");

  const isDark = opts.theme === "dark";
  const colors = isDark
    ? { bg: "#1e1e2e", surface: "#252533", border: "#3a3a4a", text: "#d4d4d4", muted: "#8b8b9a", accent: "#7c6ff0", hover: "#33334a" }
    : { bg: "#ffffff", surface: "#f9fafb", border: "#e5e7eb", text: "#1f2937", muted: "#9ca3af", accent: "#4338ca", hover: "#f3f4f6" };

  let destroyed = false;

  // Root wrapper
  const root = document.createElement("div");
  root.className = `rich-text-editor ${opts.className}`;
  root.style.cssText = `
    display:flex;flex-direction:column;width:100%;border:1px solid ${colors.border};
    border-radius:8px;overflow:hidden;background:${colors.bg};font-family:-apple-system,sans-serif;
  `;
  container.appendChild(root);

  // Toolbar
  let toolbarEl: HTMLElement | null = null;
  if (opts.showToolbar) {
    toolbarEl = document.createElement("div");
    toolbarEl.className = "rte-toolbar";
    toolbarEl.style.cssText = `
      display:flex;align-items:center;gap:2px;padding:6px 10px;
      background:${colors.surface};border-bottom:1px solid ${colors.border};
      flex-wrap:wrap;flex-shrink:0;
    `;

    const buttons = opts.toolbarButtons ?? DEFAULT_TOOLBAR;
    for (const btn of buttons) {
      if (btn.options) {
        // Dropdown button
        const wrapper = document.createElement("div");
        wrapper.style.position = "relative";
        wrapper.style.display = "inline-flex";

        const dropBtn = document.createElement("button");
        dropBtn.type = "button";
        dropBtn.innerHTML = btn.icon;
        dropBtn.title = btn.title;
        dropBtn.style.cssText = `
          padding:4px 8px;border:none;border-radius:4px;background:transparent;
          cursor:pointer;font-size:12px;font-weight:600;color:${colors.text};
          transition:background 0.15s;display:flex;align-items:center;gap:2px;
        `;
        dropBtn.innerHTML += " &#9662;";
        dropBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleDropdown(wrapper, btn.options!);
        });
        dropBtn.addEventListener("mouseenter", () => { dropBtn.style.background = colors.hover; });
        dropBtn.addEventListener("mouseleave", () => { dropBtn.style.background = ""; });
        wrapper.appendChild(dropBtn);
        toolbarEl.appendChild(wrapper);
      } else {
        // Regular button
        const el = document.createElement("button");
        el.type = "button";
        el.innerHTML = btn.icon;
        el.title = btn.title;
        el.dataset.command = btn.command;
        el.style.cssText = `
          padding:4px 8px;border:none;border-radius:4px;background:transparent;
          cursor:pointer;font-size:12px;color:${colors.text};transition:background 0.15s;
        `;
        el.addEventListener("click", () => handleCommand(btn.command));
        el.addEventListener("mouseenter", () => { el.style.background = colors.hover; });
        el.addEventListener("mouseleave", () => { el.style.background = ""; });
        toolbarEl.appendChild(el);
      }
    }

    root.appendChild(toolbarEl);
  }

  // Editable area
  const editor = document.createElement("div");
  editor.className = "rte-editor";
  editor.contentEditable = String(!opts.readOnly);
  editor.setAttribute("role", "textbox");
  editor.setAttribute("aria-multiline", "true");
  editor.style.cssText = `
    flex:1;padding:16px;overflow-y:auto;outline:none;
    min-height:200px;color:${colors.text};font-size:${opts.fontSize}px;line-height:1.7;
    ${opts.placeholder && !editor.textContent ? "" : ""}
  `;

  // Set initial content
  if (opts.value) {
    editor.innerHTML = opts.value;
  }

  root.appendChild(editor);

  // Placeholder behavior
  function updatePlaceholder(): void {
    if (!opts.placeholder) return;
    if (!editor.textContent?.trim()) {
      editor.setAttribute("data-placeholder", opts.placeholder);
    } else {
      editor.removeAttribute("data-placeholder");
    }
  }

  // Inject placeholder style
  injectRteStyles(colors, opts.placeholder);

  // --- Command Handler ---

  function handleCommand(command: EditorCommand, value?: string): void {
    editor.focus();

    switch (command) {
      case "heading1":
        document.execCommand("formatBlock", false, "h1");
        break;
      case "heading2":
        document.execCommand("formatBlock", false, "h2");
        break;
      case "heading3":
        document.execCommand("formatBlock", false, "h3");
        break;
      case "strikethrough":
        document.execCommand("strikeThrough", false);
        break;
      default:
        document.execCommand(command, false, value ?? "");
        break;
    }

    handleChange();
  }

  function toggleDropdown(parent: HTMLElement, options: Array<{ label: string; value: string }>): void {
    // Remove existing dropdown
    const existing = root.querySelector(".rte-dropdown");
    if (existing) existing.remove();

    const menu = document.createElement("div");
    menu.className = "rte-dropdown";
    menu.style.cssText = `
      position:absolute;top:100%;left:0;z-index:100;min-width:140px;
      background:#fff;border:1px solid ${colors.border};border-radius:6px;
      box-shadow:0 4px 12px rgba(0,0,0,0.15);padding:4px 0;margin-top:2px;
    `;

    for (const opt of options) {
      const item = document.createElement("button");
      item.type = "button";
      item.textContent = opt.label;
      item.style.cssText = `
        display:block;width:100%;padding:6px 14px;border:none;background:none;
        cursor:pointer;text-align:left;font-size:13px;color:${colors.text};
        transition:background 0.1s;
      `;
      item.addEventListener("click", () => {
        menu.remove();
        if (opt.value.startsWith("h")) {
          document.execCommand("formatBlock", false, opt.value);
        } else {
          document.execCommand("formatBlock", false, "p");
        }
        handleChange();
      });
      item.addEventListener("mouseenter", () => { item.style.background = colors.hover; });
      item.addEventListener("mouseleave", () => { item.style.background = ""; });
      menu.appendChild(item);
    }

    parent.appendChild(menu);

    // Close on outside click
    const closeMenu = (e: Event) => {
      if (!parent.contains(e.target as Node)) {
        menu.remove();
        document.removeEventListener("click", closeMenu);
      }
    };
    setTimeout(() => document.addEventListener("click", closeMenu), 0);
  }

  function handleChange(): void {
    updatePlaceholder();

    if (opts.maxLength > 0) {
      const text = editor.innerText ?? "";
      if (text.length > opts.maxLength) {
        // Truncate - simple approach
        editor.innerText = text.slice(0, opts.maxLength);
      }
    }

    opts.onChange?.(editor.innerHTML, editor.innerText ?? "");
  }

  // --- Event Handlers ---

  editor.addEventListener("input", handleChange);

  editor.addEventListener("focus", () => {
    updatePlaceholder();
    opts.onFocus?.();
  });

  editor.addEventListener("blur", () => {
    opts.onBlur?.();
  });

  // Keyboard shortcuts
  editor.addEventListener("keydown", (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      switch (e.key.toLowerCase()) {
        case "b": e.preventDefault(); handleCommand("bold"); break;
        case "i": e.preventDefault(); handleCommand("italic"); break;
        case "u": e.preventDefault(); handleCommand("underline"); break;
      }
    }
  });

  // Clean paste
  if (opts.cleanPaste) {
    editor.addEventListener("paste", (e: ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData?.getData("text/plain") ?? "";
      document.execCommand("insertText", false, text);
    });
  }

  // Initial state
  updatePlaceholder();

  const instance: RichTextEditorInstance = {
    element: root,

    getValue() { return editor.innerHTML; },

    getText() { return editor.innerText ?? ""; },

    setValue(html: string) {
      editor.innerHTML = html;
      handleChange();
    },

    clear() {
      editor.innerHTML = "";
      handleChange();
    },

    execCommand(command: EditorCommand, value?: string) {
      handleCommand(command, value);
    },

    focus() { editor.focus(); },

    blur() { editor.blur(); },

    getCharCount() { return (editor.innerText ?? "").length; },

    getWordCount() {
      const text = (editor.innerText ?? "").trim();
      return text ? text.split(/\s+/).length : 0;
    },

    insertHtml(html: string) {
      editor.focus();
      document.execCommand("insertHTML", false, html);
      handleChange();
    },

    insertLink(url: string, text?: string) {
      editor.focus();
      const sel = window.getSelection();
      const selectedText = sel?.toString() || text || url;
      document.execCommand("insertHTML", false, `<a href="${url}" target="_blank">${selectedText}</a>`);
      handleChange();
    },

    insertImage(src: string, alt?: string) {
      editor.focus();
      document.execCommand("insertHTML", false, `<img src="${src}" alt="${alt ?? ""}" style="max-width:100%;">`);
      handleChange();
    },

    enable() {
      editor.contentEditable = "true";
      opts.readOnly = false;
    },

    disable() {
      editor.contentEditable = "false";
      opts.readOnly = true;
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}

// --- Styles ---

function injectRteStyles(
  colors: { bg: string; surface: string; border: string; text: string; muted: string; accent: string; hover: string },
  placeholder?: string,
): void {
  if (document.getElementById("rte-styles")) return;
  const style = document.createElement("style");
  style.id = "rte-styles";
  style.textContent = `
    .rich-text-editor .rte-editor[data-placeholder]::before {
      content: "${placeholder ?? ""}";
      color: ${colors.muted};
      pointer-events:none;position:absolute;padding:16px;
    }
    .rich-text-editor .rte-editor {
      position:relative;
    }
    .rich-text-editor .rte-editor a { color: ${colors.accent}; }
    .rich-text-editor .rte-editor blockquote {
      border-left:3px solid ${colors.accent};margin:8px 0;padding:4px 12px;color:${colors.muted};
    }
    .rich-text-editor .rte-editor ul, .rich-text-editor .rte-editor ol {
      padding-left:20px;
    }
    .rich-text-editor .rte-editor img { max-width:100%;height:auto; }
    .rich-text-editor .rte-toolbar button[aria-pressed="true"],
    .rich-text-editor .rte-toolbar button.active {
      background:${colors.accent}20;color:${colors.accent};
    }
  `;
  document.head.appendChild(style);
}
