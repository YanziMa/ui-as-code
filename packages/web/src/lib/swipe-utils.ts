/**
 * Swipe Utilities: Dedicated swipe detection with directional handlers,
 * edge swipes, swipe-to-dismiss, swipeable cards/carousels, swipe
 * thresholds per direction, velocity-based vs distance-based detection,
 * and swipe gesture state machine.
 */

// --- Types ---

export type SwipeDirection = "up" | "down" | "left" | "right";
export type SwipeEdge = "left" | "right" | "top" | "bottom";

export interface SwipeConfig {
  /** Minimum horizontal distance for a horizontal swipe (px) */
  minHorizontalDistance?: number;
  /** Minimum vertical distance for a vertical swipe (px) */
  minVerticalDistance?: number;
  /** Maximum time for a valid swipe (ms) */
  maxDuration?: number;
  /** Minimum velocity (px/ms) */
  minVelocity?: number;
  /** Maximum angle deviation from axis (degrees). Default 30 */
  maxAngleDeviation?: number;
  /** Enable edge swipes */
  enableEdgeSwipes?: boolean;
  /** Edge threshold in px — how close to edge must start */
  edgeThreshold?: number;
  /** Which edges to detect */
  edges?: SwipeEdge[];
  /** Prevent default on touch. Default true */
  preventDefault?: boolean;
  /** Touch action CSS value */
  touchAction?: string;
}

export interface SwipeHandlers {
  onSwipeUp?: (data: SwipeData) => void;
  onSwipeDown?: (data: SwipeData) => void;
  onSwipeLeft?: (data: SwipeData) => void;
  onSwipeRight?: (data: SwipeData) => void;
  onEdgeSwipe?: (edge: SwipeEdge, data: SwipeData) => void;
  onSwipeStart?: () => void;
  onSwipeMove?: (deltaX: number, deltaY: number) => void;
  onSwipeEnd?: (wasSwipe: boolean) => void;
  onSwipeCancel?: () => void;
}

export interface SwipeData {
  direction: SwipeDirection;
  deltaX: number;
  deltaY: number;
  distance: number;
  duration: number;
  velocity: { x: number; y: number };
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
}

export interface SwipeToDismissOptions {
  /** Element to make swipe-to-dismiss */
  target: HTMLElement;
  /** Dismiss direction(s) */
  direction?: "left" | "right" | "up" | "down" | "horizontal" | "vertical";
  /** Threshold ratio (0-1) of element size to trigger dismiss */
  threshold?: number;
  /** Animation duration for dismiss (ms) */
  dismissDuration?: number;
  /** Animation easing */
  easing?: string;
  /** Snap back animation duration (ms) */
  snapBackDuration?: number;
  /** Opacity fade during drag */
  fadeOpacity?: boolean;
  /** Scale effect during drag */
  scaleEffect?: boolean;
  /** Background color revealed behind */
  revealBackground?: string;
  /** Called when dismissed */
  onDismiss?: (direction: SwipeDirection) => void;
  /** Called when snap-back occurs */
  onSnapBack?: () => void;
}

export interface SwipeToDismissInstance {
  /** The target element */
  el: HTMLElement;
  /** Programmatically dismiss */
  dismiss: (direction?: SwipeDirection) => void;
  /** Reset position */
  reset: () => void;
  /** Destroy */
  destroy: () => void;
}

export interface SwipeableCardOptions {
  /** Card container element */
  container: HTMLElement;
  /** Cards inside the container */
  cards: HTMLElement[];
  /** Stack mode (cards stacked on top of each other) */
  stackMode?: boolean;
  /** Swipe threshold as fraction of card width/height */
  threshold?: number;
  /** Rotation during swipe (degrees) */
  rotationAmount?: number;
  /** Opacity at full swipe */
  endOpacity?: number;
  /** Called when a card is swiped away */
  onSwipeAway?: (card: HTMLElement, direction: SwipeDirection, index: number) => void;
  /** Called when all cards are gone */
  onEmpty?: () => void;
  /** Called on each move */
  onMove?: (card: HTMLElement, progress: number, direction: SwipeDirection) => void;
}

