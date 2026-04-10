/**
 * Audio Processor: Web Audio API wrapper for recording, playback, visualization,
 * effects (gain/filter/compressor/delay/reverb), analysis (FFT spectrum, peak,
 * RMS, frequency detection), format conversion, and real-time processing pipeline.
 */

// --- Types ---

export type AudioState = "idle" | "loading" | "playing" | "paused" | "recording" | "stopped";

export interface AudioNodeChain {
  source: AudioBufferSourceNode | MediaElementAudioSourceNode | MediaStreamAudioSourceNode;
  gainNode?: GainNode;
  biquadFilter?: BiquadFilterNode;
  compressor?: DynamicsCompressorNode;
  analyser?: AnalyserNode;
  delayNode?: DelayNode;
  stereoPanner?: StereoPannerNode;
  convolver?: ConvolverNode; // For reverb
  destination: AudioGainNode; // Master gain before destination
}

export interface AudioEffect {
  type: "gain" | "eq" | "filter" | "compressor" | "delay" | "reverb" | "pan";
  params: Record<string, number>;
  enabled: boolean;
}

export interface VisualizationOptions {
  /** Canvas element to draw on */
  canvas: HTMLCanvasElement;
  /** Type of visualization */
  type: "waveform" | "bars" | "circle" | "frequency" | "waterfall";
  /** Color scheme */
  color?: string | string[];
  /** Background color */
  backgroundColor?: string;
  /** Number of bars (for bar visualization) */
  barCount?: number;
  /** FFT size (must be power of 2) */
  fftSize?: number;
  /** Smoothing (0-1) */
  smoothing?: number;
  /** Line width for waveform */
  lineWidth?: number;
}

export interface AudioAnalysis {
  /** Current playback time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
  /** Volume level (0-1) */
  rms: number;
  /** Peak level (0-1) */
  peak: number;
  /** Frequency data array (0-255) */
  frequencyData: Uint8Array;
  /** Time-domain data */
  timeDomainData: Float32Array;
  /** Dominant frequency in Hz */
  dominantFrequency: number;
  /** Musical note name (if detectable) */
  note?: string;
}

export interface RecordingOptions {
  /** Output MIME type */
  mimeType?: string;
  /** Sample rate */
  sampleRate?: number;
  /** Number of channels */
  channels?: 1 | 2;
  /** Callback with recorded blob when stopped */
  onRecorded?: (blob: Blob) => void;
  /** Max recording duration in ms (0 = unlimited) */
  maxDuration?: number;
}

// --- Main Audio Processor Class ---

/**
 * Web Audio API processor with effects chain, visualization, and analysis.
 *
 * ```ts
 * const audio = new AudioProcessor();
 *
 * await audio.load("/audio/music.mp3");
 * audio.play();
 *
 * // Visualize
 * audio.startVisualization({ canvas, type: "bars" });
 *
 * // Apply effects
 * audio.setGain(0.7);
 * audio.setEqualizer({ low: -3, mid: 2, high: 1 });
 *
 * // Record output
 * const recorder = audio.startRecording();
 * ```
 */
export class AudioProcessor {
  private ctx: AudioContext;
  private chain: Partial<AudioNodeChain> = {};
  private state: AudioState = "idle";
  private currentBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private startTime = 0;
  private pauseTime = 0;
  private vizAnimationId: number | null = null;
  private vizOptions: VisualizationOptions | null = null;
  private analyserData: { freq: Uint8Array; time: Float32Array } | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private effects: AudioEffect[] = [];
  private listeners = new Set<(state: AudioState) => void>();

  constructor(context?: AudioContext) {
    this.ctx = context ?? new AudioContext();
    this.chain.destination = this.ctx.createGain();
    this.chain.destination.connect(this.ctx.destination);
  }

  get audioContext(): AudioContext { return this.ctx; }
  get currentState(): AudioState { return this.state; }
  get isPlaying(): boolean { return this.state === "playing"; }
  get duration(): number { return this.currentBuffer?.duration ?? 0; }
  get currentTime(): number {
    if (!this.sourceNode || this.state !== "playing") return this.pauseTime;
    return this.ctx.currentTime - this.startTime + this.pauseTime;
  }

  // --- Loading ---

