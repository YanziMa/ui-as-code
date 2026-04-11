/**
 * Layout Utilities: CSS layout pattern generators, flex/grid builders,
 * stack layouts, aspect ratio utilities, spacing systems, and
 * responsive layout composition helpers.
 */

// --- Types ---

export type FlexDirection = "row" | "column" | "row-reverse" | "column-reverse";
export type FlexWrap = "nowrap" | "wrap" | "wrap-reverse";
export type JustifyContent = "start" | "center" | "end" | "between" | "around" | "evenly";
export type AlignItems = "start" | "center" | "end" | "stretch" | "baseline";
export type AlignSelf = AlignItems | "auto";
export type GapSize = "none" | "xs" | "sm" | "md" | "lg" | "xl";

export interface FlexConfig {
  direction?: FlexDirection;
  wrap?: FlexWrap;
  justify?: JustifyContent;
  align?: AlignItems;
  gap?: GapSize | number;
}

export interface GridConfig {
  columns?: number | string;
  rows?: number | string;
  gap?: GapSize | number;
  rowGap?: GapSize | number;
  columnGap?: GapSize | number;
  alignItems?: AlignItems;
  justifyItems?: JustifyContent;
  justifyContent?: JustifyContent;
  autoFit?: boolean;
  minColumnWidth?: number;
}

export interface StackConfig {
  direction?: "vertical" | "horizontal";
  gap?: GapSize | number;
  align?: AlignItems;
  distribute?: JustifyContent;
  reverse?: boolean;
  fullWidth?: boolean;
}

// --- Spacing Scale ---

const GAP_MAP: Record<GapSize, string> = {
  none: "0",
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
};

function resolveGap(gap?: GapSize | number): string {
  if (gap === undefined) return "0";
  if (typeof gap === "number") return `${gap}px`;
  return GAP_MAP[gap] ?? "0";
}

const JUSTIFY_MAP: Record<JustifyContent, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around",
  evenly: "space-evenly",
};

const ALIGN_MAP: Record<AlignItems, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
  baseline: "baseline",
};

// --- Flex Layout ---

export function flex(config: FlexConfig = {}): Record<string, string> {
  const style: Record<string, string> = {
    display: "flex",
    flexDirection: config.direction ?? "row",
    flexWrap: config.wrap ?? "nowrap",
    justifyContent: JUSTIFY_MAP[config.justify ?? "start"],
    alignItems: ALIGN_MAP[config.align ?? "stretch"],
    gap: resolveGap(config.gap),
  };
  Object.entries(style).forEach(([k, v]) => { if (v === "0") delete style[k]; });
  return style;
}

export function applyFlex(element: HTMLElement, config: FlexConfig = {}): void {
  Object.assign(element.style, flex(config));
}

/** Horizontal flex row */
export function hStack(element: HTMLElement, options?: Omit<FlexConfig, "direction">): void {
  applyFlex(element, { ...options, direction: "row" });
}

/** Vertical flex column */
export function vStack(element: HTMLElement, options?: Omit<FlexConfig, "direction">): void {
  applyFlex(element, { ...options, direction: "column" });
}

// --- Grid Layout ---

export function gridLayout(config: GridConfig = {}): Record<string, string> {
  let templateColumns: string;

  if (typeof config.columns === "string") {
    templateColumns = config.columns;
  } else if (config.autoFit && config.minColumnWidth) {
    templateColumns = `repeat(auto-fit, minmax(${config.minColumnWidth}px, 1fr))`;
  } else if (config.columns) {
    templateColumns = `repeat(${config.columns}, 1fr)`;
  } else {
    templateColumns = "repeat(12, 1fr)";
  }

  const style: Record<string, string> = {
    display: "grid",
    gridTemplateColumns: templateColumns,
    gap: resolveGap(config.gap),
    alignItems: ALIGN_MAP[config.alignItems ?? "stretch"],
    justifyItems: JUSTIFY_MAP[config.justifyItems ?? "start"],
  };

  if (config.rows) {
    style.gridTemplateRows = typeof config.rows === "string"
      ? config.rows
      : `repeat(${config.rows}, 1fr)`;
  }
  if (config.rowGap !== undefined) style.rowGap = resolveGap(config.rowGap);
  if (config.columnGap !== undefined) style.columnGap = resolveGap(config.columnGap);
  if (config.justifyContent) style.justifyContent = JUSTIFY_MAP[config.justifyContent];
  Object.entries(style).forEach(([k, v]) => { if (v === "0") delete style[k]; });

  return style;
}

