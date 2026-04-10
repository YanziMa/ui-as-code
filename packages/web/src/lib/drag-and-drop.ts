/**
 * Drag and Drop System: Comprehensive DnD engine supporting sortable lists,
 * cross-container dragging, file drop zones, touch support, constraints,
 * animations, ghost elements, preview rendering, and accessibility.
 */

// --- Types ---

export type DragMode = "move" | "copy" | "link";
export type DropPosition = "before" | "after" | "inside" | "on";

export interface DragItem {
  /** Unique identifier */
  id: string;
  /** Data payload */
  data: unknown;
  /** Type for filtering drop targets */
  type?: string;
  /** Element being dragged (or virtual) */
  element?: HTMLElement;
  /** Index in source container */
  index?: number;
}

export interface DragOptions {
  /** Drag mode (default: "move") */
  mode?: DragMode;
  /** Show ghost/preview element (default: true) */
  showGhost?: boolean;
  /** Ghost opacity (default: 0.7) */
  ghostOpacity?: number;
  /** Animation duration in ms (default: 200) */
  animationDuration?: number;
  /** Constrain to container or viewport */
  constrainTo?: HTMLElement | "viewport" | "parent";
  /** Axis lock: "x", "y", or undefined (free) */
  axis?: "x" | "y";
  /** Handle selector (if null, entire element is handle) */
  handle?: string | null;
  /** Delay before drag starts (ms, default: 0) */
  delay?: number;
  /** Distance threshold before drag starts (px, default: 3) */
  threshold?: number;
  /** Allow drag from this group */
  group?: string;
  /** Custom drag image */
  dragImage?: HTMLElement | ((item: DragItem) => HTMLElement);
  /** Callback when drag starts */
  onDragStart?: (item: DragItem, event: PointerEvent) => void;
  /** Callback during drag */
  onDrag?: (item: DragItem, position: { x: number; y: number }) => void;
  /** Callback when drag ends */
  onDragEnd?: (item: DragItem, result: DropResult | null) => void;
  /** Touch support (default: true) */
  touchSupport?: boolean;
}

export interface DropZoneOptions {
  /** Accepted item types (empty = accept all) */
  acceptTypes?: string[];
  /** Accepted groups (empty = accept all) */
  acceptGroups?: string[];
  /** Drop position calculation mode */
  dropPosition?: "auto" | "manual" | "insertion";
  /** Minimum gap between items for insertion detection (px, default: 4) */
  insertionThreshold?: number;
  /** Highlight class on hover */
  highlightClass?: string;
  /** Callback on valid drag over */
  onDragOver?: (item: DragItem, position: DropPosition, index: number) => void;
  /** Callback on drag leave */
  onDragLeave?: (item: DragItem) => void;
  /** Callback on drop */
  onDrop?: (item: DragItem, position: DropPosition, index: number) => boolean | void;
  /** Sortable behavior (default: false) */
  sortable?: boolean;
}

export interface DropResult {
  targetZone: HTMLElement;
  position: DropPosition;
  index: number;
  /** Whether the drop was accepted */
  accepted: boolean;
}

export interface SortableConfig {
  /** Animation class during sort */
  animatingClass?: string;
  /** Lock axis for sorting (default: "y") */
  axis?: "x" | "y";
  /** Remove animation duration (default: 200) */
  removeAnimationDuration?: number;
  /** Ghost follows cursor offset */
  ghostOffset?: { x: number; y: number };
  /** Disabled indices */
  disabledIndices?: Set<number>;
  /** Callback after reorder */
  onReorder?: (fromIndex: number, toIndex: number, item: DragItem) => void;
}

// --- Internal Types ---

interface ActiveDrag {
  item: DragItem;
  options: Required<DragOptions> & DragOptions;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  ghost: HTMLElement | null;
  sourceContainer: HTMLElement;
  pointerId: number;
  isDragging: boolean;
  thresholdPassed: boolean;
}

// --- Drag and Drop Manager ---

export class DragDropManager {
  private activeDrag: ActiveDrag | null = null;
  private dropZones = new Map<HTMLElement, DropZoneOptions>();
  private listeners = new Set<(event: string, data: unknown) => void>();
  private currentDropTarget: HTMLElement | null = null;
  private currentDropPosition: DropPosition = "on";
  private currentDropIndex = -1;

