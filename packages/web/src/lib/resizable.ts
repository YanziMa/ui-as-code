/**
 * Resizable panels and elements with drag handles, constraints, and persistence.
 */

export interface ResizeOptions {
  /** Minimum size in pixels */
  minWidth?: number;
  /** Maximum size in pixels */
  maxWidth?: number;
  /** Minimum height */
  minHeight?: number;
  /** Maximum height */
  maxHeight?: number;
  /** Initial width */
  initialWidth?: number;
  /** Initial height?: number
  /** Snap to grid (px) */
  gridSnap?: number;
  /** Which edges are resizable */
  edges?: ("n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw")[];
  /** Handle size in px */
  handleSize?: number;
  /** Callback on resize start */
  onResizeStart?: (size: { width: number; height: number }) => void;
  /** Callback during resize */
  onResize?: (size: { width: number; height: number }) => void;
  /** Callback on resize end */
  onResizeEnd?: (size: { width: number; height: number }) => void;
}

export interface ResizeState {
  width: number;
  height: number;
  isResizing: boolean;
  activeHandle: string | null;
}

/** Make an element resizable with drag handles */
export function makeResizable(
  element: HTMLElement,
  options: ResizeOptions = {},
): ResizableController {
  const {
    minWidth = 50,
    maxWidth = Infinity,
    minHeight = 50,
    maxHeight = Infinity,
    gridSnap = 0,
    edges = ["e", "s", "se"],
    handleSize = 6,
  } = options;

  let state: ResizeState = {
    width: options.initialWidth ?? element.offsetWidth,
    height: options.initialHeight ?? element.offsetHeight,
    isResizing: false,
    activeHandle: null,
  };

  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;
  let startLeft = 0;
  let startTop = 0;

  // Create handles
  const handles = new Map<string, HTMLElement>();
  const handlePositions: Record<string, string> = {
    n: "top: -3px; left: 50%; transform: translateX(-50%); cursor: ns-resize; width: 100%; height: 6px;",
    s: "bottom: -3px; left: 50%; transform: translateX(-50%); cursor: ns-resize; width: 100%; height: 6px;",
    e: "right: -3px; top: 50%; transform: translateY(-50%); cursor: ew-resize; height: 100%; width: 6px;",
    w: "left: -3px; top: 50%; transform: translateY(-50%); cursor: ew-resize; height: 100%; width: 6px;",
    ne: "top: -3px; right: -3px; cursor: nesw-resize;",
    nw: "top: -3px; left: -3px; cursor: nwse-resize;",
    se: "bottom: -3px; right: -3px; cursor: nwse-resize;",
    sw: "bottom: -3px; left: -3px; cursor: nesw-resize;",
  };

  for (const edge of edges) {
    if (!handlePositions[edge]) continue;

    const handle = document.createElement("div");
    handle.className = "resize-handle";
    handle.dataset.handle = edge;
    handle.style.cssText = `
      position: absolute;
      ${handlePositions[edge]!}
      z-index: 10;
      background: transparent;
    `;

    // Visual indicator on hover
    handle.addEventListener("mouseenter", () => {
      handle.style.background = "rgba(99, 102, 241, 0.3)";
    });
    handle.addEventListener("mouseleave", () => {
      if (!state.isResizing) handle.style.background = "transparent";
    });

    element.style.position = "relative";
    element.appendChild(handle);
    handles.set(edge, handle);
  }

  function applyGrid(value: number): number {
    return gridSnap > 0 ? Math.round(value / gridSnap) * gridSnap : value;
  }

  function handlePointerDown(e: PointerEvent): void {
    const handleEl = e.target as HTMLElement;
    const edge = handleEl.dataset.handle;
    if (!edge || !handles.has(edge)) return;

    e.preventDefault();
    state.isResizing = true;
    state.activeHandle = edge;

    startX = e.clientX;
    startY = e.clientY;
    startWidth = state.width;
    startHeight = state.height;
    startLeft = element.offsetLeft;
    startTop = element.offsetTop;

    // Show all handles as active
    for (const [, h] of handles) h.style.background = "rgba(99, 102, 241, 0.3)";

    options.onResizeStart?.({ width: state.width, height: state.height });

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    element.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent): void {
    if (!state.isResizing || !state.activeHandle) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const edge = state.activeHandle;

    let newWidth = startWidth;
    let newHeight = startHeight;
    let newLeft = startLeft;
    let newTop = startTop;

    // Calculate new dimensions based on which edge is being dragged
    if (edge.includes("e")) newWidth = applyGrid(Math.max(minWidth, Math.min(maxWidth, startWidth + dx)));
    if (edge.includes("w")) {
      const proposedWidth = applyGrid(Math.max(minWidth, Math.min(maxWidth, startWidth - dx)));
      const deltaW = startWidth - proposedWidth;
      newWidth = proposedWidth;
      newLeft = startLeft + deltaW;
    }
    if (edge.includes("s")) newHeight = applyGrid(Math.max(minHeight, Math.min(maxHeight, startHeight + dy)));
    if (edge.includes("n")) {
      const proposedHeight = applyGrid(Math.max(minHeight, Math.min(maxHeight, startHeight - dy)));
      const deltaH = startHeight - proposedHeight;
      newHeight = proposedHeight;
      newTop = startTop + deltaH;
    }

    // Apply
    state.width = newWidth;
    state.height = newHeight;
    element.style.width = `${newWidth}px`;
    element.style.height = `${newHeight}px`;

    if (edge.includes("w") || edge.includes("n")) {
      element.style.left = `${newLeft}px`;
      element.style.top = `${newTop}px`;
    }

    options.onResize?.({ width: newWidth, height: newHeight });
  }

  function handlePointerUp(_e: PointerEvent): void {
    if (!state.isResizing) return;

    state.isResizing = false;
    state.activeHandle = null;

    for (const [, h] of handles) h.style.background = "transparent";

    document.removeEventListener("pointermove", handlePointerMove);
    document.removeEventListener("pointerup", handlePointerUp);

    options.onResizeEnd?.({ width: state.width, height: state.height });
  }

  // Attach event listeners to handles
  for (const [, handle] of handles) {
    handle.addEventListener("pointerdown", handlePointerDown);
  }

  return {
    getState(): ResizeState { return { ...state }; },
    setSize(width: number, height: number): void {
      state.width = Math.max(minWidth, Math.min(maxWidth, width));
      state.height = Math.max(minHeight, Math.min(maxHeight, height));
      element.style.width = `${state.width}px`;
      element.style.height = `${state.height}px`;
    },
    reset(): void {
      state.width = options.initialWidth ?? element.offsetWidth;
      state.height = options.initialHeight ?? element.offsetHeight;
      element.style.width = "";
      element.style.height = "";
    },
    destroy(): void {
      for (const [edge, handle] of handles) {
        handle.removeEventListener("pointerdown", handlePointerDown);
        handle.remove();
        handles.delete(edge);
      }
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    },
  };
}

