/**
 * Spectrum Analyzer: Audio frequency spectrum analyzer visualization with bar
 * display, peak hold, gradient coloring, mirror mode, sensitivity
 * adjustment, and smooth animations.
 */

// --- Types ---

export type BarStyle = "solid" | "rounded" | "gradient-fill" | "mirror";
export type GradientType = "rainbow" | "fire" | "ocean" | "purple" | "green" | "mono";

export interface SpectrumAnalyzerOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Number of frequency bars */
  barCount?: number;
  /** Width (px) */
  width?: number;
  /** Height (px) */
  height?: number;
  /** Bar style variant */
  barStyle?: BarStyle;
  /** Gap between bars (px) */
  gap?: number;
  /** Bar minimum height (px) */
  minBarHeight?: number;
  /** Color gradient type */
  gradientType?: GradientType;
  /** Custom colors (overrides gradient type) */
  colors?: string[];
  /** Show peak indicators? */
  showPeaks?: boolean;
  /** Peak decay rate (0-1 per frame) */
  peakDecay?: number;
  /** Peak color */
  peakColor?: string;
  /** Mirror mode (reflect below center)? */
  mirror?: boolean;
  /** Mirror opacity ratio (0-1) */
  mirrorOpacity?: number;
  /** Sensitivity multiplier (amplitude boost) */
  sensitivity?: number;
  /** Smoothing factor (0=raw, 1=max smooth) */
  smoothing?: number;
  /** Background color */
  background?: string;
  /** Grid lines? */
  showGrid?: boolean;
  /** Grid line count */
  gridLines?: number;
  /** Grid color */
  gridColor?: string;
  /** dB scale labels? */
  showDbLabels?: boolean;
  /** Auto-animate mode (generates demo data) */
  autoAnimate?: boolean;
  /** Animation speed (updates per second) */
  fps?: number;
  /** Custom data callback (provides array of 0-1 values) */
  onData?: (values: number[]) => void;
  /** Custom CSS class */
  className?: string;
}

export interface SpectrumInstance {
  element: HTMLElement;
  /** Push new spectrum data (array of 0-1 values) */
  pushData: (values: number[]) => void;
  /** Set sensitivity */
  setSensitivity: (val: number) => void;
  /** Set smoothing */
  setSmoothing: (val: number) => void;
  /** Start auto-demo mode */
  startDemo: () => void;
  /** Stop auto-demo mode */
  stopDemo: () => void;
  /** Destroy */
  destroy: () => void;
}

// --- Gradients ---

function getGradientColors(type: GradientType, index: number, total: number): string {
  const t = total > 1 ? index / (total - 1) : 0;
  switch (type) {
    case "rainbow": return `hsl(${t * 300}, 80%, 55%)`;
    case "fire": return `hsl(${t * 50}, 100%, ${45 + t * 30}%)`;
    case "ocean": return `hsl(${200 + t * 40}, 75%, ${40 + t * 25}%)`;
    case "purple": return `hsl(${260 + t * 40}, 70%, ${50 + t * 20}%)`;
    case "green": return `hsl(${120 + t * 30}, 65%, ${40 + t * 25}%)`;
    case "mono": { const v = Math.round(t * 255); return `rgb(${v},${v},${v})`; }
    default: return `hsl(220, 70%, 55%)`;
  }
}

// --- Main Factory ---