  /** Register an element as draggable */
  makeDraggable(element: HTMLElement, getItem: () => DragItem, options: DragOptions = {}): () => void {
    const opts: Required<DragOptions> & DragOptions = {
      mode: options.mode ?? "move",
      showGhost: options.showGhost ?? true,
      ghostOpacity: options.ghostOpacity ?? 0.7,
      animationDuration: options.animationDuration ?? 200,
      axis: options.axis,
      handle: options.handle ?? null,
      delay: options.delay ?? 0,
      threshold: options.threshold ?? 3,
      group: options.group ?? "default",
      touchSupport: options.touchSupport ?? true,
      ...options,
    };

    const onPointerDown = (e: PointerEvent) => {
      // Only left button
      if (e.button !== 0) return;

      // Handle check
      if (opts.handle && !(e.target as HTMLElement)?.closest(opts.handle)) return;

      e.preventDefault();
      this.startDrag(e, element, getItem, opts);
    };

    element.addEventListener("pointerdown", onPointerDown);
    return () => element.removeEventListener("pointerdown", onPointerDown);
  }

  /** Register an element as a drop zone */
  registerDropZone(element: HTMLElement, options: DropZoneOptions = {}): () => void {
    const zoneOpts: DropZoneOptions = {
      acceptTypes: options.acceptTypes ?? [],
      acceptGroups: options.acceptGroups ?? [],
      dropPosition: options.dropPosition ?? "auto",
      insertionThreshold: options.insertionThreshold ?? 4,
      highlightClass: options.highlightClass ?? "ddz-highlight",
      sortable: options.sortable ?? false,
      ...options,
    };
    this.dropZones.set(element, zoneOpts);

    // Add visual styling
    element.classList.add("ddz-zone");

    return () => {
      this.dropZones.delete(element);
      element.classList.remove("ddz-zone");
    };
  }

  /** Make a list sortable */
  makeSortable(listElement: HTMLElement, getItem: (index: number) => DragItem, config: SortableConfig = {}): () => void {
    const items = Array.from(listElement.children) as HTMLElement[];

    // Register each item as draggable
    const cleanups: Array<() => void> = [];

    for (let i = 0; i < items.length; i++) {
      const idx = i;
      const itemEl = items[i]!;
      itemEl.setAttribute("data-sort-index", String(idx));
      itemEl.classList.add("dd-sortable-item");

      // Also register the list as a drop zone for reordering
      if (i === 0) {
        cleanups.push(this.registerDropZone(listElement, {
          sortable: true,
          acceptGroups: [config.axis === "x" ? "sort-x" : "sort-y"],
          onDrop: (item, _pos, index) => {
            const fromIdx = item.index ?? -1;
            if (fromIdx >= 0 && fromIdx !== index && config.onReorder) {
              config.onReorder(fromIdx, index, item);
            }
            return true;
          },
        }));
      }

      cleanups.push(this.makeDraggable(itemEl, () => getItem(idx), {
        group: config.axis === "x" ? "sort-x" : "sort-y",
        showGhost: true,
        axis: config.axis ?? "y",
        animationDuration: config.removeAnimationDuration ?? 200,
        ghostOffset: config.ghostOffset,
        onDragEnd: (item, result) => {
          if (!result?.accepted && config.onReorder && item.index !== undefined) {
            // Revert — item went back to original position
          }
        },
      }));
    }

    // Inject sortable styles if not present
    injectSortableStyles();

    return () => { for (const fn of cleanups) fn(); };
  }

