/**
 * A11y Announcer Utilities: Screen reader announcement system with live regions,
 * queue management, priority levels, rate limiting, polite/assertive regions,
 * multi-region support, and accessibility testing helpers.
 */

// --- Types ---

export type AnnouncementPriority = "polite" | "assertive";

export interface Announcement {
  id: string;
  message: string;
  priority: AnnouncementPriority;
  timestamp: number;
}

export interface AnnouncerConfig {
  /** Unique ID for this announcer instance */
  id?: string;
  /** Default priority for announcements */
  defaultPriority?: AnnouncementPriority;
  /** Minimum delay between announcements (ms) to prevent spamming */
  minInterval?: number;
  /** Maximum number of announcements to keep in history */
  maxHistory?: number;
  /** Whether to clear previous message before announcing same text */
  clearOnRepeat?: boolean;
  /** Custom container element (default: document.body) */
  container?: HTMLElement;
  /** Log announcements to console (for debugging) */
  debug?: boolean;
  /** Called before each announcement */
  onAnnounce?: (message: string, priority: AnnouncementPriority) => void;
}

export interface AnnouncerState {
  isActive: boolean;
  lastAnnouncementTime: number;
  totalAnnouncements: number;
  currentMessage: string | null;
}

// --- Live Region Factory ---

/** Create a visually hidden live region element */
function createLiveRegion(
  role: "status" | "alert" | "log",
  ariaLive: string,
  container: HTMLElement,
): HTMLDivElement {
  const region = document.createElement("div");
  region.setAttribute("role", role);
  region.setAttribute("aria-live", ariaLive);
  region.setAttribute("aria-atomic", "true");
  region.style.cssText =
    "position:absolute;width:1px;height:1px;padding:0;margin:-1px;" +
    "overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;" +
    "left:-9999px;top:auto;";
  container.appendChild(region);
  return region;
}

// --- Core Announcer Class ---

/**
 * A11yAnnouncer - manages screen reader announcements via ARIA live regions.
 *
 * Supports both polite and assertive modes, queuing, rate limiting,
 * and multiple independent announcer instances.
 *
 * @example
 * ```ts
 * const announcer = new A11yAnnouncer({ minInterval: 300 });
 * announcer.announce("Page loaded"); // polite
 * announcer.announceAssertive("Error occurred!"); // assertive
 * announcer.destroy();
 * ```
 */
export class A11yAnnouncer {
  private config: Required<AnnouncerConfig>;
  private politeRegion: HTMLDivElement;
  private assertiveRegion: HTMLDivElement;
  private logRegion: HTMLDivElement | null = null;
  private _state: AnnouncerState;
  private history: Announcement[] = [];
  private cleanupFns: Array<() => void> = [];
  private _counter = 0;

  constructor(config: AnnouncerConfig = {}) {
    this.config = {
      id: config.id ?? `announcer-${Date.now()}`,
      defaultPriority: config.defaultPriority ?? "polite",
      minInterval: config.minInterval ?? 100,
      maxHistory: config.maxHistory ?? 50,
      clearOnRepeat: config.clearOnRepeat ?? true,
      container: config.container ?? document.body,
      debug: config.debug ?? false,
      onAnnounce: config.onAnnounce ?? null!,
    };

    const container = this.config.container;

    // Create live regions
    this.politeRegion = createLiveRegion("status", "polite", container);
    this.assertiveRegion = createLiveRegion("alert", "assertive", container);

    this._state = {
      isActive: true,
      lastAnnouncementTime: 0,
      totalAnnouncements: 0,
      currentMessage: null,
    };
  }

  // --- Public API ---

  /** Get current state */
  getState(): AnnouncerState { return { ...this._state }; }

  /** Get announcement history */
  getHistory(): Announcement[] { return [...this.history]; }

  /** Clear history */
  clearHistory(): void { this.history = []; }

  /**
   * Announce a message to screen readers.
   *
   * @param message The text to announce
   * @param priority Priority level ("polite" or "assertive")
   * @param options Override options for this specific announcement
   */
  announce(
    message: string,
    priority?: AnnouncementPriority,
    options?: { skipRateLimit?: boolean; id?: string },
  ): string {
    if (!this._state.isActive) return "";

    const p = priority ?? this.config.defaultPriority;
    const id = options?.id ?? `${this.config.id}-${++this._counter}`;
    const now = Date.now();

    // Rate limiting
    if (!options?.skipRateLimit) {
      const elapsed = now - this._state.lastAnnouncementTime;
      if (elapsed < this.config.minInterval) {
        // Queue for later delivery if within rate limit window
        const delay = this.config.minInterval - elapsed;
        setTimeout(() => this._deliver(message, p, id), delay);
        return id;
      }
    }

    return this._deliver(message, p, id);
  }

  /** Announce with assertive priority (interrupts current speech) */
  announceAssertive(message: string, options?: { skipRateLimit?: boolean }): string {
    return this.announce(message, "assertive", options);
  }

