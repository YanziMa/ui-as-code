/**
 * Word Cloud: Text visualization where word size reflects frequency/importance,
 * with spiral placement algorithm, color gradients, hover effects,
 * click handlers, rotation support, and responsive sizing.
 */

// --- Types ---

export interface WordCloudItem {
  /** Word text */
  text: string;
  /** Weight/value (determines size) */
  weight: number;
  /** Color override */
  color?: string;
  /** URL on click */
  url?: string;
  /** Click handler */
  onClick?: (item: WordCloudItem, event: MouseEvent) => void;
  /** Custom data payload */
  data?: unknown;
}

export type WordCloudShape = "rectangular" | "elliptical" | "circular";
export type WordCloudSpiral = "archimedean" | "rectangular" | "triangular";

export interface WordCloudOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Word items */
  words: WordCloudItem[];
  /** Cloud width (px) */
  width?: number;
  /** Cloud height (px) */
  height?: number;
  /** Shape of the cloud area */
  shape?: WordCloudShape;
  /** Spiral type for word placement */
  spiral?: WordCloudSpiral;
  /** Font family */
  fontFamily?: string;
  /** Min font size (px) for smallest weight */
  minFontSize?: number;
  /** Max font size (px) for largest weight */
  maxFontSize?: number;
  /** Font weight range [min, max] */
  fontWeightRange?: [number, number];
  /** Color palette (cycled by position) or gradient function */
  colors?: string[];
  /** Padding between words (px) */
  padding?: number;
  /** Allow rotation? (-90 to +90 degrees) */
  rotate?: boolean;
  /** Rotation angle range in degrees */
  rotationRange?: [number, number];
  /** Show tooltips on hover? */
  showTooltips?: boolean;
  /** Animation on mount? */
  animate?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Stagger delay between words (ms) */
  staggerDelay?: number;
  /** Background color */
  background?: string;
  /** Custom CSS class */
  className?: string;
}

export interface WordCloudInstance {
  element: HTMLElement;
  /** Update words */
  setWords: (words: WordCloudItem[]) => void;
  /** Get current words */
  getWords: () => WordCloudItem[];
  /** Destroy */
  destroy: () => void;
}

// --- Defaults ---

const DEFAULT_COLORS = [
  "#1e40af", "#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa",
  "#7c3aed", "#8b5cf6", "#a78bfa", "#c084fc", "#d8b4fe",
  "#db2777", "#ec4899", "#f472b6", "#f9a8d4",
];

// --- Helpers ---

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m) return `rgba(99,102,241,${alpha})`;
  return `rgba(${parseInt(m[0]!, 16)},${parseInt(m[1]!, 16)},${parseInt(m[2]!, 16)},${alpha})`;
}

// --- Spiral Placers ---

interface Point { x: number; y: number; }

function* archimedeanSpiral(cx: number, cy: number): Generator<Point> {
  let a = 0;
  const step = 0.1;
  const radiusStep = 0.5;
  while (true) {
    yield { x: cx + a * Math.cos(a) * radiusStep, y: cy + a * Math.sin(a) * radiusStep };
    a += step;
  }
}

function* rectangularSpiral(cx: number, cy: number): Generator<Point> {
  let layer = 0;
  const step = 6;
  while (true) {
    // Right
    for (let x = cx + layer * step; x <= cx + (layer + 1) * step; x += step) yield { x, y: cy - layer * step };
    // Down
    for (let y = cy - layer * step; y <= cy + (layer + 1) * step; y += step) yield { x: cx + (layer + 1) * step, y };
    // Left
    for (let x = cx + (layer + 1) * step; x >= cx - (layer + 1) * step; x -= step) yield { x, y: cy + (layer + 1) * step };
    // Up
    for (let y = cy + (layer + 1) * step; y >= cy - (layer + 1) * step; y -= step) yield { x: cx - (layer + 1) * step, y };
    layer++;
  }
}

// --- Collision Detection ---

interface PlacedWord {
  el: HTMLElement;
  bounds: { left: number; top: number; right: number; bottom: number };
  cx: number; cy: number;
}

