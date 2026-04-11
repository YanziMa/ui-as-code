/**
 * Mouse Utilities: Cursor position tracking, mouse state management,
 * click detection (single/double/triple/right), drag state tracking,
 * velocity calculation, element hover detection, custom cursors,
 * and mouse trail effects.
 */

// --- Types ---

export interface MousePosition {
  x: number;
  y: number;
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
  screenX: number;
  screenY: number;
  /** Position relative to target element */
  localX?: number;
  localY?: number;
  timestamp: number;
}

export interface MouseState {
  isDown: boolean;
  button: number;        // -1 = none, 0 = primary, 1 = auxiliary, 2 = secondary
  buttons: number;       // Bitmask of pressed buttons
  lastClickTime: number;
  clickCount: number;
  lastPosition: MousePosition | null;
  currentPosition: MousePosition | null;
  /** Pixels moved since last mousedown */
  dragDistance: number;
  /** Whether the current gesture qualifies as a drag */
  isDragging: boolean;
  /** Velocity in px/s (smoothed via EMA) */
  velocityX: number;
  velocityY: number;
}

export interface ClickOptions {
  /** Element to attach to. Default document */
  target?: HTMLElement | Document;
  /** Handler for single click */
  onClick?: (pos: MousePosition, event: MouseEvent) => void;
  /** Handler for double click */
  onDoubleClick?: (pos: MousePosition, event: MouseEvent) => void;
  /** Handler for triple click */
  onTripleClick?: (pos: MousePosition, event: MouseEvent) => void;
  /** Handler for right click / context menu */
  onRightClick?: (pos: MousePosition, event: MouseEvent) => void;
  /** Max delay between clicks for multi-click detection (ms). Default 300 */
  multiClickDelay?: number;
  /** Prevent default context menu on right click. Default true */
  preventContextMenu?: boolean;
}

export interface HoverOptions {
  /** Elements to watch */
  elements: HTMLElement[];
  /** Callback when mouse enters an element */
  onEnter?: (el: HTMLElement) => void;
  /** Callback when mouse leaves an element */
  onLeave?: (el: HTMLElement) => void;
  /** Polling interval for position check (ms). Default 50 */
  pollInterval?: number;
  /** Debounce enter/leave callbacks (ms). Default 0 */
  debounceMs?: number;
}

export interface TrailOptions {
  /** Container for trail particles. Default document.body */
  container?: HTMLElement;
  /** Number of particles in trail. Default 20 */
  length?: number;
  /** Particle size in px. Default 4 */
  size?: number;
  /** Color of particles. Default "#3b82f6" */
  color?: string;
  /** Fade duration per particle (ms). Default 500 */
  fadeDuration?: number;
  /** Shape: "circle" or "square". Default "circle" */
  shape?: "circle" | "square";
  /** Only show while mouse button held. Default false */
  onlyWhileDown?: boolean;
}

// --- Position Tracking ---

/**
 * Track mouse position with continuous updates.
 *
 * @example
 * ```ts
 * const tracker = trackMouse({ throttleMs: 16 });
 * tracker.onMove((pos) => console.log(pos.x, pos.y));
 * // Later: tracker.destroy();
 * ```
 */
export function trackMouse(options?: { target?: EventTarget; throttleMs?: number }): {
  getPosition: () => MousePosition | null;
  onMove: (fn: (pos: MousePosition) => void) => () => void;
  destroy: () => void;
} {
  const target = options?.target ?? document;
  const throttleMs = options?.throttleMs ?? 0;
  let pos: MousePosition | null = null;
  const moveListeners = new Set<(pos: MousePosition) => void>();
  let lastTime = 0;

  function update(e: MouseEvent): void {
    const now = performance.now();
    if (throttleMs > 0 && now - lastTime < throttleMs) return;
    lastTime = now;

    const el = e.target as HTMLElement | null;
    const rect = el?.getBoundingClientRect();

    pos = {
      x: e.pageX,
      y: e.pageY,
      clientX: e.clientX,
      clientY: e.clientY,
      pageX: e.pageX,
      pageY: e.pageY,
      screenX: e.screenX,
      screenY: e.screenY,
      localX: rect ? e.clientX - rect.left : undefined,
      localY: rect ? e.clientY - rect.top : undefined,
      timestamp: Date.now(),
    };

    for (const fn of moveListeners) fn(pos);
  }

  target.addEventListener("mousemove", update, { passive: true });

  return {
    getPosition: () => pos,
    onMove: (fn) => { moveListeners.add(fn); return () => moveListeners.delete(fn); },
    destroy: () => { target.removeEventListener("mousemove", update); moveListeners.clear(); },
  };
}