export function applyGrid(element: HTMLElement, config: GridConfig = {}): void {
  Object.assign(element.style, gridLayout(config));
}

// --- Stack Layout ---

export function applyStack(element: HTMLElement, config: StackConfig = {}): void {
  const dir = config.direction ?? "vertical";
  const isVertical = dir === "vertical";

  const style: Record<string, string> = {
    display: "flex",
    flexDirection: isVertical
      ? (config.reverse ? "column-reverse" : "column")
      : (config.reverse ? "row-reverse" : "row"),
    gap: resolveGap(config.gap),
    alignItems: ALIGN_MAP[config.align ?? (isVertical ? "stretch" : "center")],
    justifyContent: JUSTIFY_MAP[config.distribute ?? "start"],
  };

  if (isVertical && config.fullWidth) {
    for (const child of Array.from(element.children) as HTMLElement[]) {
      child.style.width = "100%";
      child.style.flexShrink = "0";
    }
  }

  Object.assign(element.style, style);
}

// --- Aspect Ratio ---

export function parseAspectRatio(ratio: number | string): number {
  if (typeof ratio === "number") return ratio;

  const cleaned = ratio.replace(/\s+/g, "");
  if (cleaned.includes(":")) {
    const [w, h] = cleaned.split(":").map(Number);
    if (w && h) return w / h;
  }
  if (cleaned.includes("/")) {
    const [w, h] = cleaned.split("/").map(Number);
    if (w && h) return w / h;
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 1 : parsed;
}

export function applyAspectRatio(
  element: HTMLElement,
  ratio: number | string,
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down",
): void {
  const value = parseAspectRatio(ratio);
  element.style.aspectRatio = `${value}`;
  if (objectFit && element instanceof HTMLImageElement) {
    element.style.objectFit = objectFit;
  }
}

/** Create a wrapper div that maintains aspect ratio */
export function createAspectContainer(
  ratio: number | string,
  content?: HTMLElement,
): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.style.aspectRatio = `${parseAspectRatio(ratio)}`;
  wrapper.style.position = "relative";
  wrapper.style.overflow = "hidden";

  if (content) {
    content.style.position = "absolute";
    content.style.inset = "0";
    wrapper.appendChild(content);
  }

  return wrapper;
}

// --- Spacing System ---

/** Apply consistent spacing to an element's margin/padding */
export function spacing(
  element: HTMLElement,
  opts: {
    p?: GapSize | number;       // padding all sides
    px?: GapSize | number;      // padding x
    py?: GapSize | number;      // padding y
    pt?: GapSize | number;      // padding top
    pr?: GapSize | number;      // padding right
    pb?: GapSize | number;      // padding bottom
    pl?: GapSize | number;      // padding left
    m?: GapSize | number;       // margin all sides
    mx?: GapSize | number;      // margin x
    my?: GapSize | number;      // margin y
    mt?: GapSize | number;      // margin top
    mr?: GapSize | number;      // margin right
    mb?: GapSize | number;      // margin bottom
    ml?: GapSize | number;      // margin left
  },
): void {
  const map: [keyof typeof opts, string][] = [
    ["p", "padding"], ["px", "paddingLeft", "paddingRight"],
    ["py", "paddingTop", "paddingBottom"],
    ["pt", "paddingTop"], ["pr", "paddingRight"],
    ["pb", "paddingBottom"], ["pl", "paddingLeft"],
    ["m", "margin"], ["mx", "marginLeft", "marginRight"],
    ["my", "marginTop", "marginBottom"],
    ["mt", "marginTop"], ["mr", "marginRight"],
    ["mb", "marginBottom"], ["ml", "marginLeft"],
  ];

  for (const [opt, ...props] of map) {
    const val = opts[opt];
    if (val !== undefined) {
      const resolved = resolveGap(val);
      for (const prop of props) {
        (element.style as Record<string, string>)[prop] = resolved;
      }
    }
  }
}

