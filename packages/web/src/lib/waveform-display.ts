/**
 * Waveform Display: Audio waveform visualization with zoom, selection,
 * amplitude scaling, multi-channel support, playhead indicator, and
 * time ruler.
 */

// --- Types ---

export interface WaveformPoint {
  /** Sample index or time offset */
  t: number;
  /** Amplitude (-1 to 1) */
  v: number;
}

export interface WaveformChannel {
  /** Channel name/label */
  name: string;
  /** Channel color */
  color?: string;
  /** Waveform samples (normalized -1..1) */
  samples: number[];
  /** Offset for stereo separation (px) */
  offset?: number;
}

export interface WaveformSelection {
  /** Start sample index */
  start: number;
  /** End sample index */
  end: number;
  /** Selection color */
  color?: string;
}

export interface WaveformDisplayOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Waveform channels */
  channels: WaveformChannel[];
  /** Width (px) */
  width?: number;
  /** Height (px) */
  height?: number;
  /** Height per channel (px), auto-split if not set */
  channelHeight?: number;
  /** Zoom level (samples per px, auto if 0) */
  zoom?: number;
  /** Pan offset (sample index) */
  pan?: number;
  /** Waveform color (per-channel override) */
  color?: string;
  /** Waveform fill color */
  fillColor?: string;
  /** Waveform fill opacity */
  fillOpacity?: number;
  /** Line width (px) */
  lineWidth?: number;
  /** Style ("filled" | "line" | "bars" | "outline") */
  style?: string;
  /** Bar count for "bars" style (max bars shown) */
  barCount?: number;
  /** Show playhead? */
  showPlayhead?: boolean;
  /** Playhead position (sample index) */
  playheadPosition?: number;
  /** Playhead color */
  playheadColor?: string;
  /** Selection regions */
  selections?: WaveformSelection[];
  /** Show time ruler? */
  showRuler?: bool;
  /** Ruler ticks per major division */
  rulerTicks?: number;
  /** Samples per second (for time display) */
  sampleRate?: number;
  /** Amplitude scale (1 = full, 0.5 = half) */
  amplitudeScale?: number;
  /** Center line (zero-crossing) visibility */
  showCenterLine?: boolean;
  /** Center line style */
  centerLineStyle?: "solid" | "dashed";
  /** Background color */
  background?: string;
  /** Grid lines? */
  showGrid?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Playhead move callback */
  onPlayheadMove?: (position: number) => void;
  /** Selection callback */
  onSelectionChange?: (selection: WaveformSelection | null) => void;
  /** Click callback (sample index) */
  onClick?: (sampleIndex: number, event: MouseEvent) => void;
}

export interface WaveformDisplayInstance {
  element: HTMLElement;
  /** Set samples for a channel */
  setSamples: (channelName: string, samples: number[]) => void;
  /** Set playhead position */
  setPlayhead: (position: number) => void;
  /** Set zoom level */
  setZoom: (samplesPerPixel: number) => void;
  /** Set pan offset */
  setPan: (offset: number) => void;
  /** Add selection region */
  addSelection: (selection: WaveformSelection) => void;
  /** Clear selections */
  clearSelections: () => void;
  /** Set amplitude scale */
  setAmplitudeScale: (scale: number) => void;
  /** Export as canvas data URL */
  exportImage: (type?: string) => string;
  /** Destroy */
  destroy: () => void;
}

// --- Main Factory ---

