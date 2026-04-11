/**
 * Rich Text Editor: WYSIWYG-style contenteditable wrapper with formatting
 * toolbar, block types (headings, lists, quotes), text styling (bold,
 * italic, underline, strikethrough), color/font controls, link insertion,
 * undo/redo, HTML export/import, plain text extraction, word/char count,
 * placeholder support, auto-save, and keyboard shortcuts.
 */

// --- Types ---

export type BlockType = "p" | "h1" | "h2" | "h3" | "blockquote" | "ul" | "ol" | "pre";
export type TextAlign = "left" | "center" | "right" | "justify";

export interface RichTextOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial HTML content */
  value?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Show toolbar? */
  showToolbar?: boolean;
  /** Read-only mode */
  readOnly?: boolean;
  /** Max character count (0 = unlimited) */
  maxLength?: number;
  /** Auto-save interval in ms (0 = disabled) */
  autoSaveInterval?: number;
  /** Callback on content change */
  onChange?: (html: string, text: string) => void;
  /** Callback on save (auto or manual) */
  onSave?: (html: string) => void;
  /** Callback when max length reached */
  onMaxLength?: () => void;
  /** Allowed HTML tags (empty = all allowed) */
  allowedTags?: string[];
  /** Custom CSS class */
  className?: string;
}

export interface RichTextInstance {
  element: HTMLElement;
  editor: HTMLElement;
  /** Get HTML content */
  getHTML: () => string;
  /** Set HTML content */
  setHTML: (html: string) => void;
  /** Get plain text */
  getText: () => string;
  /** Set plain text */
  setText: (text: string) => void;
  /** Focus editor */
  focus: () => void;
  /** Blur editor */
  blur: () => void;
  /** Is focused? */
  isFocused: () => boolean;
  /** Execute a formatting command */
  execCommand: (command: string, value?: string) => void;
  /** Toggle bold */
  toggleBold: () => void;
  /** Toggle italic */
  toggleItalic: () => void;
  /** Toggle underline */
  toggleUnderline: () => void;
  /** Toggle strikethrough */
  toggleStrikethrough: () => void;
  /** Insert link at selection */
  insertLink: (url: string, text?: string) => void;
  /** Remove link from selection */
  removeLink: () => void;
  /** Set heading level */
  setHeading: (level: number) => void;
  /** Set block type */
  setBlockType: (type: BlockType) => void;
  /** Set text alignment */
  setAlign: (align: TextAlign) => void;
  /** Insert unordered list */
  insertUnorderedList: () => void;
  /** Insert ordered list */
  insertOrderedList: () => void;
  /** Indent */
  indent: () => void;
  /** Outdent */
  outdent: () => void;
  /** Undo */
  undo: () => void;
  /** Redo */
  redo: () => void;
  /** Clear all content */
  clear: () => void;
  /** Word count */
  getWordCount: () => number;
  /** Character count */
  getCharCount: () => number;
  /** Select all */
  selectAll: () => void;
  /** Save manually */
  save: () => void;
  /** Enable/disable edit mode */
  setReadOnly: (readOnly: boolean) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Main Factory ---

export function createRichTextEditor(options: RichTextOptions): RichTextInstance {
  const opts = {
    placeholder: options.placeholder ?? "Start typing...",
    showToolbar: options.showToolbar ?? true,
    readOnly: options.readOnly ?? false,
    maxLength: options.maxLength ?? 0,
    autoSaveInterval: options.autoSaveInterval ?? 0,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("RichTextEditor: container not found");

  let destroyed = false;
  let autoSaveTimer: ReturnType<typeof setInterval> | null = null;

  // Wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `rich-text-editor ${opts.className ?? ""}`;
  wrapper.style.cssText = `
    display:flex;flex-direction:column;border:1px solid #e5e7eb;border-radius:8px;
    overflow:hidden;font-family:-apple-system,sans-serif;
  `;
  container.appendChild(wrapper);

  // Toolbar
  if (opts.showToolbar) {
    const toolbar = buildToolbar();
    wrapper.appendChild(toolbar);
  }

  // Editor area
  const editor = document.createElement("div");
  editor.className = "rte-editor";
  editor.contentEditable = String(!opts.readOnly);
  editor.setAttribute("role", "textbox");
  editor.setAttribute("aria-multiline", "true");
  editor.setAttribute("aria-label", opts.placeholder);
  editor.style.cssText = `
    min-height:200px;padding:16px;outline:none;line-height:1.6;overflow-y:auto;
    ${opts.readOnly ? "background:#f9fafb;" : ""}
  `;
  if (options.value) editor.innerHTML = options.value;

  // Placeholder
  if (opts.placeholder) {
    setupPlaceholder(editor, opts.placeholder);
  }

  wrapper.appendChild(editor);

  // --- Placeholder ---

  function setupPlaceholder(el: HTMLElement, text: string): void {
    el.dataset.placeholder = text;

    const updatePlaceholder = (): void => {
      const hasContent = el.textContent?.trim().length > 0 || el.querySelectorAll("img,br").length > 0;
      el.classList.toggle("has-content", hasContent);
    };

    // Add CSS for placeholder
    const style = document.createElement("style");
    style.textContent = `
      .rte-editor:not(.has-content):before {
        content: attr(data-placeholder);
        color:#9ca3af;pointer-events:none;position:absolute;
        padding:16px;
      }
      .rte-editor { position:relative; }
    `;
    document.head.appendChild(style);

    el.addEventListener("input", updatePlaceholder);
    el.addEventListener("focus", updatePlaceholder);
    el.addEventListener("blur", updatePlaceholder);
    updatePlaceholder();
  }

  // --- Toolbar ---

  function buildToolbar(): HTMLElement {
    const toolbar = document.createElement("div");
    toolbar.className = "rte-toolbar";
    toolbar.style.cssText = `
      display:flex;flex-wrap:wrap;gap:2px;padding:6px 8px;
      background:#f9fafb;border-bottom:1px solid #e5e7eb;align-items:center;
    `;

    const groups: Array<Array<{ cmd: string; label: string; icon?: string; value?: string }>> = [
      [
        { cmd: "bold", label: "Bold", icon: "B" },
        { cmd: "italic", label: "Italic", icon: "I" },
        { cmd: "underline", label: "Underline", icon: "U" },
        { cmd: "strikeThrough", label: "Strikethrough", icon: "S" },
      ],
      [
        { cmd: "formatBlock", label: "Heading 1", value: "<h1>" },
        { cmd: "formatBlock", label: "Heading 2", value: "<h2>" },
        { cmd: "formatBlock", label: "Heading 3", value: "<h3>" },
      ],
      [
        { cmd: "insertUnorderedList", label: "Bullet List" },
        { cmd: "insertOrderedList", label: "Numbered List" },
        { cmd: "formatBlock", label: "Quote", value: "<blockquote>" },
      ],
      [
        { cmd: "justifyLeft", label: "Align Left" },
        { cmd: "justifyCenter", label: "Center" },
        { cmd: "justifyRight", label: "Align Right" },
      ],
      [
        { cmd: "createLink", label: "Link" },
        { cmd: "unlink", label: "Remove Link" },
      ],
      [
        { cmd: "undo", label: "Undo" },
        { cmd: "redo", label: "Redo" },
      ],
    ];

    for (const group of groups) {
      const grpEl = document.createElement("div");
      grpEl.style.cssText = "display:flex;gap:1px;";
      for (const item of group) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = item.icon ?? item.label.slice(0, 3);
        btn.title = item.label;
        btn.style.cssText = toolbarBtnStyle();
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          if (item.cmd === "createLink") {
            const url = prompt("Enter URL:");
            if (url) instance.insertLink(url);
          } else {
            instance.execCommand(item.cmd, item.value);
          }
        });
        grpEl.appendChild(btn);
      }
      toolbar.appendChild(grpEl);
    }

