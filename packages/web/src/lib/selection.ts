/**
 * Selection / Range API: Text selection utilities with get/set selection,
 * save/restore cursor position, select all/word/line/paragraph, range
 * manipulation, clipboard integration for selected text, caret position
 * tracking, and highlight management.
 */

// --- Types ---

export interface SelectionRange {
  /** Start container node */
  startContainer: Node;
  /** Offset within start node */
  startOffset: number;
  /** End container node */
  endContainer: Node;
  /** Offset within end node */
  endOffset: number;
  /** Selected text content */
  text: string;
  /** Whether the range is collapsed (cursor only) */
  collapsed: boolean;
  /** Number of characters selected */
  length: number;
}

export interface CaretPosition {
  /** The element the caret is in */
  element: HTMLElement | null;
  /** Line number within the element */
  line: number;
  /** Column number within the line */
  column: number;
  /** Pixel coordinates relative to viewport */
  rect: DOMRect | null;
}

export interface SelectionManagerOptions {
  /** Auto-save selection on blur? (default: false) */
  autoSave?: boolean;
  /** Storage key for saved selections */
  storageKey?: string;
  /** Callback when selection changes */
  onSelectionChange?: (range: SelectionRange | null) => void;
  /** Highlight color for selection ranges */
  highlightColor?: string;
  /** Debounce selection change events (ms) */
  debounceMs?: number;
}

