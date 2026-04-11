/**
 * Drag and Drop v2: Enhanced drag-and-drop system with sortable lists,
 * multi-drag selection, cross-container transfer, custom handles,
 * drag preview, drop zones, constraints, snap-to-grid, and accessibility.
 *
 * Supports:
 * - Single and multi-item drag
 * - Sortable lists with smooth reordering animations
 * - Cross-container drag between multiple drop zones
 * - Custom drag handles (not just the element itself)
 * - Ghost/drag preview with transform tracking
 * - Drop zone highlighting and validation
 * - Constraint modes (horizontal-only, vertical-only, container-bounded)
 * - Snap-to-grid alignment
 * - Keyboard-accessible drag (Space to grab, arrows to move)
 * - Touch device support with proper event handling
 */

// --- Types ---

export interface DnDConfig {
  /** Container(s) that act as drop zones */
  containers: HTMLElement[];
  /** Selector for draggable items within containers */
  itemSelector: string;
  /** Selector for drag handle (if null, entire item is draggable) */
  handleSelector?: string | null;
  /** Allow dragging multiple items (default: false) */
  multiDrag?: boolean;
  /** Multi-drag modifier key (default: "ctrl") */
  multiDragKey?: "ctrl" | "shift" | "meta" | "alt";
  /** Sort mode: reorder within same container (default: true) */
  sortable?: boolean;
  /** Allow cross-container drops (default: true) */
  crossContainer?: boolean;
  /** Animation duration for reorder in ms (default: 200) */
  animationDuration?: number;
  /** Drag threshold in px before drag starts (default: 5) */
  threshold?: number;
  /** Constraint: restrict movement direction */
  constraint?: "horizontal" | "vertical" | "none";
  /** Snap to grid size in px (0 = no snap) */
  gridSize?: number;
  /** Class applied to dragged item while dragging */
  dragClass?: string;
  /** Class applied to drop zone when valid target is hovered */
  dropZoneClass?: string;
  /** Class applied to placeholder where item would be dropped */
  placeholderClass?: string;
  /** Show ghost/preview element during drag (default: true) */
  showGhost?: boolean;
  /** Ghost opacity (0-1, default: 0.7) */
  ghostOpacity?: number;
  /** Enable keyboard navigation (default: false) */
  keyboardNav?: boolean;
  /** Touch support (default: true) */
  touchSupport?: boolean;
  /** Called when drag starts */
  onDragStart?: (context: DragContext) => void;
  /** Called continuously during drag */
  onDragMove?: (context: DragContext) => void;
  /** Called when dropped */
  onDrop?: (result: DropResult) => void;
  /** Called when drag is cancelled */
  onCancel?: () => void;
}

export interface DragContext {
  /** The element being dragged */
  element: HTMLElement;
  /** All elements being dragged (multi-drag) */
  elements: HTMLElement[];
  /** Source container index */
  sourceContainerIndex: number;
  /** Source container element */
  sourceContainer: HTMLElement;
  /** Current position relative to viewport */
  x: number;
  y: number;
  /** Starting position */
  startX: number;
  startY: number;
  /** Offset from pointer to element top-left */
  offsetX: number;
  offsetY: number;
  /** Current drop target info */
  dropTarget: DropTargetInfo | null;
  /** Data attached via data-dnd attributes */
  data: Record<string, string>;
}

export interface DropTargetInfo {
  /** Target container */
  container: HTMLElement;
  /** Container index */
  containerIndex: number;
  /** Element before which to insert (-1 = at end) */
  insertBeforeIndex: number;
  /** Target element (the one being hovered over) */
  targetElement: HTMLElement | null;
  /** Whether this is a valid drop location */
  isValid: boolean;
}

export interface DropResult {
  /** Dragged elements */
  elements: HTMLElement[];
  /** Source container */
  sourceContainer: HTMLElement;
  /** Source container index */
  sourceContainerIndex: number;
  /** Target container */
  targetContainer: HTMLElement;
  /** Target container index */
  targetContainerIndex: number;
  /** New index of first dragged item in target */
  newIndex: number;
  /** Old indices of dragged items in source */
  oldIndices: number[];
  /** Whether items moved to a different container */
  changedContainers: boolean;
}

// --- Internal Types ---

