/**
 * Rich Text Toolbar: WYSIWYG formatting toolbar for contenteditable areas.
 * Supports bold, italic, underline, strikethrough, headings, lists,
 * alignment, links, colors, undo/redo, code blocks, blockquotes,
 * and custom button extensions.
 */

// --- Types ---

export type ToolbarButtonId =
  | "bold" | "italic" | "underline" | "strikethrough"
  | "heading1" | "heading2" | "heading3"
  | "unordered-list" | "ordered-list"
  | "align-left" | "align-center" | "align-right" | "justify"
  | "link" | "image" | "code" | "blockquote"
  | "undo" | "redo" | "hr" | "subscript" | "superscript";

export interface ToolbarButton {
  /** Unique ID */
  id: ToolbarButtonId | string;
  /** Label text */
  label: string;
  /** Icon (emoji or SVG string) */
  icon?: string;
  /** Tooltip text */
  tooltip?: string;
  /** Command to execute (document.execCommand) */
  command?: string;
  /** Command value (for insertHTML etc.) */
  commandValue?: string;
  /** Custom click handler (overrides command) */
  onClick?: () => void;
  /** Toggle state? */
  isToggle?: boolean;
  /** Group this button belongs to */
  group?: string;
  /** Keyboard shortcut hint */
  shortcut?: string;
  /** Disabled? */
  disabled?: boolean;
}

export interface RichTextToolbarOptions {
  /** Target contenteditable element */
  target: HTMLElement;
  /** Container element or selector for the toolbar (default: creates floating toolbar) */
  container?: HTMLElement | string;
  /** Buttons to show (default: all common) */
  buttons?: ToolbarButton[];
  /** Show button labels? */
  showLabels?: boolean;
  /** Fixed position mode (vs floating) */
  fixed?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Callback when selection changes (for toggle states) */
  onSelectionChange?: (state: Record<string, boolean>) => void;
  /** Callback when link dialog needed */
  onLinkDialog?: () => Promise<string | null>;
  /** Callback when image insertion needed */
  onImageInsert?: () => Promise<string | null>;
  /** Z-index for floating mode */
  zIndex?: number;
}

export interface RichTextToolbarInstance {
  element: HTMLElement;
  /** Update toggle states based on current selection */
  updateState: () => void;
  /** Execute a command by button ID */
  execCommand: (id: string) => void;
  /** Enable/disable a button */
  setButtonEnabled: (id: string, enabled: boolean) => void;
  /** Add a custom button */
  addButton: (button: ToolbarButton) => void;
  /** Remove a button */
  removeButton: (id: string) => void;
  /** Show/hide the toolbar */
  setVisible: (visible: boolean) => void;
  /** Destroy instance */
  destroy: () => void;
}

// --- Default Button Config ---

const DEFAULT_BUTTONS: ToolbarButton[] = [
  { id: "undo", label: "Undo", icon: "\u21BA", tooltip: "Undo (Ctrl+Z)", command: "undo", shortcut: "Ctrl+Z" },
  { id: "redo", label: "Redo", icon: "\u21BB", tooltip: "Redo (Ctrl+Y)", command: "redo", shortcut: "Ctrl+Y" },
  { id: "separator-1", label: "|", id: "sep1" as unknown as ToolbarButtonId },
  { id: "bold", label: "Bold", icon: "<b>B</b>", tooltip: "Bold (Ctrl+B)", command: "bold", isToggle: true, shortcut: "Ctrl+B" },
  { id: "italic", label: "Italic", icon: "<i>I</i>", tooltip: "Italic (Ctrl+I)", command: "italic", isToggle: true, shortcut: "Ctrl+I" },
  { id: "underline", label: "Underline", icon: "<u>U</u>", tooltip: "Underline (Ctrl+U)", command: "underline", isToggle: true, shortcut: "Ctrl+U" },
  { id: "strikethrough", label: "Strike", icon: "<s>S</s>", tooltip: "Strikethrough", command: "strikeThrough", isToggle: true },
  { id: "separator-2", label: "|", id: "sep2" as unknown as ToolbarButtonId },
  { id: "heading1", label: "H1", icon: "H1", tooltip: "Heading 1", command: "formatBlock", commandValue: "h1" },
  { id: "heading2", label: "H2", icon: "H2", tooltip: "Heading 2", command: "formatBlock", commandValue: "h2" },
  { id: "heading3", label: "H3", icon: "H3", tooltip: "Heading 3", command: "formatBlock", commandValue: "h3" },
  { id: "separator-3", label: "|", id: "sep3" as unknown as ToolbarButtonId },
  { id: "unordered-list", label: "UL", icon: "\u2022 List", tooltip: "Bullet List", command: "insertUnorderedList", isToggle: true },
  { id: "ordered-list", label: "OL", icon: "1. List", tooltip: "Numbered List", command: "insertOrderedList", isToggle: true },
  { id: "separator-4", label: "|", id: "sep4" as unknown as ToolbarButtonId },
  { id: "align-left", label: "\u2190", icon: "\u2190", tooltip: "Align Left", command: "justifyLeft", isToggle: true },
  { id: "align-center", label: "\u2194", icon: "\u2194", tooltip: "Align Center", command: "justifyCenter", isToggle: true },
  { id: "align-right", label: "\u2192", icon: "\u2192", tooltip: "Align Right", command: "justifyRight", isToggle: true },
  { id: "separator-5", label: "|", id: "sep5" as unknown as ToolbarButtonId },
  { id: "link", label: "Link", icon: "\uD83D\uDD17", tooltip: "Insert Link" },
  { id: "code", label: "Code", icon: "&lt;/&gt;", tooltip: "Code Block", command: "formatBlock", commandValue: "pre" },
  { id: "blockquote", label: "Quote", icon: "\u201C", tooltip: "Blockquote", command: "formatBlock", commandValue: "blockquote" },
  { id: "hr", label: "HR", icon: "\u2014", tooltip: "Horizontal Rule", command: "insertHorizontalRule" },
];

