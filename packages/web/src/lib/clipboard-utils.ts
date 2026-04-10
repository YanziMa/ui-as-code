/**
 * Clipboard Utilities: Clipboard API wrapper with copy/paste/cut,
 * rich text (HTML), images, files, permissions handling,
 * cross-browser fallbacks, format detection, and history.
 */

// --- Types ---

export interface ClipboardData {
  text: string;
  html?: string;
  image?: Blob | null;
  files?: File[];
  formats?: string[];
}

export interface CopyOptions {
  /** Plain text to copy */
  text?: string;
  /** HTML content to copy */
  html?: string;
  /** Image blob to copy */
  image?: Blob;
  /** Files to copy */
  files?: File[];
  /** Fallback for browsers without Clipboard API */
  fallbackText?: string;
  /** Whether to show success feedback (default: true) */
  showToast?: boolean;
  /** Custom toast message */
  toastMessage?: string;
  /** Toast duration in ms */
  toastDuration?: number;
}

export interface PasteOptions {
  /** Accept only these MIME types */
  acceptTypes?: string[];
  /** Accept only these file types (extensions) */
  acceptExtensions?: string[];
  /** Max total size in bytes */
  maxSize?: number;
  /** Max file count */
  maxFiles?: number;
}

export interface PasteResult {
  text: string;
  html: string;
  image: Blob | null;
  files: File[];
  rawFormats: string[];
}

export interface ClipboardHistoryEntry {
  id: string;
  data: ClipboardData;
  timestamp: number;
  source: "copy" | "cut" | "paste";
}

export interface ClipboardHistoryOptions {
  /** Max entries to keep (default: 50) */
  maxSize?: number;
  /** Persist across sessions via localStorage? (default: false) */
  persist?: boolean;
  /** Storage key for persistence */
  storageKey?: string;
  /** Exclude sensitive patterns from history */
  excludePatterns?: RegExp[];
}

// --- Permission Handling ---

/** Request clipboard-write permission (required by most browsers for programmatic write) */
export async function requestClipboardPermission(): Promise<boolean> {
  try {
    const result = await navigator.permissions.query({ name: "clipboard-write" as PermissionName });
    return result.state === "granted" || result.state === "prompt";
  } catch {
    // Permissions API not available — try anyway
    return true;
  }
}

/** Check if clipboard-read permission is available */
export async function checkClipboardReadPermission(): Promise<boolean> {
  try {
    const result = await navigator.permissions.query({ name: "clipboard-read" as PermissionName });
    return result.state === "granted";
  } catch {
    return false;
  }
}

/** Check if Clipboard API is fully supported */
export function isClipboardSupported(): boolean {
  return !!(navigator.clipboard && typeof navigator.clipboard.writeText === "function");
}

// --- Core Copy Operations ---

/**
 * Copy text to clipboard with fallback.
 * Returns true if successful.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  try {
    if (isClipboardSupported()) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}

  // Fallback: execCommand
  return fallbackCopy(text);
}

/**
 * Copy rich content (text + HTML) to clipboard.
 */
export async function copyRich(options: CopyOptions): Promise<boolean> {
  const { text, html, image, files } = options;

  try {
    if (navigator.clipboard && typeof (navigator.clipboard as any).write === "function") {
      const parts: ClipboardItem[] = [];

      if (html && text) {
        parts.push(new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text ?? html], { type: "text/plain" }),
        }));
      } else if (text) {
        parts.push(new ClipboardItem({
          "text/plain": new Blob([text], { type: "text/plain" }),
        }));
      }

      if (image) {
        parts.push(new ClipboardItem({
          [image.type]: image,
        }));
      }

      if (parts.length > 0) {
        await (navigator.clipboard as any).write(parts);
        return true;
      }
    }
  } catch {}

  // Fallback to plain text
  if (text) return copyToClipboard(text);
  if (html) return copyToClipboard(html.replace(/<[^>]+>/g, ""));
  return false;
}

/**
 * Copy an image (Blob or canvas) to clipboard.
 */
export async function copyImage(image: Blob | HTMLCanvasElement): Promise<boolean> {
  let blob: Blob;
  if (image instanceof HTMLCanvasElement) {
    blob = await new Promise<Blob>((resolve) => image.toBlob((b) => resolve(b!)));
  } else {
    blob = image;
  }

  try {
    if (navigator.clipboard && typeof (navigator.clipboard as any).write === "function") {
      await (navigator.clipboard as any).write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
      return true;
    }
  } catch {}

  return false;
}

/**
 * Copy files to clipboard.
 */
