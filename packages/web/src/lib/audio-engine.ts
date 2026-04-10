/**
 * audio-engine.ts — Comprehensive Web Audio API Engine
 *
 * A full-featured TypeScript audio engine covering:
 *   1. Audio Context Management
 *   2. Sound Loading & Caching
 *   3. Playback Control
 *   4. Audio Nodes / Effects Chain
 *   5. Spatial Audio
 *   6. Analysis & Visualization
 *   7. Recording
 *   8. MIDI Support (Web MIDI API)
 *   9. Utilities
 */

// ─── Type Definitions ───────────────────────────────────────────────

/** Configuration options passed when creating an AudioEngine instance. */
export interface AudioEngineOptions {
  /** Desired sample rate in Hz (e.g. 44100, 48000). */
  sampleRate?: number;
  /** Latency hint for the browser's audio context scheduling. */
  latencyHint?: AudioContextLatencyCategory | number;
  /** Initial master volume from 0 to 1. Defaults to 1. */
  masterVolume?: number;
}

/** Options that control how a sound is played back. */
export interface SoundOptions {
  /** Playback volume from 0 to 1. */
  volume?: number;
  /** Whether the sound should loop continuously. */
  loop?: boolean;
  /** Speed multiplier for playback rate (1 = normal speed). */
  playbackRate?: number;
  /** Offset in seconds at which to begin playback. */
  startTime?: number;
  /** Duration in seconds of the portion to play. */
  duration?: number;
  /** Stereo pan position from -1 (left) to 1 (right). */
  pan?: number;
  /** When to start playing relative to `AudioContext.currentTime`. */
  when?: number;
  /** Fade-in duration in seconds. */
  fadeInDuration?: number;
  /** Fade-out duration in seconds. */
  fadeOutDuration?: number;
}

/** Per-effect configuration options. */
export interface EffectOptions {
  /** Wet signal mix level from 0 to 1. */
  wet?: number;
  /** Dry signal mix level from 0 to 1. */
  dry?: number;
}

/** Gain effect options. */
export interface GainEffectOptions extends EffectOptions {
  gain?: number;
}

/** Biquad filter effect options. */
export interface FilterEffectOptions extends EffectOptions {
  type?: BiquadFilterType;
  frequency?: number;
  Q?: number;
  gain?: number;
  detune?: number;
}

/** Compressor effect options. */
export interface CompressorEffectOptions extends EffectOptions {
  threshold?: number;
  knee?: number;
  ratio?: number;
  attack?: number;
  release?: number;
}

/** Delay / echo effect options. */
export interface DelayEffectOptions extends EffectOptions {
  delayTime?: number;
  feedback?: number;
  mix?: number;
}

/** Convolver reverb effect options. */
export interface ReverbEffectOptions extends EffectOptions {
  impulseResponse?: AudioBuffer;
  impulseUrl?: string;
  normalize?: boolean;
}

/** Panner effect options. */
export interface PannerEffectOptions extends EffectOptions {
  pan?: number;
}

/** WaveShaper distortion/saturation options. */
export interface WaveShaperEffectOptions extends EffectOptions {
  amount?: number;
  oversample?: OverSampleType;
}

/** Oscillator source options. */
export interface OscillatorSourceOptions extends EffectOptions {
  type?: OscillatorType;
  frequency?: number;
  detune?: number;
}

/** Spatial audio configuration for a positional sound source. */
export interface SpatialConfig {
  /** X position in world-space coordinates. */
  x: number;
  /** Y position in world-space coordinates. */
  y: number;
  /** Z position in world-space coordinates. */
  z: number;
  /** Distance attenuation model used by the panner node. */
  distanceModel?: DistanceModelType;
  /** Maximum distance beyond which no further attenuation occurs. */
  maxDistance?: number;
  /** Reference distance at which volume begins to attenuate. */
  refDistance?: number;
  /** How quickly volume falls off with distance. */
  rolloffFactor?: number;
  /** Inner cone angle in degrees where gain is 1. */
  coneInnerAngle?: number;
  /** Outer cone angle in degrees where gain drops to outerGain. */
  coneOuterAngle?: number;
  /** Gain applied outside the outer cone. */
  coneOuterGain?: number;
}

/** Data produced by the analyser on each frame. */
export interface AnalyserData {
  /** Frequency spectrum data (0–255 per bin). */
  frequencyData: Uint8Array;
  /** Time-domain waveform data (0–255 per sample). */
  timeDomainData: Uint8Array;
  /** Floating-point frequency data (dB values). */
  floatFrequencyData: Float32Array;
  /** Root-mean-square level. */
  rms: number;
  /** Peak amplitude value. */
  peak: number;
}

/** Visualization preset types. */
export type VisualizerPreset = 'bars' | 'wave' | 'circular' | 'spectrogram';

/** Visualizer configuration. */
export interface VisualizerConfig {
  /** Canvas element or selector string to draw onto. */
  canvas: HTMLCanvasElement | string;
  /** Which visualization preset to render. */
  preset?: VisualizerPreset;
  /** FFT size for analysis resolution. */
  fftSize?: number;
  /** Foreground color for visualization elements. */
  color?: string;
  /** Background color behind the visualization. */
  bgColor?: string;
  /** Number of bars for bar/circular presets. */
  barCount?: number;
  /** Smoothing constant between 0 and 1. */
  smoothingTimeConstant?: number;
}

/** Recording format options. */
export type RecordingFormat = 'wav' | 'ogg' | 'webm';

/** Recorder configuration. */
export interface RecorderConfig {
  /** Target recording format. */
  format?: RecordingFormat;
  /** Audio bit rate for encoded formats. */
  audioBitsPerSecond?: number;
  /** Whether to monitor input levels during recording. */
  monitorLevels?: boolean;
}

/** MIDI message event payload. */
export interface MidiMessageEvent {
  /** MIDI status byte (includes channel in lower nibble for voice messages). */
  status: number;
  /** First data byte (e.g., note number or CC index). */
  data1: number;
  /** Second data byte (e.g., velocity or CC value). */
  data2: number;
  /** Timestamp when the message was received. */
  timestamp: number;
  /** The raw MIDI port that sent this message. */
  port: MIDIPort;
}

/** Channel strip state for mute/solo management. */
export interface ChannelStrip {
  id: string;
  name: string;
  muted: boolean;
  soloed: boolean;
  volume: number;
  pan: number;
}

/** Sound cache entry metadata. */
interface CacheEntry {
  buffer: AudioBuffer;
  lastAccess: number;
  size: number;
  url?: string;
}

/** Internal context role identifier. */
type ContextRole = 'main' | 'sfx' | 'music';

// ─── Section 1: Audio Context Management ────────────────────────────

/**
 * Core audio engine class wrapping one or more `AudioContext` instances.
 *
 * Provides lifecycle management, master volume control, and factory access
 * to all sub-systems (loader, effects, spatial, etc.).
 */
export class AudioEngine {
  /** The primary AudioContext used for most operations. */
  public readonly ctx: AudioContext;

  /** Secondary contexts keyed by role. */
  private readonly _contexts: Map<ContextRole, AudioContext> = new Map();

  /** Master gain node that controls overall output volume. */
  public readonly masterGain: GainNode;

  /** Master compressor applied before output. */
  public readonly masterCompressor: DynamicsCompressorNode;

  /** Analyser node connected to the master bus for global metering. */
  public readonly masterAnalyser: AnalyserNode;

  /** Current engine state. */
  private _state: 'created' | 'running' | 'suspended' | 'closed' = 'created';

  /** User gesture resume handler reference (stored so it can be removed). */
  private _resumeHandler: (() => void) | null = null;

  /** Sub-system instances created lazily. */
  private _soundLoader: SoundLoader | null = null;
  private _soundCache: SoundCache | null = null;
  private _playbackManager: PlaybackManager | null = null;
  private _effectChain: EffectChain | null = null;
  private _spatialManager: SpatialAudioManager | null = null;
  private _audioAnalyzer: AudioAnalyzer | null = null;
  private _midiManager: MidiManager | null = null;
  private _recorder: AudioRecorder | null = null;

  /** Mute/solo channel strips. */
  private _channels: Map<string, ChannelStrip> = new Map();

  constructor(options: AudioEngineOptions = {}) {
    this.ctx = new AudioContext({
      sampleRate: options.sampleRate,
      latencyHint: options.latencyHint ?? 'interactive',
    });

    // Build master signal chain: gain -> compressor -> analyser -> destination
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = options.masterVolume ?? 1;

    this.masterCompressor = this.ctx.createDynamicsCompressor();
    this.masterAnalyser = this.ctx.createAnalyser();
    this.masterAnalyser.fftSize = 2048;
    this.masterAnalyser.smoothingTimeConstant = 0.8;

    this.masterGain.connect(this.masterCompressor);
    this.masterCompressor.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.ctx.destination);

    // Store main context by role
    this._contexts.set('main', this.ctx);

    // Auto-resume on user gesture
    this._bindAutoResume();

