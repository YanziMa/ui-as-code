/**
 * Treemap: Hierarchical data visualization using nested rectangles,
 * with squarify algorithm, color coding, labels, tooltips,
 * click-to-zoom, and animated transitions.
 */

// --- Types ---

export interface TreemapNode {
  /** Node name/label */
  name: string;
  /** Numeric value (area proportion) */
  value: number;
  /** Fill color override */
  color?: string;
  /** Child nodes (for hierarchical treemaps) */
  children?: TreemapNode[];
  /** Custom data payload */
  data?: unknown;
  /** Click handler */
  onClick?: (node: TreemapNode, event: MouseEvent) => void;
}

export type TreemapColorScale = "sequential" | "diverging" | "categorical" | "custom";

export interface TreemapOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Root data node (with children) or flat array of leaf nodes */
  data: TreemapNode | TreemapNode[];
  /** Chart width (px) */
  width?: number;
  /** Chart height (px) */
  height?: number;
  /** Padding between cells (px) */
  padding?: number;
  /** Border width around cells (px) */
  borderWidth?: number;
  /** Border color */
  borderColor?: string;
  /** Color scale type */
  colorScale?: TreemapColorScale;
  /** Custom color palette (for categorical/custom) */
  colors?: string[];
  /** Color range for sequential [low, high] */
  colorRange?: [string, string];
  /** Show labels inside cells? */
  showLabels?: boolean;
  /** Label font size range [min, max] based on cell size */
  labelFontSize?: [number, number];
  /** Label color */
  labelColor?: string;
  /** Show values in labels? */
  showValues?: boolean;
  /** Round cell corners (px) */
  borderRadius?: number;
  /** Animation on mount/update? */
  animate?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Enable click-to-zoom into children? */
  zoomEnabled?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface TreemapInstance {
  element: HTMLElement;
  /** Update data */
  setData: (data: TreemapNode | TreemapNode[]) => void;
  /** Zoom to a specific node */
  zoomTo: (node: TreemapNode) => void;
  /** Zoom out one level */
  zoomOut: () => void;
  /** Get current visible root */
  getCurrentRoot: () => TreemapNode;
  /** Destroy */
  destroy: () => void;
}

// --- Defaults ---

const DEFAULT_PALETTE = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
];

// --- Squarify Algorithm ---

interface Rect {
  x: number; y: number; w: number; h: number;
}

interface LayoutCell {
  rect: Rect;
  node: TreemapNode;
  depth: number;
}

