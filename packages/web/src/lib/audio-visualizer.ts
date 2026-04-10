/**
 * Audio Visualizer: Real-time audio waveform visualization using Web Audio API.
 *
 * Visualization types:
 * - Bars (frequency bars)
 * - Wave (oscilloscope waveform)
 * - Circle (circular frequency display)
 * - Spectrum (full spectrogram-like bars)
 * - Particles (reactive particle system)
 *
 * Features:
 * - Connects to Audio element, MediaStream, or raw audio file
 * - Multiple visualization modes with smooth transitions
 * - Configurable colors, bar count, sensitivity
 * - FFT analysis with configurable size
 * - Smooth interpolation between frames
 * - Play/pause sync with audio source
 * - Performance-optimized rendering loop
 */

// --- Types ---

export type VizType = "bars" | "wave" | "circle" | "spectrum" | "particles";

export type AudioSource = HTMLAudioElement | MediaStream | string | AnalyserNode;

export interface VisualizerColors {
  /** Primary/bar color */
  primary: string;
  /** Secondary/gradient end color */
  secondary?: string;
  /** Background color */
  background?: string;
  /** Glow effect color (optional) */
  glow?: string;
}

export interface AudioVisualizerOptions {
  /** Target canvas element */
  canvas: HTMLCanvasElement;
  /** Audio source (element, stream, file URL, or analyser node) */
  source?: AudioSource;
  /** Visualization type (default: bars) */
  type?: VizType;
  /** Number of bars/frequency bands (default: 64) */
  fftSize?: number;
  /** Bar count for visual display (default: 64) */
  barCount?: number;
  /** Smoothing constant 0-1 (default: 0.8) */
  smoothing?: number;
  /** Min decibels range (default: -90) */
  minDecibels?: number;
  /** Max decibels range (default: -10) */
  maxDecibels?: number;
  /** Colors configuration */
  colors?: VisualizerColors;
  /** Bar gap ratio 0-1 (default: 0.15) */
  barGap?: number;
  /** Bar radius (default: 2) */
  barRadius?: number;
  /** Mirror visualization (default: false for most types) */
  mirror?: boolean;
  /** Circular segments count (for circle type, default: 64) */
  circleSegments?: number;
  /** Inner radius ratio for circle (default: 0.3) */
  circleInnerRatio?: number;
  /** Particle count (default: 128) */
  particleCount?: number;
  /** Sensitivity multiplier (default: 1) */
  sensitivity?: number;
  /** Animation speed factor (default: 1) */
  speed?: number;
  /** Enable glow/bloom effect (default: false) */
  glow?: boolean;
  /** Auto-start on connect (default: true) */
  autoStart?: boolean;
  /** Callback when visualization frame renders */
  onFrame?: (dataArray: Uint8Array, frequencyData: Float32Array) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Custom CSS class for wrapper */
  className?: string;
}

export interface AudioVisualizerInstance {
  element: HTMLCanvasElement;
  /** Connect an audio source */
  connect: (source: AudioSource) => Promise<void>;
  /** Disconnect current source */
  disconnect: () => void;
  /** Set visualization type */
  setType: (type: VizType) => void;
  /** Set colors */
  setColors: (colors: Partial<VisualizerColors>) => void;
  /** Start/pause visualization */
  toggle: () => void;
  /** Check if running */
  get isRunning(): boolean;
  /** Get current frequency data */
  getFrequencyData: () => Uint8Array;
  /** Get time-domain data */
  getTimeDomainData: () => Float32Array;
  /** Destroy instance */
  destroy: () => void;
}

// --- Helpers ---

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function validateColor(c: string): boolean {
  const s = new Option().style;
  s.color = c;
  return s.color !== "";
}

// --- Main ---