    this._state = 'suspended';
  }

  /**
   * Returns the current state string of the underlying AudioContext.
   */
  get state(): string {
    return this._state;
  }

  /**
   * Resume the audio context. Must be called from a user gesture handler
   * in browsers that require it.
   */
  async resume(): Promise<void> {
    if (this._state === 'closed') return;
    await this.ctx.resume();
    this._state = 'running';
    for (const [, ctx] of this._contexts) {
      if (ctx.state === 'suspended') await ctx.resume();
    }
  }

  /**
   * Suspend the audio context to conserve resources.
   */
  async suspend(): Promise<void> {
    if (this._state === 'closed') return;
    await this.ctx.suspend();
    this._state = 'suspended';
  }

  /**
   * Close the audio context and release all resources.
   */
  async close(): Promise<void> {
    if (this._state === 'closed') return;
    this._unbindAutoResume();
    await this.ctx.close();
    this._state = 'closed';
    this._playbackManager?.stopAll();
  }

  /**
   * Get or create a secondary AudioContext with a specific role.
   */
  getContext(role: ContextRole): AudioContext {
    const existing = this._contexts.get(role);
    if (existing) return existing;
    const ctx = new AudioContext({ sampleRate: this.ctx.sampleRate });
    this._contexts.set(role, ctx);
    return ctx;
  }

  /**
   * Set the master output volume (0–1).
   */
  setMasterVolume(value: number): void {
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, value)), now, 0.02);
  }

  /**
   * Get the current master volume.
   */
  getMasterVolume(): number {
    return this.masterGain.gain.value;
  }

  /**
   * Mute all output instantly.
   */
  mute(): void {
    this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.01);
  }

  /**
   * Unmute and restore previous volume.
   */
  unmute(): void {
    this.masterGain.gain.setTargetAtTime(1, this.ctx.currentTime, 0.01);
  }

  // ── Lazy sub-system accessors ─────────────────────────────────

  /** Access the sound loader subsystem. */
  get loader(): SoundLoader {
    if (!this._soundLoader) this._soundLoader = new SoundLoader(this.ctx);
    return this._soundLoader;
  }

  /** Access the sound cache subsystem. */
  get cache(): SoundCache {
    if (!this._soundCache) this._soundCache = new SoundCache(50);
    return this._soundCache;
  }

  /** Access the playback manager subsystem. */
  get playback(): PlaybackManager {
    if (!this._playbackManager) this._playbackManager = new PlaybackManager(this);
    return this._playbackManager;
  }

  /** Access the effects chain builder. */
  get effects(): EffectChain {
    if (!this._effectChain) this._effectChain = new EffectChain(this.ctx);
    return this._effectChain;
  }

  /** Access the spatial audio manager. */
  get spatial(): SpatialAudioManager {
    if (!this._spatialManager) this._spatialManager = new SpatialAudioManager(this.ctx);
    return this._spatialManager;
  }

  /** Access the audio analyzer. */
  get analyzer(): AudioAnalyzer {
    if (!this._audioAnalyzer) this._audioAnalyzer = new AudioAnalyzer(this.ctx);
    return this._audioAnalyzer;
  }

  /** Access the MIDI manager. */
  get midi(): MidiManager {
    if (!this._midiManager) this._midiManager = new MidiManager();
    return this._midiManager;
  }

  /** Access the audio recorder. */
  get recorder(): AudioRecorder {
    if (!this._recorder) this._recorder = new AudioRecorder(this.ctx);
    return this._recorder;
  }

  // ── Channel strip management ──────────────────────────────────

  /**
   * Register a new channel strip for mute/solo routing.
   */
  addChannel(id: string, name: string, volume = 1, pan = 0): ChannelStrip {
    const strip: ChannelStrip = { id, name, muted: false, soloed: false, volume, pan };
    this._channels.set(id, strip);
    return strip;
  }

  /**
   * Retrieve a registered channel strip by ID.
   */
  getChannel(id: string): ChannelStrip | undefined {
    return this._channels.get(id);
  }

  /**
   * Toggle mute on a channel.
   */
  toggleMute(id: string): boolean {
    const ch = this._channels.get(id);
    if (!ch) return false;
    ch.muted = !ch.muted;
    this._updateChannelRouting();
    return ch.muted;
  }

  /**
   * Toggle solo on a channel.
   */
  toggleSolo(id: string): boolean {
    const ch = this._channels.get(id);
    if (!ch) return false;
    ch.soloed = !ch.soloed;
    this._updateChannelRouting();
    return ch.soloed;
  }

  /**
   * Check whether a given channel should currently produce audible output
   * based on its own mute/solo state and the states of all other channels.
   */
  isChannelAudible(id: string): boolean {
    const ch = this._channels.get(id);
    if (!ch || ch.muted) return false;
    const anySolo = Array.from(this._channels.values()).some((c) => c.soloed);
    if (anySolo && !ch.soloed) return false;
    return true;
  }

  /** Recalculate gains after a mute/solo change. */
  private _updateChannelRouting(): void {
    // Intended as a hook; actual gain nodes are managed externally via
    // the channel strip's `volume` property being read by consumers.
  }

  // ── Auto-resume handling ──────────────────────────────────────

  private _bindAutoResume(): void {
    const resume = () => {
      if (this._state === 'suspended' || this.ctx.state === 'suspended') {
        this.resume().catch(() => {});
      }
    };
    this._resumeHandler = resume;
    document.addEventListener('click', resume, { once: false });
    document.addEventListener('touchstart', resume, { once: false });
    document.addEventListener('keydown', resume, { once: false });
  }

  private _unbindAutoResume(): void {
    if (this._resumeHandler) {
      document.removeEventListener('click', this._resumeHandler);
      document.removeEventListener('touchstart', this._resumeHandler);
      document.removeEventListener('keydown', this._resumeHandler);
      this._resumeHandler = null;
    }
  }
}

/**
 * Factory function that creates and returns a configured `AudioEngine` instance.
 *
 * @param options - Optional engine configuration.
 * @returns A ready-to-use AudioEngine (still suspended until resumed).
 */
export function createAudioEngine(options?: AudioEngineOptions): AudioEngine {
  return new AudioEngine(options);
}


// ─── Section 2: Sound Loading & Caching ────────────────────────────

/**
 * Handles loading audio assets from various sources into decoded AudioBuffers.
 */
export class SoundLoader {
  private readonly _ctx: AudioContext;

  constructor(ctx: AudioContext) {
    this._ctx = ctx;
  }

  /**
   * Load an audio file from a URL and decode it into an AudioBuffer.
   *
   * @param url - Absolute or relative URL to the audio resource.
   * @param options - Optional fetch init overrides.
   * @returns Decoded AudioBuffer ready for playback.
   */
  async loadFromUrl(url: string, options?: RequestInit): Promise<AudioBuffer> {
    const response = await fetch(url, options ?? {});
    if (!response.ok) throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    return this.decode(arrayBuffer);
  }

  /**
   * Decode a raw ArrayBuffer containing encoded audio data.
   *
   * @param arrayBuffer - Raw bytes of an audio file.
   * @returns Decoded AudioBuffer.
   */
  async decode(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    return this._ctx.decodeAudioData(arrayBuffer.slice(0));
  }

  /**
   * Load audio from a base64-encoded data-URI string.
   *
   * @param base64 - Base64 data URI (e.g. "data:audio/mp3;base64,...").
   * @returns Decoded AudioBuffer.
   */
  async loadFromBase64(base64: string): Promise<AudioBuffer> {
    const response = await fetch(base64);
    const arrayBuffer = await response.arrayBuffer();
    return this.decode(arrayBuffer);
  }

  /**
   * Load audio from an existing ArrayBuffer directly.
   *
   * @param buffer - Encoded audio bytes.
   * @returns Decoded AudioBuffer.
   */
  async loadFromArrayBuffer(buffer: ArrayBuffer): Promise<AudioBuffer> {
    return this.decode(buffer);
  }

  /**
   * Detect the likely audio format from a URL or MIME type string.
   *
   * @param src - URL or MIME type string to inspect.
   * @returns Lowercase format string ('mp3', 'ogg', 'wav', etc.) or 'unknown'.
   */
  detectFormat(src: string): string {
    const extMatch = src.match(/\.(\w+)(\?|$)/i);
    if (extMatch) return extMatch[1].toLowerCase();
    const mimeMatch = src.match(/audio\/(\w+)/i);
    if (mimeMatch) return mimeMatch[1].toLowerCase();
    return 'unknown';
  }

  /**
   * Preload multiple sounds in parallel, returning a map of key → AudioBuffer.
   *
   * @param urls - Record mapping logical keys to URLs.
   * @returns Record of decoded buffers keyed by the same keys.
   */
  async preloadBatch(urls: Record<string, string>): Promise<Record<string, AudioBuffer>> {
    const entries = Object.entries(urls);
    const results = await Promise.allSettled(
      entries.map(async ([key, url]) => [key, await this.loadFromUrl(url)] as const)
    );
    const out: Record<string, AudioBuffer> = {};
    for (const result of results) {
      if (result.status === 'fulfilled') {
        out[result.value[0]] = result.value[1];
      }
    }
    return out;
  }
}

/**
 * LRU (Least Recently Used) cache for decoded AudioBuffers.
 *
 * Automatically evicts the oldest entry when capacity is exceeded.
 */
export class SoundCache {
  private readonly _cache: Map<string, CacheEntry> = new Map();
  private readonly _maxSize: number;
  private _currentSize = 0;

  /**
   * @param maxSize - Maximum number of cached buffers (default 50).
   */
  constructor(maxSize = 50) {
    this._maxSize = maxSize;
  }

  /**
   * Store a decoded buffer in the cache under the given key.
   *
   * @param key - Unique identifier for this sound.
   * @param buffer - Decoded AudioBuffer to cache.
   * @param url - Optional original URL for reference.
   */
  set(key: string, buffer: AudioBuffer, url?: string): void {
    if (this._cache.has(key)) {
      const old = this._cache.get(key)!;
      this._currentSize -= old.size;
    }
    const size = buffer.length * buffer.numberOfChannels * 4; // 4 bytes per float32 sample
    while (this._cache.size >= this._maxSize && this._cache.size > 0) {
      this._evictOldest();
    }
    this._cache.set(key, { buffer, lastAccess: Date.now(), size, url });
    this._currentSize += size;
  }

  /**
   * Retrieve a cached buffer by key. Updates LRU access order.
   *
   * @param key - Cache key.
   * @returns Cached AudioBuffer or undefined if not found.
   */
  get(key: string): AudioBuffer | undefined {
    const entry = this._cache.get(key);
    if (!entry) return undefined;
    entry.lastAccess = Date.now();
    return entry.buffer;
  }

  /**
   * Check whether a key exists in the cache.
   */
  has(key: string): boolean {
    return this._cache.has(key);
  }

  /**
   * Remove a specific entry from the cache.
   */
  remove(key: string): boolean {
    const entry = this._cache.get(key);
    if (!entry) return false;
    this._currentSize -= entry.size;
    this._cache.delete(key);
    return true;
  }

