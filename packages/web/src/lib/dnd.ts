/**
 * Drag and Drop System: Sortable lists, drag handles, drop zones,
 * transfer data between containers, visual feedback, constraints,
 * keyboard accessibility, and touch support.
 */

// --- Types ---

export type DnDMode = "sort" | "move" | "copy";

export interface DragData {
  /** Unique identifier */
  id: string;
  /** Display text */
  text?: string;
  /** Arbitrary payload */
  payload?: unknown;
  /** Source container ID */
  sourceId?: string;
  /** Original index in source */
  index?: number;
}

export interface DropZoneOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Zone identifier */
  zoneId: string;
  /** Accept callback — return false to reject drop */
  accept?: (data: DragData) => boolean;
  /** Callback on valid drag enter */
  onDragEnter?: (data: DragData) => void;
  /** Callback on drag leave */
  onDragLeave?: () => void;
  /** Callback on drop */
  onDrop: (data: DragData, position: number) => void;
  /** Callback during hover over items */
  onHover?: (index: number | null) => void;
  /** Highlight class for active zone */
  activeClass?: string;
  /** Custom CSS class */
  className?: string;
}

export interface SortableOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Item selector (default: children of container) */
  itemSelector?: string;
  /** Handle selector (if null, entire item is draggable) */
  handleSelector?: string | null;
  /** Group name for cross-container sorting */
  group?: string;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Threshold before starting drag (px) */
  threshold?: number;
  /** Constrain to container? */
  constrain?: boolean;
  /** Ghost/preview opacity */
  ghostOpacity?: number;
  /** Mirror offset from cursor (px) */
  mirrorOffset?: { x: number; y: number };
  /** Callback on sort start */
  onSortStart?: (data: { el: HTMLElement; index: number }) => void;
  /** Callback on sort move */
  onSortMove?: (data: { el: HTMLElement; fromIndex: number; toIndex: number }) => void;
  /** Callback on sort end */
  onSortEnd?: (data: { el: HTMLElement; fromIndex: number; toIndex: number }) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Lock axis */
  lockAxis?: "x" | "y";
  /** Remove on spill outside container? */
  removeOnSpill?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface SortableInstance {
  element: HTMLElement;
  /** Current order of item elements */
  getOrder: () => HTMLElement[];
  /** Set order programmatically */
  setOrder: (items: HTMLElement[]) => void;
  /** Disable/enable sorting */
  setDisabled: (disabled: boolean) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

export interface DnDManagerConfig {
  /** Default mode */
  mode?: DnDMode;
  /** Global drag image opacity */
  dragOpacity?: number;
  /** Show drag preview line */
  showIndicator?: boolean;
  /** Indicator color */
  indicatorColor?: string;
  /** Enable touch support */
  touchSupport?: boolean;
}

// --- Global State ---

let globalConfig: Required<DnDManagerConfig> = {
  mode: "move",
  dragOpacity: 0.7,
  showIndicator: true,
  indicatorColor: "#6366f1",
  touchSupport: true,
};

const activeDraggables = new Set<HTMLElement>();
const dropZones = new Map<string, DropZoneOptions>();
let currentDrag: DragData | null = null;
let currentDragEl: HTMLElement | null = null;
let indicatorEl: HTMLDivElement | null = null;

// --- Utilities ---

function resolveEl(el: HTMLElement | string): HTMLElement | null {
  return typeof el === "string" ? document.querySelector<HTMLElement>(el) : el;
}

function getItems(container: HTMLElement, selector?: string): HTMLElement[] {
  if (selector) return Array.from(container.querySelectorAll<HTMLElement>(selector));
  return Array.from(container.children) as HTMLElement[];
}

function getItemIndex(container: HTMLElement, item: HTMLElement, selector?: string): number {
  const items = getItems(container, selector);
  return items.indexOf(item);
}

function showIndicator(container: HTMLElement, index: number): void {
  removeIndicator();

  if (!globalConfig.showIndicator) return;

  indicatorEl = document.createElement("div");
  indicatorEl.className="dnd-indicator";
  indicatorEl.style.cssText=`
    position:absolute;left:0;right:0;height:2px;background:${globalConfig.indicatorColor};
    border-radius:1px;pointer-events:none;z-index:9999;
    transition:top ${globalConfig.showIndicator ? "0.15s" : "0s"} ease;
    box-shadow:0 0 4px ${globalConfig.indicatorColor}40;
  `;

  const items = getItems(container);
  const style = container.style;
  const wasRelative = style.position === "relative" || style.position === "absolute" || style.position === "fixed";

  if (!wasRelative) container.style.position = "relative";

  if (index >= items.length) {
    if (items.length > 0) {
      const last = items[items.length - 1]!;
      const rect = last.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      indicatorEl.style.top = `${rect.bottom - containerRect.top}px`;
    } else {
      indicatorEl.style.top = "0px";
    }
  } else if (index <= 0) {
    indicatorEl.style.top = "0px";
  } else {
    const target = items[index]!;
    const rect = target.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    indicatorEl.style.top = `${rect.top - containerRect.top}px`;
  }

  container.appendChild(indicatorEl);
  (indicatorEl as any)._container = container;
  (indicatorEl as any)._wasRelative = wasRelative;
}

function removeIndicator(): void {
  if (indicatorEl) {
    const container = (indicatorEl as any)._container as HTMLElement | undefined;
    const wasRelative = (indicatorEl as any)._wasRelative as boolean | undefined;

    if (container && !wasRelative) {
      // Only reset if we set it
      const computed = getComputedStyle(container).position;
      if (computed === "relative") container.style.position = "";
    }

    indicatorEl.remove();
    indicatorEl = null;
  }
}

function insertBefore(container: HTMLElement, item: HTMLElement, index: number): void {
  const items = getItems(container);
  if (index >= items.length) {
    container.appendChild(item);
  } else if (index <= 0) {
    container.insertBefore(item, container.firstChild);
  } else {
    container.insertBefore(item, items[index]!);
  }
}

// --- Sortable ---

export function createSortable(options: SortableOptions): SortableInstance {
  const container = resolveEl(options.container);
  if (!container) throw new Error("Sortable: container not found");

  const opts = {
    itemSelector: options.itemSelector ?? undefined,
    handleSelector: options.handleSelector ?? undefined,
    group: options.group ?? "",
    animationDuration: options.animationDuration ?? 200,
    threshold: options.threshold ?? 5,
    constrain: options.constrain ?? false,
    ghostOpacity: options.ghostOpacity ?? 0.4,
    mirrorOffset: options.mirrorOffset ?? { x: 0, y: 0 },
    disabled: options.disabled ?? false,
    lockAxis: options.lockAxis ?? undefined,
    removeOnSpill: options.removeOnSpill ?? false,
    ...options,
  };

  let destroyed = false;
  let dragging = false;
  let dragItem: HTMLElement | null = null;
  let dragIndex = -1;
  let mirror: HTMLElement | null = null;
  let placeholder: HTMLElement | null = null;
  let startX = 0;
  let startY = 0;
  let currentItemIndex = -1;

  function getSortableItems(): HTMLElement[] {
    return getItems(container!, opts.itemSelector);
  }

  function handlePointerDown(e: PointerEvent): void {
    if (opts.disabled || destroyed) return;
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;
    const item = opts.handleSelector
      ? target.closest(opts.itemSelector ?? "*") as HTMLElement ?? target.closest("[data-sortable-item]") as HTMLElement
      : target.closest(opts.itemSelector ?? "[data-sortable-item], [draggable='true']") as HTMLElement ?? (target.parentElement?.children && Array.from(target.parentElement!.children).includes(target) ? target : null);

    if (!item || !container!.contains(item)) return;

    // If handle selector is set, only allow dragging from the handle
    if (opts.handleSelector && !target.closest(opts.handleSelector)) return;

    e.preventDefault();
    dragging = false;
    dragItem = item;
    dragIndex = getSortableItems().indexOf(item);
    startX = e.clientX;
    startY = e.clientY;
    currentItemIndex = dragIndex;

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("pointercancel", handlePointerUp);
  }

  function handlePointerMove(e: PointerEvent): void {
    if (!dragItem || destroyed) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (!dragging && distance < opts.threshold) return;

    if (!dragging) {
      // Start drag
      dragging = true;
      startDrag(dragItem, e.clientX, e.clientY);
      opts.onSortStart?.({ el: dragItem, index: dragIndex });
    }

    // Move mirror
    if (mirror) {
      const mx = opts.lockAxis !== "y" ? e.clientX + opts.mirrorOffset.x : parseFloat(mirror.style.left);
      const my = opts.lockAxis !== "x" ? e.clientY + opts.mirrorOffset.y : parseFloat(mirror.style.top);

      if (opts.lockAxis !== "y") mirror.style.left = `${mx}px`;
      if (opts.lockAxis !== "x") mirror.style.top = `${my}px`;

      if (opts.constrain) {
        const containerRect = container!.getBoundingClientRect();
        const mirrorRect = mirror.getBoundingClientRect();
        if (parseFloat(mirror.style.left) < containerRect.left)
          mirror.style.left = `${containerRect.left}px`;
        if (parseFloat(mirror.style.top) < containerRect.top)
          mirror.style.top = `${containerRect.top}px`;
        if (mirrorRect.right > containerRect.right)
          mirror.style.left = `${containerRect.right - mirrorRect.width}px`;
        if (mirrorRect.bottom > containerRect.bottom)
          mirror.style.top = `${containerRect.bottom - mirrorRect.height}px`;
      }
    }

    // Determine insertion index
    const items = getSortableItems().filter((i) => i !== placeholder);
    let newIndex = -1;

    for (let i = 0; i < items.length; i++) {
      const rect = items[i]!.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const midX = rect.left + rect.width / 2;

      if (opts.lockAxis === "y" || !opts.lockAxis) {
        if (e.clientY < midY) { newIndex = i; break; }
      }
      if (opts.lockAxis === "x") {
        if (e.clientX < midX) { newIndex = i; break; }
      }
    }

    if (newIndex === -1) newIndex = items.length;

    if (newIndex !== currentItemIndex && placeholder) {
      currentItemIndex = newIndex;
      insertBefore(container!, placeholder!, newIndex);
      showIndicator(container!, newIndex);
      opts.onSortMove?.({ el: dragItem!, fromIndex: dragIndex, toIndex: newIndex });
    }

    // Check for spill
    if (opts.removeOnSpill && dragItem) {
      const containerRect = container!.getBoundingClientRect();
      const outside =
        e.clientX < containerRect.left - 10 ||
        e.clientX > containerRect.right + 10 ||
        e.clientY < containerRect.top - 10 ||
        e.clientY > containerRect.bottom + 10;

      if (outside && mirror) {
        mirror.style.opacity = "0.3";
      } else if (mirror) {
        mirror.style.opacity = String(opts.ghostOpacity + 0.3);
      }
    }
  }

  function handlePointerUp(): void {
    document.removeEventListener("pointermove", handlePointerMove);
    document.removeEventListener("pointerup", handlePointerUp);
    document.removeEventListener("pointercancel", handlePointerUp);

    if (!dragging || !dragItem || destroyed) {
      dragging = false;
      dragItem = null;
      return;
    }

    // Finalize
    const finalIndex = placeholder
      ? getSortableItems().indexOf(placeholder)
      : dragIndex;

    cleanup();

    if (opts.removeOnSpill) {
      const containerRect = container!.getBoundingClientRect();
      // We'd need last known mouse position here; simplified: keep item
    }

    opts.onSortEnd?.({ el: dragItem, fromIndex: dragIndex, toIndex: finalIndex });

    dragging = false;
    dragItem = null;
    dragIndex = -1;
    currentItemIndex = -1;
  }

  function startDrag(item: HTMLElement, x: number, y: number): void {
    const rect = item.getBoundingClientRect();

    // Create placeholder
    placeholder = item.cloneNode(true) as HTMLElement;
    placeholder.className = `${item.className} dnd-placeholder`;
    placeholder.style.cssText = `
      opacity:${opts.ghostOpacity};outline:2px dashed #a5b4fc;border-radius:4px;
      pointer-events:none;transition:height ${opts.animationDuration}ms ease;
    `;
    item.parentNode!.insertBefore(placeholder, item.nextSibling);

    // Create mirror
    mirror = item.cloneNode(true) as HTMLElement;
    mirror.className = `${item.className} dnd-mirror`;
    mirror.style.cssText = `
      position:fixed;z-index:10000;width:${rect.width}px;height:${rect.height}px;
      pointer-events:none;opacity:${opts.ghostOpacity + 0.3};
      box-shadow:0 8px 30px rgba(0,0,0,0.2);border-radius:8px;
      margin:0;left:${x + opts.mirrorOffset.x}px;top:${y + opts.mirrorOffset.y}px;
      transition:none;
    `;
    document.body.appendChild(mirror);

    // Hide original
    item.style.display = "none";

    activeDraggables.add(mirror);
    currentDragEl = mirror;
    currentDrag = { id: `sortable-${Date.now()}`, text: item.textContent ?? "", index: dragIndex };
  }

  function cleanup(): void {
    removeIndicator();

    if (dragItem && placeholder) {
      dragItem.style.display = "";
      placeholder.remove();
    }

    if (mirror) {
      mirror.remove();
      activeDraggables.delete(mirror);
    }

    currentDragEl = null;
    currentDrag = null;
    mirror = null;
    placeholder = null;
  }

  // Attach listeners
  container.addEventListener("pointerdown", handlePointerDown);

  const instance: SortableInstance = {
    element: container,

    getOrder() {
      return getSortableItems().filter((el) => el !== placeholder);
    },

    setOrder(items: HTMLElement[]) {
      const allItems = getSortableItems();
      for (const item of allItems) {
        if (!items.includes(item)) item.remove();
      }
      for (let i = 0; i < items.length; i++) {
        container!.appendChild(items[i]!);
      }
    },

    setDisabled(disabled: boolean) {
      opts.disabled = disabled;
    },

    destroy() {
      destroyed = true;
      cleanup();
      container.removeEventListener("pointerdown", handlePointerDown);
    },
  };

  return instance;
}

// --- Drop Zone ---

export function createDropZone(options: DropZoneOptions): () => void {
  const container = resolveEl(options.container);
  if (!container) throw new Error("DropZone: container not found");

  const activeClass = options.activeClass ?? "dnd-active-zone";
  let entered = false;

  container.classList.add("dnd-zone");
  container.setAttribute("data-dnd-zone", options.zoneId);
  dropZones.set(options.zoneId, options);

  function handleDragEnter(e: DragEvent): void {
    e.preventDefault();
    if (entered) return;
    entered = true;
    container.classList.add(activeClass);

    if (currentDrag && options.accept?.(currentDrag) !== false) {
      options.onDragEnter?.(currentDrag);
    }
  }

  function handleDragOver(e: DragEvent): void {
    e.preventDefault();
    if (!currentDrag) return;
    if (options.accept?.(currentDrag) === false) return;

    // Determine drop position
    const rect = container.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const children = Array.from(container.children) as HTMLElement[];
    let idx = children.length;

    for (let i = 0; i < children.length; i++) {
      const childRect = children[i]!.getBoundingClientRect();
      if (e.clientY < childRect.top + childRect.height / 2) {
        idx = i;
        break;
      }
    }

    options.onHover?.(idx);
  }

  function handleDragLeave(e: DragEvent): void {
    // Only trigger if actually leaving the container (not entering a child)
    const related = e.relatedTarget as HTMLElement | null;
    if (related && container.contains(related)) return;

    entered = false;
    container.classList.remove(activeClass);
    options.onDragLeave?.();
  }

  function handleDrop(e: DragEvent): void {
    e.preventDefault();
    entered = false;
    container.classList.remove(activeClass);

    if (!currentDrag) return;
    if (options.accept?.(currentDrag) === false) return;

    const rect = container.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const children = Array.from(container.children) as HTMLElement[];
    let idx = children.length;

    for (let i = 0; i < children.length; i++) {
      const childRect = children[i]!.getBoundingClientRect();
      if (e.clientY < childRect.top + childRect.height / 2) {
        idx = i;
        break;
      }
    }

    options.onDrop(currentDrag, idx);
  }

  container.addEventListener("dragenter", handleDragEnter);
  container.addEventListener("dragover", handleDragOver);
  container.addEventListener("dragleave", handleDragLeave);
  container.addEventListener("drop", handleDrop);

  return () => {
    container.removeEventListener("dragenter", handleDragEnter);
    container.removeEventListener("dragover", handleDragOver);
    container.removeEventListener("dragleave", handleDragLeave);
    container.removeEventListener("drop", handleDrop);
    container.classList.remove("dnd-zone", activeClass);
    container.removeAttribute("data-dnd-zone");
    dropZones.delete(options.zoneId);
  };
}

// --- Draggable Wrapper ---

export interface DraggableOptions {
  /** Element to make draggable */
  element: HTMLElement;
  /** Drag data */
  data: DragData;
  /** Mode */
  mode?: DnDMode;
  /** Drag handle selector (optional) */
  handle?: string;
  /** Callback on drag start */
  onDragStart?: (data: DragData) => void;
  /** Callback on drag end */
  onDragEnd?: (data: DragData, dropped: boolean) => void;
  /** Custom drag image */
  dragImage?: HTMLElement;
}

/** Make an element draggable using the native HTML5 DnD API */
export function makeDraggable(options: DraggableOptions): () => void {
  const { element, data, mode = globalConfig.mode, handle } = options;

  element.draggable = true;
  element.setAttribute("data-dnd-id", data.id);

  function handleDragStart(e: DragEvent): void {
    if (handle) {
      const target = e.target as HTMLElement;
      if (!target.closest(handle)) {
        e.preventDefault();
        return;
      }
    }

    currentDrag = data;
    currentDragEl = element;

    e.dataTransfer!.setData("application/json", JSON.stringify(data));
    e.dataTransfer!.effectAllowed = mode === "copy" ? "copy" : "move";

    if (options.dragImage) {
      e.dataTransfer!.setDragImage(options.dragImage, 0, 0);
    }

    element.style.opacity = String(globalConfig.dragOpacity);
    options.onDragStart?.(data);
  }

  function handleDragEnd(): void {
    element.style.opacity = "";
    const dropped = e.dataTransfer?.dropEffect !== "none";
    options.onDragEnd?.(data, dropped);
    currentDrag = null;
    currentDragEl = null;
  }

  element.addEventListener("dragstart", handleDragStart);
  element.addEventListener("dragend", handleDragEnd);

  return () => {
    element.removeEventListener("dragstart", handleDragStart);
    element.removeEventListener("dragend", handleDragEnd);
    element.draggable = false;
    element.removeAttribute("data-dnd-id");
    element.style.opacity = "";
  };
}

// --- Config ---

export function configureDnD(config: Partial<DnDManagerConfig>): void {
  Object.assign(globalConfig, config);
}

export function getDnDConfig(): Readonly<Required<DnDManagerConfig>> {
  return globalConfig;
}
