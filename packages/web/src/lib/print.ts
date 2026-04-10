/**
 * Print Manager: Browser print control with CSS injection, header/footer
 * customization, page break management, orientation, margins, before/after
 * callbacks, print preview simulation, and iframe-based isolated printing.
 */

// --- Types ---

export interface PrintOptions {
  /** Element or selector to print (prints entire page if omitted) */
  target?: HTMLElement | string;
  /** Print-specific styles to inject */
  styles?: string;
  /** Additional CSS files to load for print */
  styleSheets?: string[];
  /** Page title in print dialog */
  title?: string;
  /** Orientation: "portrait" (default) or "landscape" */
  orientation?: "portrait" | "landscape";
  /** Page margins in mm */
  margins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  /** Paper size (e.g., "A4", "Letter", "Legal") */
  paperSize?: string;
  /** Show date/time in header? */
  showDateHeader?: boolean;
  /** Show URL in footer? */
  showUrlFooter?: boolean;
  /** Custom header HTML */
  headerHtml?: string;
  /** Custom footer HTML */
  footerHtml?: string;
  /** Background graphics setting (default: true) */
  backgroundGraphics?: boolean;
  /** Remove elements matching selectors before printing */
  removeElements?: string[];
  /** Callback before print dialog opens */
  onBeforePrint?: () => void | Promise<void>;
  /** Callback after print dialog closes (user printed or cancelled) */
  onAfterPrint?: (printed: boolean) => void;
  /** Use iframe isolation (prevents parent page styles from leaking) */
  useIframe?: boolean;
  /** Delay before opening print dialog (ms) — useful for dynamic content */
  delayMs?: number;
}

export interface PrintManagerInstance {
  /** Print with options */
  print: (options?: PrintOptions) => Promise<void>;
  /** Generate a printable HTML string (for preview/email) */
  generatePrintableHtml: (options: PrintOptions) => string;
  /** Open print preview in a new window/tab */
  preview: (options: PrintOptions) => WindowProxy | null;
  /** Save as PDF (via print-to-PDF browser feature) */
  saveAsPdf: (filename?: string, options?: PrintOptions) => Promise<void>;
  /** Get default print options */
  getDefaultOptions: () => PrintOptions;
  /** Set default options that apply to all future prints */
  setDefaultOptions: (options: Partial<PrintOptions>) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Default print stylesheet ---

const DEFAULT_PRINT_STYLES = `
  @media print {
    @page {
      size: A4 portrait;
      margin: 15mm;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #000 !important;
      background: #fff !important;
    }

    /* Hide non-essential elements */
    nav, footer, .no-print, [data-no-print],
    script, style:not(.print-style),
    .sidebar, .toolbar, .header-bar,
    button:not(.print-button), .modal-backdrop {
      display: none !important;
    }

    /* Ensure links show URLs */
    a[href]::after {
      content: " (" attr(href) ")";
      font-size: 0.8em;
      color: #666;
    }

    /* Page break controls */
    .page-break-before { page-break-before: always; }
    .page-break-after { page-break-after: always; }
    .avoid-break-inside { break-inside: avoid; }

    /* Image handling */
    img {
      max-width: 100% !important;
      height: auto !important;
      page-break-inside: avoid;
    }

    table {
      page-break-inside: avoid;
      border-collapse: collapse;
      width: 100%;
    }

    th, td {
      border: 1px solid #ccc;
      padding: 4px 8px;
    }

    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }

    h1, h2, h3 { page-break-after: avoid; }
  }
`;

// --- Helpers ---

function resolveTarget(target: HTMLElement | string | undefined): HTMLElement | null {
  if (!target) return document.body;
  if (typeof target === "string") return document.querySelector(target);
  return target;
}

function buildPageStyle(options: PrintOptions): string {
  let css = DEFAULT_PRINT_STYLES;

  // Orientation & size
  if (options.orientation || options.paperSize || options.margins) {
    const orient = options.orientation ?? "portrait";
    const size = options.paperSize ?? "A4";
    const m = options.margins ?? {};
    const mt = m.top ?? 15;
    const mr = m.right ?? 15;
    const mb = m.bottom ?? 15;
    const ml = m.left ?? 15;

    css = css.replace(
      /@page \{[^}]+\}/,
      `@page {\n      size: ${size} ${orient};\n      margin: ${mt}mm ${mr}mm ${mb}mm ${ml}mm;\n    }`,
    );
  }

