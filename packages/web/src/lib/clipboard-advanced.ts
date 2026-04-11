/**
 * Advanced clipboard utilities: copy/paste with fallback strategies,
 * rich text / HTML / image support, clipboard event interception,
 * permission handling, and cross-browser compatibility.
 */

// --- Types ---

export interface ClipboardCopyOptions {
  /** Text to copy (plain) */
  text?: string;
  /** HTML content to copy */
  html?: string;
  /** Image blob or data URL */
  image?: Blob | string;
  /** Custom MIME type data */
  customData?: { mimeType: string; data: string }[];
  /** Fallback to execCommand if Clipboard API unavailable */
  useFallback?: boolean;
  /** Show success toast/notification on copy */
  showFeedback?: boolean;
  /** Feedback duration in ms */
  feedbackDuration?: number;
}

export interface ClipboardPasteOptions {
  /** Accept plain text */
  acceptText?: boolean;
  /** Accept HTML */
  acceptHtml?: boolean;
  /** Accept images */
  acceptImages?: boolean;
  /** Accept specific MIME types */
  acceptMimeTypes?: string[];
  /** Maximum size in bytes for image paste */
  maxImageSizeBytes?: number;
}

export interface ClipboardData {
  text: string | null;
  html: string | null;
  images: Blob[];
  customData: Map<string, string>;
  timestamp: number;
}

export interface ClipboardPermissionState {
  granted: boolean;
  state: PermissionState; // "granted" | "denied" | "prompt"
  name: "clipboard-read" | "clipboard-write";
}

export interface ClipboardHistoryEntry {
  id: string;
  data: ClipboardData;
  source: "copy" | "paste" | "cut";
  createdAt: number;
}

export interface ClipboardMonitorOptions {
  /** Max history entries (default: 50) */
  maxHistorySize?: number;
  /** Include images in history (default: false, memory-heavy) */
  includeImages?: boolean;
  /** Callback on any clipboard change */
  onChange?: (entry: ClipboardHistoryEntry) => void;
  /** Filter: only track certain MIME types */
  filterMimeTypes?: string[];
}

export interface ClipboardMonitorInstance {
  /** Current clipboard data */
  read(): Promise<ClipboardData>;
  /** Copy data to clipboard */
  write(options: ClipboardCopyOptions): Promise<boolean>;
  /** Get clipboard history */
  getHistory(): ClipboardHistoryEntry[];
  /** Clear history */
  clearHistory(): void;
  /** Check read permission status */
  checkReadPermission(): Promise<ClipboardPermissionState>;
  /** Check write permission status */
  checkWritePermission(): Promise<ClipboardPermissionState>;
  /** Request read permission */
  requestReadPermission(): Promise<ClipboardPermissionState>;
  /** Start monitoring clipboard changes */
  startMonitoring(): Promise<void>;
  /** Stop monitoring */
  stopMonitoring(): void;
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Internal Helpers ---

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof navigator !== "undefined";
}

function hasClipboardAPI(): boolean {
  return isBrowser() && typeof navigator.clipboard !== "undefined";
}

function hasExecCommand(): boolean {
  return isBrowser() && typeof document?.execCommand === "function";
}

/** Fallback copy using textarea + execCommand */
async function fallbackCopy(text: string): Promise<boolean> {
  if (!isBrowser()) return false;

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0;";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let success = false;
  try {
    success = document.execCommand("copy");
  } catch {
    success = false;
  }

  document.body.removeChild(textarea);
  return success;
}

