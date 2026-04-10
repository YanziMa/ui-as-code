/**
 * Print Button: One-click print with customizable print area, header/footer,
 * styling options, and lifecycle callbacks.
 */

// --- Types ---

export type PrintVariant = "icon" | "button" | "inline" | "ghost";
export type PrintSize = "sm" | "md" | "lg";

export interface PrintButtonOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Element or selector to print (defaults to window.print) */
  target?: HTMLElement | string;
  /** Display variant */
  variant?: PrintVariant;
  /** Size variant */
  size?: PrintSize;
  /** Tooltip text on hover */
  tooltip?: string;
  /** Custom label when not printing */
  label?: string;
  /** Print page title */
  pageTitle?: string;
  /** Custom CSS for print media */
  printStyles?: string;
  /** Show header on printed page? */
  printHeader?: string;
  /** Show footer on printed page? */
  printFooter?: string;
  /** Remove elements from print (selectors) */
  excludeSelectors?: string[];
  /** Callback before printing (return false to cancel) */
  onBeforePrint?: () => boolean | void;
  /** Callback after print dialog closes */
  onAfterPrint?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Custom CSS class */
  className?: string;
}

export interface PrintButtonInstance {
  element: HTMLElement;
  setTarget: (target: HTMLElement | string) => void;
  print: () => void;
  destroy: () => void;
}

// --- Size Config ---

const SIZE_STYLES: Record<PrintSize, { padding: string; fontSize: string; iconSize: string }> = {
  sm:  { padding: "4px 10px", fontSize: "12px", iconSize: "13px" },
  md:  { padding: "6px 14px", fontSize: "13px", iconSize: "14px" },
  lg:  { padding: "8px 18px", fontSize: "14px", iconSize: "16px" },
};

// --- Main Factory ---

