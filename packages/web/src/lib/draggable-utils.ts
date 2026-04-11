/**
 * Draggable Utilities: Make any element draggable with constraints,
 * snap-to-grid, momentum inertia, axis locking, drop zones, and
 * touch support.
 */

// --- Types ---

export type DragAxis = "both" | "x" | "y";
export type DragHandle = HTMLElement | string;

export interface DragConstraints {
  /** Restrict within parent bounds? */
  containment?: "parent" | "window" | HTMLElement;
  /** Min X position */
  minX?: number;
  /** Max X position */
  maxX?: number;
  /** Min Y position */
  minY?: number;
  /** Max Y position */
  maxY?: number;
}

export interface SnapConfig {
  /** Grid size in px (0 = disabled) */
  grid: number;
  /** Snap threshold (distance to snap, default grid/2) */
  threshold?: number;
  /** Snap to edges of other elements? */
  snapToEdges?: boolean;
  /** Edge snap distance (px) */
  edgeSnapDistance?: number;
}

export interface DropZone {
  /** Zone element or selector */
  el: HTMLElement | string;
  /** Unique zone identifier */
  id: string;
  /** Accept predicate (true = can drop here) */
  accept?: (dragEl: HTMLElement) => boolean;
  /** Called when entering zone */
  onEnter?: (zoneId: string) => void;
  /** Called when leaving zone */
  onLeave?: (zoneId: string) => void;
  /** Called when dropped in zone */
  onDrop?: (zoneId: string) => void;
}

export interface DraggableOptions {
  /** The element to make draggable */
  target: HTMLElement;
  /** Drag handle (if omitted, entire element is the handle) */
  handle?: DragHandle;
  /** Axis constraint */
  axis?: DragAxis;
  /** Position constraints */
  constraints?: DragConstraints;
  /** Snap configuration */
  snap?: SnapConfig;
  /** Drop zones for this draggable */
  dropZones?: DropZone[];
  /** Enable momentum/inertia after release? */
  momentum?: boolean;
  /** Momentum friction coefficient (0-1, default 0.95) */
  momentumFriction?: number;
  /** Initial position offset from current */
  initialPosition?: { x: number; y: number };
  /** Use CSS transform instead of top/left? */
  useTransform?: boolean;
  /** Show drag ghost/clone? */
  useGhost?: boolean;
  /** Ghost opacity */
  ghostOpacity?: number;
  /** Called on drag start */
  onDragStart?: (position: { x: number; y: number }) => void;
  /** Called during drag */
  onDrag?: (position: { x: number; y: number }) => void;
  /** Called on drag end */
  onDragEnd?: (position: { x: number; y: number }, droppedIn: string | null) => void;
  /** Custom class name */
  className?: string;
}