export async function copyFiles(files: File[]): Promise<boolean> {
  try {
    if (navigator.clipboard && typeof (navigator.clipboard as any).write === "function") {
      const items = files.map((f) => new ClipboardItem({ [f.type]: f }));
      await (navigator.clipboard as any).write(items);
      return true;
    }
  } catch {}
  return false;
}

// --- Read / Paste Operations ---

/**
 * Read text from clipboard.
 */
export async function readClipboardText(): Promise<string> {
  try {
    if (isClipboardSupported()) {
      return await navigator.clipboard.readText();
    }
  } catch {}
  return "";
}

/**
 * Read all available data from clipboard (text, HTML, images, files).
 */
export async function readClipboard(options?: PasteOptions): Promise<PasteResult> {
  const result: PasteResult = {
    text: "",
    html: "",
    image: null,
    files: [],
    rawFormats: [],
  };

  try {
    if (navigator.clipboard && typeof (navigator.clipboard as any).read === "function") {
      const items = await (navigator.clipboard as any).read();
      result.rawFormats = items.flatMap((item: ClipboardItem) => item.types);

      for (const item of items) {
        // Text
        if (item.types.includes("text/plain")) {
          const blob = await item.getType("text/plain");
          result.text = await blob.text();
        }

        // HTML
        if (item.types.includes("text/html")) {
          const blob = await item.getType("text/html");
          result.html = await blob.text();
        }

        // Image
        const imageType = item.types.find((t: string) => t.startsWith("image/"));
        if (imageType) {
          result.image = await item.getType(imageType);
        }

        // Files
        const fileType = item.types.find((t: string) =>
          t.startsWith("application/") || t.startsWith("text/")
        );
        if (fileType) {
          const blob = await item.getType(fileType);
          const ext = fileType.split("/")[1] ?? "bin";
          result.files.push(new File([blob], `pasted.${ext}`, { type: fileType }));
        }
      }
    }
  } catch {
    // Fall back to execCommand paste
    result.text = await readClipboardText();
  }

  // Apply filters
  if (options) {
    if (options.acceptTypes?.length) {
      result.files = result.files.filter((f) =>
        options.acceptTypes!.some((t) => f.type.includes(t))
      );
    }
    if (options.acceptExtensions?.length) {
      result.files = result.files.filter((f) =>
        options.acceptExtensions!.some((ext) => f.name.toLowerCase().endsWith(ext.toLowerCase()))
      );
    }
    if (options.maxSize) {
      result.files = result.files.filter((f) => f.size <= options.maxSize!);
    }
    if (options.maxFiles && result.files.length > options.maxFiles) {
      result.files = result.files.slice(0, options.maxFiles);
    }
  }

  return result;
}

// --- Cut Operation ---

/**
 * Cut selected text (or provided text) to clipboard.
 * Note: This requires the caller to handle DOM selection removal.
 */
export async function cutToClipboard(text: string): Promise<boolean> {
  const copied = await copyToClipboard(text);
  if (copied) {
    // Dispatch a cut event so the page can react
    document.dispatchEvent(new CustomEvent("clipboard-cut", { detail: { text } }));
  }
  return copied;
}

// --- Selection Helpers ---

