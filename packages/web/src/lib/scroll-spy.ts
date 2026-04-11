/**
 * Scroll Spy: Tracks which section is currently visible in the viewport,
 * highlights active nav links, supports multiple spy targets, smooth
 * offset configuration, throttled updates, and custom callbacks.
 */

// --- Types ---

export interface SpyTarget {
  /** Section element or selector */
  target: HTMLElement | string;
  /** Unique key for this section */
  key: string;
  /** Optional label */
  label?: string;
}

export interface ScrollSpyOptions {
  /** Spy targets (sections to track) */
  targets: SpyTarget[];
  /** Offset from top of viewport (for fixed headers, default: 0) */
  offset?: number;
  /** Bottom offset */
  bottomOffset?: number;
  /** Throttle interval in ms (default: 100) */
  throttleMs?: number;
  /** Root margin for IntersectionObserver */
  rootMargin?: string;
  /** Threshold for intersection (default: 0) */
  threshold?: number;
  /** Callback when active section changes */
  onChange?: (activeKey: string, target: HTMLElement) => void;
  /** Callback on every scroll event with all visible keys */
  onScroll?: (visibleKeys: string[], activeKey: string) => void;
  /** Initial active key (default: first target's key) */
  initialActiveKey?: string;
  /** Enable smooth scrolling to sections on programmatic change */
  smoothScroll?: boolean;
  /** Custom CSS class applied to active nav items (caller manages DOM) */
  activeClass?: string;
  /** Auto-scroll to hash on init? */
  followHash?: boolean;
}