function squarify(values: { value: number; node: TreemapNode }[], rect: Rect, padding: number): LayoutCell[] {
  if (values.length === 0) return [];

  const total = values.reduce((s, v) => s + v.value, 0);
  if (total <= 0) return [];

  const result: LayoutCell[] = [];
  const p = padding;
  const innerRect: Rect = {
    x: rect.x + p,
    y: rect.y + p,
    w: Math.max(1, rect.w - p * 2),
    h: Math.max(1, rect.h - p * 2),
  };

  function layoutRow(
    row: { value: number; node: TreemapNode }[],
    remaining: { value: number; node: TreemapNode }[],
    area: Rect,
    isHorizontal: boolean
  ): void {
    const rowTotal = row.reduce((s, v) => s + v.value, 0);
    const remainTotal = remaining.reduce((s, v) => s + v.value, 0);

    let rowArea: Rect;
    let restArea: Rect;

    if (isHorizontal) {
      const rowH = total > 0 ? (rowTotal / total) * area.h : 0;
      rowArea = { x: area.x, y: area.y, w: area.w, h: Math.max(1, rowH) };
      restArea = { x: area.x, y: area.y + rowH, w: area.w, h: Math.max(0, area.h - rowH) };
    } else {
      const rowW = total > 0 ? (rowTotal / total) * area.w : 0;
      rowArea = { x: area.x, y: area.y, w: Math.max(1, rowW), h: area.h };
      restArea = { x: area.x + rowW, y: area.y, w: Math.max(0, area.w - rowW), h: area.h };
    }

    // Distribute row items along the long edge
    let cursor = isHorizontal ? rowArea.x : rowArea.y;
    const rowLongEdge = isHorizontal ? rowArea.w : rowArea.h;
    for (const item of row) {
      const frac = rowTotal > 0 ? item.value / rowTotal : 1 / row.length;
      const size = frac * rowLongEdge;

      const cellRect: Rect = isHorizontal
        ? { x: cursor, y: rowArea.y, w: Math.max(1, size), h: rowArea.h }
        : { x: rowArea.x, y: cursor, w: rowArea.w, h: Math.max(1, size) };

      result.push({ rect: cellRect, node: item.node, depth: 0 });
      cursor += size;
    }

    if (remaining.length > 0 && restArea.w > 0 && restArea.h > 0) {
      squarifyStep(remaining, restArea, !isHorizontal);
    }
  }

  function squarifyStep(
    items: { value: number; node: TreemapNode }[],
    area: Rect,
    isHorizontal: boolean
  ): void {
    if (items.length === 0) return;

    const worst = (row: { value: number; node: TreemapNode }[], len: number, a: Rect): number => {
      if (len === 0) return Infinity;
      const total = row.reduce((s, v) => s + v.value, 0);
      const min = Math.min(...row.map(r => r.value));
      const max = Math.max(...row.map(r => r.value));
      const longEdge = isHorizontal ? a.w : a.h;
      const shortEdge = isHorizontal ? a.h : a.w;
      const s = (total / longEdge);
      return Math.max(
        (shortEdge * shortEdge * max) / (s * s * s),
        (s * s * s) / (shortEdge * shortEdge * min)
      );
    };

    const row: { value: number; node: TreemapNode }[] = [];
    const remaining = [...items];

    while (remaining.length > 0) {
      row.push(remaining.shift()!);
      if (worst(row, row.length, area) >= worst([...row, remaining[0]!], row.length + 1, area)) {
        break;
      }
    }

    layoutRow(row, remaining, area, isHorizontal);
  }

  squarifyStep(values, innerRect, innerRect.w >= innerRect.h);
  return result;
}