interface DragState {
  active: boolean;
  elements: HTMLElement[];
  sourceContainer: HTMLElement;
  sourceContainerIndex: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  offsetX: number;
  offsetY: number;
  ghost: HTMLElement | null;
  placeholders: Map<HTMLElement, HTMLElement>;
  originalPositions: Array<{ el: HTMLElement; rect: DOMRect; parent: HTMLElement; nextSibling: Node | null }>;
  selectedItems: Set<HTMLElement>;
  touchId: number | null;
}

// --- Main Class ---

export class DragAndDropV2 {
  private config: Required<Omit<DnDConfig, "handleSelector">> & { handleSelector: string | null };
  private state: DragState = this.createIdleState();
  private boundHandlers: {
    mouseDown: (e: MouseEvent) => void;
    mouseMove: (e: MouseEvent) => void;
    mouseUp: (e: MouseEvent) => void;
    touchStart: (e: TouchEvent) => void;
    touchMove: (e: TouchEvent) => void;
    touchEnd: (e: TouchEvent) => void;
    keyDown: (e: KeyboardEvent) => void;
  };
  private destroyed = false;

  constructor(config: DnDConfig) {
    this.config = {
      multiDrag: false,
      multiDragKey: "ctrl",
      sortable: true,
      crossContainer: true,
      animationDuration: 200,
      threshold: 5,
      constraint: "none",
      gridSize: 0,
      dragClass: "dnd-dragging",
      dropZoneClass: "dnd-drop-active",
      placeholderClass: "dnd-placeholder",
      showGhost: true,
      ghostOpacity: 0.7,
      keyboardNav: false,
      touchSupport: true,
      handleSelector: config.handleSelector ?? null,
      ...config,
    };

    this.boundHandlers = {
      mouseDown: (e) => this.onMouseDown(e),
      mouseMove: (e) => this.onMouseMove(e),
      mouseUp: (e) => this.onMouseUp(e),
      touchStart: (e) => this.onTouchStart(e),
      touchMove: (e) => this.onTouchMove(e),
      touchEnd: (e) => this.onTouchEnd(e),
      keyDown: (e) => this.onKeyDown(e),
    };

    this.attachListeners();
  }

  // --- Public API ---

  /** Manually start a drag on a specific element */
  startDrag(element: HTMLElement): boolean {
    if (this.state.active || this.destroyed) return false;

    const container = this.findContainer(element);
    if (!container) return false;

    const rect = element.getBoundingClientRect();
    const items = this.getSelectedItems(element);

    this.state = {
      active: true,
      elements: items,
      sourceContainer: container,
      sourceContainerIndex: this.config.containers.indexOf(container),
      startX: rect.left + rect.width / 2,
      startY: rect.top + rect.height / 2,
      currentX: rect.left + rect.width / 2,
      currentY: rect.top + rect.height / 2,
      offsetX: rect.width / 2,
      offsetY: rect.height / 2,
      ghost: null,
      placeholders: new Map(),
      originalPositions: [],
      selectedItems: new Set(items),
      touchId: null,
    };

    this.setupGhost();
    this.saveOriginalPositions();
    this.config.onDragStart?.(this.buildContext());

    return true;
  }

  /** Cancel the current drag operation */
  cancel(): void {
    if (!this.state.active) return;
    this.restorePositions();
    this.cleanup();
    this.config.onCancel?.();
  }

  /** Get current drag state (read-only) */
  isActive(): boolean { return this.state.active; }

  /** Get currently selected items for multi-drag */
  getSelectedItems(): HTMLElement[] {
    return [...this.state.selectedItems];
  }

  /** Select an item for multi-drag (without starting drag) */
  selectItem(item: HTMLElement, addToSelection = false): void {
    if (!addToSelection) this.state.selectedItems.clear();
    if (this.state.selectedItems.has(item)) {
      this.state.selectedItems.delete(item);
    } else {
      this.state.selectedItems.add(item);
    }
  }

  /** Clear all selections */
  clearSelection(): void {
    this.state.selectedItems.clear();
  }

  /** Update configuration at runtime */
  updateConfig(partial: Partial<DnDConfig>): void {
    Object.assign(this.config, partial);
  }

  /** Destroy the DnD instance and remove all listeners */
  destroy(): void {
    this.destroyed = true;
    this.cancel();
    this.detachListeners();
  }

  // --- Private: Event Handlers ---