export interface ScrollSpyInstance {
  /** Currently active section key */
  getActiveKey: () => string;
  /** All currently visible section keys */
  getVisibleKeys: () => string[];
  /** Manually set active key */
  setActiveKey: (key: string) => void;
  /** Scroll to a specific section */
  scrollTo: (key: string) => void;
  /** Refresh/recalculate positions */
  refresh: () => void;
  /** Add a new target dynamically */
  addTarget: (target: SpyTarget) => void;
  /** Remove a target by key */
  removeTarget: (key: string) => void;
  /** Update options dynamically */
  updateOptions: (opts: Partial<ScrollSpyOptions>) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Helpers ---

function resolveElement(target: HTMLElement | string): HTMLElement | null {
  return typeof target === "string"
    ? document.querySelector<HTMLElement>(target)
    : target;
}

function getElementByKey(targets: SpyTarget[], key: string): HTMLElement | null {
  const t = targets.find((t) => t.key === key);
  return t ? resolveElement(t.target) : null;
}

// --- Main Factory ---

export function createScrollSpy(options: ScrollSpyOptions): ScrollSpyInstance {
  const opts = {
    offset: options.offset ?? 0,
    bottomOffset: options.bottomOffset ?? 0,
    throttleMs: options.throttleMs ?? 100,
    rootMargin: options.rootMargin ?? `-${options.offset ?? 0}px 0px -${(options.bottomOffset ?? 50)}% 0px`,
    threshold: options.threshold ?? 0,
    activeClass: options.activeClass ?? "scroll-spy-active",
    smoothScroll: options.smoothScroll ?? true,
    followHash: options.followHash ?? true,
    ...options,
  };

  let targets = [...options.targets];
  let activeKey = opts.initialActiveKey ?? (targets[0]?.key ?? "");
  let visibleKeys = new Set<string>();
  let destroyed = false;
  let ticking = false;

  // Observers map: key -> IntersectionObserver
  const observers = new Map<string, IntersectionObserver>();
  // Element refs map: key -> HTMLElement
  const elements = new Map<string, HTMLElement>();

  // Resolve and cache elements
  function resolveElements(): void {
    for (const t of targets) {
      if (!elements.has(t.key)) {
        const el = resolveElement(t.target);
        if (el) elements.set(t.key, el);
      }
    }
  }

  // Setup observers for each target
  function setupObservers(): void {
    // Clean up old observers
    for (const [, obs] of observers) obs.disconnect();
    observers.clear();

    resolveElements();

    for (const [key, el] of elements) {
      const observer = new IntersectionObserver(
        (entries) => {
          if (destroyed) return;

          for (const entry of entries) {
            if (entry.isIntersecting) {
              visibleKeys.add(key);
            } else {
              visibleKeys.delete(key);
            }
          }

          // Determine the most "prominent" visible section
          updateActive();
        },
        {
          rootMargin: opts.rootMargin,
          threshold: opts.threshold,
        },
      );

      observer.observe(el);
      observers.set(key, observer);
    }
  }

  function updateActive(): void {
    // Find the first visible target that matches
    let newActive = "";

    for (const t of targets) {
      if (visibleKeys.has(t.key)) {
        newActive = t.key;
        break;
      }
    }

    // Fallback: use first target if none visible
    if (!newActive && targets.length > 0) {
      newActive = targets[0].key;
    }

    if (newActive !== activeKey) {
      activeKey = newActive;
      opts.onChange?.(activeKey, elements.get(activeKey)!);

      // Update URL hash
      if (opts.followHash) {
        const el = elements.get(activeKey);
        if (el?.id) {
          const url = new URL(window.location.href);
          if (url.hash !== `#${el.id}`) {
            history.replaceState(null, "", `#${el.id}`);
          }
        }
      }
    }

    opts.onScroll?.([...visibleKeys], activeKey);
  }

  // Scroll handler with throttle
  function handleScroll(): void {
    if (ticking || destroyed) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      // Re-check visibility based on scroll position
      checkVisibilityFromScroll();
    });
  }

  function checkVisibilityFromScroll(): void {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const viewportHeight = window.innerHeight;

    const newVisible = new Set<string>();

    for (const [key, el] of elements) {
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const top = rect.top + scrollTop;
      const bottom = rect.bottom + scrollTop;

      // Check if element is in viewport considering offsets
      const isVisible =
        bottom > opts.offset &&
        top < viewportHeight - opts.bottomOffset;

      if (isVisible) newVisible.add(key);
    }

    // Check if changed
    const changed = newVisible.size !== visibleKeys.size ||
      ![...newVisible].every((k) => visibleKeys.has(k));

    if (changed) {
      visibleKeys = newVisible;
      updateActive();
    } else {
      opts.onScroll?.([...visibleKeys], activeKey);
    }
  }

  // Initialize
  setupObservers();
  window.addEventListener("scroll", handleScroll, { passive: true });

  // Handle initial hash
  if (opts.followHash && window.location.hash) {
    const hashEl = document.querySelector<HTMLElement>(window.location.hash);
    if (hashEl) {
      // Find matching key
      for (const t of targets) {
        const el = resolveElement(t.target);
        if (el === hashEl) {
          activeKey = t.key;
          break;
        }
      }
      // Scroll to it
      setTimeout(() => {
        hashEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }

  // Initial check
  checkVisibilityFromScroll();

  const instance: ScrollSpyInstance = {
    getActiveKey() { return activeKey; },

    getVisibleKeys() { return [...visibleKeys]; },

    setActiveKey(key: string) {
      if (!elements.has(key)) return;
      activeKey = key;
      opts.onChange?.(activeKey, elements.get(activeKey)!);
      opts.onScroll?.([...visibleKeys], activeKey);
    },

    scrollTo(key: string) {
      const el = elements.get(key);
      if (!el) return;
      activeKey = key;
      el.scrollIntoView({
        behavior: opts.smoothScroll ? "smooth" : "auto",
        block: "start",
      });
      opts.onChange?.(activeKey, el);
    },

    refresh() {
      checkVisibilityFromScroll();
    },

    addTarget(newTarget: SpyTarget) {
      targets.push(newTarget);
      const el = resolveElement(newTarget.target);
      if (el) elements.set(newTarget.key, el);
      setupObservers();
    },

    removeTarget(key: string) {
      targets = targets.filter((t) => t.key !== key);
      elements.delete(key);
      const obs = observers.get(key);
      if (obs) { obs.disconnect(); observers.delete(key); }
      visibleKeys.delete(key);
      if (activeKey === key) {
        activeKey = targets[0]?.key ?? "";
      }
    },

    updateOptions(newOpts: Partial<ScrollSpyOptions>) {
      Object.assign(opts, newOpts);
      if (newOpts.offset !== undefined || newOpts.bottomOffset !== undefined) {
        opts.rootMargin = `-${opts.offset}px 0px -${opts.bottomOffset}% 0px`;
      }
      setupObservers();
    },

    destroy() {
      destroyed = true;
      window.removeEventListener("scroll", handleScroll);
      for (const [, obs] of observers) obs.disconnect();
      observers.clear();
      elements.clear();
      visibleKeys.clear();
    },
  };

  return instance;
}

// --- Nav auto-highlighter ---
/**
 * Convenience: auto-highlight navigation links based on scroll position.
 * Links must have href pointing to section IDs.
 */

export interface NavSpyOptions {
  /** Navigation container selector or element */
  nav: HTMLElement | string;
  /** Section selector (default: "[data-spy-target]") */
  sectionSelector?: string;
  /** Link selector (default: "a[href^='#']") */
  linkSelector?: string;
  /** Offset from top */
  offset?: number;
  /** Active class name */
  activeClass?: string;
  /** Add .parent-active class to parent <li>? */
  parentActiveClass?: string;
}

export function createNavSpy(options: NavSpyOptions): () => void {
  const navEl = typeof options.nav === "string"
    ? document.querySelector<HTMLElement>(options.nav)
    : options.nav;

  if (!navEl) throw new Error("NavSpy: nav element not found");

  const sectionSelector = options.sectionSelector ?? "[data-spy-target]";
  const linkSelector = options.linkSelector ?? "a[href^='#']";
  const activeClass = options.activeClass ?? "nav-active";
  const parentActiveClass = options.parentActiveClass ?? "parent-nav-active";

  const links = navEl.querySelectorAll<HTMLElement>(linkSelector);
  const sections = document.querySelectorAll<HTMLElement>(sectionSelector);

  // Build targets from links
  const targets: SpyTarget[] = [];
  for (const link of links) {
    const href = link.getAttribute("href");
    if (!href || !href.startsWith("#")) continue;
    const id = href.slice(1);
    const section = document.getElementById(id)
      || document.querySelector(`[${sectionSelector.slice(1, -1)}="${id}"]`);

    if (section) {
      targets.push({ target: section, key: id, label: link.textContent?.trim() });
    }
  }

  // Also add any explicit spy targets
  for (const sec of sections) {
    const key = sec.id || sec.dataset.spyTarget;
    if (key && !targets.find((t) => t.key === key)) {
      targets.push({ target: sec, key });
    }
  }

  const spy = createScrollSpy({
    targets,
    offset: options.offset ?? 0,
    activeClass,
    onChange: (activeKey) => {
      // Remove active class from all links
      for (const link of links) {
        link.classList.remove(activeClass);
        if (parentActiveClass) {
          (link.parentElement as HTMLElement)?.classList.remove(parentActiveClass);
        }
      }

      // Add active class to matching link
      const activeLink = navEl.querySelector<HTMLElement>(`a[href="#${activeKey}"]`);
      if (activeLink) {
        activeLink.classList.add(activeClass);
        if (parentActiveClass) {
          (activeLink.parentElement as HTMLElement)?.classList.add(parentActiveClass);
        }
      }
    },
  });

  // Return cleanup function
  return () => spy.destroy();
}
