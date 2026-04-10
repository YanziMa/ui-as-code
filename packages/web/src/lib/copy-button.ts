/**
 * Copy to Clipboard Button: One-click copy with visual feedback (checkmark animation),
 * auto-detect text content, fallback for older browsers, tooltip, and multiple variants.
 */

// --- Types ---

export type CopyVariant = "icon" | "button" | "inline" | "ghost";
export type CopySize = "sm" | "md" | "lg";

export interface CopyButtonOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Text to copy (if not provided, reads from closest text element) */
  text?: string;
  /** CSS selector to read text from */
  textSelector?: string;
  /** Display variant */
  variant?: CopyVariant;
  /** Size variant */
  size?: CopySize;
  /** Tooltip text on hover */
  tooltip?: string;
  /** Success feedback duration (ms) */
  successDuration?: number;
  /** Custom label when not copying */
  label?: string;
  /** Callback after successful copy */
  onCopy?: (text: string) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Custom CSS class */
  className?: string;
}

export interface CopyButtonInstance {
  element: HTMLElement;
  setText: (text: string) => void;
  copy: () => Promise<boolean>;
  destroy: () => void;
}

// --- Size Config ---

const SIZE_STYLES: Record<CopySize, { padding: string; fontSize: string; iconSize: string }> = {
  sm:  { padding: "4px 10px", fontSize: "12px", iconSize: "13px" },
  md:  { padding: "6px 14px", fontSize: "13px", iconSize: "14px" },
  lg:  { padding: "8px 18px", fontSize: "14px", iconSize: "16px" },
};

// --- Main Factory ---

