/**
 * Text Selection utilities: Range/Selection API wrapper for managing text
 * selection, cursor position, highlighting, save/restore, word/sentence/line
 * boundary detection, and selection change observation.
 */

// --- Types ---

export interface SelectionRange {
  /** Start container node */
  startNode: Node;
  /** Offset within start node */
  startOffset: number;
  /** End container node */
  endNode: Node;
  /** Offset within end node */
  endOffset: number;
  /** Selected text content */
  text: string;
  /** Bounding rect of the selection */
  rects: DOMRect[];
  /** Whether selection is collapsed (cursor only) */
  collapsed: boolean;
}

export interface CursorPosition {
  node: Node;
  offset: number;
  /** Pixel position relative to viewport */
  rect: DOMRect | null;
  /** Line number within the element (approximate) */
  line: number;
  /** Column number within the line */
  column: number;
}

export interface TextBoundaryOptions {
  /** Element to search within */
  container?: HTMLElement;
  /** Include partial matches at boundaries? */
  inclusive?: boolean;
}

// --- Core Selection API ---

/** Get the current browser Selection as a structured object */
export function getSelection(): SelectionRange | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0);
  return rangeToSelectionRange(range);
}

/** Set the current selection from a Range or coordinates */
export function setSelection(range: Range): void {
  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  sel.addRange(range);
}

/** Clear the current selection */
export function clearSelection(): void {
  window.getSelection()?.removeAllRanges();
}

/** Collapse selection to a point (start or end) */
export function collapseSelection(toStart = false): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  sel.collapse(toStart ? sel.anchorNode : sel.focusNode, toStart ? sel.anchorOffset : sel.focusOffset);
}

/** Select all content within an element */
export function selectAll(el: HTMLElement): void {
  const range = document.createRange();
  range.selectNodeContents(el);
  setSelection(range);
}

/** Select a specific range of text within an element */
export function selectText(
  el: HTMLElement,
  startOffset: number,
  endOffset: number,
): void {
  const range = document.createRange();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);

  let charCount = 0;
  let startNode: Node | null = null;
  let startOff = 0;
  let endNode: Node | null = null;
  let endOff = 0;

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const len = node.textContent?.length ?? 0;

    if (startNode === null && charCount + len >= startOffset) {
      startNode = node;
      startOff = startOffset - charCount;
    }
    if (endNode === null && charCount + len >= endOffset) {
      endNode = node;
      endOff = endOffset - charCount;
      break;
    }

    charCount += len;
  }

  if (startNode && endNode) {
    range.setStart(startNode, startOff);
    range.setEnd(endNode, endOff);
    setSelection(range);
  }
}

/** Get selected text as plain string */
export function getSelectedText(): string {
  return window.getSelection()?.toString() ?? "";
}

/** Get selected HTML */
export function getSelectedHtml(): string {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return "";
  return sel.getRangeAt(0).cloneContents().innerHTML ?? "";
}

// --- Save / Restore ---

let savedRange: Range | null = null;

/** Save the current selection so it can be restored later (e.g., after re-render) */
export function saveSelection(): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    savedRange = null;
    return;
  }
  savedRange = sel.getRangeAt(0).cloneRange();
}

/** Restore a previously saved selection */
export function restoreSelection(): boolean {
  if (!savedRange) return false;
  try {
    setSelection(savedRange);
    return true;
  } catch {
    // Range may be invalid if DOM changed
    savedRange = null;
    return false;
  }
}

/** Clear saved selection */
export function clearSavedSelection(): void {
  savedRange = null;
}

// --- Cursor Position ---

/** Get detailed cursor position info */
export function getCursorPosition(element?: HTMLElement): CursorPosition | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0);
  // Only meaningful for collapsed selections (cursor)
  if (!sel.isCollapsed) return null;

  const node = sel.anchorNode;
  const offset = sel.anchorOffset;

  if (!node) return null;

  // Create a zero-width range at cursor position for rect
  const cursorRange = document.createRange();
  cursorRange.setStart(node, offset);
  cursorRange.setEnd(node, offset);
  const rect = cursorRange.getBoundingClientRect();

  // Calculate approximate line/column
  let line = 1;
  let column = offset + 1;

  if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
    const text = node.textContent ?? "";
    const beforeCursor = text.substring(0, offset);
    const newlines = beforeCursor.match(/\n/g);
    if (newlines) {
      line += newlines.length;
      const lastNewline = beforeCursor.lastIndexOf("\n");
      column = offset - lastNewline;
    }
  }

  return { node, offset, rect, line, column };
}

/** Set cursor position at a specific character offset in an element */
export function setCursorPosition(el: HTMLElement, offset: number): void {
  selectText(el, offset, offset);
}