function intersects(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
  padding: number
): boolean {
  return !(
    a.right + padding < b.left ||
    a.left - padding > b.right ||
    a.bottom + padding < b.top ||
    a.top - padding > b.bottom
  );
}

// --- Shape Testers ---

function insideRect(x: number, y: number, w: number, h: number): boolean {
  return x >= 0 && x <= w && y >= 0 && y <= h;
}

function insideEllipse(x: number, y: number, rx: number, ry: number): boolean {
  return (x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1;
}

function insideCircle(x: number, y: number, r: number): boolean {
  return x * x + y * y <= r * r;
}

// --- Main Factory ---

export function createWordCloud(options: WordCloudOptions): WordCloudInstance {
  const opts = {
    width: options.width ?? 500,
    height: options.height ?? 350,
    shape: options.shape ?? "elliptical",
    spiral: options.spiral ?? "archimedean",
    fontFamily: options.fontFamily ?? "-apple-system, 'Segoe UI', sans-serif",
    minFontSize: options.minFontSize ?? 12,
    maxFontSize: options.maxFontSize ?? 56,
    fontWeightRange: options.fontWeightRange ?? [400, 800],
    colors: options.colors ?? DEFAULT_COLORS,
    padding: options.padding ?? 4,
    rotate: options.rotate ?? false,
    rotationRange: options.rotationRange ?? [-45, 45],
    showTooltips: options.showTooltips ?? true,
    animate: options.animate ?? true,
    animationDuration: options.animationDuration ?? 800,
    staggerDelay: options.staggerDelay ?? 30,
    background: options.background ?? "transparent",
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("WordCloud: container not found");

  let words = [...options.words];
  let destroyed = false;

  // Root element
  const root = document.createElement("div");
  root.className = `word-cloud ${opts.className}`;
  root.style.cssText = `
    position:relative;width:${opts.width}px;height:${opts.height}px;
    overflow:hidden;background:${opts.background};
    font-family:${opts.fontFamily};-webkit-user-select:none;user-select:none;
  `;
  container.appendChild(root);

  // Tooltip
  let tooltipEl: HTMLElement | null = null;

  function getTooltip(): HTMLElement {
    if (!tooltipEl) {
      tooltipEl = document.createElement("div");
      tooltipEl.className = "wc-tooltip";
      tooltipEl.style.cssText = `
        position:absolute;z-index:100;padding:6px 14px;border-radius:6px;
        background:#1f2937;color:#fff;font-size:12px;font-weight:500;
        pointer-events:none;white-space:nowrap;opacity:0;transition:opacity 0.15s;
      `;
      root.appendChild(tooltipEl);
    }
    return tooltipEl;
  }

  // --- Rendering ---

  function render(): void {
    root.innerHTML = "";
    if (tooltipEl) { root.appendChild(tooltipEl); } // Keep tooltip

    if (words.length === 0) return;

    // Sort by weight descending (larger words placed first)
    const sorted = [...words].sort((a, b) => b.weight - a.weight);
    const maxWeight = Math.max(...sorted.map(w => w.weight), 1);
    const minWeight = Math.min(...sorted.map(w => w.weight), 0);

    const placedWords: PlacedWord[] = [];
    const cx = opts.width / 2;
    const cy = opts.height / 2;

    // Choose spiral generator
    const spiralGen = opts.spiral === "rectangular"
      ? rectangularSpiral(cx, cy)
      : archimedeanSpiral(cx, cy);

    // Shape tester
    const shapeTest = (x: number, y: number): boolean => {
      const rx = x - cx;
      const ry = y - cy;
      switch (opts.shape) {
        case "rectangular": return insideRect(rx, ry, opts.width / 2, opts.height / 2);
        case "circular": return insideCircle(rx, ry, Math.min(opts.width, opts.height) / 2 - 10);
        case "elliptical":
        default:
          return insideEllipse(rx, ry, opts.width / 2 - 10, opts.height / 2 - 10);
      }
    };

    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i]!;
      const normalizedWeight = maxWeight > minWeight
        ? (item.weight - minWeight) / (maxWeight - minWeight)
        : 0.5;

      const fontSize = opts.minFontSize + normalizedWeight * (opts.maxFontSize - opts.minFontSize);
      const fontWeight = Math.round(
        opts.fontWeightRange[0] + normalizedWeight * (opts.fontWeightRange[1] - opts.fontWeightRange[0])
      );
      const color = item.color ?? opts.colors[i % opts.colors.length];
      const rotation = opts.rotate
        ? opts.rotationRange[0] + Math.random() * (opts.rotationRange[1] - opts.rotationRange[0])
        : 0;

      // Create word element for measurement
      const el = document.createElement("span");
      el.className = "wc-word";
      el.textContent = item.text;
      el.style.cssText = `
        display:inline-block;position:absolute;
        font-size:${fontSize}px;font-weight:${fontWeight};
        color:${color};white-space:nowrap;padding:2px 4px;
        cursor:pointer;transition:opacity 0.3s,color 0.15s;
        transform-origin:center center;
        ${rotation !== undefined ? `transform:rotate(${rotation}deg);` : ""}
        opacity:0;
      `;

      // Events
      el.addEventListener("mouseenter", (e) => {
        el.style.color = "#111827";
        if (opts.showTooltips) showTooltip(item, e as MouseEvent);
      });
      el.addEventListener("mouseleave", () => {
        el.style.color = color;
        hideTooltip();
      });
      el.addEventListener("click", (e) => {
        if (item.url) window.open(item.url, "_blank");
        item.onClick?.(item, e as MouseEvent);
      });

      root.appendChild(el);

      // Measure dimensions
      const rect = el.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      // Find non-overlapping position via spiral
      let placed = false;
      let iterations = 0;
      const maxIterations = 2000;

      for (const pt of spiralGen) {
        iterations++;
        if (iterations > maxIterations) break;

        const halfW = w / 2;
        const halfH = h / 2;
        const left = pt.x - halfW;
        const top = pt.y - halfH;
        const right = pt.x + halfW;
        const bottom = pt.y + halfH;

        // Check bounds
        if (!shapeTest(pt.x, pt.y)) continue;

        // Check collision with existing words
        const newBounds = { left, top, right, bottom };
        let collision = false;
        for (const pw of placedWords) {
          if (intersects(newBounds, pw.bounds, opts.padding)) {
            collision = true;
            break;
          }
        }
        if (collision) continue;

        // Place the word
        el.style.left = `${left}px`;
        el.style.top = `${top}px`;

        placedWords.push({
          el,
          bounds: newBounds,
          cx: pt.x,
          cy: pt.y,
        });

        placed = true;
        break;
      }

      if (!placed) {
        // Couldn't place — still show but at center (will overlap)
        el.style.left = `${cx - w / 2}px`;
        el.style.top = `${cy - h / 2}px`;
        placedWords.push({
          el,
          bounds: { left: cx - w / 2, top: cy - h / 2, right: cx + w / 2, bottom: cy + h / 2 },
          cx, cy,
        });
      }
    }

    // Animate entry
    if (opts.animate) {
      const allEls = Array.from(root.querySelectorAll<HTMLElement>(".wc-word"));
      allEls.forEach((el, idx) => {
        const delay = idx * opts.staggerDelay;
        setTimeout(() => {
          el.style.opacity = "1";
          el.style.transition = "opacity 0.4s ease";
        }, delay);
      });
    } else {
      root.querySelectorAll<HTMLElement>(".wc-word").forEach(el => { el.style.opacity = "1"; });
    }
  }

  function showTooltip(item: WordCloudItem, e: MouseEvent): void {
    const tt = getTooltip();
    tt.textContent = `${item.text} (weight: ${item.weight})`;
    tt.style.left = `${(e as MouseEvent).offsetX + 10}px`;
    tt.style.top = `${(e as MouseEvent).offsetY - 10}px`;
    tt.style.opacity = "1";
  }

  function hideTooltip(): void {
    if (tooltipEl) tooltipEl.style.opacity = "0";
  }

  // Initial render
  render();

  // --- Instance ---

  const instance: WordCloudInstance = {
    element: root,

    getWords() { return [...words]; },

    setWords(newWords: WordCloudItem[]) {
      words = [...newWords];
      render();
    },

    destroy() {
      destroyed = true;
      root.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