export function createWaveformDisplay(options: WaveformDisplayOptions): WaveformDisplayInstance {
  const opts = {
    width: options.width ?? 600,
    height: options.height ?? 120,
    channelHeight: options.channelHeight ?? 0,
    zoom: options.zoom ?? 0,
    pan: options.pan ?? 0,
    color: options.color ?? "#6366f1",
    fillColor: options.fillColor ?? "#c7d2fe",
    fillOpacity: options.fillOpacity ?? 0.4,
    lineWidth: options.lineWidth ?? 1.2,
    style: options.style ?? "filled",
    barCount: options.barCount ?? 200,
    showPlayhead: options.showPlayhead ?? false,
    playheadPosition: options.playheadPosition ?? 0,
    playheadColor: options.playheadColor ?? "#ef4444",
    showRuler: options.showRuler ?? true,
    rulerTicks: options.rulerTicks ?? 5,
    sampleRate: options.sampleRate ?? 44100,
    amplitudeScale: options.amplitudeScale ?? 1,
    showCenterLine: options.showCenterLine ?? true,
    centerLineStyle: options.centerLineStyle ?? "dashed",
    background: options.background ?? "#fafbfc",
    showGrid: options.showGrid ?? true,
    selections: options.selections ?? [],
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("WaveformDisplay: container not found");

  let channels: WaveformChannel[] = JSON.parse(JSON.stringify(options.channels));
  let destroyed = false;

  const chHeight = opts.channelHeight || (channels.length > 1 ? opts.height / channels.length : opts.height);
  const chGap = channels.length > 1 ? 4 : 0;

  // Root
  const root = document.createElement("div");
  root.className = `waveform-display ${opts.className}`;
  root.style.cssText = `
    width:${opts.width}px;height:${opts.height}px;
    background:${opts.background};border-radius:6px;
    overflow:hidden;position:relative;display:flex;flex-direction:column;
    cursor:crosshair;font-family:-apple-system,sans-serif;
  `;
  container.appendChild(root);

  // Ruler
  let rulerEl: HTMLElement | null = null;
  if (opts.showRuler) {
    rulerEl = document.createElement("div");
    rulerEl.style.cssText = `
      display:flex;align-items:center;height:18px;border-bottom:1px solid #e5e7eb;
      padding:0 8px;font-size:9px;color:#9ca3af;
    `;
    root.appendChild(rulerEl);
  }

  // Canvas per channel
  const canvases: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; channel: WaveformChannel; wrapper: HTMLElement }[] = [];

  for (let ci = 0; ci < channels.length; ci++) {
    const ch = channels[ci]!;
    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
      position:relative;width:100%;height:${chHeight}px;
      ${ci > 0 ? `margin-top:${chGap}px;` : ""}
    `;

    const canvas = document.createElement("canvas");
    canvas.width = opts.width * (window.devicePixelRatio || 1);
    canvas.height = chHeight * (window.devicePixelRatio || 1);
    canvas.style.cssText = `width:100%;height:100%;display:block;`;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    wrapper.appendChild(canvas);
    root.appendChild(wrapper);
    canvases.push({ canvas, ctx, channel: ch, wrapper });
  }

  // Playhead
  let playheadEl: HTMLElement | null = null;
  if (opts.showPlayhead) {
    playheadEl = document.createElement("div");
    playheadEl.style.cssText = `
      position:absolute;top:0;bottom:0;width:2px;background:${opts.playheadColor};
      z-index:10;pointer-events:none;transition:left 0.05s linear;
    `;
    root.appendChild(playheadEl);
  }

  // --- Rendering ---

  function render(): void {
    for (const { canvas, ctx, channel } of canvases) {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      const samples = channel.samples;
      if (samples.length === 0) continue;

      const totalSamples = samples.length;
      const spp = opts.zoom > 0 ? opts.zoom : totalSamples / w;
      const visibleSamples = Math.ceil(w * spp);
      const startSample = Math.max(0, Math.floor(opts.pan));
      const endSample = Math.min(totalSamples, startSample + visibleSamples);

      // Selection backgrounds
      for (const sel of opts.selections) {
        const sx = ((sel.start - opts.pan) / spp);
        const ex = ((sel.end - opts.pan) / spp);
        ctx.fillStyle = sel.color ?? "rgba(99,102,241,0.15)";
        ctx.fillRect(sx, 0, ex - sx, h);
      }

      // Center line
      if (opts.showCenterLine) {
        ctx.beginPath();
        ctx.strokeStyle = "#d1d5db";
        ctx.lineWidth = 0.5;
        if (opts.centerLineStyle === "dashed") ctx.setLineDash([4, 4]);
        else ctx.setLineDash([]);
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Grid
      if (opts.showGrid) {
        ctx.strokeStyle = "rgba(148,163,184,0.1)";
        ctx.lineWidth = 0.5;
        for (let gy = 0; gy < 4; gy++) {
          const y = (gy / 4) * h;
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
      }

      const color = channel.color ?? opts.color;

      switch (opts.style) {
        case "line": {
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = opts.lineWidth;
          for (let si = startSample; si <= endSample; si++) {
            const x = ((si - opts.pan) / spp);
            const sampIdx = Math.max(0, Math.min(totalSamples - 1, Math.round(si)));
            const v = samples[sampIdx]! * opts.amplitudeScale;
            const y = h / 2 - (v * h / 2) * 0.95;
            if (si === startSample) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          break;
        }

        case "bars": {
          const barW = w / opts.barCount;
          for (let bi = 0; bi < opts.barCount; bi++) {
            const centerSample = startSample + (bi / opts.barCount) * visibleSamples;
            const range = Math.max(1, visibleSamples / opts.barCount / 2);
            let min = 0, max = 0;
            for (let ri = Math.floor(centerSample - range); ri <= Math.ceil(centerSample + range); ri++) {
              if (ri >= 0 && ri < totalSamples) {
                const sv = samples[ri]! * opts.amplitudeScale;
                if (sv < min) min = sv;
                if (sv > max) max = sv;
              }
            }
            const bh = Math.abs(max - min) * (h / 2) * 0.95;
            const by = h / 2 - ((max + min) / 2) * (h / 2) * 0.95;
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.5 + Math.abs((max + min) / 2) * 0.5;
            ctx.fillRect(bi * barW, by, Math.max(barW - 1, 1), Math.max(bh, 1));
          }
          ctx.globalAlpha = 1;
          break;
        }

        case "outline":
        case "filled":
        default: {
          ctx.beginPath();
          ctx.moveTo(0, h / 2);
          for (let si = startSample; si <= endSample; si++) {
            const x = ((si - opts.pan) / spp);
            const sampIdx = Math.max(0, Math.min(totalSamples - 1, Math.round(si)));
            const v = samples[sampIdx]! * opts.amplitudeScale;
            const y = h / 2 - (v * h / 2) * 0.95;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(w, h / 2);
          ctx.closePath();

          if (opts.style === "filled") {
            ctx.fillStyle = opts.fillColor;
            ctx.globalAlpha = opts.fillOpacity;
            ctx.fill();
            ctx.globalAlpha = 1;
          }

          ctx.beginPath();
          ctx.moveTo(0, h / 2);
          for (let si = startSample; si <= endSample; si++) {
            const x = ((si - opts.pan) / spp);
            const sampIdx = Math.max(0, Math.min(totalSamples - 1, Math.round(si)));
            const v = samples[sampIdx]! * opts.amplitudeScale;
            const y = h / 2 - (v * h / 2) * 0.95;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(w, h / 2);
          ctx.closePath();
          ctx.strokeStyle = color;
          ctx.lineWidth = opts.lineWidth;
          ctx.stroke();
          break;
        }
      }
    }

    // Playhead
    if (playheadEl && opts.showPlayhead) {
      const spp = opts.zoom > 0 ? opts.zoom : (channels[0]?.samples.length ?? 1) / opts.width;
      playheadEl.style.left = `${(opts.playheadPosition - opts.pan) / spp}px`;
    }

    // Ruler
    if (rulerEl) {
      rulerEl.innerHTML = "";
      const totalSamples = channels[0]?.samples.length ?? 0;
      const duration = totalSamples / opts.sampleRate;
      for (let ti = 0; ti <= opts.rulerTicks; ti++) {
        const frac = ti / opts.rulerTicks;
        const sec = frac * duration;
        const mark = document.createElement("span");
        mark.style.cssText = "font-size:9px;color:#9ca3af;margin-right:auto;";
        mark.textContent = formatTime(sec);
        rulerEl.appendChild(mark);
      }
    }
  }

  function formatTime(s: number): string {
    if (s < 0) return "-0:00";
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 100);
    if (min > 0) return `${min}:${sec.toString().padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
    return `${sec}.${String(ms).padStart(2, "0")}s`;
  }

  // --- Interaction ---

  root.addEventListener("click", (e) => {
    const rect = root.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const spp = opts.zoom > 0 ? opts.zoom : (channels[0]?.samples.length ?? 1) / opts.width;
    const sampleIndex = Math.round(x * spp + opts.pan);
    opts.onClick?.(sampleIndex, e);
  });

  // Initial render
  render();

  // --- Public API ---

  const instance: WaveformDisplayInstance = {
    element: root,

    setSamples(channelName: string, samples: number[]) {
      const ch = channels.find(c => c.name === channelName);
      if (ch) ch.samples = samples;
      render();
    },

    setPlayhead(position: number) {
      opts.playheadPosition = position;
      render();
      opts.onPlayheadMove?.(position);
    },

    setZoom(samplesPerPixel: number) {
      opts.zoom = samplesPerPixel;
      render();
    },

    setPan(offset: number) {
      opts.pan = offset;
      render();
    },

    addSelection(sel: WaveformSelection) {
      opts.selections.push(sel);
      render();
    },

    clearSelections() {
      opts.selections = [];
      render();
    },

    setAmplitudeScale(scale: number) {
      opts.amplitudeScale = scale;
      render();
    },

    exportImage(type = "png"): string {
      const cv = canvases[0]?.canvas;
      if (!cv) return "";
      return cv.toDataURL(`image/${type}`);
    },

    destroy() {
      destroyed = true;
      root.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