/** Select all text in an element */
export function selectAll(element: HTMLElement): void {
  const range = document.createRange();
  range.selectNodeContents(element);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

/** Select text within an element by offset range */
export function selectRange(
  element: HTMLElement,
  startOffset: number,
  endOffset: number,
): void {
  const range = document.createRange();
  range.setStart(element, startOffset);
  range.setEnd(element, endOffset);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

/** Clear current selection */
export function clearSelection(): void {
  window.getSelection()?.removeAllRanges();
}

/** Get currently selected text */
export function getSelectedText(): string {
  return window.getSelection()?.toString() ?? "";
}

/** Get the selected element/node */
export function getSelectionTarget(): Node | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  return sel.getRangeAt(0).commonAncestorContainer;
}

// --- Clipboard History ---

/**
 * Track clipboard operations with optional persistence.
 */
export class ClipboardHistory {
  private entries: ClipboardHistoryEntry[] = [];
  private maxSize: number;
  private persist: boolean;
  private storageKey: string;
  private excludePatterns: RegExp[];

  constructor(options: ClipboardHistoryOptions = {}) {
    this.maxSize = options.maxSize ?? 50;
    this.persist = options.persist ?? false;
    this.storageKey = options.storageKey ?? "clipboard-history";
    this.excludePatterns = options.excludePatterns ?? [];

    if (this.persist) {
      this.loadFromStorage();
    }
  }

  /** Add an entry to history */
  push(data: ClipboardData, source: "copy" | "cut" | "paste" = "copy"): void {
    // Check exclusion patterns
    for (const pattern of this.excludePatterns) {
      if (pattern.test(data.text)) return;
    }

    const entry: ClipboardHistoryEntry = {
      id: `ch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      data,
      timestamp: Date.now(),
      source,
    };

    this.entries.unshift(entry);

    // Trim to max size
    while (this.entries.length > this.maxSize) {
      this.entries.pop();
    }

    if (this.persist) this.saveToStorage();
  }

  /** Get all entries */
  getAll(): ClipboardHistoryEntry[] { return [...this.entries]; }

  /** Get entry by ID */
  get(id: string): ClipboardHistoryEntry | undefined {
    return this.entries.find((e) => e.id === id);
  }

  /** Remove an entry */
  remove(id: string): boolean {
    const idx = this.entries.findIndex((e) => e.id === id);
    if (idx >= 0) {
      this.entries.splice(idx, 1);
      if (this.persist) this.saveToStorage();
      return true;
    }
    return false;
  }

  /** Clear all entries */
  clear(): void {
    this.entries = [];
    if (this.persist) this.saveToStorage();
  }

  /** Search entries by text content */
  search(query: string): ClipboardHistoryEntry[] {
    const q = query.toLowerCase();
    return this.entries.filter(
      (e) => e.data.text.toLowerCase().includes(q) ||
             e.data.html?.toLowerCase().includes(q),
    );
  }

  /** Get recent N entries */
  recent(count: number): ClipboardHistoryEntry[] {
    return this.entries.slice(0, count);
  }

  /** Restore an entry back to clipboard */
  async restore(id: string): Promise<boolean> {
    const entry = this.get(id);
    if (!entry) return false;
    return copyRich({ text: entry.data.text, html: entry.data.html });
  }

  get size(): number { return this.entries.length; }

  private saveToStorage(): void {
    try {
      // Only persist text (not images/files which are too large)
      const serializable = this.entries.map((e) => ({
        ...e,
        data: { text: e.data.text, html: e.data.html },
      }));
      localStorage.setItem(this.storageKey, JSON.stringify(serializable));
    } catch {}
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        this.entries = JSON.parse(raw);
      }
    } catch {}
  }
}

// --- Format Detection ---

/** Detect what types of data are on the clipboard */
export async function detectClipboardFormats(): Promise<string[]> {
  try {
    if (navigator.clipboard && typeof (navigator.clipboard as any).read === "function") {
      const items = await (navigator.clipboard as any).read();
      const formats = new Set<string>();
      for (const item of items) {
        for (const type of item.types) {
          formats.add(type);
        }
      }
      return Array.from(formats);
    }
  } catch {}
  return [];
}

/** Check if clipboard contains an image */
export async function hasImageInClipboard(): Promise<boolean> {
  const formats = await detectClipboardFormats();
  return formats.some((f) => f.startsWith("image/"));
}

/** Check if clipboard contains files */
export async function hasFilesInClipboard(): Promise<boolean> {
  const formats = await detectClipboardFormats();
  return formats.some((f) =>
    f.startsWith("application/") ||
    f.startsWith("text/") && f !== "text/plain" && f !== "text/html"
  );
}

// --- Convenience Functions ---

/** Copy + show brief toast feedback */
export async function copyWithFeedback(
  text: string,
  toastEl?: HTMLElement | null,
  duration = 1500,
): Promise<boolean> {
  const ok = await copyToClipboard(text);

  if (ok && toastEl) {
    toastEl.textContent = "Copied!";
    toastEl.style.opacity = "1";
    setTimeout(() => { toastEl.style.opacity = "0"; }, duration);
  }

  return ok;
}

/** Copy current selection */
export async function copySelection(): Promise<boolean> {
  const text = getSelectedText();
  if (!text) return false;
  return copyToClipboard(text);
}

/** Listen for clipboard events (user-initiated copy/paste/cut) */
export function onClipboardChange(
  handler: (event: ClipboardEvent) => void,
): () => void {
  document.addEventListener("copy", handler);
  document.addEventListener("paste", handler);
  document.addEventListener("cut", handler);
  return () => {
    document.removeEventListener("copy", handler);
    document.removeEventListener("paste", handler);
    document.removeEventListener("cut", handler);
  };
}

// --- Internal ---

/** Fallback copy using textarea trick */
function fallbackCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0;";
    ta.setAttribute("readonly", "");
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