// --- State Tracker ---

/**
 * Track comprehensive mouse state including buttons, drag status, and velocity.
 */
export function trackMouseState(target: EventTarget = document): {
  getState: () => MouseState;
  onUpdate: (fn: (state: MouseState) => void) => () => void;
  destroy: () => void;
} {
  let state: MouseState = {
    isDown: false,
    button: -1,
    buttons: 0,
    lastClickTime: 0,
    clickCount: 0,
    lastPosition: null,
    currentPosition: null,
    dragDistance: 0,
    isDragging: false,
    velocityX: 0,
    velocityY: 0,
  };

  const listeners = new Set<(state: MouseState) => void>();
  let downPos: MousePosition | null = null;
  let lastPos: MousePosition | null = null;
  let lastPosTime = 0;
  const VELOCITY_SMOOTHING = 0.3; // EMA alpha
  const DRAG_THRESHOLD = 5; // px before considered a drag

  function getPos(e: MouseEvent): MousePosition {
    const el = e.target as HTMLElement | null;
    const rect = el?.getBoundingClientRect();
    return {
      x: e.pageX, y: e.pageY,
      clientX: e.clientX, clientY: e.clientY,
      pageX: e.pageX, pageY: e.pageY,
      screenX: e.screenX, screenY: e.screenY,
      localX: rect ? e.clientX - rect.left : undefined,
      localY: rect ? e.clientY - rect.top : undefined,
      timestamp: Date.now(),
    };
  }

  function emit(): void {
    for (const fn of listeners) fn(state);
  }

  function onMouseDown(e: MouseEvent): void {
    state.isDown = true;
    state.button = e.button;
    state.buttons = e.buttons;
    downPos = getPos(e);
    lastPos = downPos;
    state.lastPosition = downPos;
    state.currentPosition = downPos;
    state.dragDistance = 0;
    state.isDragging = false;
    state.velocityX = 0;
    state.velocityY = 0;
    lastPosTime = performance.now();
    emit();
  }

  function onMouseUp(e: MouseEvent): void {
    state.isDown = false;
    state.buttons = e.buttons;
    if (!state.isDragging && downPos) {
      // It was a click, not a drag
      const now = Date.now();
      if (now - state.lastClickTime < 300) {
        state.clickCount++;
      } else {
        state.clickCount = 1;
      }
      state.lastClickTime = now;
    }
    downPos = null;
    lastPos = null;
    emit();
  }

  function onMouseMove(e: MouseEvent): void {
    const pos = getPos(e);
    state.lastPosition = state.currentPosition;
    state.currentPosition = pos;

    if (state.isDown && downPos) {
      const dx = pos.clientX - downPos.clientX;
      const dy = pos.clientY - downPos.clientY;
      state.dragDistance = Math.sqrt(dx * dx + dy * dy);
      state.isDragging = state.dragDistance >= DRAG_THRESHOLD;

      // Calculate velocity
      if (lastPos) {
        const now = performance.now();
        const dt = (now - lastPosTime) / 1000;
        if (dt > 0) {
          const vx = (pos.clientX - lastPos.clientX) / dt;
          const vy = (pos.clientY - lastPos.clientY) / dt;
          state.velocityX = state.velocityX * (1 - VELOCITY_SMOOTHING) + vx * VELOCITY_SMOOTHING;
          state.velocityY = state.velocityY * (1 - VELOCITY_SMOOTHING) + vy * VELOCITY_SMOOTHING;
        }
        lastPosTime = now;
      }
      lastPos = pos;
    }

    emit();
  }

  target.addEventListener("mousedown", onMouseDown);
  target.addEventListener("mouseup", onMouseUp);
  target.addEventListener("mousemove", onMouseMove, { passive: true });

  return {
    getState: () => ({ ...state }),
    onUpdate: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    destroy: () => {
      target.removeEventListener("mousedown", onMouseDown);
      target.removeEventListener("mouseup", onMouseUp);
      target.removeEventListener("mousemove", onMouseMove);
      listeners.clear();
    },
  };
}