  // Background graphics
  if (options.backgroundGraphics === false) {
    css += "\n  @media print {\n    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }\n  }";
  }

  // Custom styles
  if (options.styles) {
    css += `\n\n  ${options.styles}`;
  }

  return css;
}

function buildHeaderFooter(options: PrintOptions): { header: string; footer: string } {
  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  let header = "";
  if (options.headerHtml) {
    header = options.headerHtml;
  } else if (options.showDateHeader) {
    header = `<div style="text-align:center;font-size:9pt;color:#888;border-bottom:1px solid #ccc;padding-bottom:4px;margin-bottom:8px;">${dateStr}</div>`;
  }

  let footer = "";
  if (options.footerHtml) {
    footer = options.footerHtml;
  } else if (options.showUrlFooter !== false) {
    footer = `<div style="text-align:center;font-size:8pt;color:#aaa;border-top:1px solid #ccc;padding-top:4px;margin-top:8px;">${window.location.href}</div>`;
  }

  return { header, footer };
}

// --- Main Class ---

export class PrintManager {
  create(defaults: Partial<PrintOptions> = {}): PrintManagerInstance {
    let destroyed = false;
    let currentDefaults: PrintOptions = {
      orientation: "portrait",
      backgroundGraphics: true,
      showUrlFooter: true,
      ...defaults,
    };

    async function doPrint(options: PrintOptions = {}): Promise<void> {
      if (destroyed) return;

      const opts: PrintOptions = { ...currentDefaults, ...options };

      await opts.onBeforePrint?.();

      const targetEl = resolveTarget(opts.target);

      if (opts.useIframe && targetEl) {
        await printViaIframe(targetEl, opts);
      } else {
        await printDirect(targetEl, opts);
      }

      // afterprint fires when dialog closes (printed or cancelled)
      const cleanup = (): void => {
        window.removeEventListener("afterprint", cleanup);
        opts.onAfterPrint?.(true); // Can't reliably detect if user actually printed
      };
      window.addEventListener("afterprint", cleanup);

      // Fallback timeout in case afterprint doesn't fire
      setTimeout(() => {
        window.removeEventListener("afterprint", cleanup);
        opts.onAfterPrint?.(false);
      }, 60000);
    }

    async function printDirect(target: HTMLElement | null, opts: PrintOptions): Promise<void> {
      // Inject print styles
      const styleId = "print-manager-styles";
      let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = styleId;
        styleEl.className = "print-style";
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = buildPageStyle(opts);

      // Load external stylesheets
      if (opts.styleSheets?.length) {
        for (const url of opts.styleSheets) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = url;
          link.media = "print";
          link.className = "print-style";
          document.head.appendChild(link);
        }
      }

      // Remove unwanted elements
      const removedElements: HTMLElement[] = [];
      if (opts.removeElements?.length) {
        for (const sel of opts.removeElements) {
          document.querySelectorAll(sel).forEach((el) => {
            removedElements.push(el as HTMLElement);
            (el as HTMLElement).style.display = "none";
          });
        }
      }

      // Set title
      if (opts.title) {
        const originalTitle = document.title;
        document.title = opts.title;
        // Restore after print
        const restoreTitle = (): void => {
          document.title = originalTitle;
          window.removeEventListener("afterprint", restoreTitle);
        };
        window.addEventListener("afterprint", restoreTitle);
      }

      // Delay for dynamic content
      if (opts.delayMs && opts.delayMs > 0) {
        await new Promise((r) => setTimeout(r, opts.delayMs));
      }

      // Trigger print
      window.print();

      // Restore removed elements after a short delay
      setTimeout(() => {
        for (const el of removedElements) {
          el.style.display = "";
        }
        // Remove injected stylesheets (keep our main one)
        document.querySelectorAll('link.print-style[media="print"]').forEach((el) => el.remove());
      }, 1000);
    }