/** Move cursor by a relative amount (+ forward, - backward) */
export function moveCursor(delta: number): void {
  const sel = window.getSelection();
  if (!sel || !sel.isCollapsed || !sel.anchorNode) return;

  const node = sel.anchorNode;
  const currentOffset = sel.anchorOffset;
  const newOffset = Math.max(0, Math.min((node.textContent?.length ?? 0), currentOffset + delta));

  const range = document.createRange();
  range.setStart(node, newOffset);
  range.setEnd(node, newOffset);
  setSelection(range);
}

// --- Word / Sentence / Line Boundaries ---

/** Expand selection to encompass the full word under cursor */
export function selectWord(options?: TextBoundaryOptions): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;

  const range = sel.getRangeAt(0);
  const container = options?.container ?? document.body;

  if (sel.isCollapsed) {
    // Expand from cursor position to word boundaries
    const node = sel.anchorNode;
    if (node?.nodeType !== Node.TEXT_NODE) return false;

    const text = node.textContent ?? "";
    const offset = sel.anchorOffset;

    // Find word start (go back until non-word char)
    let start = offset;
    while (start > 0 && /\w/.test(text[start - 1]!)) start--;

    // Find word end (go forward until non-word char)
    let end = offset;
    while (end < text.length && /\w/.test(text[end]!)) end++;

    if (start !== end) {
      range.setStart(node, start);
      range.setEnd(node, end);
      setSelection(range);
      return true;
    }
    return false;
  }

  // If already a selection, expand to word boundaries at edges
  expandToWordBoundary(range, container);
  setSelection(range);
  return true;
}

/** Expand selection to encompass the full line */
export function selectLine(options?: TextBoundaryOptions): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;

  const range = sel.getRangeAt(0);
  const container = options?.container ?? document.body;

  if (sel.isCollapsed) {
    const node = sel.anchorNode;
    if (node?.nodeType !== Node.TEXT_NODE) return false;

    const text = node.textContent ?? "";
    const offset = sel.anchorOffset;

    // Find line start
    let start = text.lastIndexOf("\n", offset - 1) + 1;
    // Find line end
    let end = text.indexOf("\n", offset);
    if (end === -1) end = text.length;

    range.setStart(node, start);
    range.setEnd(node, end);
    setSelection(range);
    return true;
  }

  expandToLineBoundary(range, container);
  setSelection(range);
  return true;
}

/** Expand selection to encompass the full sentence */
export function selectSentence(options?: TextBoundaryOptions): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;

  const range = sel.getRangeAt(0);
  const container = options?.container ?? document.body;

  if (sel.isCollapsed) {
    const node = sel.anchorNode;
    if (node?.nodeType !== Node.TEXT_NODE) return false;

    const text = node.textContent ?? "";
    const offset = sel.anchorOffset;

    // Sentence delimiters: . ! ? followed by space or end of string
    let start = findSentenceStart(text, offset);
    let end = findSentenceEnd(text, offset);

    range.setStart(node, Math.max(0, start));
    range.setEnd(node, Math.min(text.length, end));
    setSelection(range);
    return true;
  }

  expandToSentenceBoundary(range, container);
  setSelection(range);
  return true;
}

/** Select all occurrences of the selected text in a container */
export function selectAllOccurrences(container: HTMLElement = document.body): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return 0;

  const searchText = sel.toString().trim();
  if (!searchText || searchText.length < 2) return 0;

  // Use find() API if available
  if (window.find) {
    let count = 0;
    window.getSelection()?.removeAllRanges();
    if (window.find(searchText)) {
      count++;
      while (window.find(searchText)) count++;
    }
    return count;
  }

  // Fallback: manual text node search
  const ranges: Range[] = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = node.textContent ?? "";
    let idx = 0;

    while ((idx = text.indexOf(searchText, idx)) !== -1) {
      const r = document.createRange();
      r.setStart(node, idx);
      r.setEnd(node, idx + searchText.length);
      ranges.push(r);
      idx += searchText.length;
    }
  }

  // Apply first match as selection
  if (ranges.length > 0) {
    setSelection(ranges[0]);
  }

  return ranges.length;
}

// --- Highlighting ---

/** Wrap selected text with a highlight element (e.g., <mark>) */
export function highlightSelection(className = "selection-highlight"): HTMLElement[] {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return [];

  const elements: HTMLElement[] = [];

  for (let i = 0; i < sel.rangeCount; i++) {
    const range = sel.getRangeAt(i);
    if (range.collapsed) continue;

    const mark = document.createElement("mark");
    mark.className = className;

    try {
      range.surroundContents(mark);
      elements.push(mark);
    } catch {
      // Range spans multiple elements; handle per-node
      const contents = range.extractContents();
      mark.appendChild(contents);
      range.insertNode(mark);
      elements.push(mark);
    }
  }

  sel.removeAllRanges();
  return elements;
}