    return toolbar;
  }

  function toolbarBtnStyle(): string {
    return `
      padding:4px 8px;border:1px solid #d1d5db;border-radius:4px;background:#fff;
      cursor:pointer;font-size:12px;font-weight:${(s: string) =>
        s === "B" ? "700" : s === "I" ? "600" : s === "U" ? "600" : "400"};
      color:#374151;transition:all 0.15s;min-width:28px;text-align:center;
    `;
  }

  // --- Content Change Handler ---

  function handleChange(): void {
    const html = instance.getHTML();
    const text = instance.getText();

    if (opts.maxLength > 0 && text.length > opts.maxLength) {
      opts.onMaxLength?.();
    }

    opts.onChange?.(html, text);
  }

  // Debounced change handler
  let changeTimer: ReturnType<typeof setTimeout> | null = null;
  editor.addEventListener("input", () => {
    if (changeTimer) clearTimeout(changeTimer);
    changeTimer = setTimeout(handleChange, 150);
  });

  // Keyboard shortcuts
  editor.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "b") {
      e.preventDefault(); instance.toggleBold();
    } else if ((e.ctrlKey || e.metaKey) && e.key === "i") {
      e.preventDefault(); instance.toggleItalic();
    } else if ((e.ctrlKey || e.metaKey) && e.key === "u") {
      e.preventDefault(); instance.toggleUnderline();
    } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !e.shiftKey) {
      // Allow default behavior for paragraph breaks
    }
  });

  // Tab handling (insert spaces)
  editor.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      document.execCommand("insertText", false, "  ");
    }
  });

  // Paste sanitization
  editor.addEventListener("paste", (e) => {
    if (!opts.allowedTags || opts.allowedTags.length === 0) return;
    e.preventDefault();
    const text = e.clipboardData?.getData("text/html") ?? "";
    const sanitized = sanitizeHTML(text, opts.allowedTags!);
    document.execCommand("insertHTML", false, sanitized);
  });

  // Auto-save
  if (opts.autoSaveInterval > 0) {
    autoSaveTimer = setInterval(() => {
      opts.onSave?.(instance.getHTML());
    }, opts.autoSaveInterval);
  }

  // --- Instance ---

  const instance: RichTextInstance = {
    element: wrapper,
    editor,

    getHTML() { return editor.innerHTML; },

    setHTML(html: string) {
      editor.innerHTML = html;
      handleChange();
    },

    getText() {
      return editor.innerText ?? editor.textContent ?? "";
    },

    setText(text: string) {
      editor.innerHTML = "";
      editor.textContent = text;
      handleChange();
    },

    focus() { editor.focus(); },
    blur() { editor.blur(); },
    isFocused() { return document.activeElement === editor; },

    execCommand(command: string, value?: string) {
      document.execCommand(command, false, value ?? "");
      editor.focus();
      handleChange();
    },

    toggleBold() { instance.execCommand("bold"); },
    toggleItalic() { instance.execCommand("italic"); },
    toggleUnderline() { instance.execCommand("underline"); },
    toggleStrikethrough() { instance.execCommand("strikeThrough"); },

    insertLink(url: string, text?: string) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const linkText = text ?? sel.toString() || url;
        document.execCommand("unlink", false, undefined);
        document.execCommand("createLink", false, url);
        // If no selection, set link text
        if (!sel.toString()) {
          const link = editor.querySelector("a[href]");
          if (link) link.textContent = linkText;
        }
      }
      handleChange();
    },

    removeLink() { instance.execCommand("unlink"); },

    setHeading(level: number) {
      instance.execCommand("formatBlock", `<h${Math.min(Math.max(level, 1), 6)}>`); // clamp 1-6
    },

    setBlockType(type: BlockType) {
      switch (type) {
        case "p": instance.execCommand("formatBlock", "<p>"); break;
        case "h1": case "h2": case "h3":
          instance.setHeading(parseInt(type[1]!)); break;
        case "blockquote": instance.execCommand("formatBlock", "<blockquote>"); break;
        case "ul": instance.insertUnorderedList(); break;
        case "ol": instance.insertOrderedList(); break;
        case "pre": instance.execCommand("formatBlock", "<pre>"); break;
      }
    },

    setAlign(align: TextAlign) {
      instance.execCommand(`justify${align.charAt(0).toUpperCase() + align.slice(1)}`);
    },

    insertUnorderedList() { instance.execCommand("insertUnorderedList"); },
    insertOrderedList() { instance.execCommand("insertOrderedList"); },
    indent() { instance.execCommand("indent"); },
    outdent() { instance.execCommand("outdent"); },
    undo() { instance.execCommand("undo"); },
    redo() { instance.execCommand("redo"); },

    clear() {
      editor.innerHTML = "";
      handleChange();
    },

    getWordCount(): number {
      const text = instance.getText().trim();
      return text.length === 0 ? 0 : text.split(/\s+/).length;
    },

    getCharCount(): number {
      return instance.getText().length;
    },

    selectAll() {
      // Create range covering entire editor
      const range = document.createRange();
      range.selectNodeContents(editor);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    },

    save() { opts.onSave?.(instance.getHTML()); },

    setReadOnly(ro: boolean) {
      editor.contentEditable = String(!ro);
      editor.style.background = ro ? "#f9fafb" : "";
    },

    destroy() {
      destroyed = true;
      if (autoSaveTimer) clearInterval(autoSaveTimer);
      if (changeTimer) clearTimeout(changeTimer);
      wrapper.remove();
    },
  };

  return instance;
}

