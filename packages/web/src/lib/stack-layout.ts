/**
 * Stack Layout / Card Stack: Stacked card layout with swipe gestures,
 * 3D perspective transforms, spring physics, infinite mode,
 * animation presets, and programmatic navigation.
 */

// --- Types ---

export type SwipeDirection = "left" | "right" | "up" | "down";
export type StackAnimation = "slide" | "fade" | "flip" | "cube" | "cover" | "reveal" | "scale" | "3d-stack";

export interface StackItem {
  /** Unique identifier */
  id: string;
  /** Content element or HTML string */
  content: HTMLElement | string;
  /** Optional label/title */
  label?: string;
  /** Custom data */
  data?: unknown;
}

export interface StackLayoutOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial items */
  items?: StackItem[];
  /** Animation type (default: "3d-stack") */
  animation?: StackAnimation;
  /** Allow swiping? (default: true) */
  swipeable?: boolean;
  /** Swipe threshold in px (default: 80) */
  swipeThreshold?: number;
  /** Maximum rotation during drag (deg, default: 22) */
  maxRotation?: number;
  /** Maximum offset during drag (px, default: 150) */
  maxOffset?: number;
  /** Scale of cards behind top card (default: 0.95) */
  backgroundScale?: number;
  /** Offset of each subsequent card (px, default: 6) */
  stackOffset?: number;
  /** Opacity of cards behind top card (default: 0.85) */
  backgroundOpacity?: number;
  /** Perspective for 3D effects (px, default: 1000) */
  perspective?: number;
  /** Number of visible cards in stack (default: 3) */
  visibleCount?: number;
  /** Infinite loop? (cards reappear at bottom after swipe) */
  infinite?: boolean;
  /** Callback when card is swiped away */
  onSwipe?: (item: StackItem, direction: SwipeDirection, index: number) => void;
  /** Callback on card tap/click */
  onTap?: (item: StackItem, index: number) => void;
  /** Callback on drag start */
  onDragStart?: (item: StackItem) => void;
  /** Callback on drag move */
  onDragMove?: (item: StackItem, progress: { x: number; y: number }) => void;
  /** Callback on drag end (before potential swipe) */
  onDragEnd?: (item: StackItem, willSwipe: boolean) => void;
  /** Callback when all cards are swiped (non-infinite mode) */
  onEmpty?: () => void;
  /** Callback when stack resets */
  onReset?: () => void;
  /** Show action indicators on edges? */
  showActionIndicators?: boolean;
  /** Left action indicator text/emoji */
  leftIndicator?: string;
  /** Right action indicator text/emoji */
  rightIndicator?: string;
  /** Up action indicator */
  upIndicator?: string;
  /** Down action indicator */
  downIndicator?: string;
  /** Custom CSS class */
  className?: string;
}