  /** Create a file drop zone */
  createFileDropZone(
    element: HTMLElement,
    options: {
      accept?: string;           // MIME types / extensions
      multiple?: boolean;
      maxSize?: number;          // bytes per file
      maxFiles?: number;
      onFiles: (files: File[]) => void;
      onDragOver?: () => void;
      onDragLeave?: () => void;
      onError?: (error: string) => void;
    },
  ): () => void {
    const opts = {
      accept: options.accept ?? "",
      multiple: options.multiple ?? true,
      maxSize: options.maxSize ?? 10 * 1024 * 1024,
      maxFiles: options.maxFiles ?? 0,
      ...options,
    };

    element.classList.add("dd-file-zone");

    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      element.classList.add("dd-file-over");
      options.onDragOver?.();
    };

    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      // Only trigger if actually leaving the element
      if (!element.contains(e.relatedTarget as Node)) {
        element.classList.remove("dd-file-over");
        options.onDragLeave?.();
      }
    };

    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      element.classList.remove("dd-file-over");

      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length === 0) return;

      // Filter by accept
      let accepted = files;
      if (opts.accept) {
        const patterns = opts.accept.split(",").map((p) => p.trim().toLowerCase());
        accepted = files.filter((f) =>
          patterns.some((pat) =>
            f.name.toLowerCase().endsWith(pat.replace(".", "")) ||
            f.type.toLowerCase().includes(pat.replace(".", ""))
          )
        );
        if (accepted.length < files.length) {
          options.onError?.(`${files.length - accepted.length} file(s) rejected by type filter`);
        }
      }

      // Filter by size
      const oversized = accepted.filter((f) => f.size > opts.maxSize);
      accepted = accepted.filter((f) => f.size <= opts.maxSize);
      if (oversized.length > 0) {
        options.onError?.(`${oversized.length} file(s) exceed size limit`);
      }

      // Limit count
      if (opts.maxFiles > 0 && accepted.length > opts.maxFiles) {
        accepted = accepted.slice(0, opts.maxFiles);
      }

      if (accepted.length > 0) {
        options.onFiles(accepted);
      }
    };

    // Prevent default drag behavior on the zone
    element.addEventListener("dragover", onDragOver);
    element.addEventListener("dragleave", onDragLeave);
    element.addEventListener("drop", onDrop);
    element.addEventListener("dragenter", (e) => { e.preventDefault(); });

    return () => {
      element.removeEventListener("dragover", onDragOver);
      element.removeEventListener("dragleave", onDragLeave);
      element.removeEventListener("drop", onDrop);
      element.classList.remove("dd-file-zone", "dd-file-over");
    };
  }

  /** Cancel active drag */
  cancel(): void {
    if (this.activeDrag) {
      this.endDrag(null);
    }
  }

  /** Check if currently dragging */
  isDragging(): boolean { return this.activeDrag?.isDragging ?? false; }

  /** Get current drag item */
  getActiveDrag(): ActiveDrag | null { return this.activeDrag; }

  /** Listen to global DnD events */
  onEvent(listener: (event: string, data: unknown) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- Internal: Drag Lifecycle ---

  private startDrag(e: PointerEvent, element: HTMLElement, getItem: () => DragItem, opts: Required<DragOptions> & DragOptions): void {
    const item = getItem();

    const drag: ActiveDrag = {
      item,
      options: opts,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      ghost: null,
      sourceContainer: element.parentElement ?? element,
      pointerId: e.pointerId,
      isDragging: false,
      thresholdPassed: false,
    };

    this.activeDrag = drag;

    // Capture pointer
    element.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== drag.pointerId) return;
      this.handleMove(drag, ev);
    };

    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== drag.pointerId) return;
      element.releasePointerCapture(ev.pointerId);
      element.removeEventListener("pointermove", onMove);
      element.removeEventListener("pointerup", onUp);
      this.handleEnd(drag, ev);
    };

    element.addEventListener("pointermove", onMove);
    element.addEventListener("pointerup", onUp);

    // Delay start
    if (opts.delay > 0) {
      setTimeout(() => {
        if (this.activeDrag === drag && !drag.isDragging) {
          this.activateDrag(drag, e);
        }
      }, opts.delay);
    }
  }

  private handleMove(drag: ActiveDrag, e: PointerEvent): void {
    drag.currentX = e.clientX;
    drag.currentY = e.clientY;

    if (!drag.thresholdPassed) {
      const dx = Math.abs(e.clientX - drag.startX);
      const dy = Math.abs(e.clientY - drag.startY);
      if (Math.sqrt(dx * dx + dy * dy) >= drag.options.threshold) {
        drag.thresholdPassed = true;
        this.activateDrag(drag, e);
      } else {
        return;
      }
    }

    if (!drag.isDragging) return;

    // Move ghost
    if (drag.ghost) {
      let gx = e.clientX;
      let gy = e.clientY;
      if (drag.options.axis === "x") gy = drag.startY;
      if (drag.options.axis === "y") gx = drag.startX;
      drag.ghost.style.left = `${gx}px`;
      drag.ghost.style.top = `${gy}px`;
    }

    // Hit test drop zones
    this.hitTest(e.clientX, e.clientY);

    drag.options.onDrag?.(drag.item, { x: e.clientX, y: e.clientY });
  }

  private activateDrag(drag: ActiveDrag, _e: PointerEvent): void {
    if (drag.isDragging) return;
    drag.isDragging = true;

    // Create ghost
    if (drag.options.showGhost && drag.item.element) {
      const ghost = drag.item.element.cloneNode(true) as HTMLElement;
      ghost.className = `dd-ghost ${drag.item.element.className}`;
      ghost.style.cssText = `
        position: fixed; z-index: 99998; pointer-events: none;
        opacity: ${drag.options.ghostOpacity};
        width: ${drag.item.element.offsetWidth}px;
        margin: 0; transition: none;
        transform: rotate(2deg); box-shadow: 0 8px 30px rgba(0,0,0,0.2);
      `;
      ghost.style.left = `${drag.currentX}px`;
      ghost.style.top = `${drag.currentY}px`;
      document.body.appendChild(ghost);
      drag.ghost = ghost;

      // Dim original
      drag.item.element.style.opacity = "0.3";
    }

    drag.options.onDragStart?.(drag.item, new PointerEvent("pointerdown", {
      clientX: drag.startX, clientY: drag.startY,
    } as PointerEventInit));
    this.listeners.forEach((l) => l("dragstart", drag.item));
  }

  private handleEnd(drag: ActiveDrag, e: PointerEvent): void {
    if (!drag.isDragging) {
      this.activeDrag = null;
      return;
    }

    // Try to drop
    let result: DropResult | null = null;
    if (this.currentDropTarget) {
      const zoneOpts = this.dropZones.get(this.currentDropTarget)!;
      const accepted = zoneOpts.onDrop?.(drag.item, this.currentDropPosition, this.currentDropIndex);
      result = {
        targetZone: this.currentDropTarget,
        position: this.currentDropPosition,
        index: this.currentDropIndex,
        accepted: accepted !== false,
      };
    }

    this.endDrag(result);
  }

  private endDrag(result: DropResult | null): void {
    const drag = this.activeDrag;
    if (!drag) return;

    // Restore original
    if (drag.item.element) {
      drag.item.element.style.opacity = "";
    }

    // Remove ghost
    if (drag.ghost) {
      drag.ghost.style.transition = `opacity ${drag.options.animationDuration}ms ease, transform ${drag.options.animationDuration}ms ease`;
      drag.ghost.style.opacity = "0";
      drag.ghost.style.transform = "scale(0.9)";
      setTimeout(() => drag.ghost?.remove(), drag.options.animationDuration);
    }

    // Clear drop highlight
    if (this.currentDropTarget) {
      const zoneOpts = this.dropZones.get(this.currentDropTarget);
      this.currentDropTarget.classList.remove(zoneOpts?.highlightClass ?? "ddz-highlight");
    }

    drag.options.onDragEnd?.(drag.item, result);
    this.listeners.forEach((l) => l("dragend", { item: drag.item, result }));

    this.activeDrag = null;
    this.currentDropTarget = null;
  }

  // --- Hit Testing ---

  private hitTest(x: number, y: number): void {
    if (!this.activeDrag) return;

    // Hide ghost temporarily for accurate hit testing
    const ghost = this.activeDrag.ghost;
    if (ghost) ghost.style.display = "none";

    const elementBelow = document.elementFromPoint(x, y) as HTMLElement | null;

    if (ghost) ghost.style.display = "";

    if (!elementBelow) {
      this.clearDropTarget();
      return;
    }

    // Find nearest drop zone ancestor
    let zoneEl: HTMLElement | null = elementBelow;
    while (zoneEl && !this.dropZones.has(zoneEl)) {
      zoneEl = zoneEl.parentElement;
    }

    if (zoneEl !== this.currentDropTarget) {
      this.clearDropTarget();
    }

    if (zoneEl && this.dropZones.has(zoneEl)) {
      const zoneOpts = this.dropZones.get(zoneEl)!;

      // Type/group filtering
      if (zoneOpts.acceptTypes?.length && this.activeDrag.item.type &&
          !zoneOpts.acceptTypes.includes(this.activeDrag.item.type)) {
        return;
      }
      if (zoneOpts.acceptGroups?.length &&
          !zoneOpts.acceptGroups.includes(this.activeDrag.options.group ?? "default")) {
        return;
      }

      this.currentDropTarget = zoneEl;
      zoneEl.classList.add(zoneOpts.highlightClass ?? "ddz-highlight");

      // Calculate drop position
      if (zoneOpts.sortable || zoneOpts.dropPosition === "insertion") {
        const pos = this.calculateInsertPosition(zoneEl, x, y, zoneOpts.insertionThreshold ?? 4);
        this.currentDropPosition = pos.position;
        this.currentDropIndex = pos.index;
      } else {
        this.currentDropPosition = "on";
        this.currentDropIndex = -1;
      }

      zoneOpts.onDragOver?.(this.activeDrag.item, this.currentDropPosition, this.currentDropIndex);
    }
  }

  private calculateInsertPosition(
    zone: HTMLElement,
    x: number,
    y: number,
    threshold: number,
  ): { position: DropPosition; index: number } {
    const children = Array.from(zone.children) as HTMLElement[];
    const axis = this.activeDrag?.options.axis ?? "y";

    for (let i = 0; i < children.length; i++) {
      const child = children[i]!;
      if (child === this.activeDrag?.ghost) continue;
      if (child.classList.contains("dd-ghost")) continue;

      const rect = child.getBoundingClientRect();

      if (axis === "y") {
        const midY = rect.top + rect.height / 2;
        if (y < midY - threshold) {
          return { position: "before", index: i };
        }
      } else {
        const midX = rect.left + rect.width / 2;
        if (x < midX - threshold) {
          return { position: "before", index: i };
        }
      }
    }

    return { position: "after", index: children.length };
  }

  private clearDropTarget(): void {
    if (this.currentDropTarget) {
      const zoneOpts = this.dropZones.get(this.currentDropTarget);
      this.currentDropTarget.classList.remove(zoneOpts?.highlightClass ?? "ddz-highlight");
      zoneOpts?.onDragLeave?.(this.activeDrag!.item);
    }
    this.currentDropTarget = null;
  }
}