  /**
   * Clear all cached entries.
   */
  clear(): void {
    this._cache.clear();
    this._currentSize = 0;
  }

  /**
   * Return the current number of cached entries.
   */
  get size(): number {
    return this._cache.size;
  }

  /**
   * Return approximate total memory usage in bytes.
   */
  get memoryUsage(): number {
    return this._currentSize;
  }

  private _evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this._cache) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }
    if (oldestKey !== null) {
      this.remove(oldestKey);
    }
  }
}


// ─── Section 3: Playback Control ───────────────────────────────────

/**
 * Represents a single playing instance of a sound.
 *
 * Each call to `engine.playback.play()` creates a new `SoundInstance`
 * that can be independently controlled (pause/stop/seek/volume/fade).
 */
export class SoundInstance {
  /** Unique identifier for this instance. */
  public readonly id: string;

  /** The source buffer being played. */
  public readonly buffer: AudioBuffer;

  /** Underlying AudioBufferSourceNode. */
  public sourceNode: AudioBufferSourceNode;

  /** Gain node controlling this instance's volume. */
  public gainNode: GainNode;

  /** Optional stereo panner node. */
  public pannerNode: StereoPannerNode | null = null;

  /** Pan position (-1 to 1). */
  private _pan = 0;

  /** Current volume (0–1). */
  private _volume = 1;

  /** Whether the instance is set to loop. */
  private _loop = false;

  /** Playback rate multiplier. */
  private _playbackRate = 1;

  /** Current playback offset in seconds. */
  private _offset = 0;

  /** Total duration of the source buffer. */
  public readonly duration: number;

  /** Whether the instance is currently playing. */
  private _playing = false;

  /** Parent engine reference for context access. */
  private readonly _engine: AudioEngine;

  /** Callback invoked when playback ends naturally or via stop(). */
  public onEnded: ((instance: SoundInstance) => void) | null = null;

  /** Scheduled fade-out gain automation end time. */
  private _fadeEndTime = 0;

