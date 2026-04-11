/**
 * Copy/Paste utilities: clipboard API wrapper, rich text copy,
 * image copy, cross-origin considerations, paste event handling,
 * format detection, and command fallback.
 */

// --- Types ---

export interface CopyOptions {
  /** Plain text to copy */
  text?: string;
  /** HTML content (for rich paste) */
  html?: string;
  /** Image data URL or blob */
  image?: string | Blob;
  /** Target element for selection-based copy */
  element?: HTMLElement;
  /** Format to use ('text', 'html', 'image') */
  format?: "text" | "html" | "image";
}

export interface PasteEvent {
  /** Plain text content */
  text: string;
  /** HTML content (if available) */
  html?: string;
  /** Image blob (if pasted) */
  image?: Blob;
  /** Files from file paste */
  files: File[];
  /** Raw DataTransfer object */
  dataTransfer: DataTransfer;
  /** Whether any content was found */
  hasContent: boolean;
}

export interface ClipboardHistoryEntry {
  id: string;
  text: string;
  html?: string;
  timestamp: number;
  source?: string;
}

// --- Copy Functions ---

/** Copy plain text to clipboard */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return fallbackCopyText(text);
  }
}

/** Copy HTML to clipboard */
export async function copyHtml(html: string): Promise<boolean> {
  try {
    const blob = new Blob([html], { type: "text/html" });
    const item = [new ClipboardItem({ "text/html": blob })];
    await navigator.clipboard.write(item);
    return true;
  } catch {
    return fallbackCopyHtml(html);
  }
}

/** Copy an image (data URL or Blob) to clipboard */
export async function copyImage(image: string | Blob): Promise<boolean> {
  try {
    let blob: Blob;
    if (typeof image === "string") {
      const response = await fetch(image);
      blob = await response.blob();
    } else {
      blob = image;
    }
    const item = [new ClipboardItem({ "image/png": blob })];
    await navigator.clipboard.write(item);
    return true;
  } catch {
    console.warn("[copy-paste] Image copy failed, trying fallback");
    // Fallback: can't really do image copy with execCommand
    return false;
  }
}

/** Copy the selected content of an element */
export async function copyElementContent(element: HTMLElement): Promise<boolean> {
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  if (!selection) return false;

  selection.removeAllRanges();
  selection.addRange(range);

  try {
    const success = document.execCommand("copy");
    selection.removeAllRanges();
    return success;
  } catch {
    selection.removeAllRanges();
    return false;
  }
}

/** Generic copy using options */
export async function copy(options: CopyOptions): Promise<boolean> {
  if (options.element) return copyElementContent(options.element);
  if (options.html && options.format === "html") return copyHtml(options.html);
  if (options.image) return copyImage(options.image);
  if (options.text) return copyText(options.text);
  return false;
}

// --- Paste Functions ---

/** Read text from clipboard */
export async function readClipboardText(): Promise<string> {
  try {
    return await navigator.clipboard.readText();
  } catch {
    return "";
  }
}

/** Read from a paste event, extracting all formats */
export function extractPasteData(event: ClipboardEvent): PasteEvent {
  const dt = event.clipboardData;
  if (!dt) {
    return { text: "", files: [], dataTransfer: dt as unknown as DataTransfer, hasContent: false };
  }

  const text = dt.getData("text/plain") ?? "";
  const html = dt.getData("text/html") ?? undefined;
  const files = Array.from(dt.files);

  // Check for image in items
  let image: Blob | undefined;
  for (let i = 0; i < dt.items.length; i++) {
    const item = dt.items[i];
    if (item?.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) { image = file; break; }
    }
  }

  return {
    text,
    html,
    image,
    files,
    dataTransfer: dt,
    hasContent: !!(text || html || files.length > 0 || image),
  };
}

// --- Fallbacks ---

function fallbackCopyText(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  const success = document.execCommand("copy");
  document.body.removeChild(textarea);
  return success;
}

function fallbackCopyHtml(html: string): boolean {
  const div = document.createElement("div");
  div.contentEditable = "true";
  div.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0";
  div.innerHTML = html;
  document.body.appendChild(div);
  const range = document.createRange();
  range.selectNodeContents(div);
  const sel = window.getSelection();
  if (!sel) { document.body.removeChild(div); return false; }
  sel.removeAllRanges();
  sel.addRange(range);
  const success = document.execCommand("copy");
  sel.removeAllRanges();
  document.body.removeChild(div);
  return success;
}

// --- Clipboard History ---

/** In-memory clipboard history (session-only) */
class ClipboardHistoryStore {
  private entries: ClipboardHistoryEntry[] = [];
  private maxSize: number;

  constructor(maxSize = 50) {
    this.maxSize = maxSize;
  }

  push(entry: Omit<ClipboardHistoryEntry, "id">): void {
    const record: ClipboardHistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    this.entries.unshift(record);
    if (this.entries.length > this.maxSize) {
      this.entries = this.entries.slice(0, this.maxSize);
    }
  }

  getAll(): ClipboardHistoryEntry[] {
    return [...this.entries];
  }

  getLast(): ClipboardHistoryEntry | undefined {
    return this.entries[0];
  }

  clear(): void {
    this.entries = [];
  }

  findByText(query: string): ClipboardHistoryEntry[] {
    const lower = query.toLowerCase();
    return this.entries.filter((e) => e.text.toLowerCase().includes(lower));
  }
}

const globalHistory = new ClipboardHistoryStore();

/** Push current clipboard content to history */
export async function pushToHistory(source?: string): Promise<void> {
  const text = await readClipboardText();
  if (text) globalHistory.push({ text, source });
}

/** Get clipboard history */
export function getClipboardHistory(): ClipboardHistoryEntry[] {
  return globalHistory.getAll();
}

/** Search clipboard history */
export function searchHistory(query: string): ClipboardHistoryEntry[] {
  return globalHistory.findByText(query);
}

/** Clear clipboard history */
export function clearHistory(): void {
  globalHistory.clear();
}

// --- Permission Helpers ---

/** Check if clipboard write permission is granted */
export async function checkClipboardPermission(): Promise<"granted" | "denied" | "prompt"> {
  try {
    const result = await navigator.clipboard.queryPermission({ name: "clipboard-write" });
    return result.state as "granted" | "denied" | "prompt";
  } catch {
    return "prompt";
  }
}

/** Request clipboard write permission */
export async function requestClipboardPermission(): Promise<boolean> {
  try {
    const result = await navigator.clipboard.requestPermission({ name: "clipboard-write" });
    return result === "granted";
  } catch {
    return false;
  }
}