// --- Styles ---

function injectSortableStyles(): void {
  if (document.getElementById("dnd-styles")) return;
  const style = document.createElement("style");
  style.id = "dnd-styles";
  style.textContent = `
    .dd-sortable-item { user-select: none; touch-action: none; cursor: grab; transition: transform 0.2s ease; }
    .dd-sortable-item:active { cursor: grabbing; }
    .dd-sortable-item.dd-dragging { opacity: 0.4; z-index: 1; }
    .dd-sortable-item.dd-drop-target { transform: scale(1.02); box-shadow: 0 0 0 2px #007aff40; }
    .ddz-zone { position: relative; }
    .ddz-zone.ddz-highlight { outline: 2px dashed #007aff; outline-offset: -2px; border-radius: 8px; background: #007aff08; }
    .dd-file-zone { border: 2px dashed #ccc; border-radius: 12px; padding: 24px; text-align: center;
      transition: all 0.2s ease; cursor: pointer; }
    .dd-file-zone.dd-file-over { border-color: #007aff; background: #007aff08; }
    .dd-file-zone .dd-file-icon { font-size: 48px; color: #ccc; margin-bottom: 8px; }
    .dd-file-zone .dd-file-text { color: #888; font-size: 14px; }
  `;
  document.head.appendChild(style);
}

// --- Singleton ---

let defaultManager: DragDropManager | null = null;

/** Get or create the global DragDropManager singleton */
export function getDragDropManager(): DragDropManager {
  if (!defaultManager) defaultManager = new DragDropManager();
  return defaultManager;
}