// --- Click Detection ---

/** Set up single/double/triple/right click handlers on an element */
export function setupClicks(options: ClickOptions): () => void {
  const {
    target = document,
    onClick,
    onDoubleClick,
    onTripleClick,
    onRightClick,
    multiClickDelay = 300,
    preventContextMenu = true,
  } = options;

  let clickTimes: number[] = [];
  let clickTimer: ReturnType<typeof setTimeout> | null = null;

  function handleClick(e: MouseEvent): void {
    if (e.button !== 0) return; // Only left clicks

    const now = Date.now();
    clickTimes.push(now);

    // Clear previous timer
    if (clickTimer) clearTimeout(clickTimer);

    // Trim old clicks
    clickTimes = clickTimes.filter((t) => now - t < multiClickDelay);

    const pos = extractPositionFromEvent(e);

    if (clickTimes.length >= 3 && onTripleClick) {
      onTripleClick(pos, e);
      clickTimes = [];
    } else if (clickTimes.length >= 2 && onDoubleClick) {
      onDoubleClick(pos, e);
    } else {
      // Wait to see if it becomes a double/triple click
      clickTimer = setTimeout(() => {
        if (onClick && clickTimes.length >= 1) {
          onClick(pos, e);
        }
        clickTimes = [];
      }, multiClickDelay);
    }
  }

  function handleContextMenu(e: MouseEvent): void {
    if (preventContextMenu) e.preventDefault();
    if (onRightClick) {
      onRightClick(extractPositionFromEvent(e), e);
    }
  }

  target.addEventListener("click", handleClick);
  target.addEventListener("contextmenu", handleContextMenu);

  return () => {
    target.removeEventListener("click", handleClick);
    target.removeEventListener("contextmenu", handleContextMenu);
    if (clickTimer) clearTimeout(clickTimer);
  };
}

// --- Hover Detection ---

/** Track which element(s) the mouse is hovering over from a set */
export function setupHoverDetection(options: HoverOptions): () => void {
  const { elements, onEnter, onLeave, pollInterval = 50, debounceMs = 0 } = options;
  let hoveredEl: HTMLElement | null = null;
  let enterTimer: ReturnType<typeof setTimeout> | null = null;
  let leaveTimer: ReturnType<typeof setTimeout> | null = null;
  let running = true;

  function check(): void {
    if (!running) return;
    // Find which element (if any) the mouse is over
    const current = elements.find((el) => {
      const rect = el.getBoundingClientRect();
      const pos = getLastKnownPosition();
      if (!pos) return false;
      return (
        pos.clientX >= rect.left &&
        pos.clientX <= rect.right &&
        pos.clientY >= rect.top &&
        pos.clientY <= rect.bottom
      );
    }) ?? null;

    if (current !== hoveredEl) {
      // Left previous element
      if (hoveredEl) {
        if (debounceMs > 0 && onLeave) {
          if (leaveTimer) clearTimeout(leaveTimer);
          leaveTimer = setTimeout(() => onLeave(hoveredEl!), debounceMs);
        } else {
          onLeave?.(hoveredEl!);
        }
      }

      hoveredEl = current;

      // Entered new element
      if (current) {
        if (debounceMs > 0 && onEnter) {
          if (enterTimer) clearTimeout(enterTimer);
          enterTimer = setTimeout(() => onEnter(current), debounceMs);
        } else {
          onEnter?.(current);
        }
      }
    }
  }

  // Track position
  const posTracker = trackMouse({ throttleMs: pollInterval });
  const intervalId = setInterval(check, pollInterval);

  return () => {
    running = false;
    clearInterval(intervalId);
    posTracker.destroy();
    if (enterTimer) clearTimeout(enterTimer);
    if (leaveTimer) clearTimeout(leaveTimer);
  };
}