  constructor(engine: AudioEngine, buffer: AudioBuffer, options: SoundOptions = {}) {
    this.id = `si_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this._engine = engine;
    this.buffer = buffer;
    this.duration = buffer.duration;

    this.sourceNode = engine.ctx.createBufferSource();
    this.sourceNode.buffer = buffer;
    this.sourceNode.loop = options.loop ?? false;
    this._loop = this.sourceNode.loop;
    this.sourceNode.playbackRate.value = options.playbackRate ?? 1;
    this._playbackRate = this.sourceNode.playbackRate.value;

    this.gainNode = engine.ctx.createGain();
    this.gainNode.gain.value = options.volume ?? 1;
    this._volume = this.gainNode.gain.value;

    if (options.pan !== undefined && options.pan !== 0) {
      this.pannerNode = engine.ctx.createStereoPanner();
      this.pannerNode.pan.value = options.pan;
      this._pan = options.pan;
      this.sourceNode.connect(this.pannerNode);
      this.pannerNode.connect(this.gainNode);
    } else {
      this.sourceNode.connect(this.gainNode);
    }

    this.gainNode.connect(engine.masterGain);

    this.sourceNode.onended = () => {
      if (this._playing) {
        this._playing = false;
        this.onEnded?.(this);
      }
    };
  }

  /** Current volume level (0–1). */
  get volume(): number { return this._volume; }
  set volume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
    const now = this._engine.ctx.currentTime;
    this.gainNode.gain.setTargetAtTime(this._volume, now, 0.02);
  }

  /** Current pan position (-1 left, 0 center, 1 right). */
  get pan(): number { return this._pan; }
  set pan(p: number) {
    this._pan = Math.max(-1, Math.min(1, p));
    if (this.pannerNode) {
      const now = this._engine.ctx.currentTime;
      this.pannerNode.pan.setTargetAtTime(this._pan, now, 0.02);
    }
  }

  /** Whether looping is enabled. */
  get loop(): boolean { return this._loop; }
  set loop(l: boolean) {
    this._loop = l;
    try { this.sourceNode.loop = l; } catch { /* may throw if already started */ }
  }

  /** Playback rate multiplier. */
  get playbackRate(): number { return this._playbackRate; }
  set playbackRate(r: number) {
    this._playbackRate = r;
    this.sourceNode.playbackRate.setTargetAtTime(r, this._engine.ctx.currentTime, 0.02);
  }

  /** Whether the instance is currently playing. */
  get playing(): boolean { return this._playing; }

  /**
   * Start (or resume) playback.
   *
   * @param when - Optional scheduled start time relative to AudioContext.currentTime.
   * @param offset - Offset into the buffer in seconds.
   */
  play(when?: number, offset?: number): void {
    if (this._playing) return;
    const startOffset = offset ?? this._offset;
    const startTime = when ?? 0;
    this._offset = startOffset;
    this.sourceNode.start(this._engine.ctx.currentTime + startTime, startOffset);
    this._playing = true;
  }

  /**
   * Pause playback by stopping the source and recording the current offset.
   * A new source node will be created on the next `play()` call.
   */
  pause(): void {
    if (!this._playing) return;
    this._offset = this.getCurrentTime();
    this._stopSource(false);
    this._playing = false;
  }

  /**
   * Stop playback completely and reset offset to zero.
   */
  stop(): void {
    this._stopSource(true);
    this._offset = 0;
    this._playing = false;
    this.onEnded?.(this);
  }

  /**
   * Seek to a specific position in seconds.
   *
   * @param time - Target position in seconds (clamped to buffer duration).
   */
  seek(time: number): void {
    const wasPlaying = this._playing;
    if (wasPlaying) this.pause();
    this._offset = Math.max(0, Math.min(time, this.duration));
    if (wasPlaying) this.play();
  }

  /**
   * Get the current playback position in seconds.
   */
  getCurrentTime(): number {
    if (!this._playing) return this._offset;
    // Estimate based on context time since play started (approximate)
    return this._offset + (this._engine.ctx.currentTime - (this._playStartTime ?? this._engine.ctx.currentTime)) * this._playbackRate;
  }

  /** Approximate time when play was last called. */
  private _playStartTime = 0;

  /**
   * Fade volume from current value to target over a duration.
   *
   * @param targetVolume - Target volume (0–1).
   * @param duration - Fade length in seconds.
   */
  fadeTo(targetVolume: number, duration: number): void {
    const now = this._engine.ctx.currentTime;
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(this._volume, now);
    this.gainNode.gain.linearRampToValueAtTime(
      Math.max(0, Math.min(1, targetVolume)),
      now + duration
    );
    this._fadeEndTime = now + duration;
    this._volume = targetVolume;
  }

  /**
   * Fade in from silence to current volume.
   *
   * @param duration - Fade-in length in seconds.
   */
  fadeIn(duration: number): void {
    const now = this._engine.ctx.currentTime;
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(0, now);
    this.gainNode.gain.linearRampToValueAtTime(this._volume, now + duration);
  }

  /**
   * Fade out from current volume to silence, then stop.
   *
   * @param duration - Fade-out length in seconds.
   */
  fadeOutAndStop(duration: number): void {
    const now = this._engine.ctx.currentTime;
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(this._volume, now);
    this.gainNode.gain.linearRampToValueAtTime(0, now + duration);
    setTimeout(() => this.stop(), duration * 1000 + 50);
  }

  /**
   * Disconnect all nodes and clean up resources.
   */
  destroy(): void {
    this.stop();
    try { this.sourceNode.disconnect(); } catch { /* already disconnected */ }
    try { this.gainNode.disconnect(); } catch { /* */ }
    if (this.pannerNode) {
      try { this.pannerNode.disconnect(); } catch { /* */ }
    }
  }

  private _stopSource(resetOffset: boolean): void {
    try {
      this.sourceNode.stop();
      this.sourceNode.disconnect();
    } catch {
      // Source may have already stopped
    }
    if (resetOffset) this._offset = 0;
    // Recreate source node so it can be restarted later
    this.sourceNode = this._engine.ctx.createBufferSource();
    this.sourceNode.buffer = this.buffer;
    this.sourceNode.loop = this._loop;
    this.sourceNode.playbackRate.value = this._playbackRate;
    this.sourceNode.onended = () => {
      if (this._playing) {
        this._playing = false;
        this.onEnded?.(this);
      }
    };
    if (this.pannerNode) {
      this.sourceNode.connect(this.pannerNode);
    } else {
      this.sourceNode.connect(this.gainNode);
    }
  }
}

/**
 * Manages multiple simultaneous `SoundInstance` objects.
 *
 * Provides batch operations (stop all, pause all), crossfade between
 * instances, and cleanup of finished instances.
 */
export class PlaybackManager {
  private readonly _engine: AudioEngine;
  private readonly _instances: Map<string, SoundInstance> = new Map();

  constructor(engine: AudioEngine) {
    this._engine = engine;
  }

  /**
   * Play a sound buffer with the given options.
   *
   * @param buffer - Decoded AudioBuffer to play.
   * @param options - Playback options (volume, loop, pan, fade, etc.).
   * @returns The created SoundInstance.
   */
  play(buffer: AudioBuffer, options: SoundOptions = {}): SoundInstance {
    const instance = new SoundInstance(this._engine, buffer, options);
    this._instances.set(instance.id, instance);

    // Handle auto-fade-in/out
    if (options.fadeInDuration && options.fadeInDuration > 0) {
      instance.fadeIn(options.fadeInDuration);
    }

    instance.play(options.when, options.startTime);

    // Auto-remove on ended
    instance.onEnded = (inst) => {
      this._instances.delete(inst.id);
    };

    return instance;
  }

  /**
   * Play a sound by URL (loads then plays).
   *
   * @param url - URL of the audio file.
   * @param options - Playback options.
   * @returns Promise resolving to the SoundInstance once loaded and started.
   */
  async playUrl(url: string, options: SoundOptions = {}): Promise<SoundInstance> {
    const buffer = await this._engine.loader.loadFromUrl(url);
    return this.play(buffer, options);
  }

  /**
   * Get an active instance by its ID.
   */
  getInstance(id: string): SoundInstance | undefined {
    return this._instances.get(id);
  }

  /**
   * Stop all active playback instances.
   */
  stopAll(): void {
    for (const inst of this._instances.values()) {
      inst.destroy();
    }
    this._instances.clear();
  }

  /**
   * Pause all active instances without stopping them.
   */
  pauseAll(): void {
    for (const inst of this._instances.values()) {
      inst.pause();
    }
  }

  /**
   * Resume all paused instances.
   */
  resumeAll(): void {
    for (const inst of this._instances.values()) {
      inst.play();
    }
  }

  /**
   * Crossfade from one instance to another.
   *
   * @param fromId - Instance fading out.
   * @param toBufferOrId - Buffer to play (or instance ID already playing) fading in.
   * @param duration - Crossfade duration in seconds.
   * @returns The incoming SoundInstance (newly created if a buffer was provided).
   */
  async crossfade(
    fromId: string,
    toBufferOrId: AudioBuffer | string,
    duration: number
  ): Promise<SoundInstance> {
    const fromInst = this._instances.get(fromId);
    if (fromInst) fromInst.fadeOutAndStop(duration);

    let toBuffer: AudioBuffer;
    let toInst: SoundInstance;
    if (typeof toBufferOrId === 'string') {
      toInst = this._instances.get(toBufferOrId)!;
      if (toInst) toInst.fadeIn(duration);
      else throw new Error(`Crossfade target instance "${toBufferOrId}" not found`);
    } else {
      toBuffer = toBufferOrId;
      toInst = this.play(toBuffer, { fadeInDuration: duration });
    }
    return toInst;
  }

  /**
   * Schedule playback to start at a precise future time.
   *
   * @param buffer - AudioBuffer to schedule.
   * @param when - Absolute time in seconds (from AudioContext.currentTime).
   * @param options - Additional playback options.
   * @returns The scheduled SoundInstance.
   */
  schedulePlay(buffer: AudioBuffer, when: number, options: SoundOptions = {}): SoundInstance {
    return this.play(buffer, { ...options, when });
  }

  /**
   * Number of currently active instances.
   */
  get activeCount(): number {
    return this._instances.size;
  }

  /**
   * Array of all active instance IDs.
   */
  get activeIds(): string[] {
    return Array.from(this._instances.keys());
  }
}


// ─── Section 4: Audio Nodes / Effects Chain ────────────────────────

/**
 * Builds and manages a chain of audio processing effects.
 *
 * Signal flow (default):
 *   input → gain → filter → compressor → delay → convolver → waveshaper → panner → analyser → output
 *
 * Individual effects can be bypassed or reordered.
 */
export class EffectChain {
  private readonly _ctx: AudioContext;
  private readonly _nodes: Map<string, AudioNode> = new Map();
  private readonly _bypassed: Set<string> = new Set();

  /** Default signal chain order. */
  private static readonly CHAIN_ORDER = [
    'gain', 'filter', 'compressor', 'delay', 'convolver',
    'waveshaper', 'panner', 'analyser',
  ];

  constructor(ctx: AudioContext) {
    this._ctx = ctx;
    this._buildDefaultChain();
  }

  /** The underlying AudioContext. */
  get ctx(): AudioContext { return this._ctx; }

  /**
   * Connect the entire chain's input to a source node and output to a destination.
   *
   * @param source - Source AudioNode to connect to chain input.
   * @param destination - Destination AudioNode for chain output (defaults to ctx.destination).
   */
  connect(source: AudioNode, destination?: AudioNode): void {
    const dest = destination ?? this._ctx.destination;
    const orderedNodes = this._getOrderedActiveNodes();
    if (orderedNodes.length === 0) {
      source.connect(dest);
      return;
    }
    source.connect(orderedNodes[0]);
    for (let i = 0; i < orderedNodes.length - 1; i++) {
      orderedNodes[i].connect(orderedNodes[i + 1]);
    }
    orderedNodes[orderedNodes.length - 1].connect(dest);
  }

  /**
   * Disconnect all internal chain nodes.
   */
  disconnect(): void {
    for (const node of this._nodes.values()) {
      try { node.disconnect(); } catch { /* */ }
    }
  }

  // ── Built-in effect creators ──────────────────────────────────

  /**
   * Create or configure a GainNode for volume control.
   */
  createGain(options: GainEffectOptions = {}): GainNode {
    const gain = this._ensureNode<GainNode>('gain', () => this._ctx.createGain());
    gain.gain.value = options.gain ?? 1;
    return gain;
  }

  /**
   * Create or configure a BiquadFilterNode.
   */
  createFilter(options: FilterEffectOptions = {}): BiquadFilterNode {
    const filter = this._ensureNode<BiquadFilterNode>('filter', () => this._ctx.createBiquadFilter());
    if (options.type !== undefined) filter.type = options.type;
    if (options.frequency !== undefined) filter.frequency.value = options.frequency;
    if (options.Q !== undefined) filter.Q.value = options.Q;
    if (options.gain !== undefined) filter.gain.value = options.gain;
    if (options.detune !== undefined) filter.detune.value = options.detune;
    return filter;
  }

  /**
   * Create or configure a DynamicsCompressorNode.
   */
  createCompressor(options: CompressorEffectOptions = {}): DynamicsCompressorNode {
    const comp = this._ensureNode<DynamicsCompressorNode>('compressor', () => this._ctx.createDynamicsCompressor());
    if (options.threshold !== undefined) comp.threshold.value = options.threshold;
    if (options.knee !== undefined) comp.knee.value = options.knee;
    if (options.ratio !== undefined) comp.ratio.value = options.ratio;
    if (options.attack !== undefined) comp.attack.value = options.attack;
    if (options.release !== undefined) comp.release.value = options.release;
    return comp;
  }

  /**
   * Create a DelayNode with optional feedback loop for echo/reverb simulation.
   *
   * Returns the delay node. Internally also creates a feedback gain node.
   */
  createDelay(options: DelayEffectOptions = {}): DelayNode {
    const delay = this._ensureNode<DelayNode>('delay', () => this._ctx.createDelay(5));
    delay.delayTime.value = options.delayTime ?? 0.3;

    // Feedback loop: delay -> feedbackGain -> delay
    const fbKey = 'delayFeedback';
    if (!this._nodes.has(fbKey)) {
      const fbGain = this._ctx.createGain();
      fbGain.gain.value = options.feedback ?? 0.3;
      this._nodes.set(fbKey, fbGain);
      delay.connect(fbGain);
      fbGain.connect(delay);
    } else {
      (this._nodes.get(fbKey) as GainNode).gain.value = options.feedback ?? 0.3;
    }

    // Wet/dry mix
    const mixKey = 'delayMix';
    if (!this._nodes.has(mixKey)) {
      const wetGain = this._ctx.createGain();
      const dryGain = this._ctx.createGain();
      wetGain.gain.value = options.mix ?? 0.5;
      dryGain.gain.value = 1 - (options.mix ?? 0.5);
      this._nodes.set(mixKey + 'Wet', wetGain);
      this._nodes.set(mixKey + 'Dry', dryGain);
    }

    return delay;
  }

  /**
   * Create or configure a ConvolverNode for impulse-response reverb.
   */
  async createReverb(options: ReverbEffectOptions = {}): Promise<ConvolverNode> {
    const convolver = this._ensureNode<ConvolverNode>('convolver', () => this._ctx.createConvolver());
    convolver.normalize = options.normalize ?? true;

    if (options.impulseResponse) {
      convolver.buffer = options.impulseResponse;
    } else if (options.impulseUrl) {
      const resp = await fetch(options.impulseUrl);
      const ab = await resp.arrayBuffer();
      convolver.buffer = await this._ctx.decodeAudioData(ab.slice(0));
    }
    return convolver;
  }

  /**
   * Create or configure a StereoPannerNode.
   */
  createPanner(options: PannerEffectOptions = {}): StereoPannerNode {
    const panner = this._ensureNode<StereoPannerNode>('panner', () => this._ctx.createStereoPanner());
    if (options.pan !== undefined) panner.pan.value = options.pan;
    return panner;
  }

  /**
   * Create or configure an AnalyserNode for real-time FFT/waveform data.
   */
  createAnalyser(fftSize = 2048, smoothingTimeConstant = 0.8): AnalyserNode {
    const analyser = this._ensureNode<AnalyserNode>('analyser', () => this._ctx.createAnalyser());
    analyser.fftSize = fftSize;
    analyser.smoothingTimeConstant = smoothingTimeConstant;
    return analyser;
  }

  /**
   * Create or configure a WaveShaperNode for distortion/saturation effects.
   */
  createWaveShaper(options: WaveShaperEffectOptions = {}): WaveShaperNode {
    const shaper = this._ensureNode<WaveShaperNode>('waveshaper', () => this._ctx.createWaveShaper());
    shaper.oversample = options.oversample ?? 'none';

    const amount = options.amount ?? 0;
    if (amount === 0) {
      shaper.curve = null;
    } else {
      const samples = 44100;
      const curve = new Float32Array(samples);
      const deg = Math.PI / 180;
      for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1;
        curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
      }
      shaper.curve = curve;
    }
    return shaper;
  }

  /**
   * Create an OscillatorNode as a signal generator source.
   *
   * @param options - Oscillator type, frequency, and detune settings.
   * @returns The oscillator node (not yet started).
   */
  createOscillator(options: OscillatorSourceOptions = {}): OscillatorNode {
    const osc = this._ctx.createOscillator();
    osc.type = options.type ?? 'sine';
    osc.frequency.value = options.frequency ?? 440;
    osc.detune.value = options.detune ?? 0;
    return osc;
  }

  // ── Chain management ──────────────────────────────────────────

  /**
   * Bypass an effect by name (signal passes through unprocessed).
   */
  bypass(name: string): void {
    this._bypassed.add(name);
  }

  /**
   * Re-enable a previously bypassed effect.
   */
  unbypass(name: string): void {
    this._bypassed.delete(name);
  }

  /**
   * Check if an effect is currently bypassed.
   */
  isBypassed(name: string): boolean {
    return this._bypassed.has(name);
  }

  /**
   * Retrieve any node in the chain by name.
   */
  getNode<T extends AudioNode>(name: string): T | undefined {
    return this._nodes.get(name) as T | undefined;
  }

  // ── Internal helpers ──────────────────────────────────────────

  private _buildDefaultChain(): void {
    this.createGain();
    this.createFilter({ type: 'lowpass', frequency: 20000, Q: 0 });
    this.createCompressor();
    this.createDelay();
    this.createPanner();
    this.createAnalyser();
    this.createWaveShaper();
  }

  private _ensureNode<T extends AudioNode>(key: string, factory: () => T): T {
    let node = this._nodes.get(key) as T | undefined;
    if (!node) {
      node = factory();
      this._nodes.set(key, node);
    }
    return node;
  }

  private _getOrderedActiveNodes(): AudioNode[] {
    return EffectChain.CHAIN_ORDER
      .filter((name) => this._nodes.has(name) && !this._bypassed.has(name))
      .map((name) => this._nodes.get(name)!)
      .filter(Boolean);
  }
}


// ─── Section 5: Spatial Audio ──────────────────────────────────────

/**
 * Manages 3D positional audio using PannerNodes and listener orientation.
 *
 * Supports distance models, directional sound cones, Doppler approximation,
 * and HRTF-like stereo panning fallback.
 */
export class SpatialAudioManager {
  private readonly _ctx: AudioContext;
  private readonly _sources: Map<string, AudioSource> = new Map();
  private _listenerPos: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private _listenerForward: { x: number; y: number; z: number } = { x: 0, y: 0, z: -1 };
  private _listenerUp: { x: number; y: number; z: number } = { x: 0, y: 1, z: 0 };
  private _speedOfSound = 343;

  constructor(ctx: AudioContext) {
    this._ctx = ctx;
  }

  /**
   * Create a positional audio source.
   *
   * @param config - Positional configuration (x, y, z, distance model, cones...).
   * @returns An AudioSource ready to receive audio input.
   */
  createSource(config: SpatialConfig): AudioSource {
    const source = new AudioSource(this._ctx, config);
    this._sources.set(source.id, source);
    this._updateSource(source);
    return source;
  }

  /**
   * Remove and clean up a positional source.
   */
  removeSource(id: string): void {
    const src = this._sources.get(id);
    if (src) {
      src.destroy();
      this._sources.delete(id);
    }
  }

  /**
   * Update the audio listener's position in 3D space.
   */
  setListenerPosition(x: number, y: number, z: number): void {
    this._listenerPos = { x, y, z };
    this._ctx.listener.setPosition(x, y, z);
    this._refreshAllSources();
  }

  /**
   * Set the listener's orientation vectors (forward direction and up direction).
   */
  setListenerOrientation(
    fx: number, fy: number, fz: number,
    ux: number, uy: number, uz: number
  ): void {
    this._listenerForward = { x: fx, y: fy, z: fz };
    this._listenerUp = { x: ux, y: uy, z: uz };
    this._ctx.listener.setOrientation(fx, fy, fz, ux, uy, uz);
    this._refreshAllSources();
  }

  /**
   * Set the effective speed of sound for Doppler calculations (default 343 m/s).
   */
  setSpeedOfSound(speed: number): void {
    this._speedOfSound = speed;
    for (const src of this._sources.values()) {
      (src.panner as any).speedOfSound = speed;
    }
  }

  /**
   * Get a source by ID.
   */
  getSource(id: string): AudioSource | undefined {
    return this._sources.get(id);
  }

  /**
   * Number of active spatial sources.
   */
  get sourceCount(): number {
    return this._sources.size;
  }

  private _refreshAllSources(): void {
    for (const src of this._sources.values()) {
      this._updateSource(src);
    }
  }

  private _updateSource(src: AudioSource): void {
    // Recalculate distance-based gain and cone attenuation whenever
    // the listener moves. Actual Web Audio PannerNode handles most of
    // this natively; this method exists for custom extensions.
    src.updateFromListener(this._listenerPos, this._listenerForward);
  }
}

/**
 * A single positional sound source with distance model and cone parameters.
 */
export class AudioSource {
  /** Unique source identifier. */
  public readonly id: string;

  /** The underlying PannerNode for 3D positioning. */
  public readonly panner: PannerNode;

  /** Input gain node for volume control before spatialization. */
  public readonly inputGain: GainNode;

  /** Current position in 3D space. */
  private _position: { x: number; y: number; z: number };

  /** Cone configuration. */
  private _coneInnerAngle: number;
  private _coneOuterAngle: number;
  private _coneOuterGain: number;

  /** Last calculated distance to listener. */
  private _distance = 0;

  constructor(ctx: AudioContext, config: SpatialConfig) {
    this.id = `sp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this._position = { x: config.x, y: config.y, z: config.z };

    this.inputGain = ctx.createGain();
    this.panner = ctx.createPanner();

    // Configure panner
    this.panner.panningModel = 'HRTF';
    this.panner.distanceModel = config.distanceModel ?? 'inverse';
    this.panner.refDistance = config.refDistance ?? 1;
    this.panner.maxDistance = config.maxDistance ?? 10000;
    this.panner.rolloffFactor = config.rolloffFactor ?? 1;
    this.panner.coneInnerAngle = config.coneInnerAngle ?? 360;
    this.panner.coneOuterAngle = config.coneOuterAngle ?? 360;
    this.panner.coneOuterGain = config.coneOuterGain ?? 0;

    this._coneInnerAngle = this.panner.coneInnerAngle;
    this._coneOuterAngle = this.panner.coneOuterAngle;
    this._coneOuterGain = this.panner.coneOuterGain;

    this.panner.positionX.value = config.x;
    this.panner.positionY.value = config.y;
    this.panner.positionZ.value = config.z;

    // Connect input -> gain -> panner
    this.inputGain.connect(this.panner);
  }

