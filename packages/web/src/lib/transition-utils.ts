/**
 * Transition Utilities: CSS transition orchestration, state machine transitions,
 * class-based transitions, staggered enter/leave, FLIP animation technique,
 * transition groups, and layout transition helpers.
 */

// --- Types ---

export type EasingFunction = (t: number) => number;

export interface TransitionOptions {
  /** Duration in milliseconds */
  duration?: number;
  /** Easing function or CSS easing string */
  easing?: EasingFunction | string;
  /** Delay before start (ms) */
  delay?: number;
  /** Callback when transition starts */
  onStart?: () => void;
  /** Callback when transition ends */
  onEnd?: () => void;
  /** CSS properties to transition */
  properties?: string[];
  /** Whether to use GPU layer promotion */
  gpuAccelerated?: boolean;
}

export interface ClassTransitionConfig {
  /** Element to animate */
  element: HTMLElement;
  /** Classes to add for the "entering" state */
  enterClass?: string;
  /** Classes for the "active" state */
  activeClass?: string;
  /** Classes for the "leaving" state */
  leaveClass?: string;
  /** Transition options */
  transition?: TransitionOptions;
  /** Auto-remove after leave? Default true */
  autoRemove?: boolean;
}

export interface TransitionGroupOptions {
  /** Container element */
  container: HTMLElement;
  /** Key extractor for children */
  getKey: (el: HTMLElement) => string | number;
  /** Enter transition config per item */
  enterTransition?: Partial<ClassTransitionConfig>;
  /** Leave transition config per item */
  leaveTransition?: Partial<ClassTransitionConfig>;
  /** Move/swap transition config */
  moveTransition?: Partial<ClassTransitionConfig>;
  /** Stagger delay between items (ms) */
  staggerDelay?: number;
  /** Called after all transitions complete */
  onComplete?: () => void;
}

// --- Built-in Easing Functions ---

export const easings: Record<string, EasingFunction> = {
  linear: (t: number) => t,
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => t * (2 - t),
  inOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  inCubic: (t: number) => t ** 3,
  outCubic: (t: number) => (--t) * t * t + 1,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t ** 3 : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  inQuart: (t: number) => t ** 4,
  outQuart: (t: number) => 1 - (--t) ** 4,
  inOutQuart: (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - 8 * (--t) ** 4),
  inExpo: (t: number) => t === 0 ? 0 : 10 ** (10 * (t - 1)),
  outExpo: (t: number) => t === 1 ? 1 : 1 - 10 ** (-10 * t),
  inOutExpo: (t: number) => {
    if (t === 0 || t === 1) return t;
    return t < 0.5 ? 0.5 * 10 ** (20 * t - 10) : 1 - 0.5 * 10 ** (-20 * t + 10);
  },
  inBack: (t: number) => { const s = 1.70158; return t * t * ((s + 1) * t - s); },
  outBack: (t: number) => { const s = 1.70158; return --t * t * ((s + 1) * t + s) + 1; },
  inOutBack: (t: number) => {
    const s = 1.70158 * 1.525;
    return ((t *= 2) < 1 ? t * t * ((s + 1) * t - s) * 0.5 : ((t -= 2) * t * ((s + 1) * t + s) + 2) * 0.5);
  },
  inElastic: (t: number) => t === 0 || t === 1 ? t : -(2 ** (10 * (t - 1))) * Math.sin((t - 1.075) * (2 * Math.PI) / 3),
  outElastic: (t: number) => t === 0 || t === 1 ? t : 2 ** (-10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 3) + 1,
  inOutElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    const p = 0.45;
    return t < 0.5
      ? -(2 ** (20 * t - 10)) * Math.sin((20 * t - 11.125) * (2 * Math.PI) / 4.5) / 2
      : (2 ** (-20 * t + 10) * Math.sin((20 * t - 11.125) * (2 * Math.PI) / 4.5)) / 2 + 1;
  },
  outBounce: (t: number) => {
    if (t < 1 / 2.75) { return 7.5625 * t * t; }
    if (t < 2 / 2.75) { return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75; }
    if (t < 2.5 / 2.75) { return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375; }
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
};

// --- CSS Transition Helper ---

/**
 * Apply a CSS transition to an element and get a promise that resolves when done.
 */
