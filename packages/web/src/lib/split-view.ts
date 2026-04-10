/**
 * Split View / Split Pane Layout: Multi-pane resizable layout with
 * horizontal/vertical orientation, nested splits, collapsible panes,
 * drag-to-resize splitters, min/max constraints, and persistence.
 */

// --- Types ---

export type SplitDirection = "horizontal" | "vertical";

export interface PaneConfig {
  /** Unique pane identifier */
  id: string;
  /** Initial size (px or %) */
  size?: string | number;
  /** Minimum size (px or %) */
  minSize?: string | number;
  /** Maximum size (px or %) */
  maxSize?: string | number;
  /** Can this pane collapse? */
  collapsible?: boolean;
  /** Initially collapsed? */
  defaultCollapsed?: boolean;
  /** Pane content element */
  content: HTMLElement;
  /** Whether this pane can be resized */
  resizable?: boolean;
  /** Display order index */
  order?: number;
}

export interface SplitViewOptions {
  /** Container element */
  container: HTMLElement;
  /** Pane configurations */
  panes: PaneConfig[];
  /** Orientation */
  direction?: SplitDirection;
  /** Splitter size in px (default: 6) */
  splitterSize?: number;
  /** Splitter color/visual style */
  splitterColor?: string;
  /** Show grip lines on splitter? */
  showGrip?: boolean;
  /** Persist layout to localStorage? */
  persistKey?: string;
  /** Callback when any pane resizes */
  onResize?: (sizes: Record<string, number>) => void;
  /** Callback when a pane collapses/expands */
  onToggle?: (paneId: string, collapsed: boolean) => void;
  /** Animation duration for collapse/expand (ms) */
  animationDuration?: number;
}

export interface SplitViewState {
  sizes: Record<string, number>;
  collapsed: Set<string>;
  direction: SplitDirection;
}

