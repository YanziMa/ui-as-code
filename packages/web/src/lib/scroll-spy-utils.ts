/**
 * Scroll Spy Utilities: Track which section is currently in the viewport,
 * emit active state changes, support multiple spy targets, offset handling,
 * smooth scroll to sections, and navigation sync.
 */

// --- Types ---

export interface SpySection {
  /** Section element */
  el: HTMLElement;
  /** Unique identifier */
  id: string;
  /** Optional label for display */
  label?: string;
}

export interface ScrollSpyOptions {
  /** Sections to track (element + id pairs) */
  sections: SpySection[];
  /** Offset from top of viewport for detection (px). Default 0 */
  offset?: number;
  /** Threshold ratio (0-1) for IntersectionObserver. Default 0.15 */
  threshold?: number;
  /** Root margin for IO. Default "0px" */
  rootMargin?: string;
  /** Only track one active section at a time? Default true */
  singleActive?: boolean;
  /** Called when active section changes */
  onActivate?: (section: SpySection, index: number) => void;
  /** Called when a section deactivates */
  onDeactivate?: (section: SpySection, index: number) => void;
  /** Called on every scroll with current active indices */
  onChange?: (activeIndices: number[]) => void;
  /** Use IntersectionObserver? Default true if available */
  useIO?: boolean;
  /** Smooth scroll duration when calling scrollTo() (ms). Default 450 */
  scrollDuration?: number;
  /** Container to observe within. Default viewport */
  root?: HTMLElement | null;
}

export interface ScrollSpyInstance {
  /** Get currently active section index/indices */
  getActiveIndex(): number | number[];
  /** Get currently active section(s) */
  getActiveSections(): SpySection[];
  /** Scroll to a specific section by index or id */
  scrollTo: (indexOrId: number | string) => void;
  /** Refresh / recalculate positions */
  refresh: () => void;
  /** Add a new section dynamically */
  addSection: (section: SpySection) => void;
  /** Remove a section by id */
  removeSection: (id: string) => void;
  /** Update options dynamically */
  updateOptions: (opts: Partial<ScrollSpyOptions>) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create a scroll spy that tracks which sections are visible.
 *
 * @example
 * ```ts
 * const spy = createScrollSpy({
 *   sections: [
 *     { el: document.getElementById("intro")!, id: "intro", label: "Intro" },
 *     { el: document.getElementById("features")!, id: "features" },
 *     { el: document.getElementById("pricing")!, id: "pricing" },
 *   ],
 *   onActivate: (sec, idx) => highlightNav(idx),
 * });
 * ```
 */
export function createScrollSpy(options: ScrollSpyOptions): ScrollSpyInstance {
  const {
    sections,
    offset = 0,
    threshold = 0.15,
    rootMargin = `${offset}px 0px -40% 0px`,
    singleActive = true,
    onActivate,
    onDeactivate,
    onChange,
    useIO = true,
    scrollDuration = 450,
    root = null,
  } = options;

  let _sections = [...sections];
  let _activeIndices: number[] = [];
  let cleanupFns: Array<() => void> = [];

  // --- Easing for smooth scroll ---

  function easeOutCubic(t: number): number {
    return (--t) * t * t + 1;
  }

  // --- IO-based tracking ---

  function setupIOTracking(): void {
    const io = new IntersectionObserver(
      (entries) => {
        const newActive: number[] = [];

        entries.forEach((entry) => {
          const idx = _sections.findIndex((s) => s.el === entry.target);
          if (idx < 0) return;

          if (entry.isIntersecting) {
            if (!newActive.includes(idx)) newActive.push(idx);
          }
        });

        // Sort by DOM order
        newActive.sort((a, b) => a - b);

        if (singleActive && newActive.length > 0) {
          // Keep only the first (topmost) active
          const topMost = newActive[0]!;
          setActive([topMost]);
        } else {
          setActive(newActive);
        }
      },
      {
        root,
        rootMargin,
        threshold: [threshold],
      },
    );

    _sections.forEach((s) => io.observe(s.el));
    cleanupFns.push(() => io.disconnect());
  }

  // --- Fallback scroll-based tracking ---

  function setupScrollTracking(): void {
    const scrollHandler = (): void => {
      const newActive: number[] = [];

      _sections.forEach((s, idx) => {
        const rect = s.el.getBoundingClientRect();
        if (rect.top <= offset && rect.bottom > offset) {
          newActive.push(idx);
        }
      });

      if (singleActive && newActive.length > 0) {
        setActive([newActive[newActive.length - 1]!]);
      } else {
        setActive(newActive);
      }
    };

    window.addEventListener("scroll", scrollHandler, { passive: true });
    cleanupFns.push(() => window.removeEventListener("scroll", scrollHandler));
    scrollHandler();
  }

  // --- State Management ---

  function setActive(indices: number[]): void {
    // Find newly activated
    const added = indices.filter((i) => !_activeIndices.includes(i));
    // Find deactivated
    const removed = _activeIndices.filter((i) => !indices.includes(i));

    _activeIndices = indices;

    added.forEach((idx) => {
      onActivate?.(_sections[idx]!, idx);
    });

    removed.forEach((idx) => {
      onDeactivate?.(_sections[idx]!, idx);
    });

    onChange?.(indices);
  }

  // --- API Methods ---

  function getActiveIndex(): number | number[] {
    return singleActive ? (_activeIndices[0] ?? -1) : _activeIndices;
  }

  function getActiveSections(): SpySection[] {
    return _activeIndices.map((i) => _sections[i]!).filter(Boolean);
  }

  function scrollTo(indexOrId: number | string): void {
    let target: HTMLElement | undefined;

    if (typeof indexOrId === "number") {
      target = _sections[indexOrId]?.el;
    } else {
      target = _sections.find((s) => s.id === indexOrId)?.el;
    }

    if (!target) return;

    const start = window.scrollY || document.documentElement.scrollTop;
    const targetTop = target.getBoundingClientRect().top + start - offset;

    const startTime = performance.now();

    function step(now: number): void {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / scrollDuration, 1);
      const eased = easeOutCubic(progress);

      window.scrollTo(0, start + (targetTop - start) * eased);

      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  function refresh(): void {
    // Re-observe all sections
    destroy();
    init();
  }

  function addSection(section: SpySection): void {
    _sections.push(section);
    refresh();
  }

  function removeSection(id: string): void {
    _sections = _sections.filter((s) => s.id !== id);
    refresh();
  }

  function updateOptions(opts: Partial<ScrollSpyOptions>): void {
    Object.assign(options, opts);
    refresh();
  }

  function destroy(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
    _activeIndices = [];
  }

  function init(): void {
    if (useIO && typeof IntersectionObserver !== "undefined") {
      setupIOTracking();
    } else {
      setupScrollTracking();
    }
  }

  init();

  return { getActiveIndex, getActiveSections, scrollTo, refresh, addSection, removeSection, updateOptions, destroy };
}