export interface DraggableInstance {
  /** The target element */
  target: HTMLElement;
  /** Current position */
  getPosition: () => { x: number; y: number };
  /** Set position programmatically */
  setPosition: (x: number, y: number) => void;
  /** Enable dragging */
  enable: () => void;
  /** Disable dragging */
  disable: () => void;
  /** Check if currently being dragged */
  isDragging: () => boolean;
  /** Return to initial position */
  reset: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Make an element draggable with full constraint and snap support.
 *
 * @example
 * ```ts
 * const drag = createDraggable({
 *   target: cardEl,
 *   handle: ".card-header",
 *   axis: "both",
 *   constraints: { containment: "parent" },
 *   snap: { grid: 20 },
 *   onDragEnd: (pos, zone) => console.log("Dropped at", pos, "in", zone),
 * });
 * ```
 */
export function createDraggable(options: DraggableOptions): DraggableInstance {
  const {
    target,
    handle,
    axis = "both",
    constraints,
    snap,
    dropZones,
    momentum = false,
    momentumFriction = 0.95,
    initialPosition,
    useTransform = true,
    useGhost = false,
    ghostOpacity = 0.85,
    onDragStart,
    onDrag,
    onDragEnd,
    className,
  } = options;

  let _enabled = true;
  let _isDragging = false;
  let _startX = 0;
  let _startY = 0;
  let _offsetX = 0;
  let _offsetY = 0;
  let _currentX = 0;
  let _currentY = 0;
  let _initialX = 0;
  let _initialY = 0;
  let _ghost: HTMLElement | null = null;
  let _activeZone: string | null = null;
  let _velocityX = 0;
  let _velocityY = 0;
  let _lastTime = 0;
  let _lastX = 0;
  let _lastY = 0;
  const cleanupFns: Array<() => void> = [];
  let _momentumRafId: number | null = null;

  // Resolve handle element
  function getHandleElement(): HTMLElement | null {
    if (!handle) return target;
    if (typeof handle === "string") return target.querySelector(handle);
    return handle;
  }

  // Ensure target is positioned
  const originalPosition = getComputedStyle(target).position;
  if (originalPosition === "static") {
    target.style.position = "relative";
  }

  // Apply initial position
  if (initialPosition) {
    _initialX = initialPosition.x;
    _initialY = initialPosition.y;
    applyPosition(initialPosition.x, initialPosition.y);
  } else {
    // Read current transform/position
    const pos = readPosition();
    _initialX = pos.x;
    _initialY = pos.y;
  }
  _currentX = _initialX;
  _currentY = _initialY;

  // --- Position helpers ---

  function readPosition(): { x: number; y: number } {
    if (useTransform) {
      const transform = getComputedStyle(target).transform;
      if (transform && transform !== "none") {
        const match = /matrix\(([^)]+)\)/.exec(transform);
        if (match) {
          const values = match[1].split(",").map(Number);
          return { x: values[4] ?? 0, y: values[5] ?? 0 };
        }
      }
      return { x: 0, y: 0 };
    }
    return {
      x: parseFloat(target.style.left || "0"),
      y: parseFloat(target.style.top || "0"),
    };
  }

  function applyPosition(x: number, y: number): void {
    if (useTransform) {
      target.style.transform = `translate(${x}px, ${y}px)`;
    } else {
      target.style.left = `${x}px`;
      target.style.top = `${y}px`;
    }
  }

  function constrainPosition(x: number, y: number): { x: number; y: number } {
    if (!constraints) return { x, y };

    let cx = x;
    let cy = y;

    if (constraints.containment === "parent" && target.parentElement) {
      const parentRect = target.parentElement.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const maxW = parentRect.width - targetRect.width;
      const maxH = parentRect.height - targetRect.height;

      // Convert to relative coords
      const parentStyle = getComputedStyle(target.parentElement);
      const paddingLeft = parseFloat(parentStyle.paddingLeft);
      const paddingTop = parseFloat(parentStyle.paddingTop);

      cx = Math.max(paddingLeft, Math.min(maxW + paddingLeft, cx));
      cy = Math.max(paddingTop, Math.min(maxH + paddingTop, cy));
    } else if (constraints.containment === "window") {
      const rect = target.getBoundingClientRect();
      cx = Math.max(0, Math.min(window.innerWidth - rect.width, cx));
      cy = Math.max(0, Math.min(window.innerHeight - rect.height, cy));
    }

    if (constraints.minX != null) cx = Math.max(constraints.minX, cx);
    if (constraints.maxX != null) cx = Math.min(constraints.maxX, cx);
    if (constraints.minY != null) cy = Math.max(constraints.minY, cy);
    if (constraints.maxY != null) cy = Math.min(constraints.maxY, cy);

    return { x: cx, y: cy };
  }

  function applySnap(x: number, y: number): { x: number; y: number } {
    if (!snap || snap.grid <= 0) return { x, y };

    const threshold = snap.threshold ?? snap.grid / 2;
    let sx = Math.round(x / snap.grid) * snap.grid;
    let sy = Math.round(y / snap.grid) * snap.grid;

    // Only snap if close enough
    if (Math.abs(x - sx) > threshold) sx = x;
    if (Math.abs(y - sy) > threshold) sy = y;

    return { x: sx, y: sy };
  }

  // --- Drop zones ---

  function resolveDropZones(): Array<{ id: string; el: HTMLElement; accept?: (el: HTMLElement) => boolean }> {
    if (!dropZones) return [];
    return dropZones.map((z) => ({
      id: z.id,
      el: typeof z.el === "string"
        ? (document.querySelector(z.el) as HTMLElement)
        : z.el,
      accept: z.accept,
    })).filter((z) => z.el != null);
  }

