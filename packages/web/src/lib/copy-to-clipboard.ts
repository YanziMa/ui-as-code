/**
 * Copy-to-Clipboard: Cross-browser clipboard API with fallbacks,
 * success feedback, keyboard shortcut support, and rich text / HTML copying.
 */

// --- Types ---

export interface ClipboardOptions {
  /** Text to copy */
  text: string;
  /** HTML to copy (rich text) */
  html?: string;
  /** Success message or callback */
  onSuccess?: string | (() => void);
  /** Error callback */
  onError?: (error: unknown) => void;
  /** Duration to show feedback toast (ms) */
  feedbackDuration?: number;
  /** Reset text after delay? */
  resetAfterDelay?: boolean;
  /** Element to show feedback on (button, icon, etc.) */
  feedbackTarget?: HTMLElement | string;
}

export interface ClipboardInstance {
  /** Copy text to clipboard */
  copy: (options: ClipboardOptions) => Promise<boolean>;
  /** Cut text from an input/textarea */
  cut: (element: HTMLInputElement | HTMLTextAreaElement) => Promise<boolean>;
  /** Read text from clipboard */
  readText: () => Promise<string>;
  /** Read HTML from clipboard */
  readHtml: () => Promise<string>;
  /** Check if clipboard API is available */
  isSupported: () => boolean;
  /** Destroy instance */
  destroy: () => void;
}

// --- Helpers ---

/** Show inline feedback near the target element */
function showFeedback(target: HTMLElement | string | undefined, message: string, duration: number): void {
  const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (!el) return;

  const originalTitle = el.title || el.getAttribute("data-original-title") || "";
  if (!el.getAttribute("data-original-title")) {
    el.setAttribute("data-original-title", originalTitle);
  }

  el.title = message;
  el.setAttribute("aria-label", message);

  // Visual pulse
  el.style.transition = "transform 0.15s ease";
  el.style.transform = "scale(1.08)";
  setTimeout(() => {
    el.style.transform = "";
  }, 150);

  setTimeout(() => {
    el.title = originalTitle;
    el.setAttribute("data-original-title", "");
    el.removeAttribute("data-original-title");
  }, duration);
}

/** Fallback: use textarea + execCommand('copy') */
async function fallbackCopy(text: string): Promise<boolean> {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none;";
  textarea.setAttribute("readonly", "");
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  let success = false;
  try {
    success = document.execCommand("copy");
  } catch { /* ignore */ }

  document.body.removeChild(textarea);
  return success;
}

// --- Main Class ---

export class ClipboardManager {
  create(): ClipboardInstance {
    let destroyed = false;

    async function doCopy(options: ClipboardOptions): Promise<boolean> {
      if (destroyed) return false;

      const { text, html, onSuccess, onError, feedbackDuration = 2000, feedbackTarget } = options;
      let success = false;

      try {
        if (navigator.clipboard && typeof navigator.clipboard.write === "function" && html) {
          // Rich text copy via ClipboardItem
          const clipData = new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([text], { type: "text/plain" }),
          });
          await navigator.clipboard.write([clipData]);
          success = true;
        } else if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
          await navigator.clipboard.writeText(text);
          success = true;
        } else {
          success = await fallbackCopy(text);
        }
      } catch (error) {
        success = false;
        onError?.(error);

        // Try fallback if API failed
        if (!success) {
          try {
            success = await fallbackCopy(text);
          } catch { /* give up */ }
        }
      }

      if (success) {
        if (typeof onSuccess === "string") {
          showFeedback(feedbackTarget, onSuccess, feedbackDuration);
        } else if (typeof onSuccess === "function") {
          onSuccess();
        }
      }

      return success;
    }

    async function doCut(element: HTMLInputElement | HTMLTextAreaElement): Promise<boolean> {
      if (destroyed) return false;

      const text = element.value || element.textContent || "";

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          // Clear the element
          if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            const start = element.selectionStart ?? 0;
            const end = element.selectionEnd ?? text.length;
            element.value = text.substring(0, start) + text.substring(end);
            element.setSelectionRange(start, start);
          }
          return true;
        }
      } catch { /* fall through */ }

      // Fallback
      element.select();
      const success = document.execCommand("cut");
      return success;
    }

    async function doReadText(): Promise<string> {
      if (navigator.clipboard?.readText) {
        try {
          return await navigator.clipboard.readText();
        } catch { /* permission denied */ }
      }
      return "";
    }

    async function doReadHtml(): Promise<string> {
      if (navigator.clipboard?.read) {
        try {
          const items = await navigator.clipboard.read();
          for (const item of items) {
            if (item.types.includes("text/html")) {
              const blob = await item.getType("text/html");
              return await blob.text();
            }
          }
        } catch { /* permission denied */ }
      }
      return "";
    }

    const instance: ClipboardInstance = {
      copy: doCopy,
      cut: doCut,
      readText: doReadText,
      readHtml: doReadHtml,
      isSupported: () => !!(navigator.clipboard?.writeText || document.execCommand?.("copy")),
      destroy: () => { destroyed = true; },
    };

    return instance;
  }
}

/** Convenience: create a clipboard manager */
export function createClipboardManager(): ClipboardInstance {
  return new ClipboardManager().create();
}

// --- Standalone utilities ---

/** Quick copy text to clipboard */
export async function copyToClipboard(
  text: string,
  options?: Partial<Omit<ClipboardOptions, "text">>,
): Promise<boolean> {
  return createClipboardManager().copy({ text, ...options });
}

/** Copy element's text content */
export async function copyElementText(
  element: HTMLElement | string,
  options?: Partial<Omit<ClipboardOptions, "text">>,
): Promise<boolean> {
  const el = typeof element === "string"
    ? document.querySelector<HTMLElement>(element)
    : element;
  if (!el) return false;
  return copyToClipboard(el.textContent?.trim() ?? "", options);
}

/** Copy element's innerHTML */
export async function copyElementHtml(
  element: HTMLElement | string,
  options?: Partial<Omit<ClipboardOptions, "text" | "html">>,
): Promise<boolean> {
  const el = typeof element === "string"
    ? document.querySelector<HTMLElement>(element)
    : element;
  if (!el) return false;
  return createClipboardManager().copy({
    text: el.textContent?.trim() ?? "",
    html: el.innerHTML,
    ...options,
  });
}

/** Bind Ctrl+C / Cmd+C shortcut to copy action on an element */
export function bindCopyShortcut(
  element: HTMLElement,
  getText: () => string,
  options?: Partial<Omit<ClipboardOptions, "text">>,
): () => void {
  const handler = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
      e.preventDefault();
      copyToClipboard(getText(), options);
    }
  };
  element.addEventListener("keydown", handler);
  return () => element.removeEventListener("keydown", handler);
}