export type ResizableController = ReturnType<typeof makeResizable>;

// --- Split Pane ---

export interface SplitPaneOptions {
  /** Initial split percentage (0-100) */
  initialSplit?: number;
  /** Minimum pane sizes (%) */
  minSize?: number;
  /** Maximum pane sizes (%) */
  maxSize?: number;
  /** Direction */
  direction?: "horizontal" | "vertical";
  /** Handle size in px */
  splitterSize?: number;
  /** Persist position in localStorage? */
  persistKey?: string;
  /** Callback when split changes */
  onChange?: (split: number) => void;
}

/** Create a resizable split pane between two containers */
export function createSplitPane(
  container: HTMLElement,
  firstPane: HTMLElement,
  secondPane: HTMLElement,
  options: SplitPaneOptions = {},
): SplitPaneController {
  const {
    initialSplit = 50,
    minSize = 10,
    maxSize = 90,
    direction = "horizontal",
    splitterSize = 6,
    persistKey,
    onChange,
  } = options;

  // Load persisted value or use initial
  let split = initialSplit;
  if (persistKey) {
    try {
      const saved = localStorage.getItem(persistKey);
      if (saved) split = parseFloat(saved);
    } catch { /* ignore */ }
  }

  let isDragging = false;
  let startPos = 0;
  let startSplit = 0;

  // Create splitter
  const splitter = document.createElement("div");
  splitter.className = "split-pane-splitter";
  splitter.style.cssText = `
    ${direction === "horizontal"
      ? `width: ${splitterSize}px; cursor: col-resize;`
      : `height: ${splitterSize}px; cursor: row-resize;`}
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(99, 102, 241, 0.05);
    transition: background 0.15s;
    z-index: 5;
  `;

  // Add visual grip lines
  const grip = document.createElement("div");
  grip.style.cssText = direction === "horizontal"
    ? "width: 2px; height: 30px; border-radius: 1px; background: #c7d2fe;"
    : "width: 30px; height: 2px; border-radius: 1px; background: #c7d2fe;";
  splitter.appendChild(grip);

  splitter.addEventListener("mouseenter", () => {
    splitter.style.background = "rgba(99, 102, 241, 0.15)";
  });
  splitter.addEventListener("mouseleave", () => {
    if (!isDragging) splitter.style.background = "rgba(99, 102, 241, 0.05)";
  });

  container.style.display = direction === "horizontal" ? "flex" : "flex";
  container.style.flexDirection = direction === "horizontal" ? "row" : "column";

  // Insert splitter between panes
  if (firstPane.nextSibling) {
    container.insertBefore(splitter, firstPane.nextSibling);
  } else {
    container.appendChild(splitter);
  }

  function applySplit(): void {
    const clampedSplit = Math.max(minSize, Math.min(maxSize, split));

    if (direction === "horizontal") {
      firstPane.style.flex = "none";
      firstPane.style.width = `${clampedSplit}%`;
      secondPane.style.flex = "1";
    } else {
      firstPane.style.flex = "none";
      firstPane.style.height = `${clampedSplit}%`;
      secondPane.style.flex = "1";
    }

    if (persistKey) {
      try { localStorage.setItem(persistKey, String(clampedSplit)); } catch { /* ignore */ }
    }
    onChange?.(clampedSplit);
  }

  function handlePointerDown(e: PointerEvent): void {
    e.preventDefault();
    isDragging = true;
    startPos = direction === "horizontal" ? e.clientX : e.clientY;
    startSplit = split;
    splitter.style.background = "rgba(99, 102, 241, 0.2)";

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
  }

  function handlePointerMove(e: PointerEvent): void {
    if (!isDragging) return;

    const currentPos = direction === "horizontal" ? e.clientX : e.clientY;
    const delta = currentPos - startPos;
    const containerSize = direction === "horizontal"
      ? container.offsetWidth
      : container.offsetHeight;

    const deltaPercent = (delta / containerSize) * 100;
    split = Math.max(minSize, Math.min(maxSize, startSplit + deltaPercent));
    applySplit();
  }

  function handlePointerUp(): void {
    isDragging = false;
    splitter.style.background = "rgba(99, 102, 241, 0.05)";
    document.removeEventListener("pointermove", handlePointerMove);
    document.removeEventListener("pointerup", handlePointerUp);
  }

  splitter.addEventListener("pointerdown", handlePointerDown);

  // Apply initial
  applySplit();

  return {
    getSplit(): number { return split; },
    setSplit(newSplit: number): void {
      split = newSplit;
      applySplit();
    },
    reset(): void {
      split = initialSplit;
      applySplit();
    },
    destroy(): void {
      splitter.removeEventListener("pointerdown", handlePointerDown);
      splitter.remove();
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    },
  };
}

export type SplitPaneController = ReturnType<typeof createSplitPane>;