  /** Announce with polite priority (waits for pause) */
  announcePolite(message: string, options?: { skipRateLimit?: boolean }): string {
    return this.announce(message, "polite", options);
  }

  /**
   * Announce a list of items sequentially with a delay between each.
   * Useful for reading lists like search results.
   */
  announceList(
    items: string[],
    options?: { interval?: number; prefix?: string; priority?: AnnouncementPriority },
  ): void {
    const { interval = 500, prefix = "", priority } = options ?? {};
    items.forEach((item, i) => {
      setTimeout(() => {
        this.announce(`${prefix}${item}`, priority);
      }, i * (interval ?? 500));
    });
  }

  /**
   * Announce a status change (e.g., "3 of 5 items selected").
   * Automatically formats count-based messages.
   */
  announceStatus(
    label: string,
    value: number | string,
    total?: number,
    options?: { priority?: AnnouncementPriority },
  ): string {
    let msg: string;
    if (typeof value === "number" && total !== undefined) {
      msg = `${label}: ${value} of ${total}`;
    } else {
      msg = `${label}: ${value}`;
    }
    return this.announce(msg, options?.priority);
  }

  /** Clear the current announcement (silence the live region) */
  clear(): void {
    this.politeRegion.textContent = "";
    this.assertiveRegion.textContent = "";
    this._state.currentMessage = null;
  }

  /** Pause all announcements (stop delivering new ones) */
  pause(): void {
    this._state.isActive = false;
  }

  /** Resume announcements after pausing */
  resume(): void {
    this._state.isActive = true;
  }

  /** Destroy the announcer and remove DOM elements */
  destroy(): void {
    this.pause();
    this.politeRegion.remove();
    this.assertiveRegion.remove();
    this.logRegion?.remove();
    for (const fn of this.cleanupFns) fn();
    this.cleanupFns = [];
  }

  // --- Private ---

  private _deliver(message: string, priority: AnnouncementPriority, id: string): string {
    const region = priority === "assertive" ? this.assertiveRegion : this.politeRegion;

    // Clear on repeat to force re-announcement
    if (this.config.clearOnRepeat && region.textContent === message) {
      region.textContent = "";
      // Force reflow so screen reader picks up the change
      void region.offsetHeight;
    }

    region.textContent = message;

    // Record state
    this._state.lastAnnouncementTime = Date.now();
    this._state.totalAnnouncements++;
    this._state.currentMessage = message;

    // Record in history
    const entry: Announcement = { id, message, priority, timestamp: Date.now() };
    this.history.push(entry);

    // Trim history
    if (this.history.length > this.config.maxHistory) {
      this.history = this.history.slice(-this.config.maxHistory);
    }

    // Debug logging
    if (this.config.debug) {
      console.log(`[A11yAnnouncer:${this.config.id}] [${priority}] ${message}`);
    }

    this.config.onAnnounce?.(message, priority);

    return id;
  }
}

// --- Singleton / Global Instance ---

let globalAnnouncer: A11yAnnouncer | null = null;

/** Get or create the global announcer singleton */
export function getGlobalAnnouncer(config?: AnnouncerConfig): A11yAnnouncer {
  if (!globalAnnouncer) {
    globalAnnouncer = new A11yAnnouncer(config);
  }
  return globalAnnouncer;
}

/** Destroy the global announcer singleton */
export function destroyGlobalAnnouncer(): void {
  if (globalAnnouncer) {
    globalAnnouncer.destroy();
    globalAnnouncer = null;
  }
}

// --- Convenience Functions ---

/** Quick one-shot announcement using the global announcer */
export function announce(message: string, priority?: AnnouncementPriority): string {
  return getGlobalAnnouncer().announce(message, priority);
}

/** Quick assertive announcement */
export function announceAssertive(message: string): string {
  return getGlobalAnnouncer().announceAssertive(message);
}

/** Quick polite announcement */
export function announcePolite(message: string): string {
  return getGlobalAnnouncer().announcePolite(message);
}

// --- Testing Helpers ---

/**
 * Check if an element is properly hidden from visual display but readable by screen readers.
 * Useful for verifying sr-only / visually-hidden implementations.
 */
export function isVisuallyHidden(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  const rect = el.getBoundingClientRect();

  // Check common visually-hidden patterns
  const isOffscreen = rect.width === 0 || rect.height === 0 ||
    rect.left < -9999 || rect.top < -9999;
  const isClipped = style.clip === "rect(0,0,0,0)" ||
    style.clipPath === "inset(50%)";
  const isZeroSized = style.width === "1px" && style.height === "1px";
  const hasOverflowClip = style.overflow === "hidden";

  return isOffscreen || isClipped || (isZeroSized && hasOverflowClip);
}

/** Check if an element has proper live region attributes */
export function isValidLiveRegion(el: Element): boolean {
  const role = el.getAttribute("role");
  const live = el.getAttribute("aria-live");

  const validRoles = ["status", "alert", "log", "marquee", "timer"];
  const validLiveValues = ["polite", "assertive", "off"];

  return validRoles.includes(role ?? "") &&
    validLiveValues.includes(live ?? "");
}
