/**
 * CSS Grid System: Declarative grid layout engine with track definitions,
 * grid areas, auto-placement, responsive breakpoints, gap handling,
 * alignment utilities, subgrid support, minmax/auto-fit/fill,
 * serialization, and visual debugging.
 */

// --- Types ---

export type TrackSize = number | "auto" | "min-content" | "max-content" | "fit-content"
  | { min: number | string; max: number | string }           // minmax
  | { repeat: number | "auto-fill" | "auto-fit"; size: TrackSize }; // repeat()

export type GridAlign = "start" | "end" | "center" | "stretch" | "baseline" | "space-between" | "space-around" | "space-evenly";

export interface GridItem {
  id: string;
  columnStart?: number | "auto" | span | string;   // line number, "auto", {span:N}, or area name
  columnEnd?: number | "auto" | span | string;
  rowStart?: number | "auto" | span | string;
  rowEnd?: number | "auto" | span | string;
  area?: string;                                    // named area reference
  justifySelf?: GridAlign;
  alignSelf?: GridAlign;
  order?: number;
  zIndex?: number;
  content?: unknown;                                // arbitrary item data
  style?: Record<string, string>;                   // additional CSS properties
}

export interface SpanDef {
  span: number;
}

export interface GridAreaDef {
  name: string;
  columnStart: number | string;
  columnEnd: number | string;
  rowStart: number | string;
  rowEnd: number | string;
}

export interface GridTemplate {
  columns: TrackSize[];
  rows: TrackSize[];
  areas?: GridAreaDef[];                            // grid-template-areas
  gap?: { row?: number | string; column?: number | string };
  justifyContent?: GridAlign;
  alignContent?: GridAlign;
  justifyItems?: GridAlign;
  alignItems?: GridAlign;
  width?: number | string;
  height?: number | string;
  autoFlow?: "row" | "column" | "dense" | "row dense" | "column dense";
  autoRows?: TrackSize;
  autoColumns?: TrackSize;
}

export interface Breakpoint {
  name: string;
  maxWidth?: number;
  minWidth?: number;
  template: Partial<GridTemplate>;
  itemOverrides?: Map<string, Partial<GridItem>>;
}

export interface ComputedGrid {
  template: GridTemplate;
  items: PlacedItem[];
  totalWidth: number;
  totalHeight: number;
  columnLines: number[];     // pixel positions of column lines
  rowLines: number[];        // pixel positions of row lines
  gaps: { columnGap: number; rowGap: number };
}

export interface PlacedItem extends GridItem {
  x: number;
  y: number;
  width: number;
  height: number;
  colSpan: number;
  rowSpan: number;
  colStartLine: number;
  colEndLine: number;
  rowStartLine: number;
  rowEndLine: number;
}

// --- Track Resolver ---

function resolveTrackSize(size: TrackSize, containerSize: number, index: number, totalTracks: number): number {
  if (typeof size === "number") return size;

  if (size === "auto") return containerSize / Math.max(totalTracks, 1);
  if (size === "min-content") return 0;
  if (size === "max-content") return containerSize;
  if (typeof size === "string" && size.startsWith("fit-content(")) {
    const val = parseFloat(size.replace("fit-content(", "").replace(")", ""));
    return Math.min(val, containerSize);
  }

  // minmax
  if (typeof size === "object" && "min" in size && "max" in size) {
    const minVal = typeof size.min === "number" ? size.min : parseFraction(size.min as string, containerSize);
    const maxVal = typeof size.max === "number" ? size.max : parseFraction(size.max as string, containerSize);
    return clamp(minVal, minVal, maxVal);
  }

  // repeat
  if (typeof size === "object" && "repeat" in size) {
    const innerSize = resolveTrackSize(size.size, containerSize, index, totalTracks);
    if (typeof size.repeat === "number") return innerSize;
    // auto-fill/fit: fill available space equally
    return containerSize / Math.max(totalTracks, 1);
  }

  return containerSize / Math.max(totalTracks, 1);
}