export interface SplitViewInstance {
  /** Root container element */
  element: HTMLElement;
  /** Get current state */
  getState(): SplitViewState;
  /** Resize a specific pane */
  resizePane(paneId: string, size: number): void;
  /** Collapse a pane */
  collapsePane(paneId: string): void;
  /** Expand a pane */
  expandPane(paneId: string): void;
  /** Toggle collapse state */
  togglePane(paneId: string): void;
  /** Set all pane sizes at once */
  setSizes(sizes: Record<string, number>): void;
  /** Reset to initial layout */
  reset(): void;
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Helpers ---

function parseSize(value: string | number, containerSize: number, isPercent = false): number {
  if (typeof value === "number") return value;
  const str = String(value).trim();
  if (str.endsWith("%")) {
    return (parseFloat(str) / 100) * containerSize;
  }
  return parseFloat(str) || 0;
}

function clampSize(
  value: number,
  min: number | undefined,
  max: number | undefined,
  containerSize: number,
): number {
  const minPx = min !== undefined ? parseSize(min, containerSize) : 30;
  const maxPx = max !== undefined ? parseSize(max, containerSize) : containerSize;
  return Math.max(minPx, Math.min(maxPx, value));
}

// --- Main Implementation ---

export function createSplitView(options: SplitViewOptions): SplitViewInstance {
  const {
    container,
    direction = "horizontal",
    splitterSize = 6,
    splitterColor = "rgba(99,102,241,0.1)",
    showGrip = true,
    persistKey,
    onResize,
    onToggle,
    animationDuration = 200,
  } = options;

  // Sort panes by order
  const panes = [...options.panes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // State
  let destroyed = false;
  const collapsedSet = new Set<string>();
  const sizes: Record<string, number> = {};
  const splitters = new Map<string, HTMLElement>();
  const paneElements = new Map<string, HTMLElement>();

  // Load persisted state
  if (persistKey) {
    try {
      const saved = localStorage.getItem(persistKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.sizes) Object.assign(sizes, parsed.sizes);
        if (parsed.collapsed) parsed.collapsed.forEach((id: string) => collapsedSet.add(id));
      }
    } catch { /* ignore */ }
  }

  // Setup container
  container.style.display = "flex";
  container.style.flexDirection = direction === "horizontal" ? "row" : "column";
  container.style.width = "100%";
  container.style.height = "100%";
  container.style.overflow = "hidden";
  container.className = `split-view split-${direction}`;

  // Calculate initial sizes
  function calculateInitialSizes(): void {
    const totalSize = direction === "horizontal"
      ? container.offsetWidth
      : container.offsetHeight;

    const flexiblePanes = panes.filter((p) => !collapsedSet.has(p.id));
    const reservedSize = flexiblePanes.reduce((sum, p) => {
      const s = p.size ?? 0;
      if (typeof s === "string" && (s.endsWith("px") || s.endsWith("%"))) {
        return sum + parseSize(s, totalSize);
      }
      return sum; // flexible (number or no size = auto)
    }, 0);

    const remaining = Math.max(0, totalSize - reservedSize - (flexiblePanes.length - 1) * splitterSize);
    const autoPanes = flexiblePanes.filter((p) => typeof p.size !== "string" || (!p.size!.endsWith("px") && !p.size!.endsWith("%")));
    const autoShare = autoPanes.length > 0 ? remaining / autoPanes.length : 0;

    for (const pane of panes) {
      if (collapsedSet.has(pane.id)) {
        sizes[pane.id] = 0;
        continue;
      }

      if (typeof pane.size === "string" && (pane.size.endsWith("px") || pane.size.endsWith("%"))) {
        sizes[pane.id] = clampSize(parseSize(pane.size, totalSize), pane.minSize, pane.maxSize, totalSize);
      } else if (sizes[pane.id]) {
        sizes[pane.id] = clampSize(sizes[pane.id], pane.minSize, pane.maxSize, totalSize);
      } else {
        sizes[pane.id] = clampSize(autoShare, pane.minSize, pane.maxSize, totalSize);
      }
    }
  }

  // Build DOM
  function buildDOM(): void {
    container.innerHTML = "";
    paneElements.clear();
    splitters.clear();

    calculateInitialSizes();

    for (let i = 0; i < panes.length; i++) {
      const pane = panes[i]!;
      const isCollapsed = collapsedSet.has(pane.id);

      // Pane wrapper
      const wrapper = document.createElement("div");
      wrapper.className = `split-pane split-pane-${pane.id}`;
      wrapper.dataset.paneId = pane.id;
      wrapper.style.cssText = `
        flex-shrink: 0;
        overflow: hidden;
        transition: ${animationDuration}ms ease;
        ${direction === "horizontal"
          ? `width: ${isCollapsed ? 0 : sizes[pane.id]}px;`
          : `height: ${isCollapsed ? 0 : sizes[pane.id]}px;`}
      `;
      if (isCollapsed) wrapper.style.opacity = "0";

      // Content
      wrapper.appendChild(pane.content);
      container.appendChild(wrapper);
      paneElements.set(pane.id, wrapper);

      // Add splitter after each non-last pane (unless next is collapsed)
      if (i < panes.length - 1) {
        const nextPane = panes[i + 1];
        const nextCollapsed = nextPane ? collapsedSet.has(nextPane.id) : false;

        if (!isCollapsed || !nextCollapsed) {
          const splitter = createSplitter(i);
          container.appendChild(splitter);
          splitters.set(`${i}`, splitter);
        }
      }
    }
  }

  function createSplitter(index: number): HTMLElement {
    const el = document.createElement("div");
    el.className = "split-splitter";
    el.dataset.splitterIndex = String(index);

    const isH = direction === "horizontal";
    el.style.cssText = `
      flex-shrink: 0;
      ${isH ? `width: ${splitterSize}px; cursor: col-resize;` : `height: ${splitterSize}px; cursor: row-resize;`}
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${splitterColor};
      transition: background 0.15s;
      z-index: 2;
      user-select: none;
    `;

    if (showGrip) {
      const grip = document.createElement("div");
      grip.style.cssText = isH
        ? "width:2px;height:24px;border-radius:1px;background:#c7d2fe;"
        : "width:24px;height:2px;border-radius:1px;background:#c7d2fe;";
      el.appendChild(grip);
    }

    // Hover effect
    el.addEventListener("mouseenter", () => { el.style.background = "rgba(99,102,241,0.2)"; });
    el.addEventListener("mouseleave", () => {
      if (!isDragging) el.style.background = splitterColor;
    });

    // Drag behavior
    el.addEventListener("pointerdown", (e) => startDrag(e, index));

    return el;
  }

  // Drag logic
  let isDragging = false;
  let dragStartPos = 0;
  let dragStartSizes: Record<string, number> = {};
  let dragIndex = -1;

  function startDrag(e: PointerEvent, index: number): void {
    e.preventDefault();
    isDragging = true;
    dragIndex = index;
    dragStartPos = direction === "horizontal" ? e.clientX : e.clientY;
    dragStartSizes = { ...sizes };

    // Highlight all splitters
    for (const [, sp] of splitters) sp.style.background = "rgba(99,102,241,0.2)";

    document.addEventListener("pointermove", handleDragMove);
    document.addEventListener("pointerup", handleDragEnd);
  }

  function handleDragMove(e: PointerEvent): void {
    if (!isDragging || dragIndex < 0) return;

    const currentPos = direction === "horizontal" ? e.clientX : e.clientY;
    const delta = currentPos - dragStartPos;

    const paneA = panes[dragIndex];
    const paneB = panes[dragIndex + 1];
    if (!paneA || !paneB) return;

    const containerSize = direction === "horizontal"
      ? container.offsetWidth
      : container.offsetHeight;

    const newSizeA = clampSize(
      (dragStartSizes[paneA.id] ?? 0) + delta,
      paneA.minSize,
      paneA.maxSize,
      containerSize,
    );
    const newSizeB = clampSize(
      (dragStartSizes[paneB.id] ?? 0) - delta,
      paneB.minSize,
      paneB.maxSize,
      containerSize,
    );

    const actualDelta = newSizeA - (dragStartSizes[paneA.id] ?? 0);

    sizes[paneA.id] = newSizeA;
    sizes[paneB.id] = (dragStartSizes[paneB.id] ?? 0) - actualDelta;

    applySizes();
    onResize?.({ ...sizes });
  }

  function handleDragEnd(): void {
    if (!isDragging) return;
    isDragging = false;

    for (const [, sp] of splitters) sp.style.background = splitterColor;

    document.removeEventListener("pointermove", handleDragMove);
    document.removeEventListener("pointerup", handleDragEnd);
    saveState();
  }

  function applySizes(): void {
    for (const [id, wrapper] of paneElements) {
      if (collapsedSet.has(id)) continue;
      const size = sizes[id];
      if (size !== undefined) {
        if (direction === "horizontal") {
          wrapper.style.width = `${size}px`;
        } else {
          wrapper.style.height = `${size}px`;
        }
      }
    }
  }

  function saveState(): void {
    if (!persistKey) return;
    try {
      localStorage.setItem(persistKey, JSON.stringify({
        sizes,
        collapsed: Array.from(collapsedSet),
      }));
    } catch { /* ignore */ }
  }

  // Initial build
  buildDOM();

  // Instance
  const instance: SplitViewInstance = {
    element: container,

    getState(): SplitViewState {
      return {
        sizes: { ...sizes },
        collapsed: new Set(collapsedSet),
        direction,
      };
    },

    resizePane(paneId: string, size: number): void {
      const pane = panes.find((p) => p.id === paneId);
      if (!pane) return;
      const containerSize = direction === "horizontal"
        ? container.offsetWidth
        : container.offsetHeight;
      sizes[paneId] = clampSize(size, pane.minSize, pane.maxSize, containerSize);
      applySizes();
      saveState();
      onResize?.({ ...sizes });
    },

    collapsePane(paneId: string): void {
      const pane = panes.find((p) => p.id === paneId);
      if (!pane || !pane.collapsible || collapsedSet.has(paneId)) return;

      collapsedSet.add(paneId);
      const wrapper = paneElements.get(paneId);
      if (wrapper) {
        if (direction === "horizontal") wrapper.style.width = "0";
        else wrapper.style.height = "0";
        wrapper.style.opacity = "0";
      }
      sizes[paneId] = 0;
      saveState();
      onToggle?.(paneId, true);

      // Redistribute space
      redistributeSpace();
      buildDOM();
    },

    expandPane(paneId: string): void {
      const pane = panes.find((p) => p.id === paneId);
      if (!pane || !collapsedSet.has(paneId)) return;

      collapsedSet.delete(paneId);
      const containerSize = direction === "horizontal"
        ? container.offsetWidth
        : container.offsetHeight;
      sizes[paneId] = clampSize(
        pane.size ? parseSize(pane.size, containerSize) : containerSize / panes.length,
        pane.minSize,
        pane.maxSize,
        containerSize,
      );

      saveState();
      onToggle?.(paneId, false);
      buildDOM();
    },

    togglePane(paneId: string): void {
      if (collapsedSet.has(paneId)) instance.expandPane(paneId);
      else instance.collapsePane(paneId);
    },

    setSizes(newSizes: Record<string, number>): void {
      Object.assign(sizes, newSizes);
      applySizes();
      saveState();
      onResize?.({ ...sizes });
    },

    reset(): void {
      collapsedSet.clear();
      // Clear persisted sizes
      if (persistKey) {
        try { localStorage.removeItem(persistKey); } catch { /* ignore */ }
      }
      buildDOM();
    },

    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      document.removeEventListener("pointermove", handleDragMove);
      document.removeEventListener("pointerup", handleDragEnd);
      container.innerHTML = "";
      container.style.display = "";
      container.style.flexDirection = "";
      paneElements.clear();
      splitters.clear();
    },
  };

  return instance;
}

/** Convenience: create a simple two-pane horizontal split view */
export function createHorizontalSplit(
  container: HTMLElement,
  leftContent: HTMLElement,
  rightContent: HTMLElement,
  options?: { initialSplit?: number; minSize?: number },
): SplitViewInstance {
  return createSplitView({
    container,
    direction: "horizontal",
    panes: [
      { id: "left", size: options?.initialSplit ?? 50, minSize: options?.minSize ?? 150, content: leftContent },
      { id: "right", content: rightContent },
    ],
  });
}

/** Convenience: create a simple two-pane vertical split view */
export function createVerticalSplit(
  container: HTMLElement,
  topContent: HTMLElement,
  bottomContent: HTMLElement,
  options?: { initialSplit?: number; minSize?: number },
): SplitViewInstance {
  return createSplitView({
    container,
    direction: "vertical",
    panes: [
      { id: "top", size: options?.initialSplit ?? 50, minSize: options?.minSize ?? 100, content: topContent },
      { id: "bottom", content: bottomContent },
    ],
  });
}