// --- Core Swipe Detector ---

/**
 * Create a dedicated swipe detector with per-direction handlers.
 *
 * @example
 * ```ts
 * const swiper = createSwipeDetector(element, {
 *   onSwipeLeft: (d) => console.log("Swiped left!", d.distance),
 *   onSwipeRight: (d) => console.log("Swiped right!"),
 *   enableEdgeSwipes: true,
 *   edges: ["left"],
 * });
 * ```
 */
export function createSwipeDetector(
  element: HTMLElement,
  handlers: SwipeHandlers = {},
  config: SwipeConfig = {},
): { destroy: () => void } {
  const {
    minHorizontalDistance = 50,
    minVerticalDistance = 50,
    maxDuration = 500,
    minVelocity = 0.3,
    maxAngleDeviation = 30,
    enableEdgeSwipes = false,
    edgeThreshold = 20,
    edges = ["left", "right"],
    preventDefault = true,
    touchAction = "none",
  } = config;

  let startX = 0, startY = 0;
  let startTime = 0;
  let currentX = 0, currentY = 0;
  let isTracking = false;
  let cleanupFns: Array<() => void> = [];

  // Apply touch action
  if (touchAction !== "auto") {
    element.style.touchAction = touchAction;
  }

  // Velocity samples
  const velocitySamples: Array<{ x: number; y: number; t: number }> = [];
  const MAX_SAMPLES = 5;

  function getVelocity(): { x: number; y: number } {
    if (velocitySamples.length < 2) return { x: 0, y: 0 };

    let sumVx = 0, sumVy = 0, count = 0;
    for (let i = 1; i < velocitySamples.length; i++) {
      const prev = velocitySamples[i - 1]!;
      const curr = velocitySamples[i]!;
      const dt = curr.t - prev.t;
      if (dt > 0) {
        sumVx += (curr.x - prev.x) / dt;
        sumVy += (curr.y - prev.y) / dt;
        count++;
      }
    }
    return count > 0 ? { x: sumVx / count, y: sumVy / count } : { x: 0, y: 0 };
  }

  function _detectDirection(dx: number, dy: number): SwipeDirection | null {
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < minHorizontalDistance && absDy < minVerticalDistance) return null;

    const angle = Math.atan2(absDy, absDx) * 180 / Math.PI;
    const isHorizontal = angle < (90 - maxAngleDeviation);

    if (isHorizontal) {
      return dx > 0 ? "right" : "left";
    } else {
      return dy > 0 ? "down" : "up";
    }
  }

  function _checkEdgeSwipe(startXPos: number, startYPos: number): SwipeEdge | null {
    if (!enableEdgeSwipes) return null;

    const w = window.innerWidth;
    const h = window.innerHeight;

    for (const edge of edges) {
      switch (edge) {
        case "left":
          if (startXPos < edgeThreshold) return "left";
          break;
        case "right":
          if (startXPos > w - edgeThreshold) return "right";
          break;
        case "top":
          if (startYPos < edgeThreshold) return "top";
          break;
        case "bottom":
          if (startYPos > h - edgeThreshold) return "bottom";
          break;
      }
    }

    return null;
  }

  function _handleStart(x: number, y: number): void {
    startX = x;
    startY = y;
    currentX = x;
    currentY = y;
    startTime = Date.now();
    isTracking = true;
    velocitySamples.length = 0;
    velocitySamples.push({ x, y, t: performance.now() });

    // Check edge swipe
    const edge = _checkEdgeSwipe(x, y);
    if (edge) {
      handlers.onEdgeSwipe?.(edge, {
        direction: "right", // Will be refined later
        deltaX: 0, deltaY: 0, distance: 0, duration: 0,
        velocity: { x: 0, y: 0 },
        startPoint: { x, y }, endPoint: { x, y },
      });
    }

    handlers.onSwipeStart?.();
  }

  function _handleMove(x: number, y: number): void {
    if (!isTracking) return;

    currentX = x;
    currentY = y;

    // Keep last N samples
    velocitySamples.push({ x, y, t: performance.now() });
    if (velocitySamples.length > MAX_SAMPLES) velocitySamples.shift();

    const dx = x - startX;
    const dy = y - startY;
    handlers.onSwipeMove?.(dx, dy);
  }

  function _handleEnd(): void {
    if (!isTracking) return;
    isTracking = false;

    const dx = currentX - startX;
    const dy = currentY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = Date.now() - startTime;
    const vel = getVelocity();
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);

    const direction = _detectDirection(dx, dy);

    if (
      direction &&
      dist >= (Math.abs(dx) >= Math.abs(dy) ? minHorizontalDistance : minVerticalDistance) &&
      duration <= maxDuration &&
      speed >= minVelocity
    ) {
      const data: SwipeData = {
        direction,
        deltaX: dx,
        deltaY: dy,
        distance: dist,
        duration,
        velocity: vel,
        startPoint: { x: startX, y: startY },
        endPoint: { x: currentX, y: currentY },
      };

      switch (direction) {
        case "up": handlers.onSwipeUp?.(data); break;
        case "down": handlers.onSwipeDown?.(data); break;
        case "left": handlers.onSwipeLeft?.(data); break;
        case "right": handlers.onSwipeRight?.(data); break;
      }

      handlers.onSwipeEnd?.(true);
    } else {
      handlers.onSwipeCancel?.();
      handlers.onSwipeEnd?.(false);
    }
  }

  // Touch events
  const onTouchStart = (e: TouchEvent) => {
    if (preventDefault && e.cancelable) e.preventDefault();
    const t = e.touches[0];
    if (t) _handleStart(t.clientX, t.clientY);
  };

  const onTouchMove = (e: TouchEvent) => {
    if (preventDefault && e.cancelable) e.preventDefault();
    const t = e.touches[0];
    if (t) _handleMove(t.clientX, t.clientY);
  };

  const onTouchEnd = () => _handleEnd();

  element.addEventListener("touchstart", onTouchStart, { passive: false });
  element.addEventListener("touchmove", onTouchMove, { passive: false });
  element.addEventListener("touchend", onTouchEnd);
  element.addEventListener("touchcancel", onTouchEnd);

  cleanupFns.push(
    () => element.removeEventListener("touchstart", onTouchStart),
    () => element.removeEventListener("touchmove", onTouchMove),
    () => element.removeEventListener("touchend", onTouchEnd),
    () => element.removeEventListener("touchcancel", onTouchEnd),
  );

  return {
    destroy: () => {
      for (const fn of cleanupFns) fn();
      cleanupFns = [];
      element.style.touchAction = "";
    },
  };
}

