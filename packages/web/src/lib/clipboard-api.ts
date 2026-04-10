/**
 * Clipboard API: Comprehensive clipboard wrapper with text/HTML/rich-text copy,
 * image and file clipboard access, permission handling, fallback strategies
 * for older browsers, clipboard history, format detection, and cross-origin safety.
 */

// --- Types ---

export type ClipboardFormat = "text" | "html" | "rtf" | "image" | "files" | "custom";

export interface ClipboardItemData {
  /** Plain text content */
  text?: string;
  /** HTML content */
  html?: string;
  /** Rich Text Format */
  rtf?: string;
  /** Image as Blob or data URL */
  image?: Blob | string;
  /** Files */
  files?: File[];
  /** Custom MIME type data */
  custom?: Record<string, string>;
}

export interface ClipboardResult {
  success: boolean;
  format: ClipboardFormat;
  data: string | Blob | File[] | null;
  timestamp: number;
  error?: string;
}

export interface ClipboardOptions {
  /** Format to write/read (default: "text") */
  format?: ClipboardFormat;
  /** MIME type for custom formats */
  mimeType?: string;
  /** Timeout for clipboard operations (ms) */
  timeout?: number;
  /** Fallback to execCommand if Clipboard API unavailable */
  useFallback?: boolean;
  /** Copy selection range instead of explicit content */
  fromSelection?: boolean;
}

export interface ClipboardPermissionState {
  granted: boolean;
  name: "clipboard-read" | "clipboard-write" | "clipboard";
  state: PermissionState; // "granted", "denied", "prompt"
}

export interface ClipboardHistoryEntry {
  id: string;
  data: ClipboardItemData;
  format: ClipboardFormat;
  source: string; // Which page/component wrote this
  timestamp: number;
  size: number; // Approximate byte size
}

// --- Permission Handling ---

/**
 * Request clipboard read/write permissions.
 * Returns the current permission state.
 */
export async function requestClipboardPermission(
  action: "read" | "write" = "write",
): Promise<ClipboardPermissionState> {
  const name = action === "read" ? "clipboard-read" : "clipboard-write";

  // Check if Permissions API is available
  if (typeof navigator !== "undefined" && navigator.permissions?.query) {
    try {
      const result = await navigator.permissions.query({ name: name as PermissionName });
      return {
        granted: result.state === "granted",
        name,
        state: result.state,
      };
    } catch {
      // Permission not supported — assume granted for write
      return {
        granted: action === "write",
        name,
        state: action === "write" ? "granted" as PermissionState : "prompt" as PermissionState,
      };
    }
  }

  return {
    granted: true, // Assume OK in older browsers
    name,
    state: "granted" as PermissionState,
  };
}

// --- Main Clipboard Class ---

/**
 * Clipboard manager with multi-format support.
 *
 * ```ts
 * const cb = new ClipboardAPI();
 *
 * await cb.writeText("Hello World");
 * const text = await cb.readText();
 *
 * await cb.write({ text: "Bold", html: "<b>Bold</b>" });
 * const html = await cb.readHtml();
 * ```
 */
export class ClipboardAPI {
  private history: ClipboardHistoryEntry[] = [];
  private maxHistory = 50;
  private listeners = new Set<(entry: ClipboardHistoryEntry) => void>();
  private _enabled = true;

  get enabled(): boolean { return this._enabled; }
  set enabled(v: boolean) { this._enabled = v; }

  // --- Write Operations ---

  /**
   * Write plain text to clipboard.
   */
  async writeText(text: string, options?: ClipboardOptions): Promise<ClipboardResult> {
    if (!this._enabled) return this.failResult("text", "Clipboard disabled");

    try {
      if (supportsClipboardAPI()) {
        await navigator.clipboard.writeText(text);
      } else {
        this.fallbackCopy(text);
      }

      const entry = this.recordEntry({ text }, "text");
      return { success: true, format: "text", data: text, timestamp: Date.now() };
    } catch (err) {
      // Try fallback
      if (options?.useFallback !== false) {
        try {
          this.fallbackCopy(text);
          const entry = this.recordEntry({ text }, "text");
          return { success: true, format: "text", data: text, timestamp: Date.now() };
        } catch {}
      }
      return this.failResult("text", err instanceof Error ? err.message : "Copy failed");
    }
  }

