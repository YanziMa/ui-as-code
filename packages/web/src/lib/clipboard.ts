/**
 * Advanced clipboard utilities with format support and fallback handling.
 */

export interface ClipboardData {
  text: string;
  html?: string;
  /** Base64 image data */
  image?: string;
  /** MIME type of content */
  mimeType?: string;
}

export interface ClipboardOptions {
  /** Fallback to prompt-based copy if API fails */
  useFallback?: boolean;
  /** Show success toast/notification */
  onSuccess?: () => void;
  /** Handle errors */
  onError?: (error: unknown) => void;
  /** Auto-clear after ms (0 = no auto-clear) */
  clearAfterMs?: number;
}

/** Copy text to clipboard with full fallback chain */
export async function copyToClipboard(
  text: string,
  options: ClipboardOptions = {},
): Promise<boolean> {
  const { useFallback = true, onSuccess, onError, clearAfterMs = 0 } = options;

  // Try modern Clipboard API first
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      scheduleClear(text, clearAfterMs);
      onSuccess?.();
      return true;
    } catch (err) {
      // Fall through to fallback methods
    }
  }

  // Try execCommand fallback
  if (useFallback) {
    try {
      const success = execCommandCopy(text);
      if (success) {
        scheduleClear(text, clearAfterMs);
        onSuccess?.();
        return true;
      }
    } catch (err) {
      onError?.(err);
    }
  }

  onError?.(new Error("Clipboard write failed"));
  return false;
}

/** Copy rich content (HTML + plain text) to clipboard */
export async function copyRichToClipboard(
  data: ClipboardData,
  options: ClipboardOptions = {},
): Promise<boolean> {
  const { onError } = options;

  if (navigator.clipboard && typeof navigator.clipboard.write === "function") {
    try {
      const items: ClipboardItem[] = [];

      if (data.text) {
        items.push(new ClipboardItem({
          "text/plain": new Blob([data.text], { type: "text/plain" }),
        }));
      }

      if (data.html) {
        items.push(new ClipboardItem({
          "text/html": new Blob([data.html], { type: "text/html" }),
        }));
      }

      if (data.image) {
        const base64 = data.image.split(",")[1];
        if (base64) {
          const byteChars = atob(base64);
          const byteArray = new Uint8Array(byteChars.length);
          for (let i = 0; i < byteChars.length; i++) {
            byteArray[i] = byteChars.charCodeAt(i);
          }
          items.push(new ClipboardItem({
            "image/png": new Blob([byteArray], { type: "image/png" }),
          }));
        }
      }

      await navigator.clipboard.write(items);
      options.onSuccess?.();
      return true;
    } catch (err) {
      // Fall back to text-only copy
    }
  }

  // Fallback: copy plain text only
  return copyToClipboard(data.text, options);
}

/** Read text from clipboard */
export async function readFromClipboard(): Promise<string | null> {
  if (navigator.clipboard && typeof navigator.clipboard.readText === "function") {
    try {
      return await navigator.clipboard.readText();
    } catch {
      // Permission denied or empty
      return null;
    }
  }
  return null;
}

/** Read rich content from clipboard */
export async function readRichFromClipboard(): Promise<ClipboardData | null> {
  if (navigator.clipboard && typeof navigator.clipboard.read === "function") {
    try {
      const items = await navigator.clipboard.read();
      const data: ClipboardData = { text: "" };

      for (const item of items) {
        if (item.types.includes("text/plain")) {
          const blob = await item.getType("text/plain");
          data.text = await blob.text();
        }
        if (item.types.includes("text/html")) {
          const blob = await item.getType("text/html");
          data.html = await blob.text();
        }
        if (item.types.includes("image/png")) {
          const blob = await item.getType("image/png");
          const buffer = await blob.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = "";
          for (const byte of bytes) binary += String.fromCharCode(byte);
          data.image = `data:image/png;base64,${btoa(binary)}`;
        }
      }

      return data;
    } catch {
      return null;
    }
  }

  // Fallback to text-only
  const text = await readFromClipboard();
  return text ? { text } : null;
}

/** Check if clipboard API is available */
export function isClipboardAvailable(): boolean {
  return typeof navigator !== "undefined" &&
    !!navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function";
}

/** Check if clipboard read permission is granted */
export async function canReadClipboard(): Promise<boolean> {
  try {
    const result = await navigator.permissions.query({ name: "clipboard-read" as PermissionName });
    return result.state === "granted";
  } catch {
    return false;
  }
}

/** Watch clipboard for changes (polling-based) */
export function watchClipboard(
  callback: (text: string) => void,
  intervalMs = 500,
): () => void {
  let lastContent = "";
  let running = true;

  (async function poll() {
    while (running) {
      const text = await readFromClipboard();
      if (text && text !== lastContent) {
        lastContent = text;
        callback(text);
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  })();

  return () => { running = false; };
}

// --- Internal helpers ---

function execCommandCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0;";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const success = document.execCommand("copy");
  document.body.removeChild(textarea);
  return success;
}

function scheduleClear(_text: string, ms: number): void {
  if (ms <= 0) return;
  setTimeout(async () => {
    // Only clear if our text is still there
    const current = await readFromClipboard();
    if (current === _text) {
      // Write empty to clear
      await copyToClipboard("", { useFallback: false }).catch(() => {});
    }
  }, ms);
}