// --- Swipe to Dismiss ---

/**
 * Make an element dismissible by swiping.
 *
 * @example
 * ```ts
 * const dismiss = createSwipeToDismiss({
 *   target: notificationEl,
 *   direction: "horizontal",
 *   onDismiss: (dir) => console.log("Dismissed", dir),
 * });
 * ```
 */
export function createSwipeToDismiss(options: SwipeToDismissOptions): SwipeToDismissInstance {
  const {
    target,
    direction = "horizontal",
    threshold = 0.4,
    dismissDuration = 300,
    easing = "ease-out",
    snapBackDuration = 200,
    fadeOpacity = true,
    scaleEffect = false,
    revealBackground = "#fee2e2",
    onDismiss,
    onSnapBack,
  } = options;

  let isDragging = false;
  let startX = 0, startY = 0;
  let currentTranslateX = 0, currentTranslateY = 0;
  let cleanupFns: Array<() => void> = [];

  // Reveal layer
  const reveal = document.createElement("div");
  reveal.className = "swipe-reveal-bg";
  reveal.style.cssText =
    `position:absolute;inset:0;background:${revealBackground};border-radius:inherit;` +
    "pointer-events:none;z-index:-1;";
  target.style.position = "relative";
  target.insertBefore(reveal, target.firstChild);

  function _getThresholdPx(): number {
    const rect = target.getBoundingClientRect();
    if (direction === "horizontal" || direction === "left" || direction === "right") {
      return rect.width * threshold;
    }
    return rect.height * threshold;
  }

  function _isOverThreshold(): boolean {
    const thresh = _getThresholdPx();
    if (direction === "horizontal") return Math.abs(currentTranslateX) >= thresh;
    if (direction === "vertical") return Math.abs(currentTranslateY) >= thresh;
    if (direction === "left" || direction === "right") {
      return direction === "right"
        ? currentTranslateX >= thresh
        : currentTranslateX <= -thresh;
    }
    if (direction === "up" || direction === "down") {
      return direction === "down"
        ? currentTranslateY >= thresh
        : currentTranslateY <= -thresh;
    }
    return false;
  }

  function _applyTransform(tx: number, ty: number): void {
    currentTranslateX = tx;
    currentTranslateY = ty;

    let transform = `translate(${tx}px, ${ty}px)`;
    if (scaleEffect) {
      const progress = Math.min(Math.abs(tx) / _getThresholdPx(), 1);
      const scale = 1 - progress * 0.1;
      transform += ` scale(${scale})`;
    }

    target.style.transform = transform;
    target.style.transition = "none";

    if (fadeOpacity) {
      const progress = Math.min(
        (Math.abs(tx) + Math.abs(ty)) / (_getThresholdPx() * 2),
        1,
      );
      target.style.opacity = String(1 - progress * 0.6);
    }

    // Rotation for horizontal swipes
    if (direction === "horizontal" || direction === "left" || direction === "right") {
      const rotation = tx * 0.05;
      target.style.transform = `${transform} rotate(${rotation}deg)`;
    }
  }

  function _snapBack(): void {
    target.style.transition = `transform ${snapBackDuration}ms ${easing}, opacity ${snapBackDuration}ms ${easing}`;
    target.style.transform = "";
    target.style.opacity = "";
    onSnapBack?.();

    setTimeout(() => {
      target.style.transition = "";
    }, snapBackDuration);
  }

  function _dismiss(): void {
    const dir: SwipeDirection =
      currentTranslateX > 10 ? "right"
      : currentTranslateX < -10 ? "left"
      : currentTranslateY > 10 ? "down" : "up";

    const outX = dir === "right" ? window.innerWidth : dir === "left" ? -window.innerWidth : 0;
    const outY = dir === "down" ? window.innerHeight : dir === "up" ? -window.innerHeight : 0;

    target.style.transition = `transform ${dismissDuration}ms ${easing}, opacity ${dismissDuration}ms ${easing}`;
    target.style.transform = `translate(${outX}px, ${outY}px)`;
    target.style.opacity = "0";

    setTimeout(() => {
      onDismiss?.(dir);
    }, dismissDuration);
  }

  // Event handlers
  const onStart = (clientX: number, clientY: number): void => {
    isDragging = true;
    startX = clientX;
    startY = clientY;
    target.style.transition = "none";
  };

  const onMove = (clientX: number, clientY: number): void => {
    if (!isDragging) return;

    let dx = clientX - startX + currentTranslateX;
    let dy = clientY - startY + currentTranslateY;

    // Constrain to allowed directions
    if (direction === "horizontal" || direction === "left" || direction === "right") {
      dy = 0;
      if (direction === "left" && dx > 0) dx *= 0.2; // Resistance
      if (direction === "right" && dx < 0) dx *= 0.2;
    } else if (direction === "vertical" || direction === "up" || direction === "down") {
      dx = 0;
      if (direction === "up" && dy > 0) dy *= 0.2;
      if (direction === "down" && dy < 0) dy *= 0.2;
    }

    _applyTransform(dx, dy);
  };

  const onEnd = (): void => {
    if (!isDragging) return;
    isDragging = false;

    if (_isOverThreshold()) {
      _dismiss();
    } else {
      // Reset starting point for next drag but keep current offset
      startX = 0;
      startY = 0;
      _snapBack();
      currentTranslateX = 0;
      currentTranslateY = 0;
    }
  };

  // Bind events
  const touchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    if (t) onStart(t.clientX, t.clientY);
  };
  const touchMove = (e: TouchEvent) => {
    const t = e.touches[0];
    if (t) onMove(t.clientX, t.clientY);
  };

  target.addEventListener("touchstart", touchStart, { passive: true });
  target.addEventListener("touchmove", touchMove, { passive: true });
  target.addEventListener("touchend", onEnd);
  target.addEventListener("mousedown", (e) => onStart(e.clientX, e.clientY));
  window.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY));
  window.addEventListener("mouseup", onEnd);

  cleanupFns.push(
    () => target.removeEventListener("touchstart", touchStart),
    () => target.removeEventListener("touchmove", touchMove),
    () => target.removeEventListener("touchend", onEnd),
    () => target.removeEventListener("mousedown", onStart as EventListener),
    () => window.removeEventListener("mousemove", onMove as EventListener),
    () => window.removeEventListener("mouseup", onEnd),
  );

  return {
    el: target,
    dismiss: (dir?: SwipeDirection) => {
      const outX = dir === "right" ? window.innerWidth : dir === "left" ? -window.innerWidth : 0;
      const outY = dir === "down" ? window.innerHeight : dir === "up" ? -window.innerHeight : 0;
      target.style.transition = `transform ${dismissDuration}ms ${easing}, opacity ${dismissDuration}ms ${easing}`;
      target.style.transform = `translate(${outX}px, ${outY}px)`;
      target.style.opacity = "0";
      setTimeout(() => onDismiss?.(dir ?? "right"), dismissDuration);
    },
    reset: () => {
      currentTranslateX = 0;
      currentTranslateY = 0;
      target.style.transform = "";
      target.style.opacity = "";
      target.style.transition = "";
    },
    destroy: () => {
      for (const fn of cleanupFns) fn();
      cleanupFns = [];
      reveal.remove();
    },
  };
}