// --- Sanitization ---

/** Sanitize HTML to only allow specified tags */
export function sanitizeHTML(html: string, allowedTags: string[]): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;

  const walker = document.createTreeWalker(tmp, NodeFilter.SHOW_ELEMENT);
  const toRemove: Element[] = [];

  while (walker.nextNode()) {
    const el = walker.currentNode as Element;
    if (!allowedTags.includes(el.tagName.toLowerCase())) {
      toRemove.push(el);
    }
    // Remove dangerous attributes
    for (const attr of [...el.attributes]) {
      if (attr.name.startsWith("on") || attr.name === "srcdoc") {
        el.removeAttribute(attr.name);
      }
    }
  }

  for (const el of toRemove) {
    // Replace with text content
    const frag = document.createDocumentFragment();
    while (el.firstChild) frag.appendChild(el.firstChild);
    el.parentNode?.replaceChild(frag, el);
  }

  return tmp.innerHTML;
}

/** Strip all HTML tags, returning plain text */
export function stripHTML(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent ?? tmp.innerText ?? "";
}

/** Extract text content with structure preserved (newlines for blocks) */
export function extractStructuredText(html: string): string {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;

  // Add newlines before block elements
  const blockTags = ["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6",
    "LI", "BLOCKQUOTE", "PRE", "BR"];
  for (const tag of blockTags) {
    const els = tmp.querySelectorAll(tag);
    for (const el of els) {
      el.insertBefore(document.createTextNode("\n"), el.firstChild);
      if (tag !== "BR") el.appendChild(document.createTextNode("\n"));
    }
  }

  return (tmp.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
}