// --- Color Utilities ---

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m) return [128, 128, 128];
  return [parseInt(m[0]!, 16), parseInt(m[1]!, 16), parseInt(m[2]!, 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0")).join("");
}

function interpolateColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  return rgbToHex(
    r1 + (r2 - r1) * t,
    g1 + (g2 - g1) * t,
    b1 + (b2 - b1) * t,
  );
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// --- Main Factory ---

export function createTreemap(options: TreemapOptions): TreemapInstance {
  const opts = {
    width: options.width ?? 600,
    height: options.height ?? 400,
    padding: options.padding ?? 3,
    borderWidth: options.borderWidth ?? 1,
    borderColor: options.borderColor ?? "#fff",
    colorScale: options.colorScale ?? "categorical",
    colors: options.colors ?? DEFAULT_PALETTE,
    colorRange: options.colorRange ?? ["#e0e7ff", "#4338ca"],
    showLabels: options.showLabels ?? true,
    labelFontSize: options.labelFontSize ?? [10, 18],
    labelColor: options.labelColor ?? "#fff",
    showValues: options.showValues ?? false,
    borderRadius: options.borderRadius ?? 4,
    animate: options.animate ?? true,
    animationDuration: options.animationDuration ?? 600,
    zoomEnabled: options.zoomEnabled ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Treemap: container not found");

  // Normalize input to root node with children
  function normalizeData(input: TreemapNode | TreemapNode[]): TreemapNode {
    if (Array.isArray(input)) {
      return { name: "root", value: 0, children: input };
    }
    return input;
  }

  let rootData = normalizeData(options.data);
  let currentRoot = rootData;
  let destroyed = false;

  // Root element
  const root = document.createElement("div");
  root.className = `treemap ${opts.className}`;
  root.style.cssText = `
    position:relative;width:${opts.width}px;height:${opts.height}px;
    overflow:hidden;border-radius:${opts.borderRadius}px;
    font-family:-apple-system,sans-serif;-webkit-user-select:none;user-select:none;
  `;
  container.appendChild(root);

  // Breadcrumb for zoom navigation
  let breadcrumbEl: HTMLElement | null = null;
  if (opts.zoomEnabled) {
    breadcrumbEl = document.createElement("div");
    breadcrumbEl.className = "tm-breadcrumb";
    breadcrumbEl.style.cssText = `
      position:absolute;top:8px;left:8px;z-index:10;display:flex;gap:4px;
      font-size:11px;color:#6b7280;background:rgba(255,255,255,0.9);
      padding:4px 10px;border-radius:9999px;backdrop-filter:blur(4px);
    `;
    root.appendChild(breadcrumbEl);
  }

  // Tooltip
  let tooltipEl: HTMLElement | null = null;

  function getTooltip(): HTMLElement {
    if (!tooltipEl) {
      tooltipEl = document.createElement("div");
      tooltipEl.className = "tm-tooltip";
      tooltipEl.style.cssText = `
        position:absolute;z-index:100;padding:8px 14px;border-radius:8px;
        background:#1f2937;color:#fff;font-size:12px;pointer-events:none;
        white-space:nowrap;opacity:0;transition:opacity 0.15s;
        box-shadow:0 4px 12px rgba(0,0,0,0.15);
      `;
      root.appendChild(tooltipEl);
    }
    return tooltipEl;
  }

  // --- Get leaves from current root ---

  function getLeaves(node: TreemapNode): TreemapNode[] {
    if (!node.children || node.children.length === 0) return [node];
    return node.children.flatMap(c => getLeaves(c));
  }

  function getNodeColor(node: TreemapNode, index: number, allLeaves: TreemapNode[]): string {
    if (node.color) return node.color;

    switch (opts.colorScale) {
      case "sequential": {
        const values = allLeaves.map(l => l.value);
        const minV = Math.min(...values);
        const maxV = Math.max(...values);
        const t = maxV > minV ? (node.value - minV) / (maxV - minV) : 0.5;
        return interpolateColor(opts.colorRange![0], opts.colorRange![1], t);
      }
      case "categorical":
      case "custom":
        return opts.colors[index % opts.colors.length];
      default:
        return opts.colors[index % opts.colors.length];
    }
  }

  // --- Rendering ---

  function render(progress = 1): void {
    // Clear existing cells (keep breadcrumb)
    const existingCells = root.querySelectorAll(".tm-cell");
    existingCells.forEach(el => el.remove());

    const leaves = getLeaves(currentRoot);
    if (leaves.length === 0) return;

    const totalValue = leaves.reduce((s, l) => s + l.value, 0);
    if (totalValue <= 0) return;

    const valuesWithNodes = leaves.map((node, i) => ({ value: node.value, node }));
    const fullRect: Rect = { x: 0, y: 0, w: opts.width, h: opts.height };
    const cells = squarify(valuesWithNodes, fullRect, opts.padding);

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i]!;
      const color = getNodeColor(cell.node, i, leaves);

      const el = document.createElement("div");
      el.className = "tm-cell";
      el.dataset.nodeName = cell.node.name;
      el.style.cssText = `
        position:absolute;left:${cell.rect.x}px;top:${cell.rect.y}px;
        width:${cell.rect.w}px;height:${cell.rect.h}px;
        background:${color};border:${opts.borderWidth}px solid ${opts.borderColor};
        border-radius:${opts.borderRadius}px;
        cursor:${cell.node.onClick || opts.zoomEnabled ? "pointer" : "default"};
        display:flex;flex-direction:column;justify-content:center;align-items:center;
        overflow:hidden;transition:transform ${opts.animationDuration}ms ease;
        opacity:${progress};
        transform:scale(${progress});
        transform-origin:center center;
      `;

      // Label
      if (opts.showLabels) {
        const minFS = opts.labelFontSize[0];
        const maxFS = opts.labelFontSize[1];
        const area = cell.rect.w * cell.rect.h;
        const fontSize = Math.min(maxFS, Math.max(minFS, Math.sqrt(area) / 6));

        if (fontSize >= minFS && cell.rect.w > fontSize * 3) {
          const label = document.createElement("span");
          label.className = "tm-label";
          label.style.cssText = `
            font-size:${fontSize}px;font-weight:600;color:${opts.labelColor};
            text-align:center;line-height:1.2;padding:4px;word-break:break-word;
            text-shadow:0 1px 2px rgba(0,0,0,0.2);max-width:100%;
          `;
          label.textContent = cell.node.name;
          el.appendChild(label);

          if (opts.showValues) {
            const valLabel = document.createElement("span");
            valLabel.style.cssText = `font-size:${fontSize * 0.75}px;opacity:0.85;`;
            valLabel.textContent = String(cell.node.value);
            el.appendChild(valLabel);
          }
        }
      }

      // Events
      el.addEventListener("mouseenter", (e) => {
        el.style.zIndex = "5";
        el.style.boxShadow = "0 4px 16px rgba(0,0,0,0.2)";
        const tt = getTooltip();
        tt.textContent = `${cell.node.name}: ${cell.node.value.toLocaleString()} (${((cell.node.value / totalValue) * 100).toFixed(1)}%)`;
        tt.style.left = `${(e as MouseEvent).offsetX + 10}px`;
        tt.style.top = `${(e as MouseEvent).offsetY - 10}px`;
        tt.style.opacity = "1";
      });

      el.addEventListener("mouseleave", () => {
        el.style.zIndex = "";
        el.style.boxShadow = "";
        if (tooltipEl) tooltipEl.style.opacity = "0";
      });

      el.addEventListener("click", (e) => {
        if (opts.zoomEnabled && cell.node.children && cell.node.children.length > 0) {
          zoomTo(cell.node);
        }
        cell.node.onClick?.(cell.node, e as MouseEvent);
      });

      root.appendChild(el);
    }

    // Update breadcrumb
    if (breadcrumbEl) updateBreadcrumb();
  }

  function updateBreadcrumb(): void {
    if (!breadcrumbEl) return;
    breadcrumbEl.innerHTML = "";

    // Root link
    const rootLink = document.createElement("span");
    rootLink.textContent = "\u2302 Root";
    rootLink.style.cssText = "cursor:pointer;font-weight:500;";
    rootLink.addEventListener("click", () => { currentRoot = rootData; render(); });
    breadcrumbEl.appendChild(rootLink);

    // Build path to currentRoot
    const path: TreemapNode[] = [];
    function findPath(node: TreemapNode, target: TreemapNode, trail: TreemapNode[]): boolean {
      if (node === target) { path.push(...trail, node); return true; }
      if (node.children) {
        for (const child of node.children) {
          if (findPath(child, target, [...trail, node])) return true;
        }
      }
      return false;
    }
    findPath(rootData, currentRoot, []);

    for (let i = 1; i < path.length; i++) {
      const sep = document.createElement("span");
      sep.textContent = "\u203A";
      sep.style.cssText = "color:#d1d5db;";
      breadcrumbEl.appendChild(sep);

      const crumb = document.createElement("span");
      crumb.textContent = path[i]!.name;
      crumb.style.cssText = "cursor:pointer;";
      crumb.addEventListener("click", () => { currentRoot = path[i]!; render(); });
      breadcrumbEl.appendChild(crumb);
    }
  }

  function zoomTo(node: TreemapNode): void {
    currentRoot = node;
    render();
  }

  // Animated entry
  if (opts.animate) {
    const dur = opts.animationDuration;
    const start = performance.now();
    function tick(now: number): void {
      const t = Math.min((now - start) / dur, 1);
      render(easeOutCubic(t));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  } else {
    render(1);
  }

  // --- Instance ---

  const instance: TreemapInstance = {
    element: root,

    getData() { return rootData; },

    setCurrentRoot: undefined as any,

    setData(data: TreemapNode | TreemapNode[]) {
      rootData = normalizeData(data);
      currentRoot = rootData;
      render(1);
    },

    zoomTo,

    zoomOut() {
      // Find parent of currentRoot
      function findParent(node: TreemapNode, target: TreemapNode): TreemapNode | null {
        if (node.children) {
          for (const child of node.children) {
            if (child === target) return node;
            const found = findParent(child, target);
            if (found) return found;
          }
        }
        return null;
      }
      const parent = findParent(rootData, currentRoot);
      if (parent) { currentRoot = parent; render(); }
    },

    getCurrentRoot() { return currentRoot; },

    destroy() {
      destroyed = true;
      root.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
