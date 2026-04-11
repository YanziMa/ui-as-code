/**
 * Animate-on-Scroll Utilities: Trigger CSS animations when elements enter
 * the viewport, with staggered delays, direction variants, repeat modes,
 * custom easing, and callback hooks.
 */

// --- Types ---

export type AnimationDirection = "up" | "down" | "left" | "right" | "fade" | "scale" | "flip";
export type AnimationEasing = "ease" | "ease-in" | "ease-out" | "ease-in-out" | "cubic-bezier";

export interface AnimateTarget {
  /** Element to animate */
  el: HTMLElement;
  /** Animation type/direction */
  direction?: AnimationDirection;
  /** Duration in ms. Default 600 */
  duration?: number;
  /** Delay before animation starts (ms). Default 0 */
  delay?: number;
  /** Stagger delay if part of group (ms). Applied after base delay */
  stagger?: number;
  /** Distance to translate (px). Default 30 */
  distance?: number;
  /** Scale value for scale/flip animations. Default 0.9 */
  scale?: number;
  /** Opacity at start. Default 0 */
  fromOpacity?: number;
  /** Custom easing */
  easing?: AnimationEasing;
  /** Only animate once? Default true */
  once?: boolean;
  /** Threshold for IO trigger (0-1). Default 0.15 */
  threshold?: number;
  /** Root margin offset (px). Default "0px" */
  rootMargin?: string;
  /** Custom class added during animation */
  className?: string;
  /** Called when animation triggers */
  onEnter?: (el: HTMLElement) => void;
  /** Called when animation completes */
  onComplete?: (el: HTMLElement) => void;
}

export interface AnimateOnScrollOptions {
  /** Targets to animate */
  targets: AnimateTarget[];
  /** Global default direction. Default "up" */
  defaultDirection?: AnimationDirection;
  /** Global default duration (ms). Default 600 */
  defaultDuration?: number;
  /** Global default easing. Default "ease-out" */
  defaultEasing?: AnimationEasing;
  /** Global default distance (px). Default 30 */
  defaultDistance?: number;
  /** Global default threshold. Default 0.15 */
  threshold?: number;
  /** Global root margin. Default "0px 0px -50px 0px" */
  rootMargin?: string;
  /** Enable/disable globally. Default true */
  enabled?: boolean;
  /** Respect prefers-reduced-motion? Default true */
  respectReducedMotion?: boolean;
  /** Called when any animation starts */
  onStart?: (el: HTMLElement, index: number) => void;
  /** Called when any animation completes */
  onAllComplete?: () => void;
}

