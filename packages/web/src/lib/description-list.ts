/**
 * Description List (Definition List): Key-value pair display component
 * with multiple layout variants, column control, responsive behavior,
 * copy-to-clipboard, tooltips, and status indicators.
 */

// --- Types ---

export type DlLayout = "horizontal" | "vertical" | "inline" | "grid";
export type DlSize = "sm" | "md" | "lg";

export interface DlItem {
  /** Label / term */
  label: string;
  /** Value / description */
  value: string | HTMLElement;
  /** Optional sub-text below the value */
  subValue?: string;
  /** Status indicator color dot */
  status?: "success" | "warning" | "error" | "info" | "neutral";
  /** Show copy button for the value? */
  copyable?: boolean;
  /** Tooltip on hover for the value */
  tooltip?: string;
  /** Custom label width (CSS value, e.g., "120px") */
  labelWidth?: string;
  /** Hide this item? */
  hidden?: boolean;
  /** Span multiple columns in grid mode? */
  span?: number;
}

export interface DescriptionListOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Items to display */
  items: DlItem[];
  /** Layout variant */
  layout?: DlLayout;
  /** Size variant */
  size?: DlSize;
  /** Number of columns in grid layout (default: 2) */
  columns?: number;
  /** Label column width (default: "140px" for horizontal) */
  labelWidth?: string;
  /** Border between rows? */
  bordered?: boolean;
  /** Title/heading above the list */
  title?: string;
  /** Colon after label? */
  colon?: boolean;
  /** Callback when an item's copy button is clicked */
  onCopy?: (item: DlItem, text: string) => void;
  /** Click callback on item value */
  onItemClick?: (item: DlItem, index: number) => void;
  /** Custom CSS class */
  className?: string;
}

export interface DescriptionListInstance {
  element: HTMLElement;
  getItems: () => DlItem[];
  setItems: (items: DlItem[]) => void;
  addItem: (item: DlItem) => void;
  removeItem: (index: number) => void;
  updateItem: (index: number, updates: Partial<DlItem>) => void;
  destroy: () => void;
}

// --- Status Colors ---

const STATUS_COLORS: Record<string, string> = {
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",
  neutral: "#9ca3af",
};

// --- Size Config ---

const SIZE_STYLES: Record<DlSize, { labelSize: number; valueSize: number; gap: string; padding: string }> = {
  sm: { labelSize: 12, valueSize: 12, gap: "4px", padding: "8px 12px" },
  md: { labelSize: 13, valueSize: 13, gap: "8px", padding: "10px 16px" },
  lg: { labelSize: 14, valueSize: 14, gap: "10px", padding: "12px 20px" },
};

// --- Main ---