  /**
   * Write rich content (text + HTML) to clipboard.
   */
  async write(data: ClipboardItemData, options?: ClipboardOptions): Promise<ClipboardResult> {
    if (!this._enabled) return this.failResult("text", "Clipboard disabled");

    const format = data.html ? "html" : data.image ? "image" : data.files ? "files" : "text";

    try {
      if (supportsClipboardAPI() && navigator.clipboard.write) {
        const items: ClipboardItem[] = [];

        if (data.text || data.html) {
          const blobParts: BlobPart[] = [];
          const mimeTypes: string[] = [];
          if (data.html) { blobParts.push(data.html); mimeTypes.push("text/html"); }
          if (data.text) { blobParts.push(data.text); mimeTypes.push("text/plain"); }

          items.push(new ClipboardItem({
            "text/html": new Blob(blobParts.filter((_, i) => mimeTypes[i] === "text/html"), { type: "text/html" }),
            "text/plain": new Blob(blobParts.filter((_, i) => mimeTypes[i] === "text/plain"), { type: "text/plain" }),
          }));
        }

        if (items.length > 0) {
          await navigator.clipboard.write(items);
        } else if (data.text) {
          await navigator.clipboard.writeText(data.text);
        }
      } else {
        // Fallback: use a hidden textarea + execCommand
        if (data.html && options?.useFallback !== false) {
          this.fallbackHtmlCopy(data.html, data.text);
        } else if (data.text) {
          this.fallbackCopy(data.text);
        }
      }

      this.recordEntry(data, format);
      return { success: true, format, data: data.text ?? data.html ?? null, timestamp: Date.now() };
    } catch (err) {
      return this.failResult(format, err instanceof Error ? err.message : "Write failed");
    }
  }

  /**
   * Write an image to clipboard.
   */
  async writeImage(source: Blob | string | HTMLCanvasElement | HTMLImageElement): Promise<ClipboardResult> {
    let blob: Blob;

    if (source instanceof Blob) {
      blob = source;
    } else if (source instanceof HTMLCanvasElement) {
      blob = await new Promise<Blob>((resolve) => source.toBlob((b) => resolve(b!), "image/png"));
    } else if (source instanceof HTMLImageElement) {
      const canvas = document.createElement("canvas");
      canvas.width = source.naturalWidth || source.width;
      canvas.height = source.naturalHeight || source.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(source, 0, 0);
      blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
    } else if (typeof source === "string") {
      // Data URL → Blob
      const response = await fetch(source);
      blob = await response.blob();
    } else {
      return this.failResult("image", "Unsupported image source");
    }

    try {
      if (navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      } else {
        return this.failResult("image", "Clipboard API not available for images");
      }

      this.recordEntry({ image: blob }, "image");
      return { success: true, format: "image", data: blob, timestamp: Date.now() };
    } catch (err) {
      return this.failResult("image", err instanceof Error ? err.message : "Image write failed");
    }
  }

  // --- Read Operations ---

  /**
   * Read plain text from clipboard.
   */
  async readText(options?: ClipboardOptions): Promise<ClipboardResult> {
    if (!this._enabled) return this.failResult("text", "Clipboard disabled");

    try {
      const perm = await requestClipboardPermission("read");
      if (!perm.granted) return this.failResult("text", "Permission denied");

      const text = supportsClipboardAPI()
        ? await navigator.clipboard.readText()
        : this.fallbackRead();

      return { success: true, format: "text", data: text ?? null, timestamp: Date.now() };
    } catch (err) {
      return this.failResult("text", err instanceof Error ? err.message : "Read failed");
    }
  }

  /**
   * Read HTML from clipboard.
   */
  async readHtml(options?: ClipboardOptions): Promise<ClipboardResult> {
    if (!this._enabled) return this.failResult("html", "Clipboard disabled");

    try {
      const perm = await requestClipboardPermission("read");
      if (!perm.granted) return this.failResult("html", "Permission denied");

      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          if (item.types.includes("text/html")) {
            const blob = await item.getType("text/html");
            const html = await blob.text();
            return { success: true, format: "html", data: html, timestamp: Date.now() };
          }
        }
      }