export interface AnimateOnScrollInstance {
  /** Trigger animation for a specific target */
  trigger: (index: number) => void;
  /** Trigger all animations */
  triggerAll: () => void;
  /** Reset all targets to initial state */
  reset: () => void;
  /** Reset a specific target */
  resetOne: (index: number) => void;
  /** Add a target dynamically */
  addTarget: (target: AnimateTarget) => number;
  /** Remove a target */
  removeTarget: (index: number) => void;
  /** Update global enabled state */
  setEnabled: (enabled: boolean) => void;
  /** Refresh / re-observe */
  refresh: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Direction Initial Styles ---

function getInitialStyles(direction: AnimationDistance, dist: number, scaleVal: number, opacity: number): Record<string, string> {
  switch (direction) {
    case "up":
      return { transform: `translateY(${dist}px)`, opacity: String(opacity) };
    case "down":
      return { transform: `translateY(-${dist}px)`, opacity: String(opacity) };
    case "left":
      return { transform: `translateX(${dist}px)`, opacity: String(opacity) };
    case "right":
      return { transform: `translateX(-${dist}px)`, opacity: String(opacity) };
    case "scale":
      return { transform: `scale(${scaleVal})`, opacity: String(opacity) };
    case "flip":
      return { transform: `perspective(400px) rotateX(10deg) scale(${scaleVal})`, opacity: String(opacity) };
    case "fade":
    default:
      return { opacity: String(opacity) };
  }
}

type AnimationDistance = AnimationDirection;

// --- Core Factory ---

/**
 * Create scroll-triggered animations for elements.
 *
 * @example
 * ```ts
 * const anim = createAnimateOnScroll({
 *   targets: [
 *     { el: card1, direction: "up", stagger: 100 },
 *     { el: card2, direction: "up", stagger: 200 },
 *     { el: card3, direction: "up", stagger: 300 },
 *   ],
 *   defaultDuration: 700,
 * });
 * ```
 */
export function createAnimateOnScroll(options: AnimateOnScrollOptions): AnimateOnScrollInstance {
  const {
    targets,
    defaultDirection = "up",
    defaultDuration = 600,
    defaultEasing = "ease-out",
    defaultDistance = 30,
    threshold = 0.15,
    rootMargin = "0px 0px -50px 0px",
    enabled = true,
    respectReducedMotion = true,
    onStart,
    onAllComplete,
  } = options;

  let _targets = [...targets];
  let _enabled = enabled;
  let _completedCount = 0;
  let observer: IntersectionObserver | null = null;
  const cleanupFns: Array<() => void> = [];
  const _animatedFlags = new Set<number>();

  // Check reduced motion preference
  function shouldReduceMotion(): boolean {
    if (!respectReducedMotion) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // Apply initial hidden state
  function applyInitialState(target: AnimateTarget, index: number): void {
    const dir = target.direction ?? defaultDirection;
    const dur = target.duration ?? defaultDuration;
    const dist = target.distance ?? defaultDistance;
    const scaleVal = target.scale ?? 0.9;
    const fromOp = target.fromOpacity ?? 0;
    const eas = target.easing ?? defaultEasing;

    const initial = getInitialStyles(dir, dist, scaleVal, fromOp);
    const el = target.el;

    // Save original transition
    const origTransition = el.style.transition || "";

    // Set initial state
    Object.assign(el.style, {
      ...initial,
      transition: "none",
    });

    // Store metadata for later restoration
    el.dataset.animIndex = String(index);
    el.dataset.animOrigTransition = origTransition;
    el.dataset.animDuration = String(dur);
    el.dataset.animEasing = eas;
    el.dataset.animDirection = dir;
    el.dataset.animOnce = String(target.once ?? true);

    if (target.className) el.classList.add(target.className);
  }

  // Trigger animation on an element
  function animateElement(target: AnimateTarget, index: number): void {
    const el = target.el;
    const dur = target.duration ?? defaultDuration;
    const delay = (target.delay ?? 0) + (target.stagger ?? 0);
    const eas = target.easing ?? defaultEasing;

    if (shouldReduceMotion()) {
      // Skip animation, just show
      el.style.opacity = "1";
      el.style.transform = "";
      target.onComplete?.(el);
      _completedCount++;
      checkAllComplete();
      return;
    }

    target.onEnter?.(el);
    onStart?.(el, index);

    // Apply final styles with transition
    requestAnimationFrame(() => {
      setTimeout(() => {
        el.style.transition = `transform ${dur}ms ${eas}, opacity ${dur}ms ${eas}`;
        el.style.transform = "";
        el.style.opacity = "1";

        const handleEnd = () => {
          el.removeEventListener("transitionend", handleEnd);
          // Clean up inline transition if desired
          target.onComplete?.(el);
          _completedCount++;
          checkAllComplete();
        };

        el.addEventListener("transitionend", handleEnd);

        // Fallback timeout in case transitionend doesn't fire
        setTimeout(handleEnd, dur + delay + 100);
      }, delay);
    });

    _animatedFlags.add(index);
  }

  function checkAllComplete(): void {
    const allOnceTargets = _targets.filter((t) => t.once !== false);
    if (_completedCount >= allOnceTargets.length) {
      onAllComplete?.();
    }
  }

  // Setup IntersectionObserver
  function setupObserver(): void {
    if (typeof IntersectionObserver === "undefined") {
      // Fallback: trigger all immediately
      triggerAll();
      return;
    }

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || !_enabled) return;

          const idx = _targets.findIndex((t) => t.el === entry.target);
          if (idx < 0) return;

          const target = _targets[idx]!;

          // If once mode and already animated, skip
          if (target.once !== false && _animatedFlags.has(idx)) return;

          animateElement(target, idx);

          // Unobserve if once-only
          if (target.once !== false) {
            observer?.unobserve(entry.target);
          }
        });
      },
      { threshold: [threshold], rootMargin },
    );

    _targets.forEach((t) => applyInitialState(t, _targets.indexOf(t)));
    _targets.forEach((t) => observer!.observe(t.el));
  }

  // --- API ---

  function trigger(index: number): void {
    const target = _targets[index];
    if (!target) return;
    animateElement(target, index);
  }

  function triggerAll(): void {
    _targets.forEach((t, i) => animateElement(t, i));
  }

  function resetOne(index: number): void {
    const target = _targets[index];
    if (!target) return;
    _animatedFlags.delete(index);
    applyInitialState(target, index);
  }

  function reset(): void {
    _completedCount = 0;
    _animatedFlags.clear();
    _targets.forEach((t, i) => resetOne(i));
  }

  function addTarget(target: AnimateTarget): number {
    const index = _targets.length;
    _targets.push(target);
    applyInitialState(target, index);
    if (observer) observer.observe(target.el);
    return index;
  }

  function removeTarget(index: number): void {
    if (index < 0 || index >= _targets.length) return;
    if (observer) observer.unobserve(_targets[index]!.el);
    _targets.splice(index, 1);
    _animatedFlags.delete(index);
  }

  function setEnabled(en: boolean): void { _enabled = en; }

  function refresh(): void {
    if (observer) observer.disconnect();
    reset();
    setupObserver();
  }

  function destroy(): void {
    if (observer) observer.disconnect();
    observer = null;
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
    // Restore elements
    _targets.forEach((t) => {
      const el = t.el;
      delete el.dataset.animIndex;
      delete el.dataset.animOrigTransition;
      delete el.dataset.animDuration;
      delete el.dataset.animEasing;
      delete el.dataset.animDirection;
      delete el.datasetAnimOnce;
      el.style.transition = el.dataset.animOrigTransition ?? "";
    });
  }

  // Init
  setupObserver();

  return { trigger, triggerAll, reset, resetOne, addTarget, removeTarget, setEnabled, refresh, destroy };
}