export function createCopyButton(options: CopyButtonOptions): CopyButtonInstance {
  const opts = {
    variant: options.variant ?? "icon",
    size: options.size ?? "md",
    label: options.label ?? "Copy",
    tooltip: options.tooltip ?? "Copy to clipboard",
    successDuration: options.successDuration ?? 2000,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("CopyButton: container not found");

  let destroyed = false;

  // Create button
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `copy-btn ${opts.className ?? ""}`;
  btn.title = opts.tooltip;

  const sz = SIZE_STYLES[opts.size];

  switch (opts.variant) {
    case "icon":
      btn.style.cssText = `
        display:inline-flex;align-items:center;gap:5px;padding:${sz.padding};
        border:1px solid #d1d5db;border-radius:6px;background:#fff;
        color:#374151;cursor:pointer;font-size:${sz.fontSize};font-family:-apple-system,sans-serif;
        transition:all 0.2s;font-weight:500;
      `;
      break;
    case "button":
      btn.style.cssText = `
        display:inline-flex;align-items:center;gap:5px;padding:${sz.padding};
        border:none;border-radius:6px;background:#4338ca;color:#fff;
        cursor:pointer;font-size:${sz.fontSize};font-family:-apple-system,sans-serif;
        font-weight:600;transition:all 0.2s;
      `;
      break;
    case "inline":
      btn.style.cssText = `
        display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border:none;
        background:none;color:#6366f1;cursor:pointer;font-size:${sz.fontSize};
        font-family:-apple-system,sans-serif;font-weight:500;border-radius:4px;
        transition:all 0.15s;text-decoration:underline;text-decoration-color:#93c5fd;
      `;
      break;
    case "ghost":
      btn.style.cssText = `
        display:inline-flex;align-items:center;gap:5px;padding:${sz.padding};
        border:1px dashed #d1d5db;border-radius:6px;background:transparent;
        color:#6b7280;cursor:pointer;font-size:${sz.fontSize};font-family:-apple-system,sans-serif;
        transition:all 0.15s;
      `;
      break;
  }

  // Icon
  const iconSpan = document.createElement("span");
  iconSpan.className = "copy-icon";
  iconSpan.innerHTML = "&#128203;"; // clipboard icon
  iconSpan.style.cssText = `display:inline-flex;transition:transform 0.2s;font-size:${sz.iconSize};`;
  btn.appendChild(iconSpan);

  // Label (for non-icon variants)
  if (opts.variant !== "icon") {
    const labelSpan = document.createElement("span");
    labelSpan.className = "copy-label";
    labelSpan.textContent = opts.label;
    btn.appendChild(labelSpan);
  }

  // Success checkmark (hidden initially)
  const checkSpan = document.createElement("span");
  checkSpan.className = "copy-check";
  checkSpan.innerHTML = "&#10003;";
  checkSpan.style.cssText = `
    position:absolute;display:flex;align-items:center;justify-content:center;
    font-size:16px;font-weight:700;color:#16a34a;pointer-events:none;
    opacity:0;transform:scale(0.5);transition:all 0.25s ease;
  `;
  btn.appendChild(checkSpan);

  btn.style.position = "relative";

  // Tooltip
  let tooltipEl: HTMLElement | null = null;

  function showTooltip(): void {
    if (!tooltipEl && opts.tooltip) {
      tooltipEl = document.createElement("div");
      tooltipEl.className = "copy-tooltip";
      tooltipEl.textContent = opts.tooltip;
      tooltipEl.style.cssText = `
        position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);
        background:#111827;color:#fff;padding:5px 12px;border-radius:6px;
        font-size:12px;white-space:nowrap;pointer-events:none;z-index:10000;
        opacity:0;transition:opacity 0.15s;box-shadow:0 4px 12px rgba(0,0,0,0.15);
      `;
      btn.appendChild(tooltipEl);
    }
    if (tooltipEl) {
      requestAnimationFrame(() => { tooltipEl!.style.opacity = "1"; });
    }
  }

  function hideTooltip(): void {
    if (tooltipEl) { tooltipEl.style.opacity = "0"; setTimeout(() => tooltipEl?.remove(), 150); }
  }

  btn.addEventListener("mouseenter", () => {
    showTooltip();
    if (opts.variant === "icon") iconSpan.style.transform = "scale(1.1)";
  });
  btn.addEventListener("mouseleave", () => {
    hideTooltip();
    if (opts.variant === "icon") iconSpan.style.transform = "";
  });

  // Click handler
  async function doCopy(): Promise<boolean> {
    const textToCopy = opts.text ?? getTextToCopy();
    if (!textToCopy) return false;

    try {
      // Try modern Clipboard API first
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback: execCommand
        const ta = document.createElement("textarea");
        ta.value = textToCopy;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }

      // Show success state
      showSuccess();
      opts.onCopy?.(textToCopy);
      return true;
    } catch (err) {
      opts.onError?.(err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }

  function getTextToCopy(): string {
    // From selector
    if (opts.textSelector) {
      const el = document.querySelector(opts.textSelector);
      if (el) return el.textContent || el.value || "";
    }

    // From options
    if (opts.text) return opts.text;

    // Auto-detect: look for nearby code/pre elements
    const parent = container.parentElement;
    if (parent) {
      const codeEl = parent.closest("pre, code, [data-copy]");
      if (codeEl) return codeEl.textContent || "";
    }

    return "";
  }

  function showSuccess(): void {
    // Hide icon/label temporarily
    iconSpan.style.opacity = "0";
    const labelEl = btn.querySelector(".copy-label");
    if (labelEl) labelEl.style.opacity = "0";

    // Show checkmark
    checkSpan.style.opacity = "1";
    checkSpan.style.transform = "scale(1)";

    // Change button color briefly
    const origBg = btn.style.background;
    const origBorder = btn.style.borderColor;
    const origColor = btn.style.color;
    btn.style.background = "#f0fdf4";
    btn.style.borderColor = "#86efac";
    btn.style.color = "#166534";

    setTimeout(() => {
      checkSpan.style.opacity = "0";
      checkSpan.style.transform = "scale(0.5)";
      iconSpan.style.opacity = "";
      if (labelEl) labelEl.style.opacity = "";
      btn.style.background = origBg;
      btn.style.borderColor = origBorder;
      btn.style.color = origColor;
    }, opts.successDuration);
  }

  btn.addEventListener("click", () => { doCopy(); });

  container.appendChild(btn);

  const instance: CopyButtonInstance = {
    element: btn,

    setText(text: string) {
      opts.text = text;
    },

    copy: doCopy,

    destroy() {
      destroyed = true;
      btn.remove();
    },
  };

  return instance;
}