  function checkDropZones(clientX: number, clientY: number): string | null {
    const zones = resolveDropZones();
    const prevZone = _activeZone;

    for (const zone of zones) {
      const rect = zone.el.getBoundingClientRect();
      if (
        clientX >= rect.left && clientX <= rect.right &&
        clientY >= rect.top && clientY <= rect.bottom
      ) {
        if (zone.accept && !zone.accept(target)) continue;

        if (prevZone !== zone.id) {
          // Left previous zone
          if (prevZone) {
            const pz = dropZones!.find((z) => z.id === prevZone);
            pz?.onLeave?.(prevZone);
          }
          // Entered new zone
          _activeZone = zone.id;
          const dz = dropZones!.find((z) => z.id === zone.id);
          dz?.onEnter?.(zone.id);
        }
        return zone.id;
      }
    }

    // Left all zones
    if (prevZone) {
      const pz = dropZones!.find((z) => z.id === prevZone);
      pz?.onLeave?.(prevZone);
      _activeZone = null;
    }

    return null;
  }

  // --- Ghost ---

  function showGhost(): void {
    if (!useGhost) return;

    _ghost = target.cloneNode(true) as HTMLElement;
    _ghost.className += " drag-ghost";
    Object.assign(_ghost.style, {
      position: "fixed",
      pointerEvents: "none",
      zIndex: "10000",
      opacity: String(ghostOpacity),
      margin: "0",
      width: `${target.offsetWidth}px`,
      height: `${target.offsetHeight}px`,
      left: `${_currentX}px`,
      top: `${_currentY}px`,
      boxShadow: "0 12px 36px rgba(0,0,0,0.2)",
    });
    document.body.appendChild(_ghost);

    target.style.opacity = "0.3";
  }

  function hideGhost(): void {
    if (_ghost) {
      _ghost.remove();
      _ghost = null;
    }
    target.style.opacity = "";
  }

  function updateGhostPosition(x: number, y: number): void {
    if (!_ghost) return;
    _ghost.style.left = `${x}px`;
    _ghost.style.top = `${y}px`;
  }

  // --- Drag lifecycle ---

  function startDrag(clientX: number, clientY: number): void {
    if (!_enabled || _isDragging) return;

    const handleEl = getHandleElement();
    // If handle specified, only allow drag from handle
    if (handleEl && handleEl !== target) {
      // This check is done at event level — we already filtered by handle
    }

    _isDragging = true;
    _startX = clientX;
    _startY = clientY;

    const pos = readPosition();
    _offsetX = pos.x;
    _offsetY = pos.y;
    _lastTime = performance.now();
    _lastX = clientX;
    _lastY = clientY;
    _velocityX = 0;
    _velocityY = 0;

    target.classList.add("dragging");
    showGhost();

    onDragStart?.({ x: _offsetX, y: _offsetY });
  }

  function moveDrag(clientX: number, clientY: number): void {
    if (!_isDragging) return;

    // Track velocity for momentum
    const now = performance.now();
    const dt = now - _lastTime;
    if (dt > 0) {
      _velocityX = (clientX - _lastX) / dt * 16; // normalize to ~60fps
      _velocityY = (clientY - _lastY) / dt * 16;
    }
    _lastTime = now;
    _lastX = clientX;
    _lastY = clientY;

    let dx = clientX - _startX;
    let dy = clientY - _startY;

    // Apply axis constraints
    if (axis === "x") dy = 0;
    if (axis === "y") dx = 0;

    let newX = _offsetX + dx;
    let newY = _offsetY + dy;

    // Constrain
    const constrained = constrainPosition(newX, newY);
    newX = constrained.x;
    newY = constrained.y;

    // Snap (only during drag for visual feedback)
    const snapped = applySnap(newX, newY);
    _currentX = snapped.x;
    _currentY = snapped.y;

    applyPosition(_currentX, _currentY);
    updateGhostPosition(_currentX, _currentY);

    // Check drop zones
    checkDropZones(clientX, clientY);

    onDrag?.({ x: _currentX, y: _currentY });
  }