// --- Main Factory ---

export function createRichTextToolbar(options: RichTextToolbarOptions): RichTextToolbarInstance {
  const opts = {
    showLabels: options.showLabels ?? false,
    fixed: options.fixed ?? false,
    zIndex: options.zIndex ?? 1000,
    className: options.className ?? "",
    ...options,
  };

  const target = options.target;

  // Create toolbar element
  const toolbar = document.createElement("div");
  toolbar.className = `rich-text-toolbar ${opts.className}`;
  toolbar.setAttribute("role", "toolbar");
  toolbar.style.cssText = `
    display:flex;align-items:center;gap:2px;padding:6px 8px;
    background:#f8fafc;border-bottom:1px solid #e2e8f0;
    font-family:-apple-system,sans-serif;font-size:13px;
    flex-wrap:wrap;${opts.fixed ? "" : `position:absolute;z-index:${opts.zIndex};display:none;top:-9999px;left:0;`}
  `;

  const buttons = opts.buttons ?? DEFAULT_BUTTONS;
  const buttonMap = new Map<string, { el: HTMLElement; config: ToolbarButton }>();
  let destroyed = false;

  // Build toolbar
  let currentGroup: HTMLDivElement | null = null;

  for (const btn of buttons) {
    if (btn.id.startsWith("separator") || btn.id === "sep1" || btn.id === "sep2" || btn.id === "sep3" || btn.id === "sep4" || btn.id === "sep5") {
      const sep = document.createElement("div");
      sep.className = "toolbar-separator";
      sep.style.cssText = "width:1px;height:20px;background:#d1d5db;margin:0 4px;";
      toolbar.appendChild(sep);
      currentGroup = null;
      continue;
    }

    // Grouped buttons
    if (btn.group && (!currentGroup || currentGroup.dataset.group !== btn.group)) {
      currentGroup = document.createElement("div");
      currentGroup.className = "toolbar-group";
      currentGroup.style.cssText = "display:flex;gap:1px;";
      currentGroup.dataset.group = btn.group;
      toolbar.appendChild(currentGroup);
    }

    const parent = currentGroup ?? toolbar;

    const btnEl = document.createElement("button");
    btnEl.type = "button";
    btnEl.className = `toolbar-btn ${btn.isToggle ? "toolbar-toggle" : ""}`;
    btnEl.dataset.btnId = btn.id;
    btnEl.title = `${btn.tooltip ?? btn.label}${btn.shortcut ? ` (${btn.shortcut})` : ""}`;

    btnEl.style.cssText = `
      display:inline-flex;align-items:center;justify-content:center;
      min-width:28px;height:28px;padding:0 6px;
      border:1px solid transparent;border-radius:4px;
      background:none;color:#374151;cursor:pointer;
      font-size:12px;font-family:inherit;line-height:1;
      transition:background 0.1s,border-color 0.1s,color 0.1s;
      ${btn.disabled ? "opacity:0.4;cursor:not-allowed;" : ""}
    `;

    // Icon or label
    if (btn.icon) {
      const iconSpan = document.createElement("span");
      iconSpan.innerHTML = btn.icon;
      iconSpan.style.cssText = "line-height:1;display:flex;align-items:center;";
      btnEl.appendChild(iconSpan);
    }
    if (opts.showLabels || !btn.icon) {
      const labelSpan = document.createElement("span");
      labelSpan.textContent = btn.label;
      labelSpan.style.cssText = btn.icon ? "margin-left:3px;font-size:11px;" : "";
      btnEl.appendChild(labelSpan);
    }

    // Click handler
    btnEl.addEventListener("click", () => handleButtonClick(btn));

    // Hover
    btnEl.addEventListener("mouseenter", () => {
      if (!btn.disabled) btnEl.style.background = "#e5e7eb";
    });
    btnEl.addEventListener("mouseleave", () => {
      if (!btn.disabled) btnEl.style.background = "none";
    });

    parent.appendChild(btnEl);
    buttonMap.set(btn.id, { el: btnEl, config: btn });
  }

  // Attach toolbar
  if (opts.container) {
    const c = typeof opts.container === "string"
      ? document.querySelector<HTMLElement>(opts.container)!
      : opts.container;
    c.appendChild(toolbar);
  } else {
    // Floating: position relative to target
    if (target.parentElement) {
      target.parentElement.style.position = target.parentElement.style.position || "relative";
      target.parentElement.insertBefore(toolbar, target);
    }
  }

  // --- Event Handlers ---

  async function handleButtonClick(btn: ToolbarButton): Promise<void> {
    if (btn.disabled || destroyed) return;
    target.focus();

    switch (btn.id) {
      case "link": {
        const url = await opts.onLinkDialog?.() ?? prompt("Enter URL:");
        if (url) {
          document.execCommand("createLink", false, url);
        }
        break;
      }
      case "image": {
        const src = await opts.onImageInsert?.() ?? prompt("Enter image URL:");
        if (src) {
          document.execCommand("insertImage", false, src);
        }
        break;
      }
      default:
        if (btn.onClick) {
          btn.onClick();
        } else if (btn.command) {
          document.execCommand(btn.command, false, btn.commandValue ?? undefined);
        }
    }

    updateState();
  }

  // Selection tracking
  function updateState(): void {
    if (destroyed) return;

    const state: Record<string, boolean> = {};

    for (const [id, { el, config }] of buttonMap) {
      if (config.isToggle && config.command) {
        const active = document.queryCommandState(config.command);
        state[id] = active;
        el.style.background = active ? "#dbeafe" : "none";
        el.style.borderColor = active ? "#93c5fd" : "transparent";
        el.style.color = active ? "#2563eb" : "#374151";
      }
    }

    opts.onSelectionChange?.(state);

    // Position floating toolbar
    if (!opts.fixed) {
      positionToolbar();
    }
  }

  function positionToolbar(): void {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      toolbar.style.display = "none";
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    // Only show if selection is within target
    if (rect.top >= targetRect.top - 50 && rect.bottom <= targetRect.bottom + 50) {
      toolbar.style.display = "flex";
      const top = rect.top - toolbar.offsetHeight - 4 + window.scrollY;
      toolbar.style.top = `${Math.max(0, top)}px`;
      toolbar.style.left = `${rect.left + window.scrollX}px`;
    } else {
      toolbar.style.display = "none";
    }
  }

  // Bind events
  target.addEventListener("mouseup", updateState);
  target.addEventListener("keyup", updateState);
  target.addEventListener("focus", () => {
    if (!opts.fixed) setTimeout(updateState, 10);
  });

  // Hide on blur (with delay for toolbar clicks)
  target.addEventListener("blur", () => {
    if (!opts.fixed) {
      setTimeout(() => {
        if (!toolbar.contains(document.activeElement)) {
          toolbar.style.display = "none";
        }
      }, 150);
    }
  });

  // Instance
  const instance: RichTextToolbarInstance = {
    element: toolbar,

    updateState,

    execCommand(id: string) {
      const entry = buttonMap.get(id);
      if (entry) handleButtonClick(entry.config);
    },

    setButtonEnabled(id: string, enabled: boolean) {
      const entry = buttonMap.get(id);
      if (entry) {
        entry.el.disabled = !enabled;
        entry.el.style.opacity = enabled ? "1" : "0.4";
        entry.el.style.cursor = enabled ? "pointer" : "not-allowed";
      }
    },

    addButton(button: ToolbarButton) {
      // Append to end of toolbar
      const btnEl = document.createElement("button");
      btnEl.type = "button";
      btnEl.textContent = button.label;
      btnEl.dataset.btnId = button.id;
      btnEl.title = button.tooltip ?? button.label;
      btnEl.style.cssText = `
        padding:4px 8px;border:1px solid #d1d5db;border-radius:4px;
        background:#fff;cursor:pointer;font-size:12px;margin-left:2px;
      `;
      btnEl.addEventListener("click", () => handleButtonClick(button));
      toolbar.appendChild(btnEl);
      buttonMap.set(button.id, { el: btnEl, config: button });
    },

    removeButton(id: string) {
      const entry = buttonMap.get(id);
      if (entry) {
        entry.el.remove();
        buttonMap.delete(id);
      }
    },

    setVisible(visible: boolean) {
      toolbar.style.display = visible ? "flex" : "none";
    },

    destroy() {
      destroyed = true;
      toolbar.remove();
    },
  };

  return instance;
}