/** Remove all highlights created by highlightSelection */
export function removeHighlights(className = "selection-highlight"): void {
  const marks = document.querySelectorAll(`mark.${className}`);
  for (const mark of marks) {
    const parent = mark.parentNode;
    if (parent) {
      while (mark.firstChild) {
        parent.insertBefore(mark.firstChild, mark);
      }
      parent.removeChild(mark);
    }
  }
}

/** Highlight all matching text in a container */
export function highlightText(
  container: HTMLElement,
  searchText: string,
  options?: { className?: string; caseSensitive?: boolean },
): number {
  const cls = options?.className ?? "text-highlight";
  const caseSensitive = options?.caseSensitive ?? false;
  let count = 0;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);

  const nodes: Text[] = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Text);
  }

  for (const node of nodes) {
    const text = node.textContent ?? "";
    const flags = caseSensitive ? "g" : "gi";
    const regex = new RegExp(escapeRegex(searchText), flags);

    if (regex.test(text)) {
      const parts = text.split(regex);
      const frag = document.createDocumentFragment();

      for (const part of parts) {
        if (regex.test(part) || (caseSensitive ? part === searchText : part.toLowerCase() === searchText.toLowerCase())) {
          const mark = document.createElement("mark");
          mark.className = cls;
          mark.textContent = part;
          frag.appendChild(mark);
          count++;
        } else {
          frag.appendChild(document.createTextNode(part));
        }
      }

      node.parentNode?.replaceChild(frag, node);
    }
  }

  return count;
}

// --- Selection Change Observer ---

/** Observe selection changes with debounced callback */
export function observeSelection(
  callback: (selection: SelectionRange | null) => void,
  debounceMs = 50,
): () => void {
  let lastText = "";

  const handler = (): void => {
    const current = getSelection();
    const currentText = current?.text ?? "";

    // Only fire on actual changes
    if (currentText !== lastText) {
      lastText = currentText;
      callback(current);
    }
  };

  let timer: ReturnType<typeof setTimeout>;
  const debounced = (): void => {
    clearTimeout(timer);
    timer = setTimeout(handler, debounceMs);
  };

  document.addEventListener("selectionchange", debounced);
  return () => {
    clearTimeout(timer);
    document.removeEventListener("selectionchange", debounced);
  };
}

// --- Internal Helpers ---

function rangeToSelectionRange(range: Range): SelectionRange {
  return {
    startNode: range.startContainer,
    startOffset: range.startOffset,
    endNode: range.endContainer,
    endOffset: range.endOffset,
    text: range.toString(),
    rects: Array.from(range.getClientRects()),
    collapsed: range.collapsed,
  };
}

function expandToWordBoundary(range: Range, _container: Element): void {
  // Expand start backward to word boundary
  const startText = range.startContainer.textContent ?? "";
  let start = range.startOffset;
  while (start > 0 && /\w/.test(startText[start - 1]!)) start--;
  range.setStart(range.startContainer, start);

  // Expand end forward to word boundary
  const endText = range.endContainer.textContent ?? "";
  let end = range.endOffset;
  while (end < endText.length && /\w/.test(endText[end]!)) end++;
  range.setEnd(range.endContainer, end);
}

function expandToLineBoundary(range: Range, _container: Element): void {
  const startText = range.startContainer.textContent ?? "";
  let start = startText.lastIndexOf("\n", range.startOffset - 1) + 1;
  range.setStart(range.startContainer, start);

  const endText = range.endContainer.textContent ?? "";
  let end = endText.indexOf("\n", range.endOffset);
  if (end === -1) end = endText.length;
  range.setEnd(range.endContainer, end);
}

function expandToSentenceBoundary(range: Range, _container: Element): void {
  const startText = range.startContainer.textContent ?? "";
  let start = findSentenceStart(startText, range.startOffset);
  range.setStart(range.startContainer, Math.max(0, start));

  const endText = range.endContainer.textContent ?? "";
  let end = findSentenceEnd(endText, range.endOffset);
  range.setEnd(range.endContainer, Math.min(endText.length, end));
}

function findSentenceStart(text: string, offset: number): number {
  // Go back to find sentence start (. ! ? followed by space and capital, or start)
  let pos = offset;
  while (pos > 0) {
    const ch = text[pos - 1]!;
    if (/[.!?]/.test(ch) && (pos >= text.length || text[pos] === " " || text[pos] === "\n")) {
      // Skip the delimiter and any following spaces
      pos++;
      while (pos < text.length && /[ \t]/.test(text[pos]!)) pos++;
      return pos;
    }
    pos--;
  }
  return 0;
}

function findSentenceEnd(text: string, offset: number): number {
  // Go forward to find sentence end (. ! ?)
  let pos = offset;
  while (pos < text.length) {
    if (/[.!?]/.test(text[pos]!)) {
      return pos + 1;
    }
    pos++;
  }
  return text.length;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
