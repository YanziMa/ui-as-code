/**
 * Selection Utilities: Text selection, range manipulation, caret position,
 * contenteditable helpers, highlight management, and cross-selection detection.
 */

// --- Types ---

export interface SelectionRange {
  startOffset: number;
  endOffset: number;
  text: string;
  container: HTMLElement;
}

export interface CaretPosition {
  node: Node;
  offset: number;
}

export interface Rect {
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
}

// --- Selection API Wrapper ---

/** Get the current window selection as a normalized range */
export function getSelection(): SelectionRange | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0);
  if (!range) return null;

  const container = range.commonAncestorContainer;
  if (!(container instanceof HTMLElement)) return null;

  const text = range.toString();
  const preSelRange = range.cloneRange();

  return {
    startOffset: range.startOffset,
    endOffset: range.endOffset,
    text,
    container,
    _range: preSelRange,
  };
}

/** Set the current selection */
export function setSelection(range: SelectionRange): void {
  const sel = window.getSelection();
  sel.removeAllRanges();

  try {
    const r = document.createRange();
    r.setStart(range.container, range.startOffset);
    r.setEnd(range.container, range.endOffset);
    sel.addRange(r);
  } catch { /* ignore */ }
}

/** Clear the current selection */
export function clearSelection(): void {
  window.getSelection()?.removeAllRanges();
}

/** Get selected text (convenience) */
export function getSelectedText(): string {
  return window.getSelection()?.toString() ?? "";
}

// --- Caret Position ---

/** Get the caret position within a contenteditable element */
export function getCaretPosition(el: HTMLElement): CaretPosition | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0)!;

  let node: Node | null = range.startContainer;
  let offset = range.startOffset;

  // Walk up to find an element
  while (node && node !== el) {
    if (node.previousSibling) {
      offset += (node.previousSibling.textContent?.length ?? 0);
    }
    node = node.parentNode;
  }

  return { node: range.startContainer, offset };
}

/** Set caret position within a contenteditable element */
export function setCaretPosition(el: HTMLElement, offset: number): void {
  const sel = window.getSelection();
  const range = document.createRange();

  // Find the text node at offset
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, false);

  let currentLength = 0;
  let targetNode: Node | null = null;
  let targetOffset = 0;

  while (walker.nextNode()) {
    const len = walker.currentNode.textContent?.length ?? 0;
    if (currentLength + len >= offset) {
      targetNode = walker.currentNode;
      targetOffset = offset - currentLength;
      break;
    }
    currentLength += len;
  }

  if (targetNode) {
    range.setStart(targetNode, targetOffset);
    range.setEnd(targetNode, targetOffset);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

/** Move caret relative to current position */
export function moveCaret(el: HTMLElement, delta: number): void {
  const pos = getCaretPosition(el);
  if (pos) setCaretPosition(el, Math.max(0, pos.offset + delta));
}

/** Get caret coordinates (pixel position relative to viewport) */
export function getCaretCoordinates(): { x: number; y: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0)!;
  const rect = range.getBoundingClientRect();
  return { x: rect.right, y: rect.top + rect.height / 2 };
}

// --- ContentEditable Helpers ---

/** Make an element contenteditable with options */
export function makeContentEditable(
  el: HTMLElement,
  options: { plaintext?: boolean; spellcheck?: boolean; autocapitalize?: boolean } = {},
): () => void {
  const opts = { plaintext: false, spellcheck: true, autocapitalize: true, ...options };

  el.contentEditable = "plaintext" ? "true" : "inherit";
  el.setAttribute("spellcheck", String(opts.spellcheck));
  el.setAttribute("autocitalize", String(opts.autocapitalize));

  // Focus and select all on click for convenience
  el.addEventListener("focus", () => {
    if (opts.plaintext && el.textContent) {
      // Select all on focus for easy replacement
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  });

  return () => {
    el.removeAttribute("contenteditable");
    el.removeAttribute("spellcheck");
    el.removeAttribute("autocapitalize");
  };
}

/** Insert text at caret position */
export function insertAtCaret(el: HTMLElement, text: string): boolean {
  const sel = window.getSelection();
  if (!sel.rangeCount) return false;

  // Use execCommand for proper undo support
  el.focus();
  document.execCommand("insertText", false, text);
  return true;
}

/** Insert HTML at caret position */
export function insertHtmlAtCaret(el: HTMLElement, html: string): boolean {
  const sel = window.getSelection();
  if (!sel.rangeCount) return false;

  el.focus();
  document.execCommand("insertHTML", false, html);
  return true;
}

/** Wrap selected text with HTML element */
export function wrapSelection(tagName: string, attributes?: Record<string, string>): boolean {
  const sel = window.getSelection();
  if (!sel.rangeCount || sel.isCollapsed) return false;

  const range = sel.getRangeAt(0)!;
  if (range.collapsed) return false;

  // Create wrapper element
  const wrapper = document.createElement(tagName);
  if (attributes) {
    for (const [k, v] of Object.entries(attributes)) {
      wrapper.setAttribute(k, v);
    }
  }

  try {
    range.surroundContents(wrapper);
    return true;
  } catch {
    return false;
  }
}

/** Remove wrapping from selection */
export function unwrapSelection(): boolean {
  const sel = window.getSelection();
  if (!sel.rangeCount || sel.isCollapsed) return false;

  const range = sel.getRangeAt(0)!;
  const contents = range.extractContents();
  const frag = document.createDocumentFragment();

  while (contents.firstChild) {
    frag.appendChild(contents.firstChild);
  }

  range.insertNode(frag);
  return true;
}

// --- Highlight Management ---

/** Apply highlighting to a range of text */
export function highlightRange(
  el: HTMLElement,
  startOffset: number,
  endOffset: number,
  className = "highlighted",
  color?: string,
  bgColor?: string,
): void {
  const text = el.textContent ?? "";
  if (startOffset < 0) startOffset = 0;
  if (endOffset > text.length) endOffset = text.length;

  const before = text.slice(0, startOffset);
  const highlighted = text.slice(startOffset, endOffset);
  const after = text.slice(endOffset);

  const spanColor = color ? `color:${color};` : "";
  const spanBg = bgColor ? `background:${bgColor};` : "";

  el.innerHTML = `${escapeHtml(before)}<span class="${className}" style="${spanColor}${spanBg}">${escapeHtml(highlighted)}</span>${escapeHtml(after)}`;
}

/** Remove all highlights from an element */
export function removeHighlights(el: HTMLElement, className = "highlighted"): void {
  const spans = el.querySelectorAll(`.${className}`);
  for (const span of spans) {
    const parent = span.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(span.textContent), span);
    }
  }
}