export function createSpectrumAnalyzer(options: SpectrumAnalyzerOptions): SpectrumInstance {
  const opts = {
    barCount: options.barCount ?? 32,
    width: options.width ?? 400,
    height: options.height ?? 200,
    barStyle: options.barStyle ?? "rounded",
    gap: options.gap ?? 2,
    minBarHeight: options.minBarHeight ?? 2,
    gradientType: options.gradientType ?? "rainbow",
    colors: options.colors ?? [],
    showPeaks: options.showPeaks ?? true,
    peakDecay: options.peakDecay ?? 0.92,
    peakColor: options.peakColor ?? "#fff",
    mirror: options.mirror ?? false,
    mirrorOpacity: options.mirrorOpacity ?? 0.25,
    sensitivity: options.sensitivity ?? 1.2,
    smoothing: options.smoothing ?? 0.15,
    background: options.background ?? "#0f172a",
    showGrid: options.showGrid ?? true,
    gridLines: options.gridLines ?? 4,
    gridColor: options.gridColor ?? "rgba(148,163,184,0.15)",
    showDbLabels: options.showDbLabels ?? false,
    autoAnimate: options.autoAnimate ?? true,
    fps: options.fps ?? 30,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("SpectrumAnalyzer: container not found");

  let destroyed = false;
  let currentValues: number[] = new Array(opts.barCount).fill(0);
  let smoothedValues: number[] = new Array(opts.barCount).fill(0);
  let peakValues: number[] = new Array(opts.barCount).fill(0);
  let demoTimer: ReturnType<typeof setInterval> | null = null;
  let animFrameId: ReturnType<typeof requestAnimationFrame> | null = null;

  // Root
  const root = document.createElement("div");
  root.className = `spectrum-analyzer ${opts.className}`;
  root.style.cssText = `
    display:flex;flex-direction:column;align-items:flex-end;
    width:${opts.width}px;height:${opts.height}px;
    background:${opts.background};border-radius:8px;
    padding:8px 12px;position:relative;overflow:hidden;
  `;
  container.appendChild(root);

  // Grid lines
  if (opts.showGrid) {
    const gridWrap = document.createElement("div");
    gridWrap.style.cssText = `position:absolute;inset:8px 12px;pointer-events:none;z-index:0;`;
    for (let i = 0; i <= opts.gridLines; i++) {
      const gl = document.createElement("div");
      gl.style.cssText = `
        position:absolute;left:0;right:0;top:${(i / opts.gridLines) * 100}%;
        height:1px;background:${opts.gridColor};
      `;
      gridWrap.appendChild(gl);

      if (opts.showDbLabels) {
        const db = Math.round(-((i / opts.gridLines) * 60));
        const lbl = document.createElement("span");
        lbl.style.cssText = `position:absolute;right:2px;font-size:9px;color:#64748b;top:${(i / opts.gridLines) * 100}%;transform:translateY(-50%);`;
        lbl.textContent = `${db}dB`;
        gridWrap.appendChild(lbl);
      }
    }
    root.appendChild(gridWrap);
  }

  // Bars container
  const barsContainer = document.createElement("div");
  barsContainer.style.cssText = `
    display:flex;align-items:flex-end;gap:${opts.gap}px;height:100%;width:100%;
    z-index:1;position:relative;
  `;
  root.appendChild(barsContainer);

  // Create bar elements
  const bars: { el: HTMLDivElement; peakEl: HTMLDivElement | null }[] = [];
  const barW = (opts.width - 24 - opts.gap * (opts.barCount - 1)) / opts.barCount;

  for (let i = 0; i < opts.barCount; i++) {
    const wrap = document.createElement("div");
    wrap.style.cssText = `display:flex;flex-direction:column;align-items:center;flex:1;height:100%;`;

    const bar = document.createElement("div");
    bar.style.cssText = `
      width:100%;min-height:${opts.minBarHeight}px;border-radius:
      ${opts.barStyle === "rounded" ? `${barW * 0.3}px` :
       opts.barStyle === "gradient-fill" ? `${barW * 0.5}px ${barW * 0.5}px 0 0` : "2px"}
      ${opts.barStyle === "solid" ? "" : ""}
      transition:height ${1000 / opts.fps}ms linear;
      transform-origin:bottom;
    `;

    let peakEl: HTMLDivElement | null = null;
    if (opts.showPeaks) {
      peakEl = document.createElement("div");
      peakEl.style.cssText = `
        width:6px;height:3px;border-radius:2px;background:${opts.peakColor};
        margin-bottom:2px;opacity:0;transition:opacity 0.15s ease,height 0.15s ease;
      `;
      wrap.appendChild(peakEl);
    }

    wrap.appendChild(bar);
    barsContainer.appendChild(wrap);
    bars.push({ el: bar, peakEl });
  }

  // Mirror layer
  let mirrorContainer: HTMLElement | null = null;
  let mirrorBars: HTMLDivElement[] = [];
  if (opts.mirror) {
    mirrorContainer = document.createElement("div");
    mirrorContainer.style.cssText = `
      display:flex;align-items:flex-start;gap:${opts.gap}px;height:40%;width:100%;
      opacity:${opts.mirrorOpacity};transform:scaleY(-1);
    `;
    root.insertBefore(mirrorContainer, barsContainer.nextSibling);

    for (let i = 0; i < opts.barCount; i++) {
      const mb = document.createElement("div");
      mb.style.cssText = `
        flex:1;border-radius:${barW * 0.3}px} 2px;
        transition:height ${1000 / opts.fps}ms linear;transform-origin:top;
      `;
      mirrorContainer.appendChild(mb);
      mirrorBars.push(mb);
    }
  }

  // --- Data Processing ---

  function processFrame(values: number[]): void {
    // Apply sensitivity
    const boosted = values.map(v => Math.min(1, Math.max(0, v * opts.sensitivity)));

    // Smooth
    for (let i = 0; i < opts.barCount; i++) {
      smoothedValues[i] = smoothedValues[i]! * opts.smoothing + boosted[i] * (1 - opts.smoothing);
      currentValues[i] = smoothedValues[i]!;
    }

    // Update peaks
    for (let i = 0; i < opts.barCount; i++) {
      if (currentValues[i]! > peakValues[i]!) peakValues[i] = currentValues[i];
      else peakValues[i] = peakValues[i]! * opts.peakDecay;
    }

    // Render
    for (let i = 0; i < opts.barCount; i++) {
      const val = currentValues[i]!;
      const h = Math.max(val * (opts.height - 32), opts.minBarHeight);
      const color = opts.colors.length > 0
        ? opts.colors[Math.min(i, opts.colors.length - 1)]
        : getGradientColors(opts.gradientType, i, opts.barCount);

      bars[i]!.el.style.height = `${h}px`;
      bars[i]!.el.style.background = opts.barStyle === "gradient-fill"
        ? `linear-gradient(to top, ${color}, transparent)`
        : color;

      // Peak
      if (bars[i].peakEl && opts.showPeaks) {
        const ph = Math.max(peakValues[i]! * (opts.height - 32), 1);
        bars[i].peakEl!.style.height = `${ph}px`;
        bars[i].peakEl!.style.opacity = peakValues[i]! > 0.02 ? "0.85" : "0";
      }

      // Mirror
      if (mirrorBars[i]) {
        mirrorBars[i]!.style.height = `${h}px`;
        mirrorBars[i]!.style.background = color;
      }
    }

    opts.onData?.(currentValues);
  }

  // --- Demo Mode ---

  function generateDemoData(): number[] {
    const vals: number[] = [];
    const time = Date.now() / 1000;
    for (let i = 0; i < opts.barCount; i++) {
      const freq = (i + 1) / opts.barCount;
      const base = Math.sin(time * 2.5 + freq * 8) * 0.4 + 0.3;
      const noise = Math.sin(time * 7.1 + freq * 13) * 0.15;
      const beat = Math.max(0, Math.sin(time * 4)) * 0.25 * Math.exp(-freq * 2);
      vals.push(Math.min(1, Math.max(0, base + noise + beat)));
    }
    return vals;
  }

  function startDemoLoop(): void {
    stopDemo();
    const interval = 1000 / opts.fps;
    demoTimer = setInterval(() => {
      if (destroyed) { stopDemo(); return; }
      processFrame(generateDemoData());
    }, interval);
  }

  function stopDemo(): void {
    if (demoTimer != null) { clearInterval(demoTimer); demoTimer = null; }
  }

  // --- Init ---

  if (opts.autoAnimate) startDemoLoop();
  else processFrame(new Array(opts.barCount).fill(0));

  // --- Public API ---

  const instance: SpectrumInstance = {
    element: root,

    pushData(values: number[]) {
      const padded = values.slice(0, opts.barCount);
      while (padded.length < opts.barCount) padded.push(0);
      processFrame(padded);
    },

    setSensitivity(val: number) { opts.sensitivity = Math.max(0.1, val); },
    setSmoothing(val: number) { opts.smoothing = Math.max(0, Math.min(1, val)); },

    startDemo: startDemoLoop,
    stopDemo,

    destroy() {
      destroyed = true;
      stopDemo();
      if (animFrameId != null) cancelAnimationFrame(animFrameId);
      root.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