    async function printViaIframe(target: HTMLElement, opts: PrintOptions): Promise<void> {
      const { header, footer } = buildHeaderFooter(opts);

      const iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;border:0;";
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument!;
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>${escapeHtml(opts.title ?? document.title)}</title>
  <style>${buildPageStyle(opts)}</style>
</head>
<body>
  ${header}
  ${target.innerHTML}
  ${footer}
</body>
</html>`;
      doc.open();
      doc.write(htmlContent);
      doc.close();

      // Wait for content to render
      if (opts.delayMs && opts.delayMs > 0) {
        await new Promise((r) => setTimeout(r, opts.delayMs));
      } else {
        await new Promise((r) => setTimeout(r, 300));
      }

      iframe.contentWindow?.print();

      // Cleanup
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 2000);
    }

    const instance: PrintManagerInstance = {

      print: doPrint,

      generatePrintableHtml(opts: PrintOptions): string {
        const resolvedOpts = { ...currentDefaults, ...opts };
        const targetEl = resolveTarget(resolvedOpts.target);
        const { header, footer } = buildHeaderFooter(resolvedOpts);

        return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(resolvedOpts.title ?? document.title)}</title>
  <style>${buildPageStyle(resolvedOpts)}</style>
</head>
<body>
${header}
${targetEl?.innerHTML ?? ""}
${footer}
</body>
</html>`;
      },

      preview(opts: PrintOptions): WindowProxy | null {
        const html = instance.generatePrintableHtml(opts);
        const win = window.open("", "_blank", "width=800,height=900");
        if (!win) return null;
        win.document.write(html);
        win.document.close();
        return win;
      },

      async saveAsPdf(filename = "document.pdf", opts?: PrintOptions): Promise<void> {
        // Browser print-to-PDF is triggered by print() with PDF printer selected
        // We can't force PDF, but we can set a helpful filename via title
        await instance.print({ ...opts, title: filename.replace(/\.pdf$/i, "") });
      },

      getDefaultOptions(): PrintOptions {
        return { ...currentDefaults };
      },

      setDefaultOptions(opts: Partial<PrintOptions>): void {
        currentDefaults = { ...currentDefaults, ...opts };
      },

      destroy(): void {
        if (destroyed) return;
        destroyed = true;
        const styleEl = document.getElementById("print-manager-styles");
        if (styleEl) styleEl.remove();
        document.querySelectorAll('.print-style[media="print"]').forEach((el) => el.remove());
      },
    };

    return instance;
  }
}

/** Convenience: create a print manager */
export function createPrintManager(defaults?: Partial<PrintOptions>): PrintManagerInstance {
  return new PrintManager().create(defaults);
}

// --- Standalone utilities ---

/** Quick print an element or entire page */
export async function quickPrint(target?: HTMLElement | string, options?: Omit<PrintOptions, "target">): Promise<void> {
  return createPrintManager().print({ ...options, target });
}

/** Add a page break before an element */
export function addPageBreakBefore(element: HTMLElement): void {
  element.classList.add("page-break-before");
}

/** Add a page break after an element */
export function addPageBreakAfter(element: HTMLElement): void {
  element.classList.add("page-break-after");
}

/** Prevent page breaks inside an element */
export function avoidBreakInside(element: HTMLElement): void {
  element.classList.add("avoid-break-inside");
}

// --- Internal ---

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