export function createDescriptionList(options: DescriptionListOptions): DescriptionListInstance {
  const opts = {
    layout: options.layout ?? "horizontal",
    size: options.size ?? "md",
    columns: options.columns ?? 2,
    labelWidth: options.labelWidth ?? "140px",
    bordered: options.bordered ?? false,
    colon: options.colon ?? true,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("DescriptionList: container not found");

  const sz = SIZE_STYLES[opts.size];
  let items = [...options.items];
  let destroyed = false;

  function render(): void {
    container.innerHTML = "";
    container.className = `dl dl-${opts.layout} dl-${opts.size} ${opts.className}`;

    // Optional title
    if (opts.title) {
      const titleEl = document.createElement("h4");
      titleEl.style.cssText = `
        font-size:${sz.labelSize + 2}px;font-weight:600;color:#111827;
        margin:0 0 8px 0;padding-bottom:8px;border-bottom:1px solid #f0f0f0;
      `;
      titleEl.textContent = opts.title;
      container.appendChild(titleEl);
    }

    switch (opts.layout) {
      case "grid":
        renderGrid();
        break;
      case "inline":
        renderInline();
        break;
      case "vertical":
        renderVertical();
        break;
      default:
        renderHorizontal();
    }
  }

  function renderHorizontal(): void {
    const root = document.createElement("div");
    root.className = "dl-horizontal-root";
    root.style.cssText = `
      display:flex;flex-direction:column;${opts.bordered ? "" : ""}
    `;

    items.forEach((item, index) => {
      if (item.hidden) return;
      const row = createRow(item, index);
      root.appendChild(row);
    });

    container.appendChild(root);
  }

  function renderVertical(): void {
    const root = document.createElement("dl");
    root.className = "dl-vertical-root";
    root.style.cssText = `display:flex;flex-direction:column;gap:${sz.gap};`;

    items.forEach((item, index) => {
      if (item.hidden) return;

      const row = document.createElement("div");
      row.className = "dl-row";
      row.style.cssText = `${opts.bordered ? `border-bottom:1px solid #f3f4f6;padding:${sz.padding};` : `padding:${sz.gap} 0;`}`;

      // Term
      const dt = document.createElement("dt");
      dt.style.cssText = `font-size:${sz.labelSize}px;font-weight:500;color:#6b7280;margin-bottom:2px;`;
      dt.textContent = item.label + (opts.colon ? ":" : "");
      row.appendChild(dt);

      // Definition
      const dd = document.createElement("dd");
      dd.style.cssText = `font-size:${sz.valueSize}px;color:#111827;margin:0;`;
      buildValueContent(dd, item, index);
      row.appendChild(dd);

      root.appendChild(row);
    });

    container.appendChild(root);
  }

  function renderInline(): void {
    const root = document.createElement("div");
    root.className = "dl-inline-root";
    root.style.cssText = `display:flex;flex-wrap:wrap;gap:16px 24px;line-height:1.8;font-size:${sz.valueSize}px;`;

    items.forEach((item, index) => {
      if (item.hidden) return;

      const group = document.createElement("div");
      group.className = "dl-inline-item";
      group.style.cssText = "display:inline;";

      const label = document.createElement("span");
      label.style.cssText = `color:#6b7280;font-weight:500;`;
      label.textContent = item.label + (opts.colon ? ": " : " ");
      group.appendChild(label);

      const valWrap = document.createElement("span");
      valWrap.style.cssText = "color:#111827;";
      buildValueContent(valWrap, item, index);
      group.appendChild(valWrap);

      root.appendChild(group);
    });

    container.appendChild(root);
  }

  function renderGrid(): void {
    const root = document.createElement("div");
    root.className = "dl-grid-root";
    root.style.cssText = `
      display:grid;grid-template-columns:repeat(${opts.columns}, 1fr);gap:0;
      ${opts.bordered ? "border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;" : ""}
    `;

    items.forEach((item, index) => {
      if (item.hidden) return;

      const colSpan = item.span && item.span > 1 ? `span ${Math.min(item.span, opts.columns)}` : "";

      // Label cell
      const labelCell = document.createElement("div");
      labelCell.className = "dl-grid-label";
      labelCell.style.cssText = `
        padding:${sz.padding};background:#f9fafb;
        font-size:${sz.labelSize}px;font-weight:500;color:#6b7280;
        border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;
        display:flex;align-items:center;gap:4px;
        grid-column:${colSpan};
      `;
      labelCell.textContent = item.label + (opts.colon ? ":" : "");
      root.appendChild(labelCell);

      // Value cell
      const valueCell = document.createElement("div");
      valueCell.className = "dl-grid-value";
      valueCell.style.cssText = `
        padding:${sz.padding};font-size:${sz.valueSize}px;color:#111827;
        border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:6px;
        grid-column:${colSpan};
      `;
      buildValueContent(valueCell, item, index);
      root.appendChild(valueCell);
    });

    container.appendChild(root);
  }

  function createRow(item: DlItem, index: number): HTMLElement {
    const row = document.createElement("div");
    row.className = "dl-row";
    row.style.cssText = `
      display:flex;gap:${sz.gap};
      ${opts.bordered
        ? `padding:${sz.padding};border-bottom:1px solid #f3f4f6;`
        : `padding:${sz.gap} 0;`}
    `;

    // Label side
    const labelSide = document.createElement("div");
    labelSide.className = "dl-label";
    const lw = item.labelWidth ?? opts.labelWidth;
    labelSide.style.cssText = `
      flex-shrink:0;width:${lw};min-width:80px;
      font-size:${sz.labelSize}px;font-weight:500;color:#6b7280;
      display:flex;align-items:center;gap:4px;line-height:1.5;
    `;

    // Status dot
    if (item.status) {
      const dot = document.createElement("span");
      dot.style.cssText = `
        width:6px;height:6px;border-radius:50%;flex-shrink:0;
        background:${STATUS_COLORS[item.status] ?? STATUS_COLORS.neutral};
      `;
      labelSide.appendChild(dot);
    }

    const labelText = document.createElement("span");
    labelText.textContent = item.label + (opts.colon ? ": " : "");
    labelSide.appendChild(labelText);
    row.appendChild(labelSide);

    // Value side
    const valueSide = document.createElement("div");
    valueSide.className = "dl-value";
    valueSide.style.cssText = `
      flex:1;min-width:0;font-size:${sz.valueSize}px;color:#111827;
      display:flex;align-items:center;gap:6px;line-height:1.5;
    `;
    buildValueContent(valueSide, item, index);
    row.appendChild(valueSide);

    return row;
  }

  function buildValueContent(parent: HTMLElement, item: DlItem, index: number): void {
    // Value content
    if (typeof item.value === "string") {
      const valText = document.createElement("span");
      valText.className = "dl-value-text";
      valText.textContent = item.value;
      valText.title = item.tooltip ?? item.value;
      parent.appendChild(valText);
    } else {
      parent.appendChild(item.value);
    }

    // Sub-value
    if (item.subValue) {
      const sub = document.createElement("span");
      sub.className = "dl-sub-value";
      sub.style.cssText = `display:block;font-size:${sz.valueSize - 1}px;color:#9ca3af;margin-top:1px;`;
      sub.textContent = item.subValue;
      parent.appendChild(sub);
    }

    // Copy button
    if (item.copyable && typeof item.value === "string") {
      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.innerHTML = "&#128203;"; // clipboard emoji
      copyBtn.title = "Copy to clipboard";
      copyBtn.setAttribute("aria-label", `Copy ${item.label}`);
      copyBtn.style.cssText = `
        background:none;border:none;cursor:pointer;font-size:12px;
        padding:2px 4px;border-radius:3px;opacity:0.4;
        transition:opacity 0.15s;background 0.15s;
        flex-shrink:0;display:inline-flex;align-items:center;
      `;
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(item.value as string);
          copyBtn.innerHTML = "&#10003;"; // checkmark
          copyBtn.style.opacity = "1";
          copyBtn.style.color = "#22c55e";
          setTimeout(() => {
            copyBtn.innerHTML = "&#128203;";
            copyBtn.style.opacity = "0.4";
            copyBtn.style.color = "";
          }, 1500);
          opts.onCopy?.(item, item.value as string);
        } catch {
          // Fallback for non-secure contexts
          const ta = document.createElement("textarea");
          ta.value = item.value as string;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
          opts.onCopy?.(item, item.value as string);
        }
      });
      copyBtn.addEventListener("mouseenter", () => { copyBtn.style.opacity = "0.8"; });
      copyBtn.addEventListener("mouseleave", () => { copyBtn.style.opacity = "0.4"; });
      parent.appendChild(copyBtn);
    }

    // Click handler
    if (opts.onItemClick) {
      const clickableArea = typeof item.value === "string"
        ? parent.querySelector(".dl-value-text")
        : item.value;
      if (clickableArea) {
        clickableArea.style.cursor = "pointer";
        clickableArea.addEventListener("click", () => opts.onItemClick!(item, index));
      }
    }
  }

  // Initial render
  render();

  return {
    element: container,

    getItems() { return [...items]; },

    setItems(newItems: DlItem[]) {
      items = [...newItems];
      render();
    },

    addItem(item: DlItem) {
      items.push(item);
      render();
    },

    removeItem(index: number) {
      if (index >= 0 && index < items.length) {
        items.splice(index, 1);
        render();
      }
    },

    updateItem(index: number, updates: Partial<DlItem>) {
      if (index >= 0 && index < items.length) {
        items[index] = { ...items[index]!, ...updates };
        render();
      }
    },

    destroy() {
      destroyed = true;
      container.innerHTML = "";
      container.style.cssText = "";
    },
  };
}