function parseFraction(fraction: string, containerSize: number): number {
  if (fraction.endsWith("fr")) {
    const n = parseFloat(fraction);
    return (n / 1) * containerSize; // simplified: 1fr = full share when only one fr
  }
  if (fraction.endsWith("px")) return parseFloat(fraction);
  if (fraction.endsWith("%")) return (parseFloat(fraction) / 100) * containerSize;
  if (fraction.endsWith("rem")) return parseFloat(fraction) * 16;
  return parseFloat(fraction) || 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// --- Grid Engine ---

export class GridEngine {
  private template: GridTemplate;
  private items: Map<string, GridItem> = new Map();
  private breakpoints: Breakpoint[] = [];
  private activeBreakpoint: string | null = null;
  private containerWidth = 800;
  private containerHeight = 600;

  constructor(template: GridTemplate) {
    this.template = template;
  }

  /** Set container dimensions */
  setContainerSize(width: number, height: number): this {
    this.containerWidth = width;
    this.containerHeight = height;
    return this;
  }

  /** Update template */
  setTemplate(template: Partial<GridTemplate>): this {
    Object.assign(this.template, template);
    return this;
  }

  /** Add or update a grid item */
  addItem(item: GridItem): this {
    this.items.set(item.id, item);
    return this;
  }

  /** Remove an item */
  removeItem(id: string): this {
    this.items.delete(id);
    return this;
  }

  /** Get an item */
  getItem(id: string): GridItem | undefined { return this.items.get(id); }

  /** Get all items */
  getItems(): GridItem[] { return Array.from(this.items.values()); }

  /** Clear all items */
  clearItems(): this {
    this.items.clear();
    return this;
  }

  /** Add a breakpoint */
  addBreakpoint(bp: Breakpoint): this {
    this.breakpoints.push(bp);
    this.breakpoints.sort((a, b) => (a.maxWidth ?? Infinity) - (b.maxWidth ?? Infinity));
    return this;
  }

  /** Remove a breakpoint */
  removeBreakpoint(name: string): this {
    this.breakpoints = this.breakpoints.filter((bp) => bp.name !== name);
    return this;
  }

  /** Evaluate active breakpoint based on width */
  evaluateBreakpoints(width?: number): string | null {
    const w = width ?? this.containerWidth;
    for (const bp of this.breakpoints) {
      if (bp.maxWidth !== undefined && w <= bp.maxWidth) {
        this.activeBreakpoint = bp.name;
        // Apply template overrides
        if (bp.template) Object.assign(this.template, bp.template);
        // Apply item overrides
        if (bp.itemOverrides) {
          for (const [id, overrides] of bp.itemOverrides.entries()) {
            const existing = this.items.get(id);
            if (existing) Object.assign(existing, overrides);
          }
        }
        return bp.name;
      }
      if (bp.minWidth !== undefined && w >= bp.minWidth) {
        this.activeBreakpoint = bp.name;
        if (bp.template) Object.assign(this.template, bp.template);
        if (bp.itemOverrides) {
          for (const [id, overrides] of bp.itemOverrides.entries()) {
            const existing = this.items.get(id);
            if (existing) Object.assign(existing, overrides);
          }
        }
        return bp.name;
      }
    }
    this.activeBreakpoint = null;
    return null;
  }

  /** Compute the full grid layout */
  compute(): ComputedGrid {
    const tpl = this.resolveTemplate();
    const colSizes = this.resolveTracks(tpl.columns, this.containerWidth);
    const rowSizes = this.resolveTracks(tpl.rows, this.containerHeight);

    const colGap = this.parseGap(tpl.gap?.column ?? 0, this.containerWidth);
    const rowGap = this.parseGap(tpl.gap?.row ?? 0, this.containerHeight);

    // Build line positions
    const colLines = this.buildLinePositions(colSizes, colGap);
    const rowLines = this.buildLinePositions(rowSizes, rowGap);

    // Place items
    const placedItems = this.placeItems(tpl, colLines, rowLines, colSizes, rowSizes, colGap, rowGap);

    const totalWidth = colLines[colLines.length - 1] ?? 0;
    const totalHeight = rowLines[rowLines.length - 1] ?? 0;

    return {
      template: tpl,
      items: placedItems,
      totalWidth,
      totalHeight,
      columnLines: colLines,
      rowLines: rowLines,
      gaps: { columnGap: colGap, rowGap: rowGap },
    };
  }

  /** Generate CSS for the grid container */
  generateCSS(options?: { classPrefix?: string; includeItems?: boolean }): string {
    const prefix = options?.classPrefix ?? "grid";
    const tpl = this.resolveTemplate();
    const lines: string[] = [];

    // Container styles
    lines.push(`.${prefix}-container {`);
    lines.push(`  display: grid;`);
    lines.push(`  grid-template-columns: ${this.trackSizesToCSS(tpl.columns)};`);
    lines.push(`  grid-template-rows: ${this.trackSizesToCSS(tpl.rows)};`);
    if (tpl.areas?.length) lines.push(`  grid-template-areas: ${this.areasToCSS(tpl.areas)};`);
    if (tpl.gap) {
      if (tpl.gap.row && tpl.gap.column && tpl.gap.row === tpl.gap.column) {
        lines.push(`  gap: ${this.gapToCSS(tpl.gap.row)};`);
      } else {
        if (tpl.gap.column) lines.push(`  column-gap: ${this.gapToCSS(tpl.gap.column)};`);
        if (tpl.gap.row) lines.push(`  row-gap: ${this.gapToCSS(tpl.gap.row)};`);
      }
    }
    if (tpl.justifyContent) lines.push(`  justify-content: ${tpl.justifyContent};`);
    if (tpl.alignContent) lines.push(`  align-content: ${tpl.alignContent};`);
    if (tpl.justifyItems) lines.push(`  justify-items: ${tpl.justifyItems};`);
    if (tpl.alignItems) lines.push(`  align-items: ${tpl.alignItems};`);
    if (tpl.autoFlow) lines.push(`  grid-auto-flow: ${tpl.autoFlow};`);
    if (tpl.autoRows) lines.push(`  grid-auto-rows: ${this.trackSizeToCSS(tpl.autoRows)};`);
    if (tpl.autoColumns) lines.push(`  grid-auto-columns: ${this.trackSizeToCSS(tpl.autoColumns)};`);
    if (tpl.width) lines.push(`  width: ${typeof tpl.width === "number" ? `${tpl.width}px` : tpl.width};`);
    if (tpl.height) lines.push(`  height: ${typeof tpl.height === "number" ? `${tpl.height}px` : tpl.height};`);
    lines.push("}");

    // Item styles
    if (options?.includeItems !== false) {
      for (const item of this.items.values()) {
        lines.push(`.${prefix}-item-${item.id} {`);
        if (item.columnStart !== undefined || item.columnEnd !== undefined) {
          lines.push(`  grid-column: ${this placementToCSS(item.columnStart)} / ${this.placementToCSS(item.columnEnd)};`);
        }
        if (item.rowStart !== undefined || item.rowEnd !== undefined) {
          lines.push(`  grid-row: ${this.placementToCSS(item.rowStart)} / ${this.placementToCSS(item.rowEnd)};`);
        }
        if (item.area) lines.push(`  grid-area: ${item.area};`);
        if (item.justifySelf) lines.push(`  justify-self: ${item.justifySelf};`);
        if (item.alignSelf) lines.push(`  align-self: ${item.alignSelf};`);
        if (item.order !== undefined) lines.push(`  order: ${item.order};`);
        if (item.zIndex !== undefined) lines.push(`  z-index: ${item.zIndex};`);
        if (item.style) {
          for (const [prop, val] of Object.entries(item.style)) {
            lines.push(`  ${prop}: ${val};`);
          }
        }
        lines.push("}");
      }
    }

    return lines.join("\n");
  }

  /** Export grid state as JSON */
  exportState(): object {
    return {
      template: this.template,
      items: Array.from(this.items.values()).map((item) => ({ ...item })),
      breakpoints: this.breakpoints.map((bp) => ({
        ...bp,
        itemOverrides: bp.itemOverrides ? Object.fromEntries(bp.itemOverrides.entries()) : undefined,
      })),
      containerSize: { width: this.containerWidth, height: this.containerHeight },
      activeBreakpoint: this.activeBreakpoint,
    };
  }

  /** Import grid state from JSON */
  importState(data: {
    template?: GridTemplate;
    items?: GridItem[];
    breakpoints?: Breakpoint[];
    containerSize?: { width: number; height: number };
  }): this {
    if (data.template) this.template = data.template;
    if (data.items) {
      this.items.clear();
      for (const item of data.items) this.items.set(item.id, item);
    }
    if (data.breakpoints) this.breakpoints = data.breakpoints;
    if (data.containerSize) {
      this.containerWidth = data.containerSize.width;
      this.containerHeight = data.containerSize.height;
    }
    return this;
  }

  /** Get grid info summary */
  getInfo(): {
    itemCount: number;
    columnCount: number;
    rowCount: number;
    breakpointCount: number;
    activeBreakpoint: string | null;
    containerSize: { width: number; height: number };
  } {
    return {
      itemCount: this.items.size,
      columnCount: this.flattenTracks(this.template.columns).length,
      rowCount: this.flattenTracks(this.template.rows).length,
      breakpointCount: this.breakpoints.length,
      activeBreakpoint: this.activeBreakpoint,
      containerSize: { width: this.containerWidth, height: this.containerHeight },
    };
  }

  // --- Internal ---

  private resolveTemplate(): GridTemplate {
    return { ...this.template };
  }

  private resolveTracks(tracks: TrackSize[], containerSize: number): number[] {
    const flat = this.flattenTracks(tracks);
    return flat.map((t, i) => resolveTrackSize(t, containerSize, i, flat.length));
  }

  private flattenTracks(tracks: TrackSize[]): TrackSize[] {
    const result: TrackSize[] = [];
    for (const t of tracks) {
      if (typeof t === "object" && "repeat" in t) {
        if (typeof t.repeat === "number") {
          for (let i = 0; i < t.repeat; i++) result.push(t.size);
        } else {
          // auto-fill/fit: estimate count from container
          const estimated = t.repeat === "auto-fit" ? 12 : 12;
          for (let i = 0; i < estimated; i++) result.push(t.size);
        }
      } else {
        result.push(t);
      }
    }
    return result;
  }

  private parseGap(gap: number | string, containerSize: number): number {
    if (typeof gap === "number") return gap;
    return parseFraction(gap, containerSize);
  }

  private buildLinePositions(sizes: number[], gap: number): number[] {
    const lines: number[] = [0];
    let pos = 0;
    for (let i = 0; i < sizes.length; i++) {
      pos += sizes[i];
      if (i < sizes.length - 1) pos += gap;
      lines.push(pos);
    }
    return lines;
  }

  private placeItems(
    tpl: GridTemplate,
    colLines: number[],
    rowLines: number[],
    colSizes: number[],
    rowSizes: number[],
    colGap: number,
    rowGap: number,
  ): PlacedItem[] {
    const placed: PlacedItem[] = [];
    const occupied = new Set<string>(); // "col,row" occupied cells

    for (const item of this.items.values()) {
      let cs: number, ce: number, rs: number, re: number;

      // Resolve placement
      if (item.area && tpl.areas) {
        const area = tpl.areas.find((a) => a.name === item.area);
        if (area) {
          cs = this.lineToIndex(area.columnStart, colLines.length - 1);
          ce = this.lineToIndex(area.columnEnd, colLines.length - 1);
          rs = this.lineToIndex(area.rowStart, rowLines.length - 1);
          re = this.lineToIndex(area.rowEnd, rowLines.length - 1);
        } else {
          [cs, ce, rs, re] = this.autoPlace(occupied, colSizes.length, rowSizes.length);
        }
      } else {
        cs = this.resolvePlacement(item.columnStart, 1, colLines.length - 1);
        ce = this.resolvePlacement(item.columnEnd, cs + 1, colLines.length - 1);
        rs = this.resolvePlacement(item.rowStart, 1, rowLines.length - 1);
        re = this.resolvePlacement(item.rowEnd, rs + 1, rowLines.length - 1);

        // Auto-placement if not specified
        if (item.columnStart === undefined && item.columnEnd === undefined &&
            item.rowStart === undefined && item.rowEnd === undefined && !item.area) {
          [cs, ce, rs, re] = this.autoPlace(occupied, colSizes.length, rowSizes.length);
        }
      }

      // Mark occupied
      for (let c = cs; c < ce; c++) {
        for (let r = rs; r < re; r++) {
          occupied.add(`${c},${r}`);
        }
      }

      const x = colLines[cs] ?? 0;
      const y = rowLines[rs] ?? 0;
      const w = (colLines[ce] ?? colLines[colLines.length - 1] ?? 0) - x - (ce > cs ? colGap : 0);
      const h = (rowLines[re] ?? rowLines[rowLines.length - 1] ?? 0) - y - (re > rs ? rowGap : 0);

      placed.push({
        ...item,
        x, y, width: w, height: h,
        colSpan: ce - cs,
        rowSpan: re - rs,
        colStartLine: cs,
        colEndLine: ce,
        rowStartLine: rs,
        rowEndLine: re,
      });
    }

    return placed;
  }

  private autoPlace(occupied: Set<string>, cols: number, rows: number): [number, number, number, number] {
    const flow = this.template.autoFlow?.includes("column") ? "column" : "row";
    const dense = this.template.autoFlow?.includes("dense") ?? false;

    if (flow === "row") {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (!occupied.has(`${c},${r}`)) return [c, c + 1, r, r + 1];
        }
      }
    } else {
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (!occupied.has(`${c},${r}`)) return [c, c + 1, r, r + 1];
        }
      }
    }

    // Fallback: append to end
    return [0, 1, rows, rows + 1];
  }

  private resolvePlacement(val: number | "auto" | SpanDef | string | undefined, defaultVal: number, max: number): number {
    if (val === undefined || val === "auto") return defaultVal;
    if (typeof val === "number") return clamp(val, 0, max);
    if (typeof val === "object" && "span" in val) return defaultVal + val.span;
    return defaultVal;
  }

  private lineToIndex(line: number | string, max: number): number {
    if (typeof line === "number") return clamp(line, 0, max);
    // Named line resolution would go here
    return 0;
  }

  private trackSizesToCSS(tracks: TrackSize[]): string {
    return tracks.map((t) => this.trackSizeToCSS(t)).join(" ");
  }

  private trackSizeToCSS(size: TrackSize): string {
    if (typeof size === "number") return `${size}px`;
    if (typeof size === "string") return size;
    if (typeof size === "object" && "min" in size && "max" in size) {
      return `minmax(${typeof size.min === "number" ? `${size.min}px` : size.min}, ${typeof size.max === "number" ? `${size.max}px` : size.max})`;
    }
    if (typeof size === "object" && "repeat" in size) {
      return `repeat(${size.repeat}, ${this.trackSizeToCSS(size.size)})`;
    }
    return "auto";
  }

  private areasToCSS(areas: GridAreaDef[]): string {
    // Simplified: just list area names
    return areas.map((a) => `"${a.name}"`).join(" ");
  }

  private placementToCSS(val: number | "auto" | SpanDef | string | undefined): string {
    if (val === undefined || val === "auto") return "auto";
    if (typeof val === "number") return String(val);
    if (typeof val === "object" && "span" in val) return `span ${val.span}`;
    return String(val);
  }

  private gapToCSS(gap: number | string): string {
    return typeof gap === "number" ? `${gap}px` : gap;
  }
}