// --- Swipeable Cards (Tinder-style) ---

/**
 * Create a stack of swipeable cards (Tinder-style).
 *
 * @example
 * ```ts
 * const deck = createSwipeableCards({
 *   container: document.getElementById('deck')!,
 *   cards: Array.from(document.querySelectorAll('.card')),
 *   onSwipeAway: (card, dir, idx) => console.log(`Card ${idx} swiped ${dir}`),
 * });
 * ```
 */
export function createSwipeableCards(options: SwipeableCardOptions): { destroy: () => void } {
  const {
    container,
    cards,
    stackMode = true,
    threshold = 0.3,
    rotationAmount = 15,
    endOpacity = 0.5,
    onSwipeAway,
    onEmpty,
    onMove,
  } = options;

  let activeCards = [...cards];
  let currentIndex = activeCards.length - 1;
  let isDragging = false;
  let startX = 0, startY = 0;
  let cleanupFns: Array<() => void> = [];

  function _getTopCard(): HTMLElement | undefined {
    return activeCards[currentIndex];
  }

  function _setupCard(card: HTMLElement, index: number): void {
    if (stackMode && index < activeCards.length - 1) {
      // Stack cards below with slight offset
      const offset = (activeCards.length - 1 - index) * 4;
      const scale = 1 - (activeCards.length - 1 - index) * 0.03;
      card.style.transform = `translateY(${offset}px) scale(${scale})`;
      card.style.zIndex = String(index + 1);
      card.style.opacity = index < activeCards.length - 3 ? "0" : "1";
    } else {
      card.style.zIndex = String(activeCards.length);
      card.style.transform = "";
      card.style.opacity = "1";
    }
  }

  function _updateStack(): void {
    activeCards.forEach((card, i) => _setupCard(card, i));
  }

  function _handleStart(x: number, y: number): void {
    const topCard = _getTopCard();
    if (!topCard) return;

    isDragging = true;
    startX = x;
    startY = y;
    topCard.style.transition = "none";
  }

  function _handleMove(x: number, y: number): void {
    if (!isDragging) return;
    const topCard = _getTopCard();
    if (!topCard) return;

    const dx = x - startX;
    const dy = y - startY;
    const rect = topCard.getBoundingClientRect();
    const maxDist = Math.max(rect.width, rect.height) * threshold;

    // Rotation based on position
    const rotation = (dx / rect.width) * rotationAmount;
    // Opacity based on progress
    const progress = Math.min(Math.abs(dx) / maxDist, 1);
    const opacity = 1 - progress * (1 - endOpacity);

    topCard.style.transform = `translate(${dx}px, ${dy}px) rotate(${rotation}deg)`;
    topCard.style.opacity = String(opacity);

    const dir: SwipeDirection = dx > 0 ? "right" : "left";
    onMove?.(topCard, dx > 0 ? progress : -progress, dir);
  }

  function _handleEnd(): void {
    if (!isDragging) return;
    isDragging = false;

    const topCard = _getTopCard();
    if (!topCard) return;

    const rect = topCard.getBoundingClientRect();
    const dx = parseFloat(topCard.style.transform.match(/translate\(([-\d.]+)px/)?.[1] ?? "0");
    const maxDist = rect.width * threshold;

    if (Math.abs(dx) >= maxDist) {
      // Swipe away
      const dir: SwipeDirection = dx > 0 ? "right" : "left";
      const outX = dx > 0 ? window.innerWidth * 1.5 : -window.innerWidth * 1.5;

      topCard.style.transition = "transform 300ms ease-out, opacity 300ms ease-out";
      topCard.style.transform = `translate(${outX}px, 0) rotate(${dx > 0 ? 30 : -30}deg)`;
      topCard.style.opacity = "0";

      setTimeout(() => {
        topCard.style.display = "none";
        activeCards.splice(currentIndex, 1);
        currentIndex = activeCards.length - 1;
        _updateStack();
        onSwipeAway?.(topCard, dir, currentIndex + 1);
        if (activeCards.length === 0) onEmpty?.();
      }, 300);
    } else {
      // Snap back
      topCard.style.transition = "transform 200ms ease-out, opacity 200ms ease-out";
      topCard.style.transform = "";
      topCard.style.opacity = "1";
    }
  }

  // Initial setup
  _updateStack();

  // Events
  const touchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    if (t) _handleStart(t.clientX, t.clientY);
  };
  const touchMove = (e: TouchEvent) => {
    const t = e.touches[0];
    if (t) _handleMove(t.clientX, t.clientY);
  };

  container.addEventListener("touchstart", touchStart, { passive: true });
  container.addEventListener("touchmove", touchMove, { passive: true });
  container.addEventListener("touchend", _handleEnd);
  container.addEventListener("mousedown", (e) => _handleStart(e.clientX, e.clientY));
  window.addEventListener("mousemove", (e) => _handleMove(e.clientX, e.clientY));
  window.addEventListener("mouseup", _handleEnd);

  cleanupFns.push(
    () => container.removeEventListener("touchstart", touchStart),
    () => container.removeEventListener("touchmove", touchMove),
    () => container.removeEventListener("touchend", _handleEnd),
    () => container.removeEventListener("mousedown", _handleStart as EventListener),
    () => window.removeEventListener("mousemove", _handleMove as EventListener),
    () => window.removeEventListener("mouseup", _handleEnd),
  );

  return {
    destroy: () => {
      for (const fn of cleanupFns) fn();
      cleanupFns = [];
    },
  };
}