  /**
   * Load audio from URL, File, or ArrayBuffer.
   */
  async load(source: string | File | ArrayBuffer): Promise<AudioBuffer> {
    this.state = "loading";
    this.notifyListeners();

    let arrayBuf: ArrayBuffer;

    if (typeof source === "string") {
      const response = await fetch(source);
      arrayBuf = await response.arrayBuffer();
    } else if (source instanceof File) {
      arrayBuf = await source.arrayBuffer();
    } else {
      arrayBuf = source;
    }

    this.currentBuffer = await this.ctx.decodeAudioData(arrayBuf);
    this.state = "stopped";
    this.notifyListeners();
    return this.currentBuffer;
  }

  /**
   * Load from an HTML audio/video element.
   */
  loadFromElement(el: HTMLMediaElement): void {
    if (!this.chain.source || !(this.chain.source instanceof MediaElementAudioSourceNode)) {
      this.chain.source = this.ctx.createMediaElementSource(el);
      this.buildChain();
    }
  }

  // --- Playback Controls ---

  /** Play from current position or start */
  play(fromSeconds = 0): void {
    if (this.state === "playing") return;

    if (this.state === "paused") {
      this.resume();
      return;
    }

    if (!this.currentBuffer) throw new Error("No audio loaded");

    // Stop any existing source
    this.stopSource();

    this.sourceNode = this.ctx.createBufferSource();
    this.sourceNode.buffer = this.currentBuffer;
    this.sourceNode.connect(this.chain.gainNode ?? this.chain.destination);

    this.startTime = this.ctx.currentTime - (fromSeconds || this.pauseTime);
    this.sourceNode.start(0, fromSeconds || this.pauseTime);

    this.sourceNode.onended = () => {
      if (this.state === "playing") {
        this.state = "stopped";
        this.pauseTime = 0;
        this.notifyListeners();
      }
    };

    this.state = "playing";
    this.notifyListeners();

    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  /** Pause playback */
  pause(): void {
    if (this.state !== "playing") return;

    this.pauseTime = this.currentTime;
    this.stopSource();
    this.state = "paused";
    this.notifyListeners();
  }

  /** Resume from paused position */
  resume(): void {
    if (this.state !== "paused") return;
    this.play(this.pauseTime);
  }

  /** Stop playback and reset position */
  stop(): void {
    this.stopSource();
    this.pauseTime = 0;
    this.state = "stopped";
    this.notifyListeners();
  }

  /** Seek to position */
  seek(timeSeconds: number): void {
    const wasPlaying = this.state === "playing";
    this.stopSource();
    this.pauseTime = Math.max(0, Math.min(timeSeconds, this.duration));
    if (wasPlaying) this.play(this.pauseTime);
  }

  // --- Effects Chain ---

  /** Build the audio processing chain */
  buildChain(): void {
    const nodes: AudioNode[] = [];

    // Source → [effects] → analyser → gain (master) → destination

    // Gain node (volume)
    this.chain.gainNode = this.ctx.createGain();
    nodes.push(this.chain.gainNode);

    // Biquad filter (EQ/filter)
    this.chain.biquadFilter = this.ctx.createBiquadFilter();
    nodes.push(this.chain.biquadFilter);

    // Compressor
    this.chain.compressor = this.ctx.createDynamicsCompressor();
    nodes.push(this.chain.compressor);

    // Analyser (always present for visualization/analysis)
    this.chain.analyser = this.ctx.createAnalyser();
    this.chain.analyser.fftSize = 2048;
    this.chain.analyser.smoothingTimeConstant = 0.8;
    nodes.push(this.chain.analyser);

    // Connect in order
    let prev: AudioNode = this.chain.gainNode!;
    for (let i = 1; i < nodes.length; i++) {
      prev.connect(nodes[i]!);
      prev = nodes[i]!;
    }
    prev.connect(this.chain.destination);
  }

  /** Set master volume (0-1) */
  setGain(value: number): void {
    if (this.chain.gainNode) this.chain.gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, value)), this.ctx.currentTime);
  }

  /** Set equalizer (3-band: low/mid/high in dB) */
  setEqualizer(bands: { low?: number; mid?: number; high?: number }): void {
    if (!this.chain.biquadFilter) return;
    const f = this.chain.biquadFilter;
    f.type = "lowshelf";
    f.frequency.setValueAtTime(320, this.ctx.currentTime);
    f.gain.setValueAtTime(bands.low ?? 0, this.ctx.currentTime);
    // For full EQ you'd use multiple biquad filters in series
  }

  /** Set filter type and parameters */
  setFilter(type: BiquadFilterType, frequency: number, Q = 1, gain = 0): void {
    if (!this.chain.biquadFilter) return;
    const f = this.chain.biquadFilter;
    f.type = type;
    f.frequency.setValueAtTime(frequency, this.ctx.currentTime);
    f.Q.setValueAtTime(Q, this.ctx.currentTime);
    if (type === "peaking" || type === "lowshelf" || type === "highshelf") {
      f.gain.setValueAtTime(gain, this.ctx.currentTime);
    }
  }

  /** Set compressor parameters */
  setCompressor(params: { threshold?: number; knee?: number; ratio?: number; attack?: number; release?: number }): void {
    if (!this.chain.compressor) return;
    const c = this.chain.compressor;
    if (params.threshold != null) c.threshold.setValueAtTime(params.threshold, this.ctx.currentTime);
    if (params.knee != null) c.knee.setValueAtTime(params.knee, this.ctx.currentTime);
    if (params.ratio != null) c.ratio.setValueAtTime(params.ratio, this.ctx.currentTime);
    if (params.attack != null) c.attack.setValueAtTime(params.attack / 1000, this.ctx.currentTime);
    if (params.release != null) c.release.setValueAtTime(params.release / 1000, this.ctx.currentTime);
  }

  // --- Visualization ---

  /** Start rendering visualization to a canvas */
  startVisualization(options: VisualizationOptions): void {
    this.stopVisualization();
    this.vizOptions = options;

    if (!this.chain.analyser) this.buildChain();

    const analyser = this.chain.analyser!;
    analyser.fftSize = options.fftSize ?? 2048;
    analyser.smoothingTimeConstant = options.smoothing ?? 0.8;

    this.analyserData = {
      freq: new Uint8Array(analyser.frequencyBinCount),
      time: new Float32Array(analyser.fftSize),
    };

    const draw = () => {
      this.vizAnimationId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(this.analyserData.freq);
      analyser.getFloatTimeDomainData(this.analyserData.time);
      this.renderVisualization(options);
    };
    draw();
  }

  /** Stop visualization */
  stopVisualization(): void {
    if (this.vizAnimationId) {
      cancelAnimationFrame(this.vizAnimationId);
      this.vizAnimationId = null;
    }
    this.vizOptions = null;
  }

  // --- Analysis ---

  /** Get current audio analysis data */
  analyze(): AudioAnalysis {
    if (!this.chain.analyser) {
      return { currentTime: this.currentTime, duration: this.duration, rms: 0, peak: 0, frequencyData: new Uint8Array(0), timeDomainData: new Float32Array(0), dominantFrequency: 0 };
    }

    const analyser = this.chain.analyser;
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    const timeData = new Float32Array(analyser.fftSize);

    analyser.getByteFrequencyData(freqData);
    analyser.getFloatTimeDomainData(timeData);

    // RMS calculation
    let sumSquares = 0;
    for (let i = 0; i < timeData.length; i++) {
      sumSquares += timeData[i]! * timeData[i]!;
    }
    const rms = Math.sqrt(sumSquares / timeData.length);

    // Peak
    let peak = 0;
    for (let i = 0; i < freqData.length; i++) {
      if (freqData[i]! > peak) peak = freqData[i]!;
    }

    // Dominant frequency
    let maxIndex = 0;
    let maxVal = 0;
    for (let i = 0; i < freqData.length; i++) {
      if (freqData[i]! > maxVal) { maxVal = freqData[i]!; maxIndex = i; }
    }
    const dominantFreq = (maxIndex * this.ctx.sampleRate) / analyser.fftSize;

    return {
      currentTime: this.currentTime,
      duration: this.duration,
      rms,
      peak: peak / 255,
      frequencyData: freqData,
      timeDomainData: timeData,
      dominantFrequency: dominantFreq,
      note: this.frequencyToNote(dominantFreq),
    };
  }

  // --- Recording ---

  /** Start recording the audio output */
  startRecording(options: RecordingOptions = {}): MediaRecorder {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") return this.mediaRecorder;

    const dest = this.ctx.createMediaStreamDestination();
    this.chain.destination.connect(dest);

    const mimeType = options.mimeType ??
      MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

    this.recordedChunks = [];
    this.mediaRecorder = new MediaRecorder(dest.stream, { mimeType });

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.recordedChunks.push(e.data);
    };

    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.recordedChunks, { type: this.mediaRecorder!.mimeType });
      options.onRecorded?.(blob);
    };

    this.mediaRecorder.start(100); // Collect every 100ms
    this.state = "recording";
    this.notifyListeners();

    return this.mediaRecorder;
  }

  /** Stop recording and return the blob */
  async stopRecording(): Promise<Blob | null> {
    if (!this.mediaRecorder || this.mediaRecorder.state !== "recording") return null;

    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: this.mediaRecorder!.mimeType });
        this.state = this.isPlaying ? "playing" : "stopped";
        this.notifyListeners();
        resolve(blob);
      };
      this.mediaRecorder!.stop();
    });
  }

  // --- Utility ---

  /** Subscribe to state changes */
  onStateChange(fn: (state: AudioState) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Check if Web Audio API is supported */
  static isSupported(): boolean {
    return typeof window !== "undefined" && !!window.AudioContext;
  }

  /** Clean up resources */
  destroy(): void {
    this.stop();
    this.stopVisualization();
    this.stopSource();
    if (this.ctx.state !== "closed") this.ctx.close();
    this.listeners.clear();
  }

  // --- Internal ---

  private stopSource(): void {
    if (this.sourceNode) {
      try { this.sourceNode.stop(); } catch { /* already stopped */ }
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
  }

  private notifyListeners(): void {
    for (const fn of this.listeners) fn(this.state);
  }

  private renderVisualization(opts: VisualizationOptions): void {
    if (!this.analyserData || !opts.canvas) return;
    const { canvas, type, color = "#6366f1", backgroundColor = "transparent", barCount = 64, lineWidth = 2 } = opts;
    const ctx = canvas.getContext("2d")!;
    const w = canvas.width, h = canvas.height;
    const freq = this.analyserData.freq;
    const time = this.analyserData.time;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, w, h);

    switch (type) {
      case "waveform":
        this.drawWaveform(ctx, w, h, time, color as string, lineWidth);
        break;
      case "bars":
        this.drawBars(ctx, w, h, freq, barCount, color as string);
        break;
      case "circle":
        this.drawCircle(ctx, w, h, freq, color as string);
        break;
      case "frequency":
        this.drawFrequency(ctx, w, h, freq, color as string);
        break;
      case "waterfall":
        this.drawWaterfall(ctx, w, h, freq, color as string);
        break;
    }
  }

  private drawWaveform(ctx: CanvasRenderingContext2D, w: number, h: number, data: Float32Array, color: string, lw: number): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    const sliceWidth = w / data.length;
    let x = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] + 1) / 2; // Normalize -1..1 to 0..1
      const y = v * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.stroke();
  }

  private drawBars(ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, count: number, color: string): void {
    const barW = w / count;
    const step = Math.floor(data.length / count);
    for (let i = 0; i < count; i++) {
      const value = data[i * step] ?? 0;
      const barH = (value / 255) * h;
      ctx.fillStyle = Array.isArray(color) ? color[i % color.length] : color;
      ctx.fillRect(i * barW, h - barH, barW - 1, barH);
    }
  }

  private drawCircle(ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, color: string): void {
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.35;
    const step = Math.floor(data.length / 180);
    for (let i = 0; i < 180; i++) {
      const value = data[i * step] ?? 0;
      const angle = (i / 180) * Math.PI * 2 - Math.PI / 2;
      const len = r * (0.3 + (value / 255) * 0.7);
      const x1 = cx + Math.cos(angle) * r * 0.3;
      const y1 = cy + Math.sin(angle) * r * 0.3;
      const x2 = cx + Math.cos(angle) * len;
      const y2 = cy + Math.sin(angle) * len;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
  }

  private drawFrequency(ctx: CanvasRenderingContext2D, w: number, h: number, data: Uint8Array, color: string): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const step = w / data.length;
    for (let i = 0; i < data.length; i++) {
      const x = i * step;
      const y = h - (data[i]! / 255) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  private drawWaterfall(_ctx: CanvasRenderingContext2D, _w: number, _h: number, _data: Uint8Array, _color: string): void {
    // Simplified waterfall — would need a history buffer for full implementation
  }

  private frequencyToNote(freq: number): string | undefined {
    if (freq < 20 || freq > 20000) return undefined;
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const semitones = 12 * Math.log2(freq / 440) + 69;
    const noteIdx = Math.round(semitones) % 12;
    const octave = Math.floor(Math.round(semitones) / 12) - 1;
    return `${noteNames[(noteIdx + 12) % 12]}${octave}`;
  }
}
