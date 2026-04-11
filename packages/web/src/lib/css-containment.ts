/**
 * CSS Containment API helper for performance optimization through rendering
 * scope isolation, with automatic containment strategy detection, layout
 * stability measurement, and containment cost tracking.
 */

// --- Types ---

export type ContainmentType = "layout" | "style" | "paint" | "size" | "inline-size";

export interface ContainmentConfig {
  /** Which types of containment to apply */
  types: ContainmentType[];
  /** Apply containment only when element meets criteria */
  condition?: (el: HTMLElement) => boolean;
  /** Log containment application for debugging */
  debug?: boolean;
}

export interface ContainmentResult {
  /** Element that had containment applied */
  element: HTMLElement;
  /** Containment types applied */
  applied: ContainmentType[];
  /** Whether containment was actually applied */
  applied: boolean;
  /** Estimated rendering improvement (qualitative) */
  impact: "high" | "medium" | "low" | "none";
}

export interface ContainmentManagerOptions {
  /** Default containment types for auto-detected candidates */
  defaultTypes?: ContainmentType[];
  /** Auto-detect and contain widgets/components */
  autoDetect?: boolean;
  /** Selector for elements to consider for auto-detection */
  candidateSelector?: string;
  /** Maximum containment depth to traverse (default: 0 = no limit) */
  maxDepth?: number;
  /** Exclude elements matching this selector */
  excludeSelector?: string;
  /** Called when containment is applied */
  onApply?: (result: ContainmentResult) => void;
}

export interface ContainmentManagerInstance {
  /** Apply containment to a specific element */
  apply: (element: HTMLElement, config: ContainmentConfig) => ContainmentResult;
  /** Remove containment from an element */
  remove: (element: HTMLElement) => void;
  /** Check what containment is currently on an element */
  getContainment: (element: HTMLElement) => ContainmentType[];
  /** Auto-detect and apply containment to page elements */
  autoApply: (container?: HTMLElement) => ContainmentResult[];
  /** Measure layout stability before/after containment */
  measureStability: (element: HTMLElement, durationMs?: number) => Promise<{ shifts: number; maxShift: number }>;
  /** Destroy and cleanup (remove all applied containment) */
  destroy: () => void;
}

// --- Helpers ---

const CONTAINMENT_VALUES: Record<ContainmentType, string> = {
  layout: "layout",
  style: "style",
  paint: "paint",
  size: "size",
  "inline-size": "inline-size",
};

function parseCurrentContainment(el: HTMLElement): ContainmentType[] {
  const val = getComputedStyle(el).contain ?? "";
  if (!val || val === "none") return [];
  return val.split(/\s+/).filter(Boolean) as ContainmentType[];
}

function containmentToCss(types: ContainmentType[]): string {
  return types.map((t) => CONTAINMENT_VALUES[t] ?? t).join(" ") || "none";
}

function estimateImpact(el: HTMLElement, types: ContainmentType[]): "high" | "medium" | "low" | "none" {
  if (types.length === 0) return "none";

  const childCount = el.children.length;
  const hasComplexContent = el.querySelectorAll("canvas, video, iframe, svg").length > 0;

  if (childCount > 50 || hasComplexContent) return "high";
  if (childCount > 10) return "medium";
  if (types.includes("layout") || types.includes("paint")) return "medium";
  return "low";
}

// --- Main ---

export function createContainmentManager(options: ContainmentManagerOptions = {}): ContainmentManagerInstance {
  const {
    defaultTypes = ["layout", "style", "paint"],
    autoDetect = false,
    candidateSelector = "[class*='widget'], [class*='card'], [class*='panel'], [class*='modal'], [class*='component']",
    maxDepth = 0,
    excludeSelector = "",
    onApply,
  } = options;

  let destroyed = false;
  const managed = new Set<HTMLElement>();

  function doApply(element: HTMLElement, config: ContainmentConfig): ContainmentResult {
    if (destroyed) return { element, applied: [], applied: false, impact: "none" };

    // Check condition
    if (config.condition && !config.condition(element)) {
      return { element, applied: [], applied: false, impact: "none" };
    }

    const current = parseCurrentContainment(element);
    const newTypes = config.types.filter((t) => !current.includes(t));

    if (newTypes.length === 0) {
      return { element, applied: current, applied: true, impact: estimateImpact(element, current) };
    }

    const merged = [...current, ...newTypes];
    element.style.contain = containmentToCss(merged);
    managed.add(element);

    const result: ContainmentResult = {
      element,
      applied: newTypes,
      applied: true,
      impact: estimateImpact(element, merged),
    };

    onApply?.(result);
    return result;
  }

  function doRemove(element: HTMLElement): void {
    element.style.contain = "";
    managed.delete(element);
  }

  function doGetContainment(element: HTMLElement): ContainmentType[] {
    return parseCurrentContainment(element);
  }

  function doAutoApply(container?: HTMLElement): ContainmentResult[] {
    const root = container ?? document.body;
    const results: ContainmentResult[] = [];
    const exclude = excludeSelector ? root.querySelectorAll(excludeSelector) : [];

    const isExcluded = (el: HTMLElement): boolean => {
      for (const ex of exclude) { if (ex === el || ex.contains(el)) return true; }
      return false;
    };

    const candidates = root.querySelectorAll<HTMLElement>(candidateSelector);
    for (const el of candidates) {
      if (isExcluded(el)) continue;

      // Check depth
      if (maxDepth > 0) {
        let depth = 0;
        let parent = el.parentElement;
        while (parent && parent !== root) { depth++; parent = parent.parentElement; }
        if (depth > maxDepth) continue;
      }

      results.push(doApply(el, { types: defaultTypes }));
    }

    return results;
  }

  async function doMeasureStability(element: HTMLElement, durationMs = 1000): Promise<{ shifts: number; maxShift: number }> {
    const positions = new Map<HTMLElement, { x: number; y: number }>();

    function snapshot(): void {
      const children = element.querySelectorAll<HTMLElement>("*");
      for (const child of children) {
        const rect = child.getBoundingClientRect();
        positions.set(child, { x: rect.x, rect.y });
      }
    }

    snapshot();
    await new Promise((r) => setTimeout(r, durationMs));

    let shifts = 0;
    let maxShift = 0;

    const children = element.querySelectorAll<HTMLElement>("*");
    for (const child of children) {
      const prev = positions.get(child);
      if (!prev) continue;
      const rect = child.getBoundingClientRect();
      const dx = Math.abs(rect.x - prev.x);
      const dy = Math.abs(rect.y - prev.y);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0.5) {
        shifts++;
        maxShift = Math.max(maxShift, dist);
      }
    }

    return { shifts, maxShift };
  }

  const instance: ContainmentManagerInstance = {
    apply: doApply,
    remove: doRemove,
    getContainment: doGetContainment,
    autoApply: doAutoApply,
    measureStability: doMeasureStability,

    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const el of managed) {
        try { el.style.contain = ""; } catch { /* ignore */ }
      }
      managed.clear();
    },
  };

  // Auto-detect on creation
  if (autoDetect && typeof document !== "undefined") {
    // Defer to let DOM settle
    requestAnimationFrame(() => { doAutoApply(); });
  }

  return instance;
}

// --- Standalone utilities ---

/** Quick one-shot: apply containment to an element */
export function contain(
  element: HTMLElement,
  types: ContainmentType[],
): ContainmentResult {
  return createContainmentManager().apply(element, { types });
}

/** Check browser support for CSS containment */
export function isContainmentSupported(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.createElement("div");
  return "contain" in el.style;
}
