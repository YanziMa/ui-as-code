/**
 * Transition: CSS transition orchestration for enter/leave animations,
 * with mode control (out-in, in-out), stagger support, lifecycle hooks,
 * and configurable duration/easing.
 */

// --- Types ---

export type TransitionMode = "out-in" | "in-out" | "simultaneous";
export type TransitionPhase = "enter" | "enter-active" | "enter-done" | "leave" | "leave-active" | "leave-done";

export interface TransitionOptions {
  /** Element or selector to animate */
  element: HTMLElement | string;
  /** Enter animation (CSS class name) */
  enterClass?: string;
  /** Leave animation (CSS class name) */
  leaveClass?: string;
  /** Duration in ms */
  duration?: number;
  /** CSS timing function */
  easing?: string;
  /** Delay before enter starts (ms) */
  enterDelay?: number;
  /** Delay before leave starts (ms) */
  leaveDelay?: number;
  /** Transition mode */
  mode?: TransitionMode;
  /** Show element initially? (for mount animation) */
  appear?: boolean;
  /** Stagger delay between children (ms) */
  stagger?: number;
  /** Callback before enter */
  onBeforeEnter?: (el: HTMLElement) => void;
  /** Callback after enter */
  onEnter?: (el: HTMLElement) => void;
  /** Callback after enter completes */
  onAfterEnter?: (el: HTMLElement) => void;
  /** Callback before leave */
  onBeforeLeave?: (el: HTMLElement) => void;
  /** Callback after leave */
  onLeave?: (el: HTMLElement) => void;
  /** Callback after leave completes */
  onAfterLeave?: (el: HTMLElement) => void;
  /** CSS properties to transition (default: all) */
  cssProperties?: string[];
  /** Keep element mounted but hidden when not visible? */
  unmountOnHide?: boolean;
  /** Initial state: visible or hidden */
  initialVisible?: boolean;
}