/** Create a visual feedback element (brief highlight) */
function showCopyFeedback(duration = 1500): void {
  if (!isBrowser()) return;

  const el = document.createElement("div");
  el.textContent = "Copied!";
  el.style.cssText = [
    "position:fixed",
    "bottom:24px",
    "right:24px",
    "background:#16a34a",
    "color:white",
    "padding:8px 16px",
    "border-radius:6px",
    "font-size:14px",
    "font-family:system-ui,sans-serif",
    "z-index:999999",
    "pointer-events:none",
    "animation:fadeInUp 0.2s ease",
  ].join(";");

  // Inject keyframe if not present
  if (!document.getElementById("clipboard-feedback-styles")) {
    const style = document.createElement("style");
    style.id = "clipboard-feedback-styles";
    style.textContent = `
      @keyframes fadeInUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
      @keyframes fadeOut { from { opacity:1; } to { opacity:0; } }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(el);

  setTimeout(() => {
    el.style.animation = "fadeOut 0.3s ease forwards";
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// --- Main Class ---

export class ClipboardAdvanced {
  create(options: ClipboardMonitorOptions = {}): ClipboardMonitorInstance {
    let destroyed = false;

    const {
      maxHistorySize = 50,
      includeImages = false,
      onChange,
      filterMimeTypes,
    } = options;

    const history: ClipboardHistoryEntry[] = [];
    let monitoring = false;
    let monitorInterval: ReturnType<typeof setInterval> | null = null;
    let lastReadData: string | null = null;

    async function readClipboard(): Promise<ClipboardData> {
      const result: ClipboardData = {
        text: null,
        html: null,
        images: [],
        customData: new Map(),
        timestamp: Date.now(),
      };

      if (!hasClipboardAPI()) return result;

      try {
        const items = await navigator.clipboard.read();

        for (const item of items) {
          const types = item.types;

          // Plain text
          if (types.includes("text/plain")) {
            try {
              result.text = await (await item.getType("text/plain")).text();
            } catch { /* ignore */ }
          }

          // HTML
          if (types.includes("text/html")) {
            try {
              result.html = await (await item.getType("text/html")).text();
            } catch { /* ignore */ }
          }

          // Images
          if (includeImages) {
            for (const type of types) {
              if (type.startsWith("image/")) {
                try {
                  const blob = await item.getType(type);
                  result.images.push(blob);
                } catch { /* ignore */ }
              }
            }
          }

          // Custom MIME types
          if (filterMimeTypes) {
            for (const mime of filterMimeTypes) {
              if (types.includes(mime)) {
                try {
                  const data = await (await item.getType(mime)).text();
                  result.customData.set(mime, data);
                } catch { /* ignore */ }
              }
            }
          }
        }
      } catch (err) {
        // Permission denied or other error
        console.warn("[ClipboardAdvanced] Read failed:", err);
      }

      return result;
    }

    async function writeToClipboard(opts: ClipboardCopyOptions): Promise<boolean> {
      if (destroyed) return false;

      const { text, html, image, customData, useFallback = true, showFeedback: feedback = false, feedbackDuration = 1500 } = opts;

      // If only plain text and no Clipboard API, use fallback
      if (text && !html && !image && !customData?.length && (!hasClipboardAPI() || useFallback)) {
        const ok = await fallbackCopy(text);
        if (ok && feedback) showCopyFeedback(feedbackDuration);
        addToHistory({ text, html: null, images: [], customData: new Map(), timestamp: Date.now() }, "copy");
        return ok;
      }

      if (!hasClipboardAPI()) {
        // Try fallback with just text
        if (text) {
          const ok = await fallbackCopy(text);
          if (ok && feedback) showCopyFeedback(feedbackDuration);
          return ok;
        }
        return false;
      }

      try {
        const clipboardItems: ClipboardItem[] = [];

        // Build data map
        const dataMap: Record<string, BlobPart> = {};

        if (text) dataMap["text/plain"] = new Blob([text], { type: "text/plain" });
        if (html) dataMap["text/html"] = new Blob([html], { type: "text/html" });

        if (image) {
          if (typeof image === "string") {
            // Data URL → convert to Blob
            const response = await fetch(image);
            const blob = await response.blob();
            dataMap[blob.type || "image/png"] = blob;
          } else {
            dataMap[image.type || "image/png"] = image;
          }
        }

        if (customData) {
          for (const { mimeType, data } of customData) {
            dataMap[mimeType] = new Blob([data], { type: mimeType });
          }
        }

        if (Object.keys(dataMap).length > 0) {
          clipboardItems.push(new ClipboardItem(dataMap));
        }

        await navigator.clipboard.write(clipboardItems);

        if (feedback) showCopyFeedback(feedbackDuration);

        addToHistory({
          text: text ?? null,
          html: html ?? null,
          images: image ? (typeof image === "string" ? [] : [image]) : [],
          customData: new Map(customData?.map((d) => [d.mimeType, d.data]) ?? []),
          timestamp: Date.now(),
        }, "copy");

        return true;
      } catch (err) {
        console.warn("[ClipboardAdvanced] Write failed:", err);

        // Last resort: fallback
        if (text) {
          const ok = await fallbackCopy(text);
          if (ok && feedback) showCopyFeedback(feedbackDuration);
          return ok;
        }
        return false;
      }
    }

    function addToHistory(data: ClipboardData, source: ClipboardHistoryEntry["source"]): void {
      const entry: ClipboardHistoryEntry = {
        id: crypto.randomUUID(),
        data,
        source,
        createdAt: Date.now(),
      };

      history.unshift(entry);
      if (history.length > maxHistorySize) history.pop();

      onChange?.(entry);
    }

    async function checkPermission(name: "clipboard-read" | "clipboard-write"): Promise<ClipboardPermissionState> {
      if (!hasClipboardAPI()) {
        return { granted: false, state: "denied", name };
      }

      try {
        const state = await navigator.permissions.query({ name });
        return { granted: state.state === "granted", state: state.state, name };
      } catch {
        // Permissions API not available — assume prompt/denied based on context
        return { granted: name === "clipboard-write", state: name === "clipboard-write" ? "granted" : "prompt", name };
      }
    }

    async function startMon(): Promise<void> {
      if (monitoring || destroyed) return;

      const perm = await checkPermission("clipboard-read");
      if (perm.state === "denied") {
        console.warn("[ClipboardAdvanced] Clipboard read permission denied, cannot monitor");
        return;
      }

      monitoring = true;

      // Poll-based monitoring (Clipboard API doesn't have a change event)
      monitorInterval = setInterval(async () => {
        if (destroyed || !monitoring) return;

        try {
          const data = await readClipboard();
          const dataStr = JSON.stringify({ t: data.text, h: data.html });

          if (dataStr !== lastReadData && data.text !== null) {
            lastReadData = dataStr;
            addToHistory(data, "paste");
          }
        } catch {
          // Silently ignore read errors during monitoring
        }
      }, 1000); // Poll every second
    }

    function stopMon(): void {
      monitoring = false;
      if (monitorInterval) {
        clearInterval(monitorInterval);
        monitorInterval = null;
      }
    }

    const instance: ClipboardMonitorInstance = {

      async read(): Promise<ClipboardData> {
        if (destroyed) throw new Error("ClipboardAdvanced destroyed");
        return readClipboard();
      },

      async write(options: ClipboardCopyOptions): Promise<boolean> {
        if (destroyed) throw new Error("ClipboardAdvanced destroyed");
        return writeToClipboard(options);
      },

      getHistory(): ClipboardHistoryEntry[] {
        return [...history];
      },

      clearHistory(): void {
        history.length = 0;
        lastReadData = null;
      },

      checkReadPermission: () => checkPermission("clipboard-read"),
      checkWritePermission: () => checkPermission("clipboard-write"),

      async requestReadPermission(): Promise<ClipboardPermissionState> {
        if (!hasClipboardAPI()) {
          return { granted: false, state: "denied", name: "clipboard-read" };
        }

        try {
          // Attempting to read triggers the permission prompt
          await readClipboard();
          return await checkPermission("clipboard-read");
        } catch {
          return { granted: false, state: "denied", name: "clipboard-read" };
        }
      },

      startMonitoring: startMon,

      stopMonitoring: stopMon,

      destroy(): void {
        if (destroyed) return;
        destroyed = true;
        stopMon();
        history.length = 0;
      },
    };

    return instance;
  }
}

/** Convenience: create a clipboard manager */
export function createClipboardManager(options?: ClipboardMonitorOptions): ClipboardMonitorInstance {
  return new ClipboardAdvanced().create(options);
}

// --- Standalone helpers ---

/** Quick copy text to clipboard (with automatic fallback) */
export async function copyToClipboard(
  text: string,
  options: { showFeedback?: boolean; fallback?: boolean } = {},
): Promise<boolean> {
  const mgr = createClipboardManager();
  try {
    return await mgr.write({ text, ...options });
  } finally {
    mgr.destroy();
  }
}

/** Quick read text from clipboard */
export async function readFromClipboard(): Promise<string | null> {
  if (!hasClipboardAPI()) return null;
  try {
    return await navigator.clipboard.readText();
  } catch {
    return null;
  }
}

/** Copy HTML content to clipboard (rich text) */
export async function copyHtmlToClipboard(html: string, text?: string): Promise<boolean> {
  const mgr = createClipboardManager();
  try {
    return await mgr.write({ html, text: text ?? stripHtml(html) });
  } finally {
    mgr.destroy();
  }
}

/** Strip HTML tags to get plain text */
export function stripHtml(html: string): string {
  if (typeof document === "undefined") return html.replace(/<[^>]*>/g, "");
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent ?? tmp.innerText ?? "";
}

/** Read image from clipboard as data URL */
export async function readImageFromClipboard(): Promise<string | null> {
  if (!hasClipboardAPI()) return null;
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const imageType = item.types.find((t) => t.startsWith("image/"));
      if (imageType) {
        const blob = await item.getType(imageType);
        return await blobToDataURL(blob);
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Convert Blob to data URL */
export async function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

/** Detect if clipboard contains an image */
export async function clipboardHasImage(): Promise<boolean> {
  if (!hasClipboardAPI()) return false;
  try {
    const items = await navigator.clipboard.read();
    return items.some((item) => item.types.some((t) => t.startsWith("image/")));
  } catch {
    return false;
  }
}