export interface SelectionManagerInstance {
  /** Get current selection as a normalized range */
  getSelection: () => SelectionRange | null;
  /** Get selected text (shorthand) */
  getSelectedText: () => string;
  /** Set selection programmatically */
  setSelection: (range: SelectionRange) => void;
  /** Select all text in an element */
  selectAll: (element?: HTMLElement) => void;
  /** Select word at position */
  selectWordAt: (x: number, y: number) => void;
  /** Select line at position */
  selectLineAt: (x: number, y: number) => void;
  /** Collapse selection to start (move cursor to beginning) */
  collapseToStart: () => void;
  /** Collapse selection to end (move cursor to end) */
  collapseToEnd: () => void;
  /** Remove all selection */
  clearSelection: () => void;
  /** Save current selection for later restoration */
  saveSelection: () => string; // Returns a serialized key
  /** Restore a previously saved selection */
  restoreSelection: (key: string) => boolean;
  /** Get caret/cursor position details */
  getCaretPosition: () => CaretPosition;
  /** Move caret to specific position */
  moveCaretTo: (element: HTMLElement, offset: number) => void;
  /** Insert text at current selection/caret position */
  insertText: (text: string) => void;
  /** Wrap selection with HTML element(s) */
  wrapSelection: (tagName: string, attrs?: Record<string, string>) => void;
  /** Unwrap selection (remove wrapping tags) */
  unwrapSelection: () => void;
  /** Get bounding rects of all selection ranges */
  getSelectionRects: () => DOMRect[];
  /** Check if anything is selected */
  hasSelection: () => boolean;
  /** Copy selected text to clipboard */
  copySelection: () => Promise<boolean>;
  /** Subscribe to selection changes */
  onChange: (callback: (range: SelectionRange | null) => void) => () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Helpers ---

function normalizeSelection(sel: Selection | null): SelectionRange | null {
  if (!sel || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0);
  if (!range) return null;

  return {
    startContainer: range.startContainer,
    startOffset: range.startOffset,
    endContainer: range.endContainer,
    endOffset: range.endOffset,
    text: range.toString(),
    collapsed: range.collapsed,
    length: range.toString().length,
  };
}

function serializeRange(range: SelectionRange): string {
  // Simple serialization using path-based approach
  try {
    return JSON.stringify({
      sC: getNodePath(range.startContainer),
      sO: range.startOffset,
      eC: getNodePath(range.endContainer),
      eO: range.endOffset,
    });
  } catch {
    return "";
  }
}

function deserializeRange(serialized: string): { startContainer: Node; startOffset: number; endContainer: Node; endOffset: number } | null {
  try {
    const data = JSON.parse(serialized);
    return {
      startContainer: resolveNodePath(data.sC),
      startOffset: data.sO,
      endContainer: resolveNodePath(data.eC),
      endOffset: data.eO,
    };
  } catch {
    return null;
  }
}

function getNodePath(node: Node): (number | string)[] {
  const path: (number | string)[] = [];
  let current: Node | null = node;

  while (current && current !== document.body) {
    const parent = current.parentNode;
    if (!parent) break;

    const siblings = Array.from(parent.childNodes);
    const index = siblings.indexOf(current);

    if (current.nodeType === Node.TEXT_NODE) {
      path.unshift("#text", index);
    } else if (current.nodeType === Node.ELEMENT_NODE) {
      path.unshift((current as Element).tagName.toLowerCase(), index);
    }

    current = parent;
  }

  return path;
}

function resolveNodePath(path: (number | string)[]): Node | null {
  if (path.length === 0) return null;

  let current: Node = document.body;

  for (let i = 0; i < path.length; i += 2) {
    const tagOrText = path[i] as string;
    const index = path[i + 1] as number;

    if (tagOrText === "#text") {
      const children = Array.from(current.childNodes);
      current = children[index] ?? current;
    } else {
      const children = Array.from(current.childNodes).filter(
        (n) => n.nodeType === Node.ELEMENT_NODE && (n as Element).tagName.toLowerCase() === tagOrText,
      );
      current = children[index] ?? current;
    }
  }

  return current;
}

// --- Main Class ---

export class SelectionManager {
  create(options: SelectionManagerOptions = {}): SelectionManagerInstance {
    let destroyed = false;
    const listeners = new Set<(range: SelectionRange | null) => void>();
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const savedSelections = new Map<string, string>();

    function notifyChange(): void {
      const sel = normalizeSelection(getSelection());
      options.onSelectionChange?.(sel);
      for (const cb of listeners) cb(sel);
    }

    function debouncedNotify(): void {
      const ms = options.debounceMs ?? 0;
      if (ms > 0) {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(notifyChange, ms);
      } else {
        notifyChange();
      }
    }

    // Listen for selection changes
    document.addEventListener("selectionchange", debouncedNotify);

    // Auto-save on blur
    if (options.autoSave) {
      document.addEventListener("blur", (): void => {
        const sel = getSelection();
        if (sel && !sel.isCollapsed) {
          const key = "auto-save";
          savedSelections.set(key, serializeRange(normalizeSelection(sel)!));
        }
      });
    }

    const instance: SelectionManagerInstance = {

      getSelection(): SelectionRange | null {
        return normalizeSelection(getSelection());
      },

      getSelectedText(): string {
        return window.getSelection()?.toString() ?? "";
      },

      setSelection(range): void {
        if (destroyed) return;
        const sel = window.getSelection();
        if (!sel) return;

        const newRange = new Range();
        newRange.setStart(range.startContainer, range.startOffset);
        newRange.setEnd(range.endContainer, range.endOffset);
        sel.removeAllRanges();
        sel.addRange(newRange);
      },

      selectAll(element?): void {
        const target = element ?? document.body;
        const sel = window.getSelection();
        if (!sel) return;
        const range = new Range();
        range.selectNodeContents(target);
        sel.removeAllRanges();
        sel.addRange(range);
      },

      selectWordAt(x, y): void {
        if (document.caretRangeFromPoint) {
          // Chrome/Safari
          const range = document.caretRangeFromPoint(x, y);
          if (range) {
            range.expand("word");
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
          }
        } else {
          // Firefox fallback — use modify
          const sel = window.getSelection();
          if (sel) {
            sel.collapse(x, y);
            sel.modify("extend", "word", "forward");
            sel.modify("extend", "word", "backward");
          }
        }
      },

      selectLineAt(x, y): void {
        if (document.caretRangeFromPoint) {
          const range = document.caretRangeFromPoint(x, y);
          if (range) {
            range.expand("line");
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
          }
        }
      },

      collapseToStart(): void {
        const sel = window.getSelection();
        if (sel) sel.collapseToStart();
      },

      collapseToEnd(): void {
        const sel = window.getSelection();
        if (sel) sel.collapseToEnd();
      },

      clearSelection(): void {
        window.getSelection()?.removeAllRanges();
      },

      saveSelection(): string {
        const sel = instance.getSelection();
        if (!sel) return "";

        const id = crypto.randomUUID();
        savedSelections.set(id, serializeRange(sel));
        return id;
      },

      restoreSelection(key): boolean {
        const serialized = savedSelections.get(key);
        if (!serialized) return false;

        const deserialized = deserializeRange(serialized);
        if (!deserialized) return false;

        try {
          instance.setSelection({
            ...deserialized,
            text: "",
            collapsed: false,
            length: 0,
          });
          return true;
        } catch {
          return false;
        }
      },

      getCaretPosition(): CaretPosition {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) {
          return { element: null, line: 0, column: 0, rect: null };
        }

        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Find the containing editable element
        let el: HTMLElement | null = range.startContainer as HTMLElement;
        while (el && el.nodeType !== Node.ELEMENT_NODE) {
          el = el.parentNode as HTMLElement;
        }

        // Estimate line/column from offset
        const text = range.startContainer.textContent ?? "";
        const lines = text.slice(0, range.startOffset).split("\n");
        const line = lines.length;
        const column = lines[lines.length - 1]?.length ?? 0;

        return {
          element: el,
          line,
          column,
          rect: rect.width > 0 || rect.height > 0 ? rect : null,
        };
      },

      moveCaretTo(element, offset): void {
        const sel = window.getSelection();
        if (!sel) return;

        // Find a text node within the element
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let remaining = offset;
        let targetNode: Text | null = null;
        let targetOffset = 0;

        while (walker.nextNode()) {
          const node = walker.currentNode as Text;
          if (node.length >= remaining) {
            targetNode = node;
            targetOffset = remaining;
            break;
          }
          remaining -= node.length;
        }

        if (!targetNode) {
          // Position at end of last text node
          // Walk again to find last node
          const walker2 = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
          let last: Text | null = null;
          while (walker2.nextNode()) last = walker2.currentNode as Text;
          if (last) {
            targetNode = last;
            targetOffset = last.length;
          }
        }

        if (targetNode) {
          const range = new Range();
          range.setStart(targetNode, targetOffset);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          targetNode.parentElement?.focus();
        }
      },

      insertText(text): void {
        const sel = window.getSelection();
        if (!sel) return;

        if (!sel.isCollapsed) {
          sel.deleteFromDocument();
        }

        sel.insertNode(document.createTextNode(text));
        sel.collapseToEnd();
      },

      wrapSelection(tagName, attrs?): void {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) return;

        const range = sel.getRangeAt(0);
        const wrapper = document.createElement(tagName);
        if (attrs) {
          for (const [k, v] of Object.entries(attrs)) {
            wrapper.setAttribute(k, v);
          }
        }

        try {
          range.surroundContents(wrapper);
        } catch {
          // Partial selection — use extractContents + append
          const contents = range.extractContents();
          wrapper.appendChild(contents);
          range.insertNode(wrapper);
        }
      },