export interface StackLayoutInstance {
  element: HTMLElement;
  /** Get current items */
  getItems: () => StackItem[];
  /** Get current top item index */
  getCurrentIndex: () => number;
  /** Add item to bottom of stack */
  addItem: (item: StackItem) => void;
  /** Add items to bottom */
  addItems: (items: StackItem[]) => void;
  /** Remove item by ID */
  removeItem: (id: string) => void;
  /** Programmatically swipe current card */
  swipe: (direction: SwipeDirection) => void;
  /** Navigate to specific index */
  goToIndex: (index: number) => void;
  /** Go to next card (swipe current) */
  next: () => void;
  /** Go to previous card (undo last swipe) */
  prev: () => void;
  /** Shuffle remaining cards */
  shuffle: () => void;
  /** Reset with original items */
  reset: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Main Factory ---

export function createStackLayout(options: StackLayoutOptions): StackLayoutInstance {
  const opts = {
    animation: options.animation ?? "3d-stack",
    swipeable: options.swipeable ?? true,
    swipeThreshold: options.swipeThreshold ?? 80,
    maxRotation: options.maxRotation ?? 22,
    maxOffset: options.maxOffset ?? 150,
    backgroundScale: options.backgroundScale ?? 0.95,
    stackOffset: options.stackOffset ?? 6,
    backgroundOpacity: options.backgroundOpacity ?? 0.85,
    perspective: options.perspective ?? 1000,
    visibleCount: options.visibleCount ?? 3,
    infinite: options.infinite ?? false,
    showActionIndicators: options.showActionIndicators ?? true,
    leftIndicator: options.leftIndicator ?? "\u2716",
    rightIndicator: options.rightIndicator ?? "\u2714",
    upIndicator: options.upIndicator ?? "\u2B06",
    downIndicator: options.downIndicator ?? "\u2B07",
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("StackLayout: container not found");

  let destroyed = false;
  let items: StackItem[] = options.items ? [...options.items] : [];
  let currentIndex = 0;
  let history: StackItem[] = []; // For undo
  let isDragging = false;
  let startX = 0, startY = 0;
  let currentX = 0, currentY = 0;
  let pointerId: number | null = null;

  // Setup container
  container.className = `stack-layout ${opts.className}`;
  container.style.cssText = `
    position:relative;width:100%;height:100%;
    perspective:${opts.perspective}px;overflow:hidden;
    touch-action:none;user-select:none;-webkit-user-select:none;
  `;

  const cardElements = new Map<string, HTMLElement>();

  function render(): void {
    if (destroyed) return;
    container.innerHTML = "";
    cardElements.clear();

    if (items.length === 0) {
      opts.onEmpty?.();
      return;
    }

    const visibleItems = items.slice(currentIndex, currentIndex + opts.visibleCount);

    for (let i = visibleItems.length - 1; i >= 0; i--) {
      const item = visibleItems[i]!;
      const depth = visibleItems.length - 1 - i; // 0 = top

      const el = createCardElement(item, depth);
      container.appendChild(el);
      cardElements.set(item.id, el);
    }
  }

  function createCardElement(item: StackItem, depth: number): HTMLElement {
    const el = document.createElement("div");
    el.className = `stack-card stack-card-${depth}`;
    el.dataset.stackId = item.id;
    el.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;
      border-radius:12px;overflow:hidden;
      box-shadow:0 ${4 + depth * 2}px ${16 + depth * 4}px rgba(0,0,0,${0.1 + depth * 0.03});
      transition: transform 0.3s ease, opacity 0.3s ease;
      cursor:grab;
      background:#fff;border:1px solid #e5e7eb;
    `;

    // Content
    if (typeof item.content === "string") {
      el.innerHTML = item.content;
    } else {
      el.appendChild(item.content);
    }

    // Apply depth transform
    applyDepthTransform(el, depth);

    // Action indicators
    if (depth === 0 && opts.showActionIndicators) {
      createIndicators(el);
    }

    // Event listeners
    if (depth === 0 && opts.swipeable) {
      attachDragEvents(el, item);
    }

    // Click/tap
    el.addEventListener("click", () => {
      if (!isDragging) opts.onTap?.(item, currentIndex);
    });

    return el;
  }

  function applyDepthTransform(el: HTMLElement, depth: number): void {
    if (depth === 0) {
      el.style.transform = "translateZ(0)";
      el.style.opacity = "1";
      el.style.zIndex = String(opts.visibleCount);
      return;
    }

    const scale = opts.backgroundScale + (1 - opts.backgroundScale) * (1 - depth / opts.visibleCount);
    const offsetY = depth * opts.stackOffset;
    const opacity = opts.backgroundOpacity ** depth;

    switch (opts.animation) {
      case "3d-stack":
        el.style.transform = `
          translateY(${offsetY}px)
          scale(${scale})
          translateZ(${-depth * 20}px)
          rotateX(${depth * -2}deg)
        `;
        break;
      case "slide":
        el.style.transform = `translateY(${offsetY}px) scale(${scale})`;
        break;
      case "scale":
        el.style.transform = `scale(${scale})`;
        break;
      case "fade":
        el.style.transform = `translateY(${offsetY}px)`;
        break;
      case "flip":
        el.style.transform = `
          translateY(${offsetY}px) scale(${scale})
          rotateY(${depth * -5}deg)
        `;
        break;
      case "cube":
        el.style.transform = `
          translateY(${offsetY}px) scale(${scale})
          rotateX(${depth * -8}deg) rotateY(${depth * -5}deg)
        `;
        break;
      default:
        el.style.transform = `translateY(${offsetY}px) scale(${scale})`;
    }

    el.style.opacity = String(opacity);
    el.style.zIndex = String(opts.visibleCount - depth);
  }

  function createIndicators(cardEl: HTMLElement): void {
    const leftInd = document.createElement("div");
    leftInd.className = "stack-indicator-left";
    leftInd.textContent = opts.leftIndicator;
    leftInd.style.cssText = `
      position:absolute;left:20px;top:50%;transform:translateY(-50%);
      font-size:32px;opacity:0;transition:opacity 0.15s;color:#ef4444;
      pointer-events:none;text-shadow:0 1px 3px rgba(0,0,0,0.2);
    `;

    const rightInd = document.createElement("div");
    rightInd.className = "stack-indicator-right";
    rightInd.textContent = opts.rightIndicator;
    rightInd.style.cssText = `
      position:absolute;right:20px;top:50%;transform:translateY(-50%);
      font-size:32px;opacity:0;transition:opacity 0.15s;color:#22c55e;
      pointer-events:none;text-shadow:0 1px 3px rgba(0,0,0,0.2);
    `;

    cardEl.appendChild(leftInd);
    cardEl.appendChild(rightInd);
  }

  function attachDragEvents(cardEl: HTMLElement, item: StackItem): void {
    cardEl.addEventListener("pointerdown", (e) => {
      if (destroyed || !opts.swipeable) return;
      e.preventDefault();

      isDragging = false;
      startX = e.clientX;
      startY = e.clientY;
      currentX = 0;
      currentY = 0;
      pointerId = e.pointerId;

      cardEl.setPointerCapture(e.pointerId);
      cardEl.style.transition = "none";
      cardEl.style.cursor = "grabbing";

      opts.onDragStart?.(item);

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        isDragging = true;
        currentX = ev.clientX - startX;
        currentY = ev.clientY - startY;

        // Clamp to max offset
        const clampedX = Math.max(-opts.maxOffset, Math.min(opts.maxOffset, currentX));
        const clampedY = Math.max(-opts.maxOffset, Math.min(opts.maxOffset, currentY));

        // Rotation based on X offset
        const rotation = (clampedX / opts.maxOffset) * opts.maxRotation;

        cardEl.style.transform = `
          translateX(${clampedX}px) translateY(${clampedY}px)
          rotate(${rotation}deg)
          scale(${1 + Math.abs(clampedX) / opts.maxOffset * 0.05})
        `;

        // Show indicators
        updateIndicators(cardEl, clampedX);

        opts.onDragMove?.(item, { x: clampedX, y: clampedY });
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        cardEl.releasePointerCapture(ev.pointerId);
        cardEl.removeEventListener("pointermove", onMove);
        cardEl.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);

        handleDragEnd(cardEl, item);
      };

      const onCancel = () => {
        cardEl.removeEventListener("pointermove", onMove);
        cardEl.removeEventListener("pointerup", onUp);
        snapBack(cardEl);
      };

      cardEl.addEventListener("pointermove", onMove);
      cardEl.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
    });
  }

  function updateIndicators(cardEl: HTMLElement, x: number): void {
    const left = cardEl.querySelector(".stack-indicator-left");
    const right = cardEl.querySelector(".stack-indicator-right");
    if (left) (left as HTMLElement).style.opacity = x < -40 ? String(Math.min(1, Math.abs(x) / 100)) : "0";
    if (right) (right as HTMLElement).style.opacity = x > 40 ? String(Math.min(1, x / 100)) : "0";
  }

  function handleDragEnd(cardEl: HTMLElement, item: StackItem): void {
    cardEl.style.cursor = "grab";
    cardEl.style.transition = "transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.35s ease";

    const distance = Math.sqrt(currentX * currentX + currentY * currentY);
    const willSwipe = distance > opts.swipeThreshold;

    opts.onDragEnd?.(item, willSwipe);

    if (willSwipe) {
      // Determine direction
      let dir: SwipeDirection = "right";
      if (Math.abs(currentX) > Math.abs(currentY)) {
        dir = currentX < 0 ? "left" : "right";
      } else {
        dir = currentY < 0 ? "up" : "down";
      }

      // Animate out
      const flyOutX = currentX * 2;
      const flyOutY = currentY * 2;
      const flyRotation = (currentX / opts.maxOffset) * opts.maxRotation * 2;

      cardEl.style.transform = `
        translateX(${flyOutX}px) translateY(${flyOutY}px)
        rotate(${flyRotation}deg) scale(0.8)
      `;
      cardEl.style.opacity = "0";

      setTimeout(() => completeSwipe(item, dir), 350);
    } else {
      snapBack(cardEl);
    }
  }

  function snapBack(cardEl: HTMLElement): void {
    cardEl.style.transform = "translateZ(0)";
    cardEl.style.opacity = "1";

    const left = cardEl.querySelector(".stack-indicator-left");
    const right = cardEl.querySelector(".stack-indicator-right");
    if (left) (left as HTMLElement).style.opacity = "0";
    if (right) (right as HTMLElement).style.opacity = "0";
  }

  function completeSwipe(item: StackItem, direction: SwipeDirection): void {
    history.push(item);

    if (opts.infinite) {
      // Move to end
      items = [...items.filter((i) => i.id !== item.id), item];
    } else {
      items = items.filter((i) => i.id !== item.id);
      currentIndex = Math.min(currentIndex, Math.max(0, items.length - 1));

      if (items.length === 0) {
        opts.onEmpty?.();
      }
    }

    opts.onSwipe?.(item, direction, history.length - 1);
    render();
  }

  // --- Instance ---

  const instance: StackLayoutInstance = {
    element: container,

    getItems: () => [...items],
    getCurrentIndex: () => currentIndex,

    addItem(item) {
      items.push(item);
      render();
    },

    addItems(newItems) {
      items.push(...newItems);
      render();
    },

    removeItem(id) {
      items = items.filter((i) => i.id !== id);
      render();
    },

    swipe(direction) {
      if (items.length === 0) return;
      const item = items[currentIndex] ?? items[0]!;
      if (!item) return;

      const cardEl = cardElements.get(item.id);
      if (!cardEl) {
        completeSwipe(item, direction);
        return;
      }

      // Animate out in the given direction
      cardEl.style.transition = "transform 0.35s ease-out, opacity 0.35s ease-out";

      const offsets: Record<SwipeDirection, [number, number]> = {
        left: [-300, 0],
        right: [300, 0],
        up: [0, -300],
        down: [0, 300],
      };
      const [ox, oy] = offsets[direction]!;

      cardEl.style.transform = `translateX(${ox}px) translateY(${oy}px) rotate(${direction === "left" ? -20 : direction === "right" ? 20 : 0}deg) scale(0.8)`;
      cardEl.style.opacity = "0";

      setTimeout(() => completeSwipe(item, direction), 350);
    },

    goToIndex(index) {
      if (index < 0 || index >= items.length) return;
      currentIndex = index;
      render();
    },

    next() {
      instance.swipe("right");
    },

    prev() {
      if (history.length === 0) return;
      const lastItem = history.pop()!;
      if (opts.infinite) {
        // Move from end back to front
        items = [lastItem, ...items.filter((i) => i.id !== lastItem.id)];
      } else {
        items.splice(currentIndex, 0, lastItem);
      }
      opts.onReset?.();
      render();
    },

    shuffle() {
      // Fisher-Yates shuffle
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j]!, items[i]!];
      }
      currentIndex = 0;
      render();
    },

    reset() {
      items = options.items ? [...options.items] : [];
      currentIndex = 0;
      history = [];
      render();
    },

    destroy() {
      destroyed = true;
      container.innerHTML = "";
      container.style.cssText = "";
      cardElements.clear();
    },
  };

  // Initial render
  render();

  return instance;
}