/** Find all occurrences of text and highlight them */
export function highlightAll(
  el: HTMLElement,
  searchText: string,
  options?: { className?: string; caseSensitive?: boolean; wholeWord?: boolean },
): number {
  const cls = options?.className ?? "highlighted";
  const caseSensitive = options?.caseSensitive ?? false;
  const wholeWord = options?.wholeWord ?? false;

  const text = el.textContent ?? "";
  if (!searchText) return 0;

  const searchRegex = wholeWord
    ? new RegExp(`\\b${escapeRegExp(searchText)}\\b`, caseSensitive ? "g" : "gi")
    : new RegExp(escapeRegExp(searchText), caseSensitive ? "g" : "gi");

  const matches: Array<{ start: number; end: number }> = [];
  let match: RegExpExecArray | null;

  while ((match = searchRegex.exec(text)) !== null) {
    matches.push({ start: match.index, end: match.index + match[0].length });
  }

  // Build highlighted HTML from right to left to preserve offsets
  let result = "";
  let lastEnd = text.length;

  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i]!;
    result = escapeHtml(text.slice(m.start, m.end)) +
      `<span class="${cls}">${escapeHtml(text.slice(m.start, m.end))}</span>` +
      escapeHtml(text.slice(lastEnd, lastEnd));
    lastEnd = m.start;
  }

  result = escapeHtml(text.slice(0, lastEnd)) + result;
  el.innerHTML = result;

  return matches.length;
}

// --- Range/Rect Utilities ---

/** Get bounding rect of a range */
export function getRangeRect(): Rect | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0)!;
  return range.getBoundingClientRect() as Rect;
}

/** Check if a point is inside a selection */
export function isPointInSelection(x: number, y: number): boolean {
  const rect = getRangeRect();
  if (!rect) return false;

  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

/** Select all text in an element */
export function selectAll(el: HTMLElement): void {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

/** Select text between two positions */
export function selectBetween(
  el: HTMLElement,
  startPos: { node: Node; offset: number },
  endPos: { node: Node; offset: number },
): void {
  const range = document.createRange();
  range.setStart(startPos.node, startPos.offset);
  range.setEnd(endPos.node, endPos.offset);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

// --- Cross-Selection Detection ---

/** Detect if user is actively selecting (mouse is down after initial mousedown) */
export function createSelectionDetector(): {
  let isSelecting = false;
  let selectionStart: { x: number; y: number } | null = null;
  let hasMoved = false;

  document.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    // Check if clicking on or near text content
    const target = e.target as HTMLElement;
    if (isSelectable(target)) {
      isSelecting = true;
      hasMoved = false;
      selectionStart = { x: e.clientX, y: e.clientY };
    }
  }, true);

  document.addEventListener("mousemove", (e) => {
    if (isSelecting && selectionStart) {
      const dx = e.clientX - selectionStart.x;
      const dy = e.clientY - selectionStart.y;
      if (Math.sqrt(dx * dx + dy * dy) > 3) hasMoved = true;
    }
  });

  document.addEventListener("mouseup", () => {
    if (isSelecting) {
      isSelecting = false;
      selectionStart = null;
    }
  }, true);

  return {
    isSelecting: () => isSelecting && hasMoved,
    wasRealSelection: () => hasMoved,
  };
}

function isSelectable(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (["input", "textarea", "select", "button"].includes(tag)) return false;
  const style = getComputedStyle(el);
  return style.userSelect !== "none" &&
    style.webkitUserSelect !== "none";
}

// --- Internal ---

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