  /** Current X position. */
  get x(): number { return this._position.x; }
  /** Current Y position. */
  get y(): number { return this._position.y; }
  /** Current Z position. */
  get z(): number { return this._position.z; }

  /**
   * Move the source to a new position.
   */
  setPosition(x: number, y: number, z: number): void {
    this._position = { x, y, z };
    const now = this.panner.context.currentTime;
    this.panner.positionX.setTargetAtTime(x, now, 0.02);
    this.panner.positionY.setTargetAtTime(y, now, 0.02);
    this.panner.positionZ.setTargetAtTime(z, now, 0.02);
  }

  /**
   * Set directional sound cone parameters.
   *
   * @param innerAngle - Angle in degrees where gain is 1.
   * @param outerAngle - Angle in degrees where gain drops to outerGain.
   * @param outerGain - Gain applied outside the outer cone (0–1).
   */
  setCone(innerAngle: number, outerAngle: number, outerGain: number): void {
    this._coneInnerAngle = innerAngle;
    this._coneOuterAngle = outerAngle;
    this._coneOuterGain = outerGain;
    this.panner.coneInnerAngle = innerAngle;
    this.panner.coneOuterAngle = outerAngle;
    this.panner.coneOuterGain = outerGain;
  }

  /**
   * Calculate straight-line distance to the listener position.
   */
  getDistanceTo(listenerPos: { x: number; y: number; z: number }): number {
    const dx = this._position.x - listenerPos.x;
    const dy = this._position.y - listenerPos.y;
    const dz = this._position.z - listenerPos.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Called by SpatialAudioManager when the listener moves.
   */
  updateFromListener(
    listenerPos: { x: number; y: number; z: number },
    listenerFwd: { x: number; y: number; z: number }
  ): void {
    this._distance = this.getDistanceTo(listenerPos);
    // Cone attenuation is handled natively by the PannerNode, but we can
    // compute additional HRTF-like approximations here if needed.
  }

  /**
   * Get the last computed distance to the listener.
   */
  get distance(): number {
    return this._distance;
  }

  /**
   * Disconnect all nodes and release resources.
   */
  destroy(): void {
    try { this.inputGain.disconnect(); } catch { /* */ }
    try { this.panner.disconnect(); } catch { /* */ }
  }
}


// ─── Section 6: Analysis & Visualization ───────────────────────────

/**
 * Extracts real-time frequency, waveform, and level data from an audio source
 * using the Web Audio AnalyserNode.
 */
export class AudioAnalyzer {
  private readonly _ctx: AudioContext;
  private _analyser: AnalyserNode;
  private _sourceNode: AudioNode | null = null;
  private _freqData: Uint8Array<ArrayBuffer>;
  private _timeData: Uint8Array<ArrayBuffer>;
  private _floatFreqData: Float32Array<ArrayBuffer>;

  /** Static energy history for beat detection across all instances. */
  private static _beatHistory: number[] = [];

  constructor(ctx: AudioContext, fftSize = 2048) {
    this._ctx = ctx;
    this._analyser = ctx.createAnalyser();
    this._analyser.fftSize = fftSize;
    this._analyser.smoothingTimeConstant = 0.8;
    this._freqData = new Uint8Array(this._analyser.frequencyBinCount);
    this._timeData = new Uint8Array(this._analyser.fftSize);
    this._floatFreqData = new Float32Array(this._analyser.frequencyBinCount);
  }

  /** The underlying AnalyserNode for direct access. */
  get analyser(): AnalyserNode { return this._analyser; }

  /** Number of frequency bins (fftSize / 2). */
  get frequencyBinCount(): number { return this._analyser.frequencyBinCount; }

  /**
   * Connect an AudioNode (e.g., a MediaElementSource or GainNode) to the analyzer.
   */
  connectSource(source: AudioNode): void {
    if (this._sourceNode) {
      try { this._sourceNode.disconnect(this._analyser); } catch { /* */ }
    }
    source.connect(this._analyser);
    this._sourceNode = source;
  }