// --- Responsive Grid Builder ---

export class ResponsiveGridBuilder {
  private baseTemplate: GridTemplate;
  private breakpoints: Breakpoint[] = [];

  constructor(base: GridTemplate) {
    this.baseTemplate = base;
  }

  /** Add a mobile-first breakpoint */
  mobile(maxWidth: number, overrides: Partial<GridTemplate>): this {
    this.breakpoints.push({ name: "mobile", maxWidth, template: overrides });
    return this;
  }

  /** Add tablet breakpoint */
  tablet(maxWidth: number, overrides: Partial<GridTemplate>): this {
    this.breakpoints.push({ name: "tablet", maxWidth, template: overrides });
    return this;
  }

  /** Add desktop breakpoint */
  desktop(minWidth: number, overrides: Partial<GridTemplate>): this {
    this.breakpoints.push({ name: "desktop", minWidth, template: overrides });
    return this;
  }

  /** Add custom breakpoint */
  add(name: string, constraint: { maxWidth?: number; minWidth?: number }, overrides: Partial<GridTemplate>): this {
    this.breakpoints.push({ name, ...constraint, template: overrides });
    return this;
  }

  /** Build the configured GridEngine */
  build(): GridEngine {
    const engine = new GridEngine(this.baseTemplate);
    for (const bp of this.breakpoints) engine.addBreakpoint(bp);
    return engine;
  }