export function createAudioVisualizer(options: AudioVisualizerOptions): AudioVisualizerInstance {
  const opts = {
    type: "bars" as VizType,
    fftSize: 256,
    barCount: 64,
    smoothing: 0.8,
    minDecibels: -90,
    maxDecibels: -10,
    colors: { primary: "#6366f1", secondary: "#a855f7", background: "rgba(0,0,0,0)" },
    barGap: 0.15,
    barRadius: 2,
    mirror: false,
    circleSegments: 64,
    circleInnerRatio: 0.3,
    particleCount: 128,
    sensitivity: 1,
    speed: 1,
    glow: false,
    autoStart: true,
    ...options,
  };

  const canvas = options.canvas;
  const ctx = canvas.getContext("2d")!;
  if (!ctx) throw new Error("Canvas 2D context not available");

  // Web Audio state
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let sourceNode: AudioBufferSourceNode | MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null = null;
  let isConnected = false;
  let isRunning = false;
  let destroyed = false;
  let animFrameId: number | null = null;

  // Data arrays
  let dataArray = new Uint8Array(opts.fftSize / 2);
  let freqData = new Float32Array(opts.fftSize / 2);
  let prevData = new Float32Array(opts.barCount); // For smooth interpolation

  // Particle state (for particles mode)
  interface Particle {
    x: number; y: number;
    vx: number; vy: number;
    size: number;
    angle: number;
    speed: number;
    origDist: number;
  }
  let particles: Particle[] = [];

  // Initialize particles
  function initParticles(): void {
    const cx = canvas.width / 2, cy = canvas.height / 2;
    particles = [];
    for (let i = 0; i < opts.particleCount; i++) {
      const angle = (i / opts.particleCount) * Math.PI * 2;
      const dist = 40 + Math.random() * Math.min(cx, cy) * 0.6;
      particles.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: 1.5 + Math.random() * 3,
        angle,
        speed: 0.002 + Math.random() * 0.01,
        origDist: dist,
      });
    }
  }
  initParticles();

  // --- Audio Connection ---

  async function connect(source: AudioSource): Promise<void> {
    try {
      disconnect();

      audioContext = new AudioContext();

      if (source instanceof AnalyserNode) {
        analyser = source;
      } else {
        analyser = audioContext.createAnalyser();
        analyser.fftSize = opts.fftSize;
        analyser.smoothingTimeConstant = opts.smoothing;
        analyser.minDecibels = opts.minDecibels;
        analyser.maxDecibels = opts.maxDecibels;

        if (source instanceof HTMLAudioElement) {
          sourceNode = audioContext.createMediaElementSource(source);
          sourceNode.connect(analyser);
          analyser.connect(audioContext.destination);
        } else if (source instanceof MediaStream) {
          sourceNode = audioContext.createMediaStreamSource(source);
          sourceNode.connect(analyser);
          analyser.connect(audioContext.destination);
        } else if (typeof source === "string") {
          // File URL - fetch and decode
          const response = await fetch(source);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          sourceNode = audioContext.createBufferSource();
          sourceNode.buffer = audioBuffer;
          sourceNode.connect(analyser);
          analyser.connect(audioContext.destination);
          if (opts.autoStart) sourceNode.start();
        }
      }

      dataArray = new Uint8Array(analyser.frequencyBinCount);
      freqData = new Float32Array(analyser.frequencyBinCount);
      isConnected = true;

      if (opts.autoStart) start();
    } catch (err) {
      opts.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  function disconnect(): void {
    stop();
    if (sourceNode) {
      try { sourceNode.disconnect(); } catch { /* ignore */ }
      sourceNode = null;
    }
    if (audioContext && audioContext.state !== "closed") {
      try { audioContext.close(); } catch { /* ignore */ }
    }
    audioContext = null;
    analyser = null;
    isConnected = false;
  }

  // --- Rendering ---

  function start(): void {
    if (isRunning || destroyed || !analyser) return;
    isRunning = true;
    tick();
  }

  function stop(): void {
    isRunning = false;
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  function tick(): void {
    if (!isRunning || destroyed || !analyser) return;

    animFrameId = requestAnimationFrame(tick);

    // Get audio data
    analyser.getByteFrequencyData(dataArray);
    analyser.getFloatFrequencyData(freqData);

    opts.onFrame?.(dataArray, freqData);

    // Clear
    ctx.fillStyle = opts.colors.background ?? "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    switch (opts.type) {
      case "bars": renderBars(); break;
      case "wave": renderWave(); break;
      case "circle": renderCircle(); break;
      case "spectrum": renderSpectrum(); break;
      case "particles": renderParticles(); break;
    }
  }

  function renderBars(): void {
    const w = canvas.width, h = canvas.height;
    const barCount = opts.barCount;
    const gap = opts.barGap;
    const totalGapWidth = (barCount - 1) * gap;
    const barWidth = (w - totalGapWidth) / barCount;
    const step = Math.floor(dataArray.length / barCount);

    for (let i = 0; i < barCount; i++) {
      // Average multiple bins for smoother result
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += dataArray[i * step + j] ?? 0;
      }
      let value = (sum / step / 255) * opts.sensitivity;
      value = Math.pow(value, 0.8); // Compress for better visuals

      // Smooth interpolation
      value = lerp(prevData[i] ?? value, value, 0.3);
      prevData[i] = value;

      const barHeight = value * h * 0.85;
      const x = i * (barWidth + gap);

      // Gradient per bar
      const gradY = h - barHeight;
      const gradient = ctx.createLinearGradient(x, h, x, gradY);
      gradient.addColorStop(0, opts.colors.primary);
      if (opts.colors.secondary) {
        gradient.addColorStop(1, opts.colors.secondary);
      }

      ctx.fillStyle = gradient;
      roundRect(ctx, x, h - barHeight, barWidth, barHeight, opts.barRadius);

      // Mirror
      if (opts.mirror) {
        ctx.globalAlpha = 0.3;
        ctx.fillRect(x, 0, barWidth, barHeight * 0.4);
        ctx.globalAlpha = 1;
      }
    }
  }

  function renderWave(): void {
    const w = canvas.width, h = canvas.height;
    analyser?.getByteTimeDomainData(dataArray);

    ctx.beginPath();
    ctx.strokeStyle = opts.colors.primary;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const sliceWidth = w / dataArray.length;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
      const v = (dataArray[i] ?? 128) / 255;
      const y = v * h;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);

      x += sliceWidth;
    }

    ctx.stroke();

    // Glow effect
    if (opts.glow && opts.colors.glow) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = opts.colors.glow;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Mirror wave below
    if (opts.mirror) {
      ctx.beginPath();
      ctx.globalAlpha = 0.25;
      x = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const v = (dataArray[i] ?? 128) / 255;
        const y = h - v * h * 0.5;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function renderCircle(): void {
    const cx = canvas.width / 2, cy = canvas.height / 2;
    const radius = Math.min(cx, cy) * 0.7;
    const innerRadius = radius * opts.circleInnerRatio;
    const segments = opts.circleSegments;
    const step = Math.floor(dataArray.length / segments);

    for (let i = 0; i < segments; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += dataArray[i * step + j] ?? 0;
      }
      let value = (sum / step / 255) * opts.sensitivity;
      value = lerp(prevData[i % prevData.length] ?? value, value, 0.25);
      prevData[i % prevData.length] = value;

      const angle = (i / segments) * Math.PI * 2 - Math.PI / 2;
      const r = innerRadius + (radius - innerRadius) * value;

      const x1 = cx + Math.cos(angle) * innerRadius;
      const y1 = cy + Math.sin(angle) * innerRadius;
      const x2 = cx + Math.cos(angle) * r;
      const y2 = cy + Math.sin(angle) * r;

      const hue = (i / segments) * 360;
      ctx.strokeStyle = `hsl(${hue}, 70%, 60%)`;
      ctx.lineWidth = Math.max(radius / segments * 1.5, 2);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = opts.colors.primary + "33";
    ctx.fill();
  }

  function renderSpectrum(): void {
    const w = canvas.width, h = canvas.height;
    const barCount = Math.min(opts.barCount * 2, 128);
    const step = Math.floor(dataArray.length / barCount);
    const barW = w / barCount - 1;

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += dataArray[i * step + j] ?? 0;
      }
      let value = (sum / step / 255) * opts.sensitivity;
      value = Math.pow(value, 0.7);

      const barH = value * h * 0.9;
      const x = i * (barW + 1);

      // Color based on frequency (rainbow)
      const hue = (i / barCount) * 280 + 200;
      ctx.fillStyle = `hsl(${hue % 360}, 75%, 55%)`;
      ctx.fillRect(x, h - barH, barW, barH);
    }
  }

  function renderParticles(): void {
    const cx = canvas.width / 2, cy = canvas.height / 2;

    // Calculate average amplitude
    let avgAmp = 0;
    for (let i = 0; i < dataArray.length; i++) avgAmp += dataArray[i] ?? 0;
    avgAmp = (avgAmp / dataArray.length / 255) * opts.sensitivity;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]!;
      const binIdx = Math.floor((i / particles.length) * dataArray.length * 0.5);
      const amp = (dataArray[binIdx % dataArray.length] ?? 0) / 255 * opts.sensitivity;

      // Update particle based on audio
      p.angle += p.speed * opts.speed * (1 + amp * 3);
      const targetDist = p.origDist * (1 + amp * 0.8);
      p.origDist = lerp(p.origDist, targetDist, 0.05);

      p.x = cx + Math.cos(p.angle) * p.origDist;
      p.y = cy + Math.sin(p.angle) * p.origDist;

      // Size reacts to amplitude
      const size = p.size * (1 + amp * 2);

      // Draw
      const alpha = 0.4 + amp * 0.6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fillStyle = opts.colors.primary;
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    if (r <= 0) { ctx.rect(x, y, w, h); return; }
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  // --- Instance ---

  const instance: AudioVisualizerInstance = {
    element: canvas,

    connect,
    disconnect,

    setType(type: VizType) {
      opts.type = type;
      if (type === "particles") initParticles();
    },

    setColors(colors: Partial<VisualizerColors>) {
      Object.assign(opts.colors, colors);
    },

    toggle() { isRunning ? stop() : start(); },

    get isRunning() { return isRunning; },

    getFrequencyData() { return dataArray; },
    getTimeDomainData() {
      if (analyser) {
        const td = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(td);
        return td;
      }
      return new Float32Array(0);
    },

    destroy() {
      destroyed = true;
      disconnect();
    },
  };

  // Auto-connect if source provided
  if (options.source) {
    connect(options.source).catch(err => opts.onError?.(err));
  }

  return instance;
}