  /**
   * Disconnect the current source.
   */
  disconnectSource(): void {
    if (this._sourceNode) {
      try { this._sourceNode.disconnect(this._analyser); } catch { /* */ }
      this._sourceNode = null;
    }
  }

  /**
   * Capture the current analysis frame with all data types populated.
   *
   * @returns Complete AnalyserData snapshot.
   */
  getData(): AnalyserData {
    this._analyser.getByteFrequencyData(this._freqData);
    this._analyser.getByteTimeDomainData(this._timeData);
    this._analyser.getFloatFrequencyData(this._floatFreqData);

    let sumSquares = 0;
    let peak = 0;
    for (let i = 0; i < this._timeData.length; i++) {
      const val = (this._timeData[i] - 128) / 128;
      sumSquares += val * val;
      const absVal = Math.abs(val);
      if (absVal > peak) peak = absVal;
    }
    const rms = Math.sqrt(sumSquares / this._timeData.length);

    return {
      frequencyData: Uint8Array.from(this._freqData as unknown as number[]),
      timeDomainData: Uint8Array.from(this._timeData as unknown as number[]),
      floatFrequencyData: Float32Array.from(this._floatFreqData as unknown as number[]),
      rms,
      peak,
    };
  }

  /**
   * Get only the frequency spectrum data (Uint8Array, 0–255 per bin).
   */
  getFrequencyData(): Uint8Array {
    this._analyser.getByteFrequencyData(this._freqData);
    return Uint8Array.from(this._freqData as unknown as number[]);
  }

  /**
   * Get only the waveform/time-domain data (Uint8Array, 0–255 per sample).
   */
  getTimeDomainData(): Uint8Array {
    this._analyser.getByteTimeDomainData(this._timeData);
    return Uint8Array.from(this._timeData as unknown as number[]);
  }

  /**
   * Compute the current RMS (root-mean-square) level.
   */
  getRMS(): number {
    this._analyser.getByteTimeDomainData(this._timeData);
    let sumSq = 0;
    for (let i = 0; i < this._timeData.length; i++) {
      const norm = (this._timeData[i] - 128) / 128;
      sumSq += norm * norm;
    }
    return Math.sqrt(sumSq / this._timeData.length);
  }

  /**
   * Compute the current peak amplitude (0–1).
   */
  getPeak(): number {
    this._analyser.getByteTimeDomainData(this._timeData);
    let peak = 0;
    for (let i = 0; i < this._timeData.length; i++) {
      const absVal = Math.abs((this._timeData[i] - 128) / 128);
      if (absVal > peak) peak = absVal;
    }
    return peak;
  }

  /**
   * Simple energy-based beat/onset detection.
   *
   * Uses a running average of spectral energy and flags an onset when
   * the current energy exceeds the average by a configurable threshold.
   *
   * @param threshold - Sensitivity multiplier (default 1.5).
   * @returns True if a beat/onset was detected this frame.
   */
  detectBeat(threshold = 1.5): boolean {
    this._analyser.getByteFrequencyData(this._freqData);
    let energy = 0;
    for (let i = 0; i < this._freqData.length; i++) {
      energy += this._freqData[i] * this._freqData[i];
    }
    energy = Math.sqrt(energy / this._freqData.length);

    // Static history for simple detection (for production use a circular buffer)
    const historyLen = 30;
    if (!AudioAnalyzer._beatHistory) {
      AudioAnalyzer._beatHistory = [];
    }
    const history: number[] = AudioAnalyzer._beatHistory;
    history.push(energy);
    if (history.length > historyLen) history.shift();

    if (history.length < historyLen) return false;
    const avgEnergy = history.reduce((a, b) => a + b, 0) / history.length;
    return energy > avgEnergy * threshold;
  }

  /**
   * Set analyzer parameters.
   */
  configure(fftSize?: number, smoothingTimeConstant?: number): void {
    if (fftSize) this._analyser.fftSize = fftSize;
    if (smoothingTimeConstant !== undefined) this._analyser.smoothingTimeConstant = smoothingTimeConstant;
    // Resize backing arrays
    this._freqData = new Uint8Array(this._analyser.frequencyBinCount);
    this._timeData = new Uint8Array(this._analyser.fftSize);
    this._floatFreqData = new Float32Array(this._analyser.frequencyBinCount);
  }
}

/**
 * Real-time audio visualizer that renders to an HTMLCanvasElement.
 *
 * Supports multiple preset visualization styles driven by an AudioAnalyzer.
 */
export class Visualizer {
  private readonly _analyzer: AudioAnalyzer;
  private _canvas: HTMLCanvasElement | null = null;
  private _ctx2d: CanvasRenderingContext2D | null = null;
  private _animFrameId = 0;
  private _running = false;
  private _config: Required<VisualizerConfig> & { canvas: HTMLCanvasElement };