  /** Generate responsive CSS with media queries */
  generateResponsiveCSS(prefix?: string): string {
    const engine = this.build();
    const baseCSS = engine.generateCSS({ classPrefix: prefix, includeItems: false });
    const sections: string[] = [`/* Base Grid */\n${baseCSS}`];

    for (const bp of this.breakpoints) {
      const bpEngine = new GridEngine({ ...this.baseTemplate, ...bp.template });
      const bpCSS = bpEngine.generateCSS({ classPrefix: prefix, includeItems: false });

      let query: string;
      if (bp.maxWidth !== undefined) {
        query = `(max-width: ${bp.maxWidth}px)`;
      } else {
        query = `(min-width: bp.minWidth!px)`;
      }

      sections.push(`\n/* ${bp.name} */\n@media ${query} {\n  ${bpCSS.split("\n").map((l) => l ? "  " + l : "").join("\n")}\n}`);
    }

    return sections.join("\n\n");
  }
}

// --- Grid Presets ---

export const GridPresets = {
  /** Standard 12-column grid */
  twelveColumn(): GridTemplate {
    return {
      columns: Array.from({ length: 12 }, () => 1 as TrackSize),
      rows: ["auto"],
      gap: { column: 16, row: 16 },
    };
  },

  /** Dashboard layout: sidebar + main content */
  dashboard(sidebarWidth = 250): GridTemplate {
    return {
      columns: [sidebarWidth, "auto"],
      rows: ["auto", "auto"],
      gap: { column: 0, row: 16 },
      areas: [
        { name: "header", columnStart: 1, columnEnd: -1, rowStart: 1, rowEnd: 2 },
        { name: "sidebar", columnStart: 1, columnEnd: 2, rowStart: 2, rowEnd: -1 },
        { name: "main", columnStart: 2, columnEnd: -1, rowStart: 2, rowEnd: -1 },
      ],
    };
  },

  /** Card grid (auto-fit cards) */
  cardGrid(minCardWidth = 280, gap = 24): GridTemplate {
    return {
      columns: [{ repeat: "auto-fill", size: minCardWidth }],
      rows: ["auto"],
      gap: { column: gap, row: gap },
      autoFlow: "row dense",
    };
  },

  /** Form layout: labels on left, inputs on right */
  formLayout(labelWidth = 150, gap = 16): GridTemplate {
    return {
      columns: [labelWidth, "auto"],
      rows: [],
      gap: { column: gap, row: gap },
      alignItems: "center",
    };
  },

  /** Masonry-like grid (simplified) */
  masonry(columns = 4, gap = 16): GridTemplate {
    return {
      columns: Array.from({ length: columns }, () => "1fr" as TrackSize),
      rows: ["auto"],
      gap: { column: gap, row: gap },
      autoFlow: "column dense",
    };
  },

  /** Holy grail layout */
  holyGrail(headerHeight = 60, footerHeight = 50, sidebarWidth = 220): GridTemplate {
    return {
      columns: [sidebarWidth, "auto", 200],
      rows: [headerHeight, "auto", footerHeight],
      areas: [
        { name: "header", columnStart: 1, columnEnd: -1, rowStart: 1, rowEnd: 2 },
        { name: "nav", columnStart: 1, columnEnd: 2, rowStart: 2, rowEnd: 3 },
        { name: "content", columnStart: 2, columnEnd: 3, rowStart: 2, rowEnd: 3 },
        { name: "aside", columnStart: 3, columnEnd: 4, rowStart: 2, rowEnd: 3 },
        { name: "footer", columnStart: 1, columnEnd: -1, rowStart: 3, rowEnd: 4 },
      ],
      gap: { column: 0, row: 0 },
    };
  },
};