export function cssTransition(
  element: HTMLElement,
  targetStyles: Partial<CSSStyleDeclaration>,
  options: TransitionOptions = {},
): Promise<void> {
  const {
    duration = 300,
    easing = easings.outQuad,
    delay = 0,
    onStart,
    onEnd,
    properties,
    gpuAccelerated = false,
  } = options;

  return new Promise((resolve) => {
    // Capture initial styles
    const initialStyles: Record<string, string> = {};
    const propList = properties ?? Object.keys(targetStyles);

    // Set up transition
    const easingStr = typeof easing === "string" ? easing : "";
    const durationStr = `${duration}ms`;
    const delayStr = `${delay}ms`;

    if (propList.length > 0) {
      element.style.transitionProperty = propList.join(", ");
    }
    element.style.transitionDuration = durationStr;
    element.style.transitionTimingFunction = easingStr || (typeof easing === "function" ? "linear" : String(easing));
    element.style.transitionDelay = delayStr;

    if (gpuAccelerated) {
      element.style.willChange = "transform, opacity";
      element.style.transform = element.style.transform || "translateZ(0)";
    }

    // Store initial values
    for (const prop of propList) {
      initialStyles[prop] = getComputedStyle(element)[prop as keyof CSSStyleDeclaration] as string;
    }

    onStart?.();

    // Apply target styles
    Object.assign(element.style, targetStyles);

    // Listen for transitionend
    const onEndHandler = (e: TransitionEvent) => {
      if (e.target !== element) return;
      element.removeEventListener("transitionend", onEndHandler);

      // Clean up
      element.style.transitionProperty = "";
      element.style.transitionDuration = "";
      element.style.transitionTimingFunction = "";
      element.style.transitionDelay = "";

      if (gpuAccelerated) {
        element.style.willChange = "";
        if (element.style.transform === "translateZ(0)") element.style.transform = "";
      }

      onEnd?.();
      resolve();
    };

    element.addEventListener("transitionend", onEndHandler);

    // Fallback timeout
    setTimeout(() => {
      element.removeEventListener("transitionend", onEndHandler);
      onEnd?.();
      resolve();
    }, duration + delay + 100);
  });
}

/** Animate opacity from current value to target */
export function fadeTo(
  element: HTMLElement,
  targetOpacity: number,
  duration = 300,
): Promise<void> {
  return cssTransition(element, { opacity: String(targetOpacity) }, { duration });
}

/** Fade in an element */
export function fadeIn(element: HTMLElement, duration = 300): Promise<void> {
  element.style.opacity = "0";
  element.style.display = "";
  return fadeTo(element, 1, duration);
}

/** Fade out an element */
export async function fadeOut(element: HTMLElement, duration = 300): Promise<void> {
  await fadeTo(element, 0, duration);
  element.style.display = "none";
}

/** Slide an element by delta Y */
export function slideBy(
  element: HTMLElement,
  deltaY: number,
  duration = 300,
  easing: EasingFunction | string = easings.outQuad,
): Promise<void> {
  return cssTransition(
    element,
    { transform: `translateY(${deltaY}px)` },
    { duration, easing },
  );
}

// --- Class-based Transitions ---

/**
 * Run a class-based enter/active/leave transition sequence.
 */
export function runClassTransition(config: ClassTransitionConfig): Promise<void> {
  const {
    element,
    enterClass = "transition-enter",
    activeClass = "transition-active",
    leaveClass = "transition-leave",
    transition = {},
    autoRemove = false,
  } = config;

  return new Promise((resolve) => {
    // Phase 1: Add enter class
    element.classList.add(enterClass);
    requestAnimationFrame(() => {
      // Phase 2: Add active class (triggers transition)
      element.classList.remove(enterClass);
      element.classList.add(activeClass);

      const duration = transition.duration ?? 300;

      const handler = () => {
        element.removeEventListener("transitionend", handler);
        resolve();
      };
      element.addEventListener("transitionend", handler);

      // Timeout fallback
      setTimeout(handler, duration + 50);
    });
  });
}

/**
 * Run a leave transition with optional removal.
 */
