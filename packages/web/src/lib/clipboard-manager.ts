/**
 * Clipboard Manager: Advanced clipboard API wrapper supporting text, HTML,
 * rich text, images, files, permissions, cross-origin copy/paste,
 * fallback strategies, clipboard history, and format detection.
 */

// --- Types ---

export type ClipboardDataType =
  | "text/plain"
  | "text/html"
  | "image/png"
  | "image/jpeg"
  | "image/gif"
  | "image/svg+xml"
  | "application/json"
  | "files"
  | "custom";

export interface ClipboardData {
  type: ClipboardDataType;
  data: string | Blob | File[];
  /** MIME type for custom types */
  mimeType?: string;
  /** When this entry was copied */
  timestamp?: number;
  /** Source application hint */
  source?: string;
}

export interface ClipboardPermission {
  granted: boolean;
  state: PermissionState;
  /** Why permission was denied (if applicable) */
  reason?: string;
}

type PermissionState = "granted" | "denied" | "prompt";

export interface CopyOptions {
  /** Text content */
  text?: string;
  /** HTML content (rich text) */
  html?: string;
  /** Image as Blob or data URL */
  image?: Blob | string;
  /** Files to copy */
  files?: File[];
  /** JSON data (serialized automatically) */
  json?: unknown;
  /** Custom format data */
  custom?: { mimeType: string; data: string };
  /** Plain text fallback for older browsers */
  plainTextFallback?: string;
}

export interface PasteOptions {
  /** Preferred data type to extract */
  preferredType?: ClipboardDataType;
  /** Extract all available types */
  extractAll?: boolean;
  /** Maximum file size in bytes (default: 10MB) */
  maxFileSize?: number;
  /** Allowed MIME types for file paste */
  allowedMimeTypes?: string[];
  /** Sanitize HTML on paste */
  sanitizeHtml?: boolean;
}

export interface ClipboardHistoryEntry {
  id: string;
  data: ClipboardData[];
  timestamp: number;
  /** User-visible preview text */
  preview: string;
  /** Size in bytes */
  size: number;
}