  function endDrag(): void {
    if (!_isDragging) return;

    _isDragging = false;
    target.classList.remove("dragging");

    const finalPos = { x: _currentX, y: _currentY };
    const droppedIn = _activeZone;

    // Notify drop zone
    if (droppedIn) {
      const dz = dropZones?.find((z) => z.id === droppedIn);
      dz?.onDrop?.(droppedIn);
      _activeZone = null;
    }

    hideGhost();

    // Momentum
    if (momentum && (Math.abs(_velocityX) > 0.5 || Math.abs(_velocityY) > 0.5)) {
      applyMomentum(_currentX, _currentY, _velocityX, _velocityY);
    } else {
      onDragEnd?.(finalPos, droppedIn);
    }
  }

  function applyMomentum(startX: number, startY: number, vx: number, vy: number): void {
    let mx = startX;
    let my = startY;
    let mvx = vx;
    let mvy = vy;

    function step(): void {
      mvx *= momentumFriction;
      mvy *= momentumFriction;

      if (Math.abs(mvx) < 0.1 && Math.abs(mvy) < 0.1) {
        _momentumRafId = null;
        const constrained = constrainPosition(mx, my);
        applyPosition(constrained.x, constrained.y);
        _currentX = constrained.x;
        _currentY = constrained.y;
        onDragEnd?.({ x: _currentX, y: _currentY }, null);
        return;
      }

      mx += mvx;
      my += mvy;

      const constrained = constrainPosition(mx, my);
      applyPosition(constrained.x, constrained.y);
      _currentX = constrained.x;
      _currentY = constrained.y;
      onDrag?.({ x: _currentX, y: _currentY });

      _momentumRafId = requestAnimationFrame(step);
    }

    _momentumRafId = requestAnimationFrame(step);
  }

  // --- Event listeners ---

  function attachEvents(): void {
    const handleEl = getHandleElement();

    const onStart = (clientX: number, clientY: number) => {
      startDrag(clientX, clientY);
    };

    // Mouse events on handle
    if (handleEl) {
      handleEl.addEventListener("mousedown", (e) => {
        e.preventDefault();
        onStart(e.clientX, e.clientY);
      });

      handleEl.addEventListener("touchstart", (e) => {
        onStart(e.touches[0]!.clientX, e.touches[0]!.clientY);
      }, { passive: true });
    } else {
      target.addEventListener("mousedown", (e) => {
        e.preventDefault();
        onStart(e.clientX, e.clientY);
      });

      target.addEventListener("touchstart", (e) => {
        onStart(e.touches[0]!.clientX, e.touches[0]!.clientY);
      }, { passive: true });
    }

    // Global move/end
    const onMouseMove = (e: MouseEvent) => moveDrag(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => { e.preventDefault(); moveDrag(e.touches[0]!.clientX, e.touches[0]!.clientY); };
    const onMouseUp = () => endDrag();
    const onTouchEnd = () => endDrag();

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);

    cleanupFns.push(
      () => document.removeEventListener("mousemove", onMouseMove),
      () => document.removeEventListener("mouseup", onMouseUp),
      () => document.removeEventListener("touchmove", onTouchMove),
      () => document.removeEventListener("touchend", onTouchEnd),
    );
  }

  attachEvents();

  // --- Public API ---

  function getPosition(): { x: number; y: number } {
    return { x: _currentX, y: _currentY };
  }

  function setPosition(x: number, y: number): void {
    const constrained = constrainPosition(x, y);
    _currentX = constrained.x;
    _currentY = constrained.y;
    applyPosition(_currentX, _currentY);
  }

  function enable(): void { _enabled = true; }
  function disable(): void { _enabled = false; }
  function isDragging(): boolean { return _isDragging; }

  function reset(): void {
    if (_momentumRafId) {
      cancelAnimationFrame(_momentumRafId);
      _momentumRafId = null;
    }
    setPosition(_initialX, _initialY);
  }

  function destroy(): void {
    if (_momentumRafId) cancelAnimationFrame(_momentumRafId);
    hideGhost();
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
    if (originalPosition === "static") {
      target.style.removeProperty("position");
    }
    target.classList.remove("dragging");
  }

  return {
    target,
    getPosition, setPosition,
    enable, disable, isDragging,
    reset, destroy,
  };
}