export interface TransitionInstance {
  element: HTMLElement;
  /** Trigger enter animation */
  enter: () => Promise<void>;
  /** Trigger leave animation */
  leave: () => Promise<void>;
  /** Toggle visibility with animation */
  toggle: () => Promise<void>;
  /** Set visible without animation */
  show: () => void;
  /** Hide without animation */
  hide: () => void;
  /** Check if currently visible */
  isVisible: () => boolean;
  /** Update options dynamically */
  setOptions: (opts: Partial<TransitionOptions>) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Defaults ---

const DEFAULTS = {
  enterClass: "transition-enter",
  leaveClass: "transition-leave",
  duration: 300,
  easing: "ease-out",
  mode: "out-in" as TransitionMode,
  appear: false,
  unmountOnHide: false,
  initialVisible: true,
};

// --- Main Factory ---

export function createTransition(options: TransitionOptions): TransitionInstance {
  const opts = { ...DEFAULTS, ...options };

  const el = typeof options.element === "string"
    ? document.querySelector<HTMLElement>(options.element)!
    : options.element;

  if (!el) throw new Error("Transition: element not found");

  let visible = opts.initialVisible ?? true;
  let destroyed = false;
  let currentAnimation: ReturnType<typeof setTimeout> | null = null;

  // Apply base styles
  el.style.transitionProperty = opts.cssProperties?.join(", ") || "opacity, transform";
  el.style.transitionDuration = `${opts.duration}ms`;
  el.style.transitionTimingFunction = opts.easing;

  function runEnter(): Promise<void> {
    return new Promise((resolve) => {
      opts.onBeforeEnter?.(el);

      // Remove leave classes
      el.classList.remove(opts.leaveClass, `${opts.leaveClass}-active`, `${opts.leaveClass}-done`);

      // Add enter classes
      el.classList.add(opts.enterClass);
      void el.offsetHeight; // force reflow

      el.classList.add(`${opts.enterClass}-active`);
      el.style.display = "";
      el.style.visibility = "visible";
      opts.onEnter?.(el);

      currentAnimation = setTimeout(() => {
        el.classList.remove(opts.enterClass, `${opts.enterClass}-active`);
        el.classList.add(`${opts.enterClass}-done`);
        opts.onAfterEnter?.(el);
        currentAnimation = null;
        resolve();
      }, opts.duration);
    });
  }

  function runLeave(): Promise<void> {
    return new Promise((resolve) => {
      opts.onBeforeLeave?.(el);

      // Remove enter classes
      el.classList.remove(opts.enterClass, `${opts.enterClass}-active`, `${opts.enterClass}-done`);

      // Add leave classes
      el.classList.add(opts.leaveClass);
      void el.offsetHeight; // force reflow

      el.classList.add(`${opts.leaveClass}-active`);
      opts.onLeave?.(el);

      currentAnimation = setTimeout(() => {
        el.classList.remove(opts.leaveClass, `${opts.leaveClass}-active`);
        el.classList.add(`${opts.leaveClass}-done`);

        if (opts.unmountOnHide) {
          el.style.display = "none";
        }

        opts.onAfterLeave?.(el);
        currentAnimation = null;
        resolve();
      }, opts.duration);
    });
  }

  const instance: TransitionInstance = {
    element: el,

    async enter() {
      if (destroyed || visible) return;
      visible = true;
      if (opts.enterDelay) await new Promise((r) => setTimeout(r, opts.enterDelay));
      await runEnter();
    },

    async leave() {
      if (destroyed || !visible) return;
      visible = false;
      if (opts.leaveDelay) await new Promise((r) => setTimeout(r, opts.leaveDelay));
      await runLeave();
    },

    async toggle() {
      visible ? await instance.leave() : await instance.enter();
    },

    show() {
      if (currentAnimation) clearTimeout(currentAnimation);
      visible = true;
      el.style.display = "";
      el.style.visibility = "visible";
      el.classList.remove(opts.leaveClass, `${opts.leaveClass}-active`, `${opts.leaveClass}-done`);
    },

    hide() {
      if (currentAnimation) clearTimeout(currentAnimation);
      visible = false;
      if (opts.unmountOnHide) {
        el.style.display = "none";
      } else {
        el.style.visibility = "hidden";
        el.style.opacity = "0";
      }
    },

    isVisible: () => visible,

    setOptions(newOpts: Partial<TransitionOptions>) {
      Object.assign(opts, newOpts);
    },

    destroy() {
      destroyed = true;
      if (currentAnimation) clearTimeout(currentAnimation);
      el.classList.remove(
        opts.enterClass, `${opts.enterClass}-active`, `${opts.enterClass}-done`,
        opts.leaveClass, `${opts.leaveClass}-active`, `${opts.leaveClass}-done`,
      );
      el.style.transitionProperty = "";
      el.style.transitionDuration = "";
      el.style.transitionTimingFunction = "";
    },
  };

  return instance;
}

// --- Transition Group (for lists) ---

export interface TransitionGroupOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Child selector (defaults to direct children) */
  childSelector?: string;
  /** Shared transition options */
  transition?: Omit<TransitionOptions, "element">;
  /** Stagger between each child's animation (ms) */
  stagger?: number;
}

export interface TransitionGroupInstance {
  /** Animate all children in */
  enterAll: () => Promise<void>;
  /** Animate all children out */
  leaveAll: () => Promise<void>;
  /** Get individual child transitions */
  getTransitions: () => TransitionInstance[];
  /** Destroy all */
  destroy: () => void;
}

export function createTransitionGroup(options: TransitionGroupOptions): TransitionGroupInstance {
  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("TransitionGroup: container not found");

  const selector = options.childSelector ?? ":scope > *";
  const children = Array.from(container.querySelectorAll<HTMLElement>(selector));
  const transitions: TransitionInstance[] = [];
  const stagger = options.stagger ?? 50;

  for (let i = 0; i < children.length; i++) {
    const t = createTransition({
      element: children[i]!,
      ...options.transition,
      enterDelay: (options.transition?.enterDelay ?? 0) + i * stagger,
      leaveDelay: (options.transition?.leaveDelay ?? 0) + i * stagger,
    });
    transitions.push(t);
  }

  return {
    async enterAll() {
      for (const t of transitions) await t.enter();
    },
    async leaveAll() {
      for (const t of transitions.reverse()) await t.leave();
    },
    getTransitions: () => transitions,
    destroy() {
      for (const t of transitions) t.destroy();
    },
  };
}