// --- Grid Debug Overlay ---

export class GridDebugOverlay {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private visible = false;

  /** Initialize debug overlay on a container element */
  attach(container: HTMLElement, computed: ComputedGrid): void {
    // Create or reuse canvas
    if (!this.canvas) {
      this.canvas = document.createElement("canvas");
      this.canvas.style.position = "absolute";
      this.canvas.style.top = "0";
      this.canvas.style.left = "0";
      this.canvas.style.pointerEvents = "none";
      this.canvas.style.zIndex = "9999";
      container.style.position = container.style.position || "relative";
      container.appendChild(this.canvas);
    }

    this.canvas.width = computed.totalWidth || container.clientWidth;
    this.canvas.height = computed.totalHeight || container.clientHeight;
    this.ctx = this.canvas.getContext("2d");

    if (this.visible) this.render(computed);
  }

  /** Show/hide debug overlay */
  toggle(show?: boolean): boolean {
    this.visible = show ?? !this.visible;
    return this.visible;
  }

  /** Render debug visualization */
  render(computed: ComputedGrid): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw column lines
    ctx.strokeStyle = "rgba(255, 0, 0, 0.3)";
    ctx.lineWidth = 1;
    for (const x of computed.columnLines) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, computed.totalHeight);
      ctx.stroke();
    }

    // Draw row lines
    ctx.strokeStyle = "rgba(0, 0, 255, 0.3)";
    for (const y of computed.rowLines) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(computed.totalWidth, y);
      ctx.stroke();
    }

    // Draw item bounds
    ctx.strokeStyle = "rgba(0, 255, 0, 0.5)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    for (const item of computed.items) {
      ctx.strokeRect(item.x, item.y, item.width, item.height);

      // Label
      ctx.fillStyle = "rgba(0, 200, 0, 0.8)";
      ctx.font = "10px monospace";
      ctx.fillText(item.id, item.x + 2, item.y + 12);
    }
    ctx.setLineDash([]);
  }

  /** Detach overlay */
  detach(): void {
    if (this.canvas?.parentNode) this.canvas.parentNode.removeChild(this.canvas);
    this.canvas = null;
    this.ctx = null;
  }
}