  /** Custom draw callback for user-defined rendering. */
  public onDraw: ((data: AnalyserData, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void) | null = null;

  constructor(analyzer: AudioAnalyzer, config: VisualizerConfig) {
    this._analyzer = analyzer;
    const canvas = typeof config.canvas === 'string'
      ? document.querySelector<HTMLCanvasElement>(config.canvas)!
      : config.canvas;
    if (!canvas) throw new Error('Visualizer: canvas element not found');
    this._canvas = canvas;
    this._ctx2d = canvas.getContext('2d');
    this._config = {
      canvas,
      preset: config.preset ?? 'bars',
      fftSize: config.fftSize ?? 1024,
      color: config.color ?? '#00ccff',
      bgColor: config.bgColor ?? '#000000',
      barCount: config.barCount ?? 64,
      smoothingTimeConstant: config.smoothingTimeConstant ?? 0.8,
    };
    this._analyzer.configure(this._config.fftSize, this._config.smoothingTimeConstant);
  }

  /**
   * Start the rendering animation loop.
   */
  start(): void {
    if (this._running) return;
    this._running = true;
    this._loop();
  }

  /**
   * Stop the rendering animation loop.
   */
  stop(): void {
    this._running = false;
    if (this._animFrameId) cancelAnimationFrame(this._animFrameId);
  }

  /**
   * Update the visualization preset at runtime.
   */
  setPreset(preset: VisualizerPreset): void {
    this._config.preset = preset;
  }

  /**
   * Update colors without restarting.
   */
  setColor(color: string, bgColor?: string): void {
    this._config.color = color;
    if (bgColor !== undefined) this._config.bgColor = bgColor;
  }

  private _loop = (): void => {
    if (!this._running) return;
    this._draw();
    this._animFrameId = requestAnimationFrame(this._loop);
  };

  private _draw(): void {
    const canvas = this._canvas!;
    const ctx = this._ctx2d!;
    if (!canvas || !ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const data = this._analyzer.getData();

    // Allow custom override
    if (this.onDraw) {
      this.onDraw(data, ctx, canvas);
      return;
    }

    // Background
    ctx.fillStyle = this._config.bgColor;
    ctx.fillRect(0, 0, w, h);

    switch (this._config.preset) {
      case 'bars': this._drawBars(data, ctx, w, h); break;
      case 'wave': this._drawWave(data, ctx, w, h); break;
      case 'circular': this._drawCircular(data, ctx, w, h); break;
      case 'spectrogram': this._drawSpectrogram(data, ctx, w, h); break;
    }
  }

  private _drawBars(data: AnalyserData, ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const freq = data.frequencyData;
    const barCount = this._config.barCount;
    const barWidth = w / barCount - 1;
    const step = Math.floor(freq.length / barCount);

    ctx.fillStyle = this._config.color;
    for (let i = 0; i < barCount; i++) {
      const val = freq[i * step] / 255;
      const barH = val * h;
      const x = i * (barWidth + 1);
      ctx.fillRect(x, h - barH, barWidth, barH);
    }
  }

  private _drawWave(data: AnalyserData, ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const wave = data.timeDomainData;
    ctx.lineWidth = 2;
    ctx.strokeStyle = this._config.color;
    ctx.beginPath();
    const sliceW = w / wave.length;
    for (let i = 0; i < wave.length; i++) {
      const v = wave[i] / 128.0;
      const y = (v * h) / 2;
      if (i === 0) ctx.moveTo(0, y);
      else ctx.lineTo(i * sliceW, y);
    }
    ctx.stroke();
  }

  private _drawCircular(data: AnalyserData, ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const freq = data.frequencyData;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.25;
    const barCount = this._config.barCount;
    const step = Math.floor(freq.length / barCount);

    ctx.fillStyle = this._config.color;
    for (let i = 0; i < barCount; i++) {
      const val = freq[i * step] / 255;
      const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
      const barH = val * radius;
      const x1 = cx + Math.cos(angle) * radius;
      const y1 = cy + Math.sin(angle) * radius;
      const x2 = cx + Math.cos(angle) * (radius + barH);
      const y2 = cy + Math.sin(angle) * (radius + barH);
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  // Spectrogram: scrolling frequency-time heatmap (simplified)
  private _spectrogramHistory: ImageData[] = [];

  private _drawSpectrogram(data: AnalyserData, ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const freq = data.frequencyData;
    // Shift existing columns left and draw new column on the right
    const imgData = ctx.getImageData(1, 0, w - 1, h);
    ctx.putImageData(imgData, 0, 0);

    const binCount = freq.length;
    const colStep = h / binCount;
    for (let i = 0; i < binCount; i++) {
      const val = freq[i];
      // Map to a heat color (simple blue->green->red)
      const hue = (1 - val / 255) * 240;
      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.fillRect(w - 1, h - (i + 1) * colStep, 1, Math.ceil(colStep) + 1);
    }
  }
}


// ─── Section 7: Recording ──────────────────────────────────────────

/**
 * Records audio from a MediaStream (microphone) or AudioNode destination
 * into the requested format using the MediaRecorder API or manual WAV encoding.
 */
export class AudioRecorder {
  private readonly _ctx: AudioContext;
  private _mediaRecorder: MediaRecorder | null = null;
  private _recordedChunks: Blob[] = [];
  private _stream: MediaStream | null = null;
  private _sourceNode: MediaStreamAudioSourceNode | null = null;
  private _analyserNode: AnalyserNode | null = null;
  private _isRecording = false;
  private _isPaused = false;
  private _config: RecorderConfig = { format: 'webm' };

  /** Fired periodically with current RMS level during recording. */
  public onLevelUpdate: ((rms: number, peak: number) => void) | null = null;

  /** Fired when recording stops with the final Blob. */
  public onStop: ((blob: Blob) => void) | null = null;

  /** Fired when recording is paused/resumed. */
  public onPauseChange: ((paused: boolean) => void) | null = null;

  /** Level monitoring interval handle. */
  private _levelInterval: ReturnType<typeof setInterval> | null = null;

  constructor(ctx: AudioContext) {
    this._ctx = ctx;
  }

  /**
   * Start recording from the default microphone input.
   *
   * @param config - Recording format and options.
   */
  async start(config?: RecorderConfig): Promise<void> {
    if (this._isRecording) return;
    this._config = config ?? { format: 'webm' };

    this._stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this._sourceNode = this._ctx.createMediaStreamSource(this._stream);

    // Set up monitoring analyser if requested
    if (this._config.monitorLevels) {
      this._analyserNode = this._ctx.createAnalyser();
      this._analyserNode.fftSize = 256;
      this._sourceNode.connect(this._analyserNode);
      this._startLevelMonitoring();
    }

    this._recordedChunks = [];
    const mimeType = this._resolveMimeType();
    this._mediaRecorder = new MediaRecorder(this._stream, { mimeType });

    this._mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this._recordedChunks.push(e.data);
    };

    this._mediaRecorder.onstop = async () => {
      const blob = await this._assembleBlob();
      this._isRecording = false;
      this._isPaused = false;
      this._stopLevelMonitoring();
      this.onStop?.(blob);
    };

    this._mediaRecorder.start(100); // collect data every 100ms
    this._isRecording = true;
    this._isPaused = false;
  }

  /**
   * Start recording from an AudioNode instead of a microphone.
   *
   * Creates a MediaStreamDestination, connects the node, and records from it.
   *
   * @param sourceNode - The AudioNode to capture output from.
   * @param config - Recording format and options.
   */
  async startFromNode(sourceNode: AudioNode, config?: RecorderConfig): Promise<void> {
    if (this._isRecording) return;
    this._config = config ?? { format: 'webm' };

    const dest = this._ctx.createMediaStreamDestination();
    sourceNode.connect(dest);
    this._stream = dest.stream;

    this._recordedChunks = [];
    const mimeType = this._resolveMimeType();
    this._mediaRecorder = new MediaRecorder(this._stream, { mimeType });

    this._mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this._recordedChunks.push(e.data);
    };

    this._mediaRecorder.onstop = async () => {
      const blob = await this._assembleBlob();
      this._isRecording = false;
      this._isPaused = false;
      this.onStop?.(blob);
    };

    this._mediaRecorder.start(100);
    this._isRecording = true;
    this._isPaused = false;
  }

  /**
   * Pause the current recording.
   */
  pause(): void {
    if (!this._isRecording || this._isPaused || !this._mediaRecorder) return;
    this._mediaRecorder.pause();
    this._isPaused = true;
    this.onPauseChange?.(true);
  }

  /**
   * Resume a paused recording.
   */
  resume(): void {
    if (!this._isRecording || !this._isPaused || !this._mediaRecorder) return;
    this._mediaRecorder.resume();
    this._isPaused = false;
    this.onPauseChange?.(false);
  }

  /**
   * Stop recording and assemble the final output blob.
   */
  stop(): void {
    if (!this._isRecording || !this._mediaRecorder) return;
    this._mediaRecorder.stop();
    // Stop all tracks on the stream
    if (this._stream) {
      this._stream.getTracks().forEach((t) => t.stop());
    }
  }

  /** Whether a recording is currently in progress. */
  get isRecording(): boolean { return this._isRecording; }

  /** Whether the recording is currently paused. */
  get isPaused(): boolean { return this._isPaused; }

  /**
   * Resolve the best available MIME type for the selected format.
   */
  private _resolveMimeType(): string {
    const fmt = this._config.format;
    const candidates: Record<string, string[]> = {
      wav: ['audio/wav', 'audio/wave;codecs=1'],
      ogg: ['audio/ogg;codecs=opus', 'audio/ogg'],
      webm: ['audio/webm;codecs=opus', 'audio/webm'],
    };
    const types = candidates[fmt as string] ?? candidates.webm;
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return ''; // browser will pick default
  }

  /**
   * Assemble recorded chunks into a single Blob.
   * For WAV format, performs manual WAV header construction.
   */
  private async _assembleBlob(): Promise<Blob> {
    if (this._config.format === 'wav' && this._recordedChunks.length > 0) {
      // Attempt raw WAV assembly from PCM chunks if possible;
      // otherwise fall through to standard blob concatenation.
      const wav = await this._tryAssembleWav();
      if (wav) return wav;
      return new Blob(this._recordedChunks, { type: 'audio/wav' });
    }
    const mime = this._resolveMimeType() || 'audio/webm';
    return new Blob(this._recordedChunks, { type: mime });
  }

  /**
   * Try to build a proper WAV file from recorded PCM data.
   */
  private async _tryAssembleWav(): Promise<Blob | null> {
    try {
      // If chunks contain raw PCM data we can wrap with a WAV header
      const totalLength = this._recordedChunks.reduce((sum, c) => sum + c.size, 0);
      const buffer = new ArrayBuffer(44 + totalLength);
      const view = new DataView(buffer);

      // RIFF header
      this._writeString(view, 0, 'RIFF');
      view.setUint32(4, 36 + totalLength, true);
      this._writeString(view, 8, 'WAVE');

      // fmt chunk
      this._writeString(view, 12, 'fmt ');
      view.setUint32(16, 16, true); // chunk size
      view.setUint16(20, 1, true); // PCM format
      view.setUint16(22, 1, true); // mono (assumed)
      view.setUint32(24, this._ctx.sampleRate, true);
      view.setUint32(28, this._ctx.sampleRate * 2, true); // byte rate
      view.setUint16(32, 2, true); // block align
      view.setUint16(34, 16, true); // bits per sample

      // data chunk
      this._writeString(view, 36, 'data');
      view.setUint32(40, totalLength, true);

      // Copy PCM data
      const uint8 = new Uint8Array(buffer, 44);
      let offset = 0;
      for (const chunk of this._recordedChunks) {
        const arr = new Uint8Array(await chunk.arrayBuffer());
        uint8.set(arr, offset);
        offset += arr.length;
      }

      return new Blob([buffer], { type: 'audio/wav' });
    } catch {
      return null;
    }
  }

  private _writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  private _startLevelMonitoring(): void {
    this._levelInterval = setInterval(() => {
      if (!this._analyserNode || !this._isRecording || this._isPaused) return;
      const freqData = new Uint8Array(this._analyserNode.frequencyBinCount);
      const timeData = new Uint8Array(this._analyserNode.fftSize);
      this._analyserNode.getByteFrequencyData(freqData);
      this._analyserNode.getByteTimeDomainData(timeData);

      let sumSq = 0;
      let peak = 0;
      for (let i = 0; i < timeData.length; i++) {
        const norm = (timeData[i] - 128) / 128;
        sumSq += norm * norm;
        if (Math.abs(norm) > peak) peak = Math.abs(norm);
      }
      const rms = Math.sqrt(sumSq / timeData.length);
      this.onLevelUpdate?.(rms, peak);
    }, 50);
  }

  private _stopLevelMonitoring(): void {
    if (this._levelInterval) {
      clearInterval(this._levelInterval);
      this._levelInterval = null;
    }
  }
}


// ─── Section 8: MIDI Support (Web MIDI API) ────────────────────────

/**
 * Manages MIDI input/output device access via the Web MIDI API.
 *
 * Provides event callbacks for note on/off, control change, and clock messages.
 */
export class MidiManager {
  private _access: MIDIAccess | null = null;
  private _inputs: Map<string, MIDIInput> = new Map();
  private _outputs: Map<string, MIDIOutput> = new Map();

  /** Fired when a note-on message is received. */
  public onNoteOn: ((event: MidiMessageEvent) => void) | null = null;

  /** Fired when a note-off message is received. */
  public onNoteOff: ((event: MidiMessageEvent) => void) | null = null;

  /** Fired when a control-change (CC) message is received. */
  public onControlChange: ((event: MidiMessageEvent) => void) | null = null;

  /** Fired on each MIDI clock tick (0xF8). */
  public onClock: ((timestamp: number) => void) | null = null;

  /** Fired for any other MIDI message. */
  public onMessage: ((event: MidiMessageEvent) => void) | null = null;

  /** Fired when a device is connected or disconnected. */
  public onStateChange: ((port: MIDIPort) => void) | null = null;

  /** Whether MIDI access has been granted. */
  get isAvailable(): boolean { return this._access !== null; }

  /** List of available input device names. */
  get inputNames(): string[] { return Array.from(this._inputs.values()).map((i) => i.name).filter((n): n is string => n != null); }

  /** List of available output device names. */
  get outputNames(): string[] { return Array.from(this._outputs.values()).map((o) => o.name).filter((n): n is string => n != null); }

  /**
   * Request MIDI access from the browser.
   *
   * @param sysex - Whether to request SysEx permission (may show a prompt).
   * @returns Promise resolving when access is granted.
   */
  async requestAccess(sysex = false): Promise<MIDIAccess> {
    if (this._access) return this._access;

    this._access = await navigator.requestMIDIAccess({ sysex });
    this._enumerateDevices();
    this._access.onstatechange = (e) => {
      this._enumerateDevices();
      this.onStateChange?.(e.port);
    };
    return this._access;
  }

  /**
   * Send a note-on message to a specific output port.
   *
   * @param outputIdOrName - Output port ID or name substring.
   * @param note - MIDI note number (0–127).
   * @param velocity - Velocity (0–127, default 100).
   * @param channel - MIDI channel (0–15, default 0).
   */
  sendNoteOn(outputIdOrName: string, note: number, velocity = 100, channel = 0): void {
    const output = this._findOutput(outputIdOrName);
    if (!output) return;
    const status = 0x90 | (channel & 0x0f);
    output.send([status, note & 0x7f, velocity & 0x7f]);
  }

  /**
   * Send a note-off message to a specific output port.
   *
   * @param outputIdOrName - Output port ID or name substring.
   * @param note - MIDI note number (0–127).
   * @param velocity - Release velocity (0–127, default 0).
   * @param channel - MIDI channel (0–15, default 0).
   */
  sendNoteOff(outputIdOrName: string, note: number, velocity = 0, channel = 0): void {
    const output = this._findOutput(outputIdOrName);
    if (!output) return;
    const status = 0x80 | (channel & 0x0f);
    output.send([status, note & 0x7f, velocity & 0x7f]);
  }

  /**
   * Send a control-change (CC) message.
   *
   * @param outputIdOrName - Output port ID or name.
   * @param controller - CC number (0–127).
   * @param value - CC value (0–127).
   * @param channel - MIDI channel (0–15).
   */
  sendCC(outputIdOrName: string, controller: number, value: number, channel = 0): void {
    const output = this._findOutput(outputIdOrName);
    if (!output) return;
    const status = 0xb0 | (channel & 0x0f);
    output.send([status, controller & 0x7f, value & 0x7f]);
  }

  /**
   * Send a pitch-bend message.
   *
   * @param outputIdOrName - Output port ID or name.
   * @param value - Bend value (-8192 to 8191, 0 = center).
   * @param channel - MIDI channel (0–15).
   */
  sendPitchBend(outputIdOrName: string, value: number, channel = 0): void {
    const output = this._findOutput(outputIdOrName);
    if (!output) return;
    const clamped = Math.max(-8192, Math.min(8191, value)) + 8192;
    const lsb = clamped & 0x7f;
    const msb = (clamped >> 7) & 0x7f;
    const status = 0xe0 | (channel & 0x0f);
    output.send([status, lsb, msb]);
  }

  /**
   * Close MIDI access and remove all listeners.
   */
  close(): void {
    for (const input of this._inputs.values()) {
      input.onmidimessage = null;
    }
    this._inputs.clear();
    this._outputs.clear();
    this._access = null;
  }

  // ── Device enumeration ─────────────────────────────────────────

  private _enumerateDevices(): void {
    if (!this._access) return;
    this._inputs.clear();
    this._outputs.clear();
    for (const entry of this._access.inputs) {
      const input = entry[1];
      if (input.state === 'connected') {
        this._inputs.set(input.id, input);
        input.onmidimessage = (e) => this._handleMessage(e, input);
      }
    }
    for (const entry of this._access.outputs) {
      const output = entry[1];
      if (output.state === 'connected') {
        this._outputs.set(output.id, output);
      }
    }
  }

  private _handleMessage(e: MIDIMessageEvent, port: MIDIInput): void {
    const data = e.data;
    if (!data || data.length < 2) return;
    const status = data[0];
    const data1 = data[1];
    const data2 = data.length > 2 ? data[2] : 0;

    const evt: MidiMessageEvent = { status, data1, data2, timestamp: e.timeStamp, port };

    // Note On (status 0x90–0x9F with velocity > 0)
    if ((status >= 0x90 && status <= 0x9f) && data2 > 0) {
      this.onNoteOn?.(evt);
    }
    // Note Off (status 0x80–0x8F, or NoteOn with velocity 0)
    else if (
      (status >= 0x80 && status <= 0x8f) ||
      ((status >= 0x90 && status <= 0x9f) && data2 === 0)
    ) {
      this.onNoteOff?.(evt);
    }
    // Control Change (0xB0–0xBF)
    else if (status >= 0xb0 && status <= 0xbf) {
      this.onControlChange?.(evt);
    }
    // MIDI Clock (0xF8)
    else if (status === 0xf8) {
      this.onClock?.(e.timeStamp);
    }

    this.onMessage?.(evt);
  }

  private _findOutput(idOrName: string): MIDIOutput | undefined {
    // Try exact ID match first
    const exact = this._outputs.get(idOrName);
    if (exact) return exact;
    // Fallback to name substring match
    for (const output of this._outputs.values()) {
      if (output.name.toLowerCase().includes(idOrName.toLowerCase())) return output;
    }
    return undefined;
  }
}


// ─── Section 9: Utilities ──────────────────────────────────────────

/**
 * Collection of static utility functions for common audio math conversions.
 */
export const AudioUtils = {
  /**
   * Convert decibel value to linear gain.
   *
   * @param db - Value in decibels (e.g., -6 for half gain).
   * @returns Linear gain factor (0–∞).
   */
  dbToGain(db: number): number {
    return Math.pow(10, db / 20);
  },

  /**
   * Convert linear gain to decibels.
   *
   * @param gain - Linear gain factor.
   * @returns Value in dB (negative for gains below 1).
   */
  gainToDb(gain: number): number {
    if (gain <= 0) return -Infinity;
    return 20 * Math.log10(gain);
  },

  /**
   * Convert a frequency in Hz to the nearest MIDI note number.
   *
   * @param freq - Frequency in Hz.
   * @returns Nearest MIDI note number (0–127), where 69 = A4 = 440Hz.
   */
  frequencyToNote(freq: number): number {
    return 12 * Math.log2(freq / 440) + 69;
  },

  /**
   * Convert a MIDI note number to frequency in Hz.
   *
   * @param note - MIDI note number (0–127).
   * @returns Frequency in Hz.
   */
  noteToFrequency(note: number): number {
    return 440 * Math.pow(2, (note - 69) / 12);
  },

  /**
   * Calculate cents offset between a measured frequency and a target note.
   *
   * @param measuredFreq - Measured frequency in Hz.
   * @param targetNote - Reference MIDI note number.
   * @returns Offset in cents (+/- 50 cents = within quarter tone).
   */
  centsOffset(measuredFreq: number, targetNote: number): number {
    const targetFreq = AudioUtils.noteToFrequency(targetNote);
    return 1200 * Math.log2(measuredFreq / targetFreq);
  },

  /**
   * Convert semitone offset to a frequency ratio.
   *
   * @param semitones - Number of semitones (can be fractional).
   * @returns Multiplicative frequency ratio.
   */
  semitoneRatio(semitones: number): number {
    return Math.pow(2, semitones / 12);
  },

  /**
   * Convert a value from one sample rate to another (linear interpolation index).
   *
   * @param value - Value at the original sample rate.
   * @param fromRate - Original sample rate.
   * @param toRate - Target sample rate.
   * @returns Scaled value proportional to the rate ratio.
   */
  sampleRateConvert(value: number, fromRate: number, toRate: number): number {
    return value * (toRate / fromRate);
  },

  /**
   * Clamp a value between a minimum and maximum.
   */
  clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  },

  /**
   * Linear interpolation between two values.
   *
   * @param a - Start value (t=0).
   * @param b - End value (t=1).
   * @param t - Interpolation factor (0–1).
   */
  lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  },
} as const;

/**
 * Convenience wrapper around master volume control with smooth ramping.
 */
export class MasterVolume {
  private readonly _gainNode: GainNode;
  private readonly _ctx: AudioContext;
  private _muted = false;
  private _preMuteVolume = 1;