      unwrapSelection(): void {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) return;

        const range = sel.getRangeAt(0);
        const parent = range.commonAncestorContainer as HTMLElement;

        if (parent && parent.nodeType === Node.ELEMENT_NODE) {
          const fragment = document.createDocumentFragment();
          while (parent.firstChild) {
            fragment.appendChild(parent.firstChild);
          }
          parent.parentNode?.replaceChild(fragment, parent);
        }
      },

      getSelectionRects(): DOMRect[] {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return [];

        const rects: DOMRect[] = [];
        for (let i = 0; i < sel.rangeCount; i++) {
          const range = sel.getRangeAt(i);
          rects.push(...Array.from(range.getClientRects()));
        }
        return rects;
      },

      hasSelection(): boolean {
        const sel = window.getSelection();
        return !!(sel && !sel.isCollapsed && sel.toString().length > 0);
      },

      async copySelection(): Promise<boolean> {
        const text = instance.getSelectedText();
        if (!text) return false;

        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch {
          // Fallback
          return false;
        }
      },

      onChange(callback): () => void {
        listeners.add(callback);
        callback(instance.getSelection()); // Immediate call
        return () => { listeners.delete(callback); };
      },

      destroy(): void {
        if (destroyed) return;
        destroyed = true;
        document.removeEventListener("selectionchange", debouncedNotify);
        if (debounceTimer) clearTimeout(debounceTimer);
        listeners.clear();
        savedSelections.clear();
      },
    };

    return instance;
  }
}

/** Convenience: create a selection manager */
export function createSelectionManager(options?: SelectionManagerOptions): SelectionManagerInstance {
  return new SelectionManager().create(options);
}
