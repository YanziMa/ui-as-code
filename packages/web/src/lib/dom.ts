/**
 * DOM manipulation utilities (browser-only).
 */

/** Query selector that returns typed element or null */
export function qs<T extends Element = Element>(
  selector: string,
  parent: Element | Document = document,
): T | null {
  return parent.querySelector(selector) as T | null;
}

/** Query selector all that returns typed array */
export function qsa<T extends Element = Element>(
  selector: string,
  parent: Element | Document = document,
): T[] {
  return Array.from(parent.querySelectorAll(selector)) as T[];
}

/** Create element with attributes and children */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>,
  ...children: (string | Node)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v);
    }
  }
  for (const child of children) {
    if (typeof child === "string") {
      el.appendChild(document.createTextNode(child));
    } else {
      el.appendChild(child);
    }
  }
  return el;
}

/** Add event listener that returns unsubscribe function */
export function on<K extends keyof HTMLElementEventMap>(
  el: HTMLElement,
  event: K,
  handler: (ev: HTMLElementEventMap[K]) => unknown,
  options?: boolean | AddEventListenerOptions,
): () => void {
  el.addEventListener(event, handler as EventListener, options);
  return () => el.removeEventListener(event, handler as EventListener, options);
}

/** Wait for DOM ready */
export function domReady(): Promise<void> {
  return new Promise((resolve) => {
    if (document.readyState !== "loading") {
      resolve();
    } else {
      document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
    }
  });
}

/** Check if element is visible in viewport */
export function isVisible(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.top < window.innerHeight &&
    rect.bottom > 0 &&
    rect.left < window.innerWidth &&
    rect.right > 0
  );
}

/** Get computed style value */
export function getStyle(el: Element, property: string): string {
  return window.getComputedStyle(el).getPropertyValue(property);
}

/** Scroll element into view smoothly */
export function scrollIntoView(el: Element, behavior: ScrollBehavior = "smooth"): void {
  el.scrollIntoView({ behavior, block: "nearest" });
}

/** Copy text to clipboard */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const result = document.execCommand("copy");
    document.body.removeChild(textarea);
    return result;
  }
}

/** Download data as file */
export function downloadFile(data: string | Blob, filename: string, mime?: string): void {
  const blob = typeof data === "string" ? new Blob([data], { type: mime || "text/plain" }) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