// --- Mouse Trail ---

/** Create a visual mouse trail effect */
export function createMouseTrail(options: TrailOptions = {}): () => void {
  const {
    container = document.body,
    length = 20,
    size = 4,
    color = "#3b82f6",
    fadeDuration = 500,
    shape = "circle",
    onlyWhileDown = false,
  } = options;

  const particles: HTMLElement[] = [];
  let currentIndex = 0;
  let isDown = false;
  let cleanupFns: Array<() => void> = [];

  // Create particles
  for (let i = 0; i < length; i++) {
    const el = document.createElement("div");
    el.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 999999;
      width: ${size}px;
      height: ${size}px;
      ${shape === "circle" ? "border-radius: 50%" : ""}
      background: ${color};
      opacity: 0;
      transform: translate(-50%, -50%);
      transition: opacity ${fadeDuration}ms ease-out;
    `;
    container.appendChild(el);
    particles.push(el);
  }

  function onMouseMove(e: MouseEvent): void {
    if (onlyWhileDown && !isDown) return;

    const p = particles[currentIndex]!;
    p.style.left = `${e.clientX}px`;
    p.style.top = `${e.clientY}px`;
    p.style.opacity = "1";
    p.style.transition = "none";

    requestAnimationFrame(() => {
      p.style.transition = `opacity ${fadeDuration}ms ease-out`;
      p.style.opacity = "0";
    });

    currentIndex = (currentIndex + 1) % length;
  }

  function onMouseDown(): void { isDown = true; }
  function onMouseUp(): void { isDown = false; }

  document.addEventListener("mousemove", onMouseMove, { passive: true });
  document.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mouseup", onMouseUp);

  cleanupFns.push(
    () => document.removeEventListener("mousemove", onMouseMove),
    () => document.removeEventListener("mousedown", onMouseDown),
    () => document.removeEventListener("mouseup", onMouseUp),
  );

  return () => {
    for (const fn of cleanupFns) fn();
    for (const p of particles) p.remove();
  };
}

// --- Utility Functions ---

let _lastKnownPos: MousePosition | null = null;

document.addEventListener("mousemove", (e) => {
  _lastKnownPos = extractPositionFromEvent(e);
}, { passive: true });

/** Get the most recently known mouse position */
function getLastKnownPosition(): MousePosition | null {
  return _lastKnownPos;
}

/** Extract position from any mouse event */
export function extractPositionFromEvent(e: MouseEvent): MousePosition {
  const el = e.target as HTMLElement | null;
  const rect = el?.getBoundingClientRect();
  return {
    x: e.pageX,
    y: e.pageY,
    clientX: e.clientX,
    clientY: e.clientY,
    pageX: e.pageX,
    pageY: e.pageY,
    screenX: e.screenX,
    screenY: e.screenY,
    localX: rect ? e.clientX - rect.left : undefined,
    localY: rect ? e.clientY - rect.top : undefined,
    timestamp: Date.now(),
  };
}

/** Check if point is inside an element's bounds */
export function isInsideElement(x: number, y: number, el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

/** Get the element under the mouse at given coordinates */
export function getElementAtPosition(x: number, y: number): Element | null {
  // Hide any potential mouse trail elements temporarily
  return document.elementFromPoint(x, y);
}

/** Check if the left mouse button is currently pressed */
export function isMouseDown(): boolean {
  return typeof (globalThis as unknown as { mouseDown?: boolean }).mouseDown !== "undefined"
    ? (globalThis as unknown as { mouseDown: boolean }).mouseDown
    : false;
}

/** Distance between two mouse positions */
export function mouseDistance(a: MousePosition, b: MousePosition): number {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}