  private onMouseDown(e: MouseEvent): void {
    // Only left click
    if (e.button !== 0) return;

    const handleEl = this.findHandleElement(e.target as HTMLElement);
    if (!handleEl) return;

    e.preventDefault();

    const itemEl = this.findItemElement(handleEl);
    if (!itemEl) return;

    const rect = itemEl.getBoundingClientRect();

    // Store initial position — drag starts after threshold
    this._pendingDrag = {
      element: itemEl,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.state.active && this._pendingDrag) {
      const dx = e.clientX - this._pendingDrag.startX;
      const dy = e.clientY - this._pendingDrag.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist >= this.config.threshold) {
        this.activateDrag(this._pendingDrag.element, e.clientX, e.clientY, this._pendingDrag.offsetX, this._pendingDrag.offsetY);
        this._pendingDrag = null;
        return;
      }
    }

    if (!this.state.active) return;
    e.preventDefault();

    this.updatePosition(e.clientX, e.clientY);
  }

  private onMouseUp(e: MouseEvent): void {
    if (this._pendingDrag) {
      this._pendingDrag = null;
      return;
    }

    if (!this.state.active) return;
    this.finalizeDrop();
  }

  private onTouchStart(e: TouchEvent): void {
    if (!this.config.touchSupport) return;
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    const handleEl = this.findHandleElement(touch.target as HTMLElement);
    if (!handleEl) return;

    const itemEl = this.findItemElement(handleEl);
    if (!itemEl) return;

    const rect = itemEl.getBoundingClientRect();

    this._pendingDrag = {
      element: itemEl,
      startX: touch.clientX,
      startY: touch.clientY,
      offsetX: touch.clientX - rect.left,
      offsetY: touch.clientY - rect.top,
    };
    this._touchStartPos = { x: touch.clientX, y: touch.clientY };
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.config.touchSupport) return;
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];

    if (!this.state.active && this._pendingDrag) {
      const dx = touch.clientX - this._pendingDrag.startX;
      const dy = touch.clientY - this._pendingDrag.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist >= this.config.threshold) {
        e.preventDefault(); // Prevent scroll
        this.activateDrag(this._pendingDrag.element, touch.clientX, touch.clientY, this._pendingDrag.offsetX, this._pendingDrag.offsetY);
        this._pendingDrag = null;
        return;
      }
    }

    if (!this.state.active) return;
    e.preventDefault();

    this.updatePosition(touch.clientX, touch.clientY);
  }

  private onTouchEnd(e: TouchEvent): void {
    if (this._pendingDrag) {
      this._pendingDrag = null;
      return;
    }

    if (!this.state.active) return;
    this.finalizeDrop();
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (!this.config.keyboardNav) return;
    if (!this.state.active) {
      // Space/Enter on focused item starts drag
      if ((e.key === " " || e.key === "Enter") && document.activeElement) {
        const itemEl = document.activeElement.closest(this.config.itemSelector) as HTMLElement | null;
        if (itemEl) {
          e.preventDefault();
          this.startDrag(itemEl);
        }
      }
      return;
    }

    // Arrow keys move the dragged element
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        this.moveByKeyboard(-1);
        break;
      case "ArrowDown":
        e.preventDefault();
        this.moveByKeyboard(1);
        break;
      case "Escape":
        e.preventDefault();
        this.cancel();
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        this.finalizeDrop();
        break;
    }
  }

  // --- Private: Core Logic ---

  private _pendingDrag: {
    element: HTMLElement;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null = null;

  private _touchStartPos: { x: number; y: number } | null = null;

  private activateDrag(element: HTMLElement, x: number, y: number, offsetX: number, offsetY: number): void {
    const container = this.findContainer(element);
    if (!container) return;

    const items = this.getSelectedItems(element);

    this.state = {
      active: true,
      elements: items,
      sourceContainer: container,
      sourceContainerIndex: this.config.containers.indexOf(container),
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
      offsetX,
      offsetY,
      ghost: null,
      placeholders: new Map(),
      originalPositions: [],
      selectedItems: new Set(items),
      touchId: null,
    };

    this.setupGhost();
    this.saveOriginalPositions();
    this.config.onDragStart?.(this.buildContext());
  }

  private updatePosition(x: number, y: number): void {
    let finalX = x;
    let finalY = y;

    // Apply constraint
    if (this.config.constraint === "vertical") {
      finalX = this.state.startX;
    } else if (this.config.constraint === "horizontal") {
      finalY = this.state.startY;
    }

    // Apply grid snap
    if (this.config.gridSize > 0) {
      finalX = Math.round(finalX / this.config.gridSize) * this.config.gridSize;
      finalY = Math.round(finalY / this.config.gridSize) * this.config.gridSize;
    }

    this.state.currentX = finalX;
    this.state.currentY = finalY;

    // Move ghost
    if (this.state.ghost) {
      this.state.ghost.style.transform = `translate(${finalX - this.state.offsetX}px, ${finalY - this.state.offsetY}px)`;
    }

    // Find drop target and update placeholders
    const dropTarget = this.findDropTarget(finalX, finalY);
    this.state.dropTarget = dropTarget;
    this.updatePlaceholders(dropTarget);

    this.config.onDragMove?.(this.buildContext());
  }

  private finalizeDrop(): void {
    const dropTarget = this.findDropTarget(this.state.currentX, this.state.currentY);

    if (dropTarget && dropTarget.isValid) {
      // Execute the drop
      this.executeDrop(dropTarget);
    } else {
      // Cancel — revert
      this.restorePositions();
      this.config.onCancel?.();
    }

    this.cleanup();
  }

  private executeDrop(target: DropTargetInfo): void {
    const sourceIdx = this.state.sourceContainerIndex;
    const targetIdx = target.containerIndex;

    // Remove elements from source (with placeholders already there)
    for (const el of this.state.elements) {
      el.style.display = "none";
    }

    // Insert into target at correct position
    const targetChildren = Array.from(target.container.querySelectorAll(this.config.itemSelector));
    let insertBefore: Element | null = null;

    if (target.insertBeforeIndex >= 0 && target.insertBeforeIndex < targetChildren.length) {
      insertBefore = targetChildren[target.insertBeforeIndex];
    }

    for (const el of this.state.elements) {
      el.classList.remove(this.config.dragClass);
      el.style.display = "";
      el.style.transform = "";

      if (insertBefore) {
        target.container.insertBefore(el, insertBefore);
      } else {
        target.container.appendChild(el);
      }
    }

    // Build result
    const oldIndices = this.state.elements.map((el) =>
      this.getItemIndex(el, this.state.originalPositions)
    );

    const newIndex = target.insertBeforeIndex >= 0 ? target.insertBeforeIndex :
      target.container.querySelectorAll(this.config.itemSelector).length - this.state.elements.length;

    const result: DropResult = {
      elements: this.state.elements,
      sourceContainer: this.state.sourceContainer,
      sourceContainerIndex: sourceIdx,
      targetContainer: target.container,
      targetContainerIndex: targetIdx,
      newIndex,
      oldIndices,
      changedContainers: sourceIdx !== targetIdx,
    };

    this.config.onDrop?.(result);
  }

  // --- Private: Helpers ---

  private findHandleElement(target: HTMLElement): HTMLElement | null {
    if (!this.config.handleSelector) {
      // Entire item is the handle — check if it matches item selector
      return target.closest(this.config.itemSelector) as HTMLElement | null;
    }

    return target.closest(this.config.handleSelector) as HTMLElement | null;
  }

  private findItemElement(handleOrItem: HTMLElement): HTMLElement | null {
    return handleOrItem.closest(this.config.itemSelector) as HTMLElement | null;
  }

  private findContainer(element: HTMLElement): HTMLElement | null {
    for (const container of this.config.containers) {
      if (container.contains(element)) return container;
    }
    return null;
  }

  private getSelectedItems(triggerElement: HTMLElement): HTMLElement[] {
    if (!this.config.multiDrag || this.state.selectedItems.size <= 1) {
      return [triggerElement];
    }

    // Include trigger + all other selected items from same container
    const items = [triggerElement];
    for (const item of this.state.selectedItems) {
      if (item !== triggerElement && this.findContainer(item) === this.findContainer(triggerElement)) {
        items.push(item);
      }
    }
    return items;
  }

  private getItemIndex(el: HTMLElement, positions: Array<{ el: HTMLElement }>): number {
    return positions.findIndex((p) => p.el === el);
  }

  private findDropTarget(x: number, y: number): DropTargetInfo | null {
    // Use elementFromPoint to find what's under the cursor
    const ghostDisplay = this.state.ghost ? this.state.ghost.style.display : null;
    if (this.state.ghost) this.state.ghost.style.display = "none";

    const underCursor = document.elementFromPoint(x, y) as HTMLElement | null;

    if (this.state.ghost && ghostDisplay !== null) {
      this.state.ghost.style.display = ghostDisplay;
    }

    if (!underCursor) return null;

    // Find which container we're over
    let targetContainer: HTMLElement | null = null;
    let targetContainerIndex = -1;

    for (let i = 0; i < this.config.containers.length; i++) {
      if (this.config.containers[i].contains(underCursor)) {
        targetContainer = this.config.containers[i];
        targetContainerIndex = i;
        break;
      }
    }

    if (!targetContainer) return null;

    // Check if cross-container is allowed
    const isValid = this.config.crossContainer || targetContainerIndex === this.state.sourceContainerIndex;

    // Find insertion point
    const targetEl = underCursor.closest(this.config.itemSelector) as HTMLElement | null;
    const allItems = Array.from(targetContainer.querySelectorAll(this.config.itemSelector));
    let insertBeforeIndex = targetEl ? allItems.indexOf(targetEl) : allItems.length;

    // Don't allow dropping before/after self
    if (targetEl && this.state.elements.includes(targetEl)) {
      // Adjust index based on cursor position relative to center
      const rect = targetEl.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const midX = rect.left + rect.width / 2;
      if (this.config.constraint === "horizontal" || (y > rect.top && y < rect.bottom)) {
        insertBeforeIndex = y < midY ? insertBeforeIndex : insertBeforeIndex + 1;
      } else {
        insertBeforeIndex = x < midX ? insertBeforeIndex : insertBeforeIndex + 1;
      }
    }

    return {
      container: targetContainer,
      containerIndex: targetContainerIndex,
      insertBeforeIndex,
      targetElement: targetEl,
      isValid,
    };
  }

  private setupGhost(): void {
    if (!this.config.showGhost || this.state.elements.length === 0) return;

    const first = this.state.elements[0];
    const rect = first.getBoundingClientRect();

    const ghost = first.cloneNode(true) as HTMLElement;
    ghost.className = `${first.className} ${this.config.dragClass}`.trim();
    ghost.style.cssText = `
      position: fixed;
      z-index: 10000;
      top: 0;
      left: 0;
      width: ${rect.width}px;
      height: ${rect.height}px;
      pointer-events: none;
      opacity: ${this.config.ghostOpacity};
      margin: 0;
      transform: translate(${rect.left}px, ${rect.top}px);
      transition: none;
    `;

    document.body.appendChild(ghost);
    this.state.ghost = ghost;

    // Hide originals
    for (const el of this.state.elements) {
      el.classList.add(this.config.dragClass);
      el.style.opacity = "0.3";
    }
  }

  private saveOriginalPositions(): void {
    this.state.originalPositions = this.state.elements.map((el) => ({
      el,
      rect: el.getBoundingClientRect(),
      parent: el.parentElement!,
      nextSibling: el.nextElementSibling,
    }));
  }

  private restorePositions(): void {
    for (const pos of this.state.originalPositions) {
      pos.el.classList.remove(this.config.dragClass);
      pos.el.style.opacity = "";
      pos.el.style.transform = "";

      if (pos.el.parentElement !== pos.parent) {
        pos.parent.insertBefore(pos.el, pos.nextSibling);
      }
    }
  }

  private updatePlaceholders(target: DropTargetInfo | null): void {
    // Remove old placeholders
    for (const [, ph] of this.state.placeholders) {
      ph.remove();
    }
    this.state.placeholders.clear();

    // Remove old drop-zone highlights
    for (const c of this.config.containers) {
      c.classList.remove(this.config.dropZoneClass);
    }

    if (!target || !target.isValid) return;

    // Highlight target container
    target.container.classList.add(this.config.dropZoneClass);

    // Create placeholder at insertion point
    if (this.config.sortable) {
      const placeholder = document.createElement("div");
      placeholder.className = this.config.placeholderClass;
      placeholder.style.cssText = `
        height: 2px;
        background: #007aff;
        margin: 4px 0;
        border-radius: 1px;
        transition: all ${this.config.animationDuration}ms ease;
      `;

      const children = Array.from(target.container.querySelectorAll(this.config.itemSelector));
      if (target.insertBeforeIndex >= 0 && target.insertBeforeIndex < children.length) {
        target.container.insertBefore(placeholder, children[target.insertBeforeIndex]);
      } else {
        target.container.appendChild(placeholder);
      }

      this.state.placeholders.set(target.container, placeholder);
    }
  }

  private cleanup(): void {
    // Remove ghost
    if (this.state.ghost) {
      this.state.ghost.remove();
      this.state.ghost = null;
    }

    // Remove placeholders
    for (const [, ph] of this.state.placeholders) {
      ph.remove();
    }
    this.state.placeholders.clear();

    // Remove drop-zone classes
    for (const c of this.config.containers) {
      c.classList.remove(this.config.dropZoneClass);
    }

    // Restore original styles
    for (const el of this.state.elements) {
      el.classList.remove(this.config.dragClass);
      el.style.opacity = "";
      el.style.transform = "";
    }

    this.state = this.createIdleState();
    this._pendingDrag = null;
  }

  private createIdleState(): DragState {
    return {
      active: false,
      elements: [],
      sourceContainer: null as unknown as HTMLElement,
      sourceContainerIndex: -1,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      offsetX: 0,
      offsetY: 0,
      ghost: null,
      placeholders: new Map(),
      originalPositions: [],
      selectedItems: new Set(),
      touchId: null,
    };
  }

  private buildContext(): DragContext {
    return {
      element: this.state.elements[0],
      elements: this.state.elements,
      sourceContainerIndex: this.state.sourceContainerIndex,
      sourceContainer: this.state.sourceContainer,
      x: this.state.currentX,
      y: this.state.currentY,
      startX: this.state.startX,
      startY: this.state.startY,
      offsetX: this.state.offsetX,
      offsetY: this.state.offsetY,
      dropTarget: this.state.dropTarget ?? null,
      data: this.extractDataAttributes(this.state.elements[0]),
    };
  }

  private extractDataAttributes(el: HTMLElement): Record<string, string> {
    const data: Record<string, string> = {};
    for (const attr of el.attributes) {
      if (attr.name.startsWith("data-dnd-")) {
        data[attr.name.slice(9)] = attr.value;
      }
    }
    return data;
  }

  private moveByKeyboard(direction: number): void {
    if (this.state.elements.length !== 1) return;

    const el = this.state.elements[0];
    const container = this.findContainer(el);
    if (!container) return;

    const siblings = Array.from(container.querySelectorAll(this.config.itemSelector));
    const idx = siblings.indexOf(el);
    const newIdx = idx + direction;

    if (newIdx < 0 || newIdx >= siblings.length) return;

    if (direction > 0) {
      el.parentNode!.insertBefore(el.nextSibling ?? el, (siblings[newIdx + 1] ?? null));
    } else {
      el.parentNode!.insertBefore(el, siblings[newIdx]);
    }

    this.updatePosition(this.state.currentX, this.state.currentY);
  }

  // --- Private: Listener Management ---

  private attachListeners(): void {
    document.addEventListener("mousedown", this.boundHandlers.mouseDown, { passive: false });
    document.addEventListener("mousemove", this.boundHandlers.mouseMove, { passive: false });
    document.addEventListener("mouseup", this.boundHandlers.mouseUp);
    document.addEventListener("touchstart", this.boundHandlers.touchStart, { passive: false });
    document.addEventListener("touchmove", this.boundHandlers.touchMove, { passive: false });
    document.addEventListener("touchend", this.boundHandlers.touchEnd);
    document.addEventListener("keydown", this.boundHandlers.keyDown);
  }

  private detachListeners(): void {
    document.removeEventListener("mousedown", this.boundHandlers.mouseDown);
    document.removeEventListener("mousemove", this.boundHandlers.mouseMove);
    document.removeEventListener("mouseup", this.boundHandlers.mouseUp);
    document.removeEventListener("touchstart", this.boundHandlers.touchStart);
    document.removeEventListener("touchmove", this.boundHandlers.touchMove);
    document.removeEventListener("touchend", this.boundHandlers.touchEnd);
    document.removeEventListener("keydown", this.boundHandlers.keyDown);
  }
}