export function runLeaveTransition(config: ClassTransitionConfig): Promise<void> {
  const {
    element,
    leaveClass = "transition-leave",
    activeClass = "transition-active",
    transition = {},
    autoRemove = true,
  } = config;

  return new Promise((resolve) => {
    element.classList.add(activeClass);
    element.classList.add(leaveClass);

    // Force reflow so browser registers the class addition
    void element.offsetHeight;

    element.classList.remove(activeClass);

    const duration = transition.duration ?? 300;

    const handler = () => {
      element.removeEventListener("transitionend", handler);
      element.classList.remove(leaveClass);
      if (autoRemove) element.remove();
      resolve();
    };

    element.addEventListener("transitionend", handler);
    setTimeout(handler, duration + 50);
  });
}

// --- FLIP Technique (First, Last, Invert, Play) ---

/**
 * FLIP animation: measure element position before DOM change,
 * apply change, then animate from old position to new.
 *
 * @example
 * ```ts
 * await flip(itemEl, () => {
 *   // Move item to new position in DOM
 *   container.insertBefore(itemEl, newSibling);
 * });
 * ```
 */
export async function flip(
  element: HTMLElement,
  mutate: () => void,
  options: TransitionOptions & { absolute?: boolean } = {},
): Promise<void> {
  const { absolute = true, ...transitionOpts } = options;

  // First: record position
  const first = element.getBoundingClientRect();

  // Apply mutation
  mutate();

  // Last: record new position
  const last = element.getBoundingClientRect();

  // Invert: calculate delta
  const deltaX = first.left - last.left;
  const deltaY = first.top - last.top;
  const deltaW = first.width / last.width;
  const deltaH = first.height / last.height;

  if (absolute) {
    element.style.position = "absolute";
    element.style.top = `${first.top}px`;
    element.style.left = `${first.left}px`;
    element.style.width = `${first.width}px`;
    element.style.height = `${first.height}px`;
    element.style.margin = "0";
  }

  // Play: animate to natural position
  const transforms: string[] = [];
  if (!absolute && (deltaX !== 0 || deltaY !== 0)) {
    transforms.push(`translate(${deltaX}px, ${deltaY}px)`);
  }
  if (Math.abs(deltaW - 1) > 0.01) transforms.push(`scaleX(${deltaW})`);
  if (Math.abs(deltaH - 1) > 0.01) transforms.push(`scaleY(${deltaH})`);

  if (transforms.length > 0) {
    await cssTransition(
      element,
      { transform: transforms.join(" "), position: "", top: "", left: "", width: "", height: "", margin: "" },
      transitionOpts,
    );
  }

  // Clean up
  element.style.position = "";
  element.style.top = "";
  element.style.left = "";
  element.style.width = "";
  element.style.height = "";
  element.style.transform = "";
  element.style.margin = "";
}

// --- Staggered Transitions ---

/**
 * Stagger enter animations across multiple elements.
 */
export function staggerEnter(
  elements: HTMLElement[],
  config: {
    enterClass?: string;
    activeClass?: string;
    staggerDelay?: number;
    duration?: number;
  } = {},
): Promise<void[]> {
  const {
    enterClass = "stagger-enter",
    activeClass = "stagger-active",
    staggerDelay = 50,
    duration = 300,
  } = config;

  // Initial state: hide all
  for (const el of elements) {
    el.classList.add(enterClass);
    el.style.opacity = "0";
  }

  return Promise.all(
    elements.map((el, i) =>
      new Promise<void>((resolve) => {
        setTimeout(() => {
          el.classList.remove(enterClass);
          el.classList.add(activeClass);
          el.style.opacity = "1";
          el.style.transition = `opacity ${duration}ms ease-out`;

          setTimeout(resolve, duration);
        }, i * staggerDelay);
      }),
    ),
  );
}

/**
 * Stagger leave animations across multiple elements (reversed order).
 */
export function staggerLeave(
  elements: HTMLElement[],
  config: {
    leaveClass?: string;
    activeClass?: string;
    staggerDelay?: number;
    duration?: number;
    removeAfter?: boolean;
  } = {},
): Promise<void[]> {
  const {
    leaveClass = "stagger-leave",
    activeClass = "stagger-active",
    staggerDelay = 50,
    duration = 300,
    removeAfter = true,
  } = config;

  const reversed = [...elements].reverse();

  return Promise.all(
    reversed.map((el, i) =>
      new Promise<void>((resolve) => {
        setTimeout(() => {
          el.classList.add(activeClass, leaveClass);

          setTimeout(() => {
            el.classList.remove(activeClass, leaveClass);
            el.style.opacity = "0";
            if (removeAfter) el.remove();
            resolve();
          }, duration);
        }, i * staggerDelay);
      }),
    ),
  );
}