export function createPrintButton(options: PrintButtonOptions): PrintButtonInstance {
  const opts = {
    variant: options.variant ?? "icon",
    size: options.size ?? "md",
    label: options.label ?? "Print",
    tooltip: options.tooltip ?? "Print page",
    pageTitle: options.pageTitle ?? document.title,
    printStyles: options.printStyles ?? "",
    printHeader: options.printHeader ?? "",
    printFooter: options.printFooter ?? "",
    excludeSelectors: options.excludeSelectors ?? [],
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("PrintButton: container not found");

  let destroyed = false;

  // Create button
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `print-btn ${opts.className ?? ""}`;
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
        border:none;border-radius:6px;background:#2563eb;color:#fff;
        cursor:pointer;font-size:${sz.fontSize};font-family:-apple-system,sans-serif;
        font-weight:600;transition:all 0.2s;
      `;
      break;
    case "inline":
      btn.style.cssText = `
        display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border:none;
        background:none;color:#2563eb;cursor:pointer;font-size:${sz.fontSize};
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
  iconSpan.className = "print-icon";
  iconSpan.innerHTML = "&#128424;"; // printer icon
  iconSpan.style.cssText = `display:inline-flex;transition:transform 0.2s;font-size:${sz.iconSize};`;
  btn.appendChild(iconSpan);

  // Label (for non-icon variants)
  if (opts.variant !== "icon") {
    const labelSpan = document.createElement("span");
    labelSpan.className = "print-label";
    labelSpan.textContent = opts.label;
    btn.appendChild(labelSpan);
  }

  // Tooltip
  let tooltipEl: HTMLElement | null = null;

  function showTooltip(): void {
    if (!tooltipEl && opts.tooltip) {
      tooltipEl = document.createElement("div");
      tooltipEl.className = "print-tooltip";
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

  // Track injected styles
  let injectedStyle: HTMLStyleElement | null = null;
  let injectedHeader: HTMLElement | null = null;
  let injectedFooter: HTMLElement | null = null;
  let hiddenElements: HTMLElement[] = [];
  let originalTitle = "";

  function doPrint(): void {
    try {
      // Before callback
      const proceed = opts.onBeforePrint?.();
      if (proceed === false) return;

      // Save original title
      originalTitle = document.title;
      if (opts.pageTitle) document.title = opts.pageTitle;

      // Inject print styles
      injectPrintStyles();

      // Hide excluded elements
      hideExcludedElements();

      // Inject header/footer
      if (opts.printHeader) injectPrintHeader();
      if (opts.printFooter) injectPrintFooter();

      // Trigger print
      window.print();

      // Use matchMedia to detect when print dialog closes
      const mqList = window.matchMedia("print");
      const handler = (e: MediaQueryListEvent) => {
        if (!e.matches) {
          cleanup();
          opts.onAfterPrint?.();
          mqList.removeEventListener("change", handler);
        }
      };
      mqList.addEventListener("change", handler);

      // Fallback: cleanup after a delay (for browsers that don't fire change event)
      setTimeout(() => {
        if (!destroyed) {
          cleanup();
          opts.onAfterPrint?.();
        }
      }, 1000);
    } catch (err) {
      cleanup();
      opts.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  function injectPrintStyles(): void {
    if (injectedStyle) return;

    injectedStyle = document.createElement("style");
    injectedStyle.id = "print-btn-styles";
    injectedStyle.setAttribute("media", "print");

    let css = `
      @media print {
        body * { visibility: hidden; }
        .print-target, .print-target * { visibility: visible; }
        .print-target { position: absolute; left: 0; top: 0; width: 100%; }
        .print-header-element, .print-footer-element { visibility: visible !important; display: block !important; }
        @page { margin: 1cm; }
      }
    `;

    if (opts.printStyles) {
      css += `\n${opts.printStyles}`;
    }

    injectedStyle.textContent = css;
    document.head.appendChild(injectedStyle);
  }

  function hideExcludedElements(): void {
    hiddenElements = [];
    opts.excludeSelectors.forEach((sel) => {
      document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
        el.dataset.printHidden = "true";
        el.style.display = "none";
        hiddenElements.push(el);
      });
    });
  }

  function injectPrintHeader(): void {
    if (injectedHeader) return;
    injectedHeader = document.createElement("div");
    injectedHeader.className = "print-header-element";
    injectedHeader.innerHTML = opts.printHeader!;
    injectedHeader.style.cssText = `
      display:none;position:fixed;top:0;left:0;right:0;padding:10px 20px;
      border-bottom:1px solid #ccc;font-size:11px;color:#666;z-index:99999;
    `;
    document.body.insertBefore(injectedHeader, document.body.firstChild);
  }

  function injectPrintFooter(): void {
    if (injectedFooter) return;
    injectedFooter = document.createElement("div");
    injectedFooter.className = "print-footer-element";
    injectedFooter.innerHTML = opts.printFooter!;
    injectedFooter.style.cssText = `
      display:none;position:fixed;bottom:0;left:0;right:0;padding:10px 20px;
      border-top:1px solid #ccc;font-size:11px;color:#666;text-align:center;z-index:99999;
    `;
    document.body.appendChild(injectedFooter);
  }

  function cleanup(): void {
    // Restore title
    if (originalTitle) {
      document.title = originalTitle;
      originalTitle = "";
    }

    // Remove injected style
    if (injectedStyle) {
      injectedStyle.remove();
      injectedStyle = null;
    }

    // Remove header/footer
    if (injectedHeader) { injectedHeader.remove(); injectedHeader = null; }
    if (injectedFooter) { injectedFooter.remove(); injectedFooter = null; }

    // Restore hidden elements
    hiddenElements.forEach((el) => {
      delete el.dataset.printHidden;
      el.style.display = "";
    });
    hiddenElements = [];

    // If target was specified, remove print-target class
    if (opts.target) {
      const targetEl = typeof opts.target === "string"
        ? document.querySelector(opts.target)
        : opts.target;
      if (targetEl) targetEl.classList.remove("print-target");
    }
  }

  btn.addEventListener("click", () => { doPrint(); });

  container.appendChild(btn);

  const instance: PrintButtonInstance = {
    element: btn,

    setTarget(target: HTMLElement | string) {
      opts.target = target;
    },

    print: doPrint,

    destroy() {
      destroyed = true;
      cleanup();
      btn.remove();
    },
  };

  return instance;
}