export interface ClipboardConfig {
  /** Max history entries (default: 50) */
  maxHistorySize?: number;
  /** Enable history tracking (default: true) */
  enableHistory?: boolean;
  /** Auto-sanitize pasted HTML (default: true) */
  autoSanitize?: boolean;
  /** Default timeout for clipboard operations (ms, default: 5000) */
  timeoutMs?: number;
  /** Called on successful copy */
  onCopy?: (data: ClipboardData[]) => void;
  /** Called on successful paste */
  onPaste?: (data: ClipboardData[]) => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

// --- Permission Management ---

/** Request clipboard-write permission (required by Clipboard API) */
export async function requestClipboardPermission(): Promise<ClipboardPermission> {
  try {
    const result = await navigator.permissions.query({ name: "clipboard-write" as PermissionName });
    if (result.state === "granted") {
      return { granted: true, state: "granted" };
    }
    if (result.state === "prompt") {
      // Try to actually write to trigger the prompt
      try {
        await navigator.clipboard.writeText("");
        return { granted: true, state: "granted" };
      } catch {
        return { granted: false, state: "denied", reason: "User denied clipboard permission" };
      }
    }
    return { granted: false, state: result.state, reason: "Clipboard permission not granted" };
  } catch {
    // Permissions API not available
    return { granted: true, state: "granted" }; // Assume OK
  }
}

/** Request clipboard-read permission */
export async function requestReadPermission(): Promise<ClipboardPermission> {
  try {
    const result = await navigator.permissions.query({ name: "clipboard-read" as PermissionName });
    if (result.state === "granted") {
      return { granted: true, state: "granted" };
    }
    if (result.state === "prompt") {
      try {
        await navigator.clipboard.read();
        return { granted: true, state: "granted" };
      } catch {
        return { granted: false, state: "denied", reason: "User denied read permission" };
      }
    }
    return { granted: false, state: result.state };
  } catch {
    return { granted: true, state: "granted" };
  }
}

/** Check if Clipboard API is available */
export function isClipboardApiAvailable(): boolean {
  return typeof navigator !== "undefined" &&
    "clipboard" in navigator &&
    typeof navigator.clipboard.writeText === "function";
}

// --- HTML Sanitization ---

/** Basic HTML sanitization for pasted content (removes script tags, event handlers, etc.) */
export function sanitizeHtml(html: string): string {
  let sanitized = html;

  // Remove script tags and content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  // Remove event handlers (onclick, onload, etc.)
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*"[^"]*"/gi, "");
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*'[^']*'/gi, "");
  // Remove javascript: URLs
  sanitized = sanitized.replace(/href\s*=\s*"javascript:[^"]*"/gi, 'href=""');
  sanitized = sanitized.replace(/href\s*=\s*'javascript:[^']*'/gi, "href=''");
  // Remove iframe/embed/object tags
  sanitized = sanitized.replace(/<(iframe|embed|object)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  // Remove meta/refresh redirects
  sanitized = sanitized.replace(/<meta[^>]*http-equiv=["']?refresh["'][^>]*>/gi, "");
  // Remove base tag (prevents URL manipulation)
  sanitized = sanitized.replace(/<base[^>]*>/gi, "");

  return sanitized;
}

// --- Fallback: execCommand ---

/** Fallback copy using execCommand for older browsers */
function execCommandCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0;";
  textarea.setAttribute("readonly", "");
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    const success = document.execCommand("copy");
    return success;
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

/** Fallback paste using execCommand */
function execCommandPaste(): string {
  const textarea = document.createElement("textarea");
  textarea.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0;";
  document.body.appendChild(textarea);
  textarea.focus();

  try {
    document.execCommand("paste");
    const text = textarea.value;
    return text;
  } catch {
    return "";
  } finally {
    textarea.remove();
  }
}

// --- Main Clipboard Manager ---

export class ClipboardManager {
  private config: Required<ClipboardConfig>;
  private history: ClipboardHistoryEntry[] = [];
  private listeners = new Set<(entry: ClipboardHistoryEntry) => void>();

  constructor(config: ClipboardConfig = {}) {
    this.config = {
      maxHistorySize: config.maxHistorySize ?? 50,
      enableHistory: config.enableHistory ?? true,
      autoSanitize: config.autoSanitize ?? true,
      timeoutMs: config.timeoutMs ?? 5000,
      onCopy: config.onCopy ?? (() => {}),
      onPaste: config.onPaste ?? (() => {}),
      onError: config.onError ?? (() => {}),
    };
  }

  // --- Write Operations ---

  /** Copy text to clipboard */
  async copyText(text: string): Promise<boolean> {
    return this.copy({ text });
  }

  /** Copy rich content to clipboard */
  async copy(options: CopyOptions): Promise<boolean> {
    const entries: ClipboardData[] = [];

    // Build clipboard data entries
    if (options.text) {
      entries.push({ type: "text/plain", data: options.text });
    }

    if (options.html) {
      entries.push({ type: "text/html", data: options.html });
    }

    if (options.image) {
      const blob = typeof options.image === "string"
        ? await this.dataUrlToBlob(options.image)
        : options.image;
      entries.push({ type: "image/png", data: blob });
    }

    if (options.files) {
      entries.push({ type: "files", data: options.files });
    }

    if (options.json !== undefined) {
      entries.push({
        type: "application/json",
        data: JSON.stringify(options.json),
        mimeType: "application/json",
      });
    }

    if (options.custom) {
      entries.push({
        type: "custom",
        data: options.custom.data,
        mimeType: options.custom.mimeType,
      });
    }

    // Attempt modern Clipboard API
    if (isClipboardApiAvailable()) {
      try {
        await this.writeViaClipboardApi(entries);
        this.addToHistory(entries);
        this.config.onCopy(entries);
        this.notifyListeners();
        return true;
      } catch (e) {
        this.config.onError(e as Error);
      }
    }

    // Fallback: execCommand for text
    if (options.text || options.plainTextFallback) {
      const text = options.text ?? options.plainTextFallback ?? "";
      const success = execCommandCopy(text);
      if (success) {
        this.addToHistory(entries.length > 0 ? entries : [{ type: "text/plain", data: text }]);
        this.config.onCopy(entries);
        return true;
      }
    }

    return false;
  }

  /** Cut text (requires editable selection) */
  async cut(text?: string): Promise<boolean> {
    if (text) {
      // We can't programmatically cut specific text — only what's selected
      // So we copy and then the user needs to delete manually
      return this.copyText(text);
    }
    try {
      // Try to use the Clipboard API's cut
      await (navigator.clipboard as unknown as { write: () => Promise<void> }).write([]);
      return true;
    } catch {
      return false;
    }
  }

  // --- Read Operations ---

  /** Read text from clipboard */
  async readText(): Promise<string> {
    const data = await this.paste({ preferredType: "text/plain" });
    const textEntry = data.find((d) => d.type === "text/plain");
    return typeof textEntry?.data === "string" ? textEntry.data : "";
  }

  /** Read HTML from clipboard */
  async readHtml(): Promise<string> {
    const data = await this.paste({ preferredType: "text/html" });
    const htmlEntry = data.find((d) => d.type === "text/html");
    let html = typeof htmlEntry?.data === "string" ? htmlEntry.data : "";

    if (html && this.config.autoSanitize) {
      html = sanitizeHtml(html);
    }

    return html;
  }

  /** Read all available data from clipboard */
  async paste(options: PasteOptions = {}): Promise<ClipboardData[]> {
    const results: ClipboardData[] = [];
    const preferred = options.preferredType;
    const maxSize = options.maxFileSize ?? 10 * 1024 * 1024; // 10MB

    if (isClipboardApiAvailable()) {
      try {
        const clipboardItems = await navigator.clipboard.read();

        for (const item of clipboardItems) {
          // Text
          if (item.types.includes("text/plain") && (!preferred || preferred === "text/plain")) {
            const text = await (item.getType("text/plain") as Promise<Blob>).then(b => b.text());
            results.push({ type: "text/plain", data: text });
          }

          // HTML
          if (item.types.includes("text/html") && (!preferred || preferred === "text/html")) {
            let html = await (item.getType("text/html") as Promise<Blob>).then(b => b.text());
            if (html && options.sanitizeHtml !== false) {
              html = sanitizeHtml(html);
            }
            results.push({ type: "text/html", data: html });
          }

          // Image
          if (item.types.includes("image/png") && (!preferred || preferred.startsWith("image/"))) {
            try {
              const blob = await item.getType("image/png") as Promise<Blob>;
              results.push({ type: "image/png", data: blob });
            } catch {
              // Image might not be available
            }
          }

          // Files
          if (item.types.includes("files") && (!preferred || preferred === "files")) {
            try {
              const files = await item.getType("files") as Promise<File[]>;
              const filtered = options.allowedMimeTypes
                ? files.filter((f) => options.allowedMimeTypes!.includes(f.type))
                : files.filter((f) => f.size <= maxSize);
              if (filtered.length > 0) {
                results.push({ type: "files", data: filtered });
              }
            } catch {
              // Files might not be available
            }
          }

          if (options.extractAll) {
            // Try all other types
            for (const type of item.types) {
              if (!results.some((r) => r.type === type)) {
                try {
                  const data = await (item.getType(type) as Promise<Blob>).then(b => b.text());
                  results.push({ type: type as ClipboardDataType, data });
                } catch {
                  // Skip unreadable types
                }
              }
            }
          }
        }
      } catch (e) {
        this.config.onError(e as Error);
      }
    }

    // Fallback for text
    if (results.length === 0 && (!preferred || preferred === "text/plain")) {
      const text = execCommandPaste();
      if (text) {
        results.push({ type: "text/plain", data: text });
      }
    }

    this.config.onPaste(results);
    return results;
  }

  // --- History ---

  /** Get clipboard history */
  getHistory(): ClipboardHistoryEntry[] {
    return [...this.history];
  }

  /** Clear history */
  clearHistory(): void {
    this.history = [];
  }

  /** Subscribe to new history entries */
  onHistoryEntry(listener: (entry: ClipboardHistoryEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- Utility ---

  /** Check if clipboard API is supported */
  static isSupported(): boolean {
    return isClipboardApiAvailable();
  }

  /** Get current clipboard read/write permission status */
  static async checkPermissions(): Promise<{ read: ClipboardPermission; write: ClipboardPermission }> {
    const [read, write] = await Promise.all([
      requestReadPermission(),
      requestClipboardPermission(),
    ]);
    return { read, write };
  }

  // --- Internal ---

  private async writeViaClipboardApi(entries: ClipboardData[]): Promise<void> {
    const textItem = entries.find((e) => e.type === "text/plain");
    const htmlItem = entries.find((e) => e.type === "text/html");
    const imageItem = entries.find((e) => e.type.startsWith("image/"));

    if (textItem && htmlItem) {
      const blob = new Blob(
        [typeof htmlItem.data === "string" ? htmlItem.data : ""],
        { type: "text/html" },
      );
      await navigator.clipboard.write([
        new ClipboardItem({
          ["text/plain": typeof textItem.data === "string" ? textItem.data : ""],
          ["text/html": blob],
        }),
      ]);
    } else if (textItem) {
      await navigator.clipboard.writeText(typeof textItem.data === "string" ? textItem.data : "");
    } else if (imageItem && imageItem.data instanceof Blob) {
      // Note: Clipboard API doesn't directly support writing blobs in all browsers
      // This is best-effort
      console.warn("[Clipboard] Writing images via Clipboard API may have limited support");
    }
  }

  private async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const response = await fetch(dataUrl);
      if (!response.ok) reject(new Error("Failed to fetch data URL"));
      resolve(response.blob());
    });
  }

  private addToHistory(entries: ClipboardData[]): void {
    if (!this.config.enableHistory) return;

    const preview = entries
      .filter((e) => typeof e.data === "string")
      .map((e) => (e.data as string).slice(0, 100))
      .join(" | ")
      || "(binary data)";

    const size = entries.reduce((total, e) => {
      if (typeof e.data === "string") return total + e.data.length;
      if (e.data instanceof Blob) return total + e.data.size;
      if (Array.isArray(e.data)) return total + e.data.length;
      return total;
    }, 0);

    const entry: ClipboardHistoryEntry = {
      id: crypto.randomUUID(),
      data: entries,
      timestamp: Date.now(),
      preview,
      size,
    };

    this.history.unshift(entry);
    while (this.history.length > this.config.maxHistorySize) {
      this.history.pop();
    }

    this.notifyListeners();
  }

  private notifyListeners(): void {
    const latest = this.history[0];
    if (latest) {
      for (const l of this.listeners) l(latest);
    }
  }
}