// --- Transition Group ---

/**
 * Manage enter/leave/move transitions for a group of child elements.
 */
export function createTransitionGroup(options: TransitionGroupOptions): { destroy: () => void } {
  const { container, getKey, staggerDelay = 0, onComplete } = options;
  const activeKeys = new Set<string | number>();
  const cleanupFns: Array<() => void> = [];

  /** Add a new child element with enter animation */
  function addElement(el: HTMLElement): void {
    const key = getKey(el);
    if (activeKeys.has(key)) return;
    activeKeys.add(key);

    const cfg = options.enterTransition ?? {};
    const delay = Array.from(activeKeys).length * (staggerDelay ?? 0);

    el.style.opacity = "0";
    container.appendChild(el);

    requestAnimationFrame(() => {
      el.style.transition = `opacity ${(cfg.transition?.duration ?? 200)}ms ease-out`;
      el.style.transitionDelay = `${delay}ms`;
      el.style.opacity = "1";

      if (cfg.enterClass) el.classList.add(cfg.enterClass);
      requestAnimationFrame(() => {
        if (cfg.enterClass) el.classList.remove(cfg.enterClass);
        if (cfg.activeClass) el.classList.add(cfg.activeClass);
      });
    });
  }

  /** Remove a child element with leave animation */
  function removeElement(el: HTMLElement): void {
    const key = getKey(el);
    if (!activeKeys.has(key)) return;
    activeKeys.delete(key);

    const cfg = options.leaveTransition ?? {};

    if (cfg.leaveClass) el.classList.add(cfg.leaveClass);
    if (cfg.activeClass) el.classList.add(cfg.activeClass);

    el.style.transition = `opacity ${(cfg.transition?.duration ?? 200)}ms ease-out`;
    el.style.opacity = "0";

    const duration = cfg.transition?.duration ?? 200;
    setTimeout(() => {
      if (cfg.leaveClass) el.classList.remove(cfg.leaveClass);
      if (cfg.activeClass) el.classList.remove(cfg.activeClass);
      el.remove();
      onComplete?.();
    }, duration);
  }

  /** Sync children: diff and animate changes */
  function sync(newElements: HTMLElement[]): void {
    const newKeys = new Set(newElements.map(getKey));

    // Remove old elements not in new set
    for (const el of Array.from(container.children) as HTMLElement[]) {
      if (!newKeys.has(getKey(el))) {
        removeElement(el);
      }
    }

    // Add new elements
    for (const el of newElements) {
      addElement(el);
    }
  }

  return {
    destroy() {
      for (const fn of cleanupFns) fn();
      cleanupFns.length = 0;
    },
    addElement,
    removeElement,
    sync,
  };
}

// --- Layout Transition ---

/**
 * Animate layout changes using FLIP on children of a container.
 */
export function layoutTransition(
  container: HTMLElement,
  mutate: () => void,
  options?: TransitionOptions,
): Promise<void> {
  const children = Array.from(container.children) as HTMLElement[];
  if (children.length === 0) {
    mutate();
    return Promise.resolve();
  }

  // Record positions
  const positions = new Map<HTMLElement, DOMRect>();
  for (const child of children) {
    positions.set(child, child.getBoundingClientRect());
  }

  // Mutate
  mutate();

  // FLIP each child
  return Promise.all(
    children.map((child) => {
      const prev = positions.get(child);
      if (!prev) return Promise.resolve();

      const curr = child.getBoundingClientRect();
      const dx = prev.left - curr.left;
      const dy = prev.top - curr.top;

      if (dx === 0 && dy === 0) return Promise.resolve();

      return cssTransition(
        child,
        { transform: `translate(${dx}px, ${dy}px)` },
        { ...(options ?? {}), duration: options?.duration ?? 250 },
      ).then(() => {
        child.style.transform = "";
      });
    }),
  );
}