      // Fallback: no reliable way to read HTML without API
      return this.failResult("html", "HTML reading requires Clipboard API");
    } catch (err) {
      return this.failResult("html", err instanceof Error ? err.message : "HTML read failed");
    }
  }

  /**
   * Read files from clipboard (e.g., pasted images).
   */
  async readFiles(options?: ClipboardOptions): Promise<ClipboardResult> {
    if (!this._enabled) return this.failResult("files", "Clipboard disabled");

    try {
      const perm = await requestClipboardPermission("read");
      if (!perm.granted) return this.failResult("files", "Permission denied");

      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        const files: File[] = [];

        for (const item of items) {
          // Look for image types
          for (const type of item.types) {
            if (type.startsWith("image/")) {
              const blob = await item.getType(type);
              const ext = type.split("/")[1] ?? "png";
              files.push(new File([blob], `pasted-image.${ext}`, { type }));
            }
          }
        }

        if (files.length > 0) {
          return { success: true, format: "files", data: files, timestamp: Date.now() };
        }
      }

      return this.failResult("files", "No files found on clipboard");
    } catch (err) {
      return this.failResult("files", err instanceof Error ? err.message : "File read failed");
    }
  }

  /**
   * Read any available format from clipboard (auto-detect).
   */
  async read(options?: ClipboardOptions): Promise<ClipboardResult> {
    // Try HTML first, then text, then files
    const html = await this.readHtml(options);
    if (html.success) return html;

    const files = await this.readFiles(options);
    if (files.success) return files;

    return this.readText(options);
  }

  // --- History ---

  /**
   * Get clipboard history (locally tracked writes only).
   */
  getHistory(): ClipboardHistoryEntry[] {
    return [...this.history];
  }

  /**
   * Clear local clipboard history.
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Set max history entries.
   */
  setMaxHistory(n: number): void {
    this.maxHistory = n;
    if (this.history.length > n) {
      this.history = this.history.slice(0, n);
    }
  }

  /** Listen to clipboard writes (local tracking) */
  onWrite(listener: (entry: ClipboardHistoryEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- Utility ---

  /**
   * Check if clipboard API is available.
   */
  static isSupported(): boolean {
    return typeof navigator !== "undefined" && !!navigator.clipboard;
  }

  /**
   * Check if a specific format can be written.
   */
  static canWrite(format: ClipboardFormat): boolean {
    if (!ClipboardAPI.isSupported()) return format === "text"; // Fallback works for text
    switch (format) {
      case "text": return !!navigator.clipboard?.writeText;
      case "html": case "image": return !!navigator.clipboard?.write;
      default: return false;
    }
  }

  /**
   * Check if a specific format can be read.
   */
  static canRead(format: ClipboardFormat): boolean {
    if (!ClipboardAPI.isSupported()) return false;
    switch (format) {
      case "text": return !!navigator.clipboard?.readText;
      case "html": case "image": case "files": return !!navigator.clipboard?.read;
      default: return false;
    }
  }

  // --- Internal ---

  private failResult(format: ClipboardFormat, error: string): ClipboardResult {
    return { success: false, format, data: null, timestamp: Date.now(), error };
  }

  private recordEntry(data: ClipboardItemData, format: ClipboardFormat, source = "user"): ClipboardHistoryEntry {
    const entry: ClipboardHistoryEntry = {
      id: `clip_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      data,
      format,
      source,
      timestamp: Date.now(),
      size: this.estimateSize(data),
    };

    this.history.unshift(entry);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }

    for (const listener of this.listeners) listener(entry);
    return entry;
  }

  private estimateSize(data: ClipboardItemData): number {
    let size = 0;
    if (data.text) size += data.text.length * 2;
    if (data.html) size += data.html.length * 2;
    if (data.rtf) size += data.rtf.length * 2;
    if (data.image instanceof Blob) size += data.image.size;
    if (data.files) size += data.files.reduce((sum, f) => sum + f.size, 0);
    return size;
  }

  // --- Fallbacks for older browsers ---

  private fallbackCopy(text: string): void {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0;";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    document.execCommand("copy");
    document.body.removeChild(ta);
  }

  private fallbackHtmlCopy(html: string, text?: string): void {
    const div = document.createElement("div");
    div.contentEditable = "true";
    div.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0;";
    div.innerHTML = html;
    if (text) div.textContent = text; // Set plain text fallback
    document.body.appendChild(div);

    const range = document.createRange();
    range.selectNodeContents(div);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);

    document.execCommand("copy");
    document.body.removeChild(div);
  }

  private fallbackRead(): string | null {
    // No reliable way to read clipboard via fallback
    // This returns null — caller should handle gracefully
    return null;
  }
}

// --- Detection Helpers ---

function supportsClipboardAPI(): boolean {
  return typeof navigator !== "undefined" &&
    typeof navigator.clipboard === "object" &&
    navigator.clipboard !== null;
}

// --- Convenience Functions ---

/** Quick copy text to clipboard */
export async function copyToClipboard(text: string): Promise<boolean> {
  const api = new ClipboardAPI();
  const result = await api.writeText(text);
  return result.success;
}

/** Quick read text from clipboard */
export async function readFromClipboard(): Promise<string | null> {
  const api = new ClipboardAPI();
  const result = await api.readText();
  return result.success ? (result.data as string) : null;
}

/** Copy element's text content */
export async function copyElement(el: HTMLElement): Promise<boolean> {
  return copyToClipboard(el.textContent ?? "");
}

/** Copy element's outerHTML as rich text */
export async function copyElementRich(el: HTMLElement): Promise<boolean> {
  const api = new ClipboardAPI();
  const result = await api.write({ html: el.outerHTML, text: el.textContent ?? "" });
  return result.success;
}