// --- Divider / Separator ---

/** Insert a horizontal or vertical divider after/before an element */
export function insertDivider(
  container: HTMLElement,
  orientation: "horizontal" | "vertical" = "horizontal",
  options?: { color?: string; thickness?: number; margin?: GapSize | number },
): HTMLElement {
  const divider = document.createElement("div");
  const isHorizontal = orientation === "horizontal";

  divider.setAttribute("role", "separator");
  divider.setAttribute("aria-orientation", orientation);

  const thickness = options?.thickness ?? 1;
  const gap = resolveGap(options?.margin ?? "md");

  if (isHorizontal) {
    divider.style.width = "100%";
    divider.style.height = `${thickness}px`;
    divider.style.marginTop = gap;
    divider.style.marginBottom = gap;
  } else {
    divider.style.width = `${thickness}px`;
    divider.style.height = "100%";
    divider.style.marginLeft = gap;
    divider.style.marginRight = gap;
  }

  divider.style.backgroundColor = options?.color ?? "var(--color-border, #e2e8f0)";
  divider.style.flexShrink = "0";

  container.appendChild(divider);
  return divider;
}

// --- Layout Composition Helpers ---

/** Create a header + content + footer layout */
export function createAppLayout(options?: {
  headerHeight?: number;
  footerHeight?: number;
  maxWidth?: number;
}): { container: HTMLElement; header: HTMLElement; main: HTMLElement; footer: HTMLElement } {
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.minHeight = "100vh";
  if (options?.maxWidth) {
    container.style.maxWidth = `${options.maxWidth}px`;
    container.style.marginLeft = "auto";
    container.style.marginRight = "auto";
    container.style.width = "100%";
  }

  const header = document.createElement("header");
  header.style.flexShrink = "0";
  if (options?.headerHeight) header.style.height = `${options.headerHeight}px`;

  const main = document.createElement("main");
  main.style.flexGrow = "1";
  main.style.overflow = "auto";

  const footer = document.createElement("footer");
  footer.style.flexShrink = "0";
  if (options?.footerHeight) footer.style.height = `${options.footerHeight}px`;

  container.append(header, main, footer);
  return { container, header, main, footer };
}

/** Create a sidebar + content layout */
export function createSidebarLayout(options?: {
  sidebarWidth?: number;
  position?: "left" | "right";
  collapsible?: boolean;
}): { container: HTMLElement; sidebar: HTMLElement; content: HTMLElement; toggle?: () => void } {
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.minHeight = "100vh";

  const sbWidth = options?.sidebarWidth ?? 260;
  const isLeft = options?.position !== "right";

  const sidebar = document.createElement("aside");
  sidebar.style.width = `${sbWidth}px`;
  sidebar.style.flexShrink = "0";
  sidebar.style.transition = "width 200ms ease, transform 200ms ease";
  sidebar.style.overflow = "auto";

  const content = document.createElement("div");
  content.style.flexGrow = "1";
  content.style.minWidth = "0"; // Prevent overflow
  content.style.overflow = "auto";

  if (isLeft) {
    container.append(sidebar, content);
  } else {
    container.append(content, sidebar);
  }

  let collapsed = false;
  const toggle = (): void => {
    collapsed = !collapsed;
    sidebar.style.width = collapsed ? "0" : `${sbWidth}px`;
    sidebar.style.overflow = collapsed ? "hidden" : "auto";
  };

  return { container, sidebar, content, ...(options?.collapsible ? { toggle } : {}) };
}

/** Create a centered content area with max-width */
export function createCenteredLayout(maxWidth = 800, padding = 24): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.justifyContent = "center";
  wrapper.style.padding = `${padding}px`;
  wrapper.style.minHeight = "100vh";

  const inner = document.createElement("div");
  inner.style.width = "100%";
  inner.style.maxWidth = `${maxWidth}px`;

  wrapper.appendChild(inner);
  return inner;
}