  constructor(gainNode: GainNode, ctx: AudioContext) {
    this._gainNode = gainNode;
    this._ctx = ctx;
  }

  /** Current volume level (0–1). */
  get volume(): number { return this._gainNode.gain.value; }

  /**
   * Set volume with optional smooth ramp.
   *
   * @param value - Target volume (0–1).
   * @param rampTime - Ramp duration in seconds (0 for instant).
   */
  setVolume(value: number, rampTime = 0.01): void {
    const v = Math.max(0, Math.min(1, value));
    const now = this._ctx.currentTime;
    this._gainNode.gain.cancelScheduledValues(now);
    if (rampTime <= 0) {
      this._gainNode.gain.value = v;
    } else {
      this._gainNode.gain.setTargetAtTime(v, now, rampTime / 5);
    }
  }

  /** Mute output instantly. */
  mute(): void {
    if (this._muted) return;
    this._preMuteVolume = this._gainNode.gain.value;
    this._gainNode.gain.setTargetAtTime(0, this._ctx.currentTime, 0.01);
    this._muted = true;
  }

  /** Unmute and restore pre-mute volume. */
  unmute(): void {
    if (!this._muted) return;
    this._gainNode.gain.setTargetAtTime(this._preMuteVolume, this._ctx.currentTime, 0.01);
    this._muted = false;
  }

  /** Whether currently muted. */
  get muted(): boolean { return this._muted; }
}

/**
 * Handles audio session interruptions (phone calls, notifications, etc.)
 * on platforms that support the AudioSession API (iOS Safari, etc.).
 */
export class AudioSessionHandler {
  private _interrupted = false;
  private _onInterrupt: (() => void) | null = null;
  private _onResume: (() => void) | null = null;

  /** Register callbacks for interruption and resumption events. */
  onInterrupt(callback: () => void): void {
    this._onInterrupt = callback;
    this._listen();
  }

  onResume(callback: () => void): void {
    this._onResume = callback;
    this._listen();
  }

  /** Whether the audio session is currently interrupted. */
  get isInterrupted(): boolean { return this._interrupted; }

  private _listen(): void {
    // iOS Safari supports webkitaudiocontext interruption via events;
    // standard browsers use document visibility/page-lifecycle APIs.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this._interrupted = true;
        this._onInterrupt?.();
      } else {
        this._interrupted = false;
        this._onResume?.();
      }
    });

    // Handle focus/blur for tab switching
    window.addEventListener('blur', () => {
      this._interrupted = true;
      this._onInterrupt?.();
    });
    window.addEventListener('focus', () => {
      this._interrupted = false;
      this._onResume?.();
    });
  }
}
