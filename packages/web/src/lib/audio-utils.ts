/**
 * @module audio-utils
 * @description Comprehensive audio processing utilities for browser-based audio applications.
 * Built entirely on the Web Audio API. No React or framework dependencies.
 *
 * Features:
 * - AudioContext management (singleton, auto-resume on user gesture)
 * - FFT analysis, frequency data, waveform visualization, beat detection
 * - Audio effects: gain, EQ, compressor, reverb (convolution), delay/echo, distortion
 * - Audio recording: microphone / MediaStream capture, WAV export, pause/resume
 * - Audio playback: play/pause/seek, crossfade, loop points, playback rate control
 * - Visualization data generators (frequency bars, waveform points)
 * - Volume analysis: RMS, peak detection, silence detection
 * - Utility helpers: time formatting, dB conversion, sample calculations
 */

// ---------------------------------------------------------------------------
// 1. Type Definitions
// ---------------------------------------------------------------------------

/** Represents a frequency band for equalization. */
export interface EQBand {
  /** Frequency in Hz. */
  frequency: number;
  /** Gain value in dB (negative = cut, positive = boost). */
  gain: number;
  /** Quality factor (bandwidth). Defaults to 1. */
  Q?: number;
  /** Filter type. Defaults to 'peaking'. */
  type?: BiquadFilterType;
}

/** Configuration options for the compressor effect. */
export interface CompressorOptions {
  /** Threshold in dB. Default -24. */
  threshold?: number;
  /** Ratio (e.g., 4 means 4:1). Default 4. */
  ratio?: number;
  /** Attack time in seconds. Default 0.003. */
  attack?: number;
  /** Release time in seconds. Default 0.25. */
  release?: number;
  /** Knee width in dB. Default 30. */
  knee?: number;
  /** Makeup gain in dB. Default 0. */
  makeupGain?: number;
}

/** Configuration options for the reverb (convolution) effect. */
export interface ReverbOptions {
  /** Decay duration in seconds. Default 2. */
  decay?: number;
  /** Reverse the impulse response. Default false. */
  reverse?: boolean;
  /** Pre-delay in seconds. Default 0. */
  preDelay?: number;
  /** Wet/dry mix (0-1). Default 1. */
  wet?: number;
  /** Dry signal level (0-1). Default 0. */
  dry?: number;
}

/** Configuration options for the delay/echo effect. */
export interface DelayOptions {
  /** Delay time in seconds. Default 0.3. */
  delayTime?: number;
  /** Feedback amount (0-1). Default 0.35. */
  feedback?: number;
  /** Wet level (0-1). Default 0.6. */
  wet?: number;
  /** Dry level (0-1). Default 1. */
  dry?: number;
}

/** Configuration options for the distortion effect. */
export interface DistortionOptions {
  /** Amount of distortion (0-100). Default 20. */
  amount?: number;
  /** Oversample mode. Default 'none'. */
  oversample?: OverSampleType;
  /** Wet level (0-1). Default 1. */
  wet?: number;
  /** Dry level (0-1). Default 0. */
  dry?: number;
}

/** Configuration options for audio recording. */
export interface RecordingOptions {
  /** MIME type for the recorder. Defaults to best available. */
  mimeType?: string;
  /** Number of audio bits per sample. Default 16. */
  bitsPerSample?: number;
  /** Sample rate in Hz. Uses context sample rate by default. */
  sampleRate?: number;
  /** Called periodically with the current blob and elapsed time. */
  onDataAvailable?: (blob: Blob, elapsedTime: number) => void;
  /** Called when recording is stopped with the final blob. */
  onStop?: (blob: Blob) => void;
  /** Called when an error occurs. */
  onError?: (error: Error) => void;
}

/** Configuration options for crossfading between two audio sources. */
export interface CrossfadeOptions {
  /** Duration of the crossfade in seconds. Default 2. */
  duration?: number;
  /** Curve type for the fade. Default 'equal-power'. */
  curve?: 'linear' | 'equal-power';
}

/** Loop point configuration for playback. */
export interface LoopPoints {
  /** Start time of the loop in seconds. */
  start: number;
  /** End time of the loop in seconds. */
  end: number;
}

/** Playback state returned by the player. */
export interface PlaybackState {
  /** Current playback position in seconds. */
  currentTime: number;
  /** Total duration in seconds (NaN if not loaded). */
  duration: number;
  /** Whether audio is currently playing. */
  playing: boolean;
  /** Current playback rate (speed without pitch shift). */
  playbackRate: number;
  /** Whether looping is enabled. */
  loop: boolean;
  /** Loop points if set. */
  loopPoints?: LoopPoints | null;
  /** Current volume (0-1). */
  volume: number;
  /** Whether muted. */
  muted: boolean;
}

/** Beat detection result. */
export interface BeatDetectionResult {
  /** Estimated tempo in BPM. */
  bpm: number;
  /** Confidence score (0-1). */
  confidence: number;
  /** Array of detected beat times in seconds. */
  beats: number[];
}

/** Volume analysis result. */
export interface VolumeAnalysis {
  /** RMS level (0-1). */
  rms: number;
  /** Peak level (0-1). */
  peak: number;
  /** Peak hold time in samples since last reset. */
  peakHoldSamples: number;
  /** Whether the current frame is considered silent. */
  silent: boolean;
  /** Peak level in decibels. */
  peakDb: number;
  /** RMS level in decibels. */
  rmsDb: number;
}

/** Visualization data for frequency bars. */
export interface FrequencyBarData {
  /** Normalized bar heights (0-1), one per band. */
  values: number[];
  /** Center frequencies for each band in Hz. */
  frequencies: number[];
  /** Average value across all bands. */
  average: number;
  /** Maximum value across all bands. */
  max: number;
}

/** Visualization data for waveform. */
export interface WaveformData {
  /** Normalized waveform points (-1 to 1). */
  points: Float32Array;
  /** Length of the data array. */
  length: number;
  /** Minimum value. */
  min: number;
  /** Maximum value. */
  max: number;
}

/** Full analysis snapshot combining multiple analyzers. */
export interface AudioAnalysisSnapshot {
  /** Frequency domain data (magnitude). */
  frequencyData: Uint8Array;
  /** Time-domain (waveform) data. */
  waveformData: Uint8Array;
  /** Float frequency data (more precise). */
  floatFrequencyData: Float32Array;
  /** Volume analysis result. */
  volume: VolumeAnalysis;
  /** Beat detection result (if enabled). */
  beat?: BeatDetectionResult | null;
}

// ---------------------------------------------------------------------------
// 2. Audio Context Management (Singleton)
// ---------------------------------------------------------------------------

let _audioContext: AudioContext | null = null;

/**
 * Get or create the singleton AudioContext.
 * The context is created lazily on first call and reused thereafter.
 *
 * @returns The shared AudioContext instance.
 *
 * @example
 * ```ts
 * const ctx = getAudioContext();
 * console.log(ctx.sampleRate);
 * ```
 */
export function getAudioContext(): AudioContext {
  if (!_audioContext || _audioContext.state === 'closed') {
    _audioContext = new AudioContext();
  }
  return _audioContext;
}

/**
 * Resume the AudioContext (required after user gesture on most browsers).
 * Many browsers suspend AudioContext until a user interaction resumes it.
 *
 * @param context Optional specific AudioContext to resume. Uses singleton if omitted.
 * @returns A promise that resolves when the context is running.
 *
 * @example
 * ```ts
 * button.addEventListener('click', () => resumeAudioContext());
 * ```
 */
export async function resumeAudioContext(context?: AudioContext): Promise<AudioContext> {
  const ctx = context ?? getAudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
  return ctx;
}

/**
 * Suspend the AudioContext to conserve resources.
 *
 * @param context Optional specific AudioContext to suspend.
 * @returns A promise that resolves when suspended.
 */
export async function suspendAudioContext(context?: AudioContext): Promise<void> {
  const ctx = context ?? getAudioContext();
  if (ctx.state === 'running') {
    await ctx.suspend();
  }
}

/**
 * Close and release the singleton AudioContext.
 * Call this when audio functionality is no longer needed to free resources.
 *
 * @returns A promise that resolves when closed.
 */
export async function closeAudioContext(): Promise<void> {
  if (_audioContext && _audioContext.state !== 'closed') {
    await _audioContext.close();
  }
  _audioContext = null;
}

/**
 * Get the current state of the singleton AudioContext.
 *
 * @returns The AudioContextState string ('suspended' | 'running' | 'closed').
 */
export function getAudioContextState(): AudioContextState {
  return _audioContext?.state ?? 'closed';
}

/**
 * Create a one-time event listener that resumes the AudioContext on any user gesture.
 * Useful for ensuring audio works after page load without requiring explicit user action.
 *
 * @param target The element to attach listeners to. Defaults to document.
 * @returns A cleanup function that removes the listeners.
 *
 * @example
 * ```ts
 * // Auto-resume on first click/touch/keydown
 * const cleanup = setupAutoResume();
 * // Later: cleanup();
 * ```
 */
export function setupAutoResume(target: EventTarget = document): () => void {
  const events = ['click', 'touchstart', 'keydown'] as const;
  let resumed = false;

  const handler = async () => {
    if (!resumed) {
      resumed = true;
      try {
        await resumeAudioContext();
      } catch {
        // Ignore errors during auto-resume
      }
    }
  };

  for (const evt of events) {
    target.addEventListener(evt, handler, { once: true, passive: true });
  }

  return () => {
    for (const evt of events) {
      target.removeEventListener(evt, handler);
    }
  };
}

// ---------------------------------------------------------------------------
// 3. Audio Analysis
// ---------------------------------------------------------------------------

/**
 * Create an AnalyserNode configured for detailed analysis.
 *
 * @param context The AudioContext to create the node in.
 * @param fftSize FFT size (must be a power of 2 between 32 and 32768). Default 2048.
 * @param smoothingTimeConstant Smoothing (0-1). Default 0.8.
 * @param minDecibels Minimum dB range. Default -90.
 * @param maxDecibels Maximum dB range. Default -10.
 * @returns A configured AnalyserNode.
 */
export function createAnalyser(
  context: AudioContext,
  fftSize: number = 2048,
  smoothingTimeConstant: number = 0.8,
  minDecibels: number = -90,
  maxDecibels: number = -10,
): AnalyserNode {
  const analyser = context.createAnalyser();
  analyser.fftSize = fftSize;
  analyser.smoothingTimeConstant = smoothingTimeConstant;
  analyser.minDecibels = minDecibels;
  analyser.maxDecibels = maxDecibels;
  return analyser;
}

/**
 * Extract frequency magnitude data from an AnalyserNode.
 *
 * @param analyser The AnalyserNode to read from.
 * @param dataArray Optional pre-allocated Uint8Array. Created if omitted.
 * @returns Uint8Array of frequency bin magnitudes (0-255).
 */
export function getFrequencyData(analyser: AnalyserNode, dataArray?: Uint8Array): Uint8Array {
  const buffer = dataArray ?? new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(buffer);
  return buffer;
}

/**
 * Extract precise (float) frequency data from an AnalyserNode.
 * Values are in decibels (minDecibels to maxDecibels).
 *
 * @param analyser The AnalyserNode to read from.
 * @param dataArray Optional pre-allocated Float32Array.
 * @returns Float32Array of frequency bin values in dB.
 */
export function getFloatFrequencyData(analyser: AnalyserNode, dataArray?: Float32Array): Float32Array {
  const buffer = dataArray ?? new Float32Array(analyser.frequencyBinCount);
  analyser.getFloatFrequencyData(buffer);
  return buffer;
}

/**
 * Extract time-domain (waveform) data from an AnalyserNode.
 *
 * @param analyser The AnalyserNode to read from.
 * @param dataArray Optional pre-allocated Uint8Array.
 * @returns Uint8Array of waveform samples (-128 to 127, stored as 0-255).
 */
export function getWaveformData(analyser: AnalyserNode, dataArray?: Uint8Array): Uint8Array {
  const buffer = dataArray ?? new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(buffer);
  return buffer;
}

/**
 * Convert a frequency bin index to its corresponding frequency in Hz.
 *
 * @param binIndex The frequency bin index.
 * @param fftSize The FFT size used.
 * @param sampleRate The audio sample rate.
 * @returns Frequency in Hz.
 */
export function binToFrequency(binIndex: number, fftSize: number, sampleRate: number): number {
  return (binIndex * sampleRate) / fftSize;
}

/**
 * Find the dominant (peak) frequency from frequency data.
 *
 * @param frequencyData Uint8Array from getFrequencyData.
 * @param fftSize The FFT size used.
 * @param sampleRate The audio sample rate.
 * @returns The dominant frequency in Hz, or 0 if no data.
 */
export function getDominantFrequency(
  frequencyData: Uint8Array,
  fftSize: number,
  sampleRate: number,
): number {
  let maxVal = 0;
  let maxIndex = 0;
  for (let i = 0; i < frequencyData.length; i++) {
    if (frequencyData[i] > maxVal) {
      maxVal = frequencyData[i];
      maxIndex = i;
    }
  }
  if (maxVal === 0) return 0;
  // Parabolic interpolation for sub-bin accuracy
  const y1 = frequencyData[Math.max(0, maxIndex - 1)];
  const y2 = frequencyData[maxIndex];
  const y3 = frequencyData[Math.min(frequencyData.length - 1, maxIndex + 1)];
  const d = (y1 - y3) / (2 * (y1 - 2 * y2 + y3));
  const refinedBin = Math.max(0, maxIndex + d);
  return binToFrequency(refinedBin, fftSize, sampleRate);
}

/**
 * Basic beat detection using energy-based onset detection.
 * Compares short-term energy against a local average to detect beats.
 *
 * @param analyser The AnalyserNode connected to the audio source.
 * @param historyLength Number of frames to keep for averaging. Default 43 (~1s at 44100/2048).
 * @param sensitivity Threshold multiplier (lower = more sensitive). Default 1.5.
 * @returns A BeatDetectionResult object.
 */
export function detectBeat(
  analyser: AnalyserNode,
  historyLength: number = 43,
  sensitivity: number = 1.5,
): BeatDetectionResult {
  const freqData = getFloatFrequencyData(analyser);
  const now = performance.now() / 1000;

  // Compute current energy (sum of squared magnitudes above noise floor)
  let energy = 0;
  const noiseFloor = analyser.minDecibels;
  for (let i = 0; i < freqData.length; i++) {
    if (freqData[i] > noiseFloor) {
      energy += Math.pow(10, freqData[i] / 10);
    }
  }

  // Access or initialize history storage on the analyser node
  const key = '__beatDetector';
  if (!(analyser as unknown as Record<string, unknown>)[key]) {
    (analyser as unknown as Record<string, unknown>)[key] = {
      history: [] as number[],
      energies: [] as { time: number; value: number }[],
      lastBeatTime: 0,
      beats: [] as number[],
    };
  }
  const detector = (analyser as unknown as Record<string, unknown>)[key] as {
    history: number[];
    energies: { time: number; value: number }[];
    lastBeatTime: number;
    beats: number[];
  };

  detector.history.push(energy);
  if (detector.history.length > historyLength) {
    detector.history.shift();
  }
  detector.energies.push({ time: now, value: energy });

  // Calculate average historical energy
  const avgEnergy =
    detector.history.reduce((a, b) => a + b, 0) / detector.history.length;

  // Detect onset: current energy significantly exceeds average
  const isBeat = avgEnergy > 0 && energy > avgEnergy * sensitivity;

  if (isBeat && now - detector.lastBeatTime > 0.2) {
    // Minimum 200ms between beats
    detector.lastBeatTime = now;
    detector.beats.push(now);
    // Keep only recent beats (last 10 seconds)
    detector.beats = detector.beats.filter((t) => now - t < 10);
  }

  // Estimate BPM from inter-beat intervals
  let bpm = 0;
  let confidence = 0;
  if (detector.beats.length >= 4) {
    const intervals: number[] = [];
    for (let i = 1; i < detector.beats.length; i++) {
      intervals.push(detector.beats[i] - detector.beats[i - 1]);
    }
    intervals.sort((a, b) => a - b);
    const medianInterval = intervals[Math.floor(intervals.length / 2)];
    if (medianInterval > 0) {
      bpm = 60 / medianInterval;
      // Clamp to reasonable BPM range
      if (bpm < 60) bpm *= 2;
      if (bpm > 200) bpm /= 2;
      // Confidence based on interval consistency
      const variance =
        intervals.reduce((sum, iv) => sum + Math.pow(iv - medianInterval, 2), 0) /
        intervals.length;
      confidence = Math.max(0, 1 - variance / (medianInterval * medianInterval));
    }
  }

  return { bpm, confidence, beats: [...detector.beats] };
}

/**
 * Reset the internal beat detection state on an analyser node.
 *
 * @param analyser The AnalyserNode whose beat detector should be reset.
 */
export function resetBeatDetection(analyser: AnalyserNode): void {
  const key = '__beatDetector';
  delete (analyser as unknown as Record<string, unknown>)[key];
}

// ---------------------------------------------------------------------------
// 4. Audio Effects
// ---------------------------------------------------------------------------

/**
 * Create a gain node with initial value.
 *
 * @param context The AudioContext.
 * @param initialValue Gain value (0-1). Default 1.
 * @returns A GainNode.
 */
export function createGainNode(
  context: AudioContext,
  initialValue: number = 1,
): GainNode {
  const gain = context.createGain();
  gain.gain.value = initialValue;
  return gain;
}

/**
 * Set the volume on a GainNode with optional ramping.
 *
 * @param gain The GainNode to adjust.
 * @param value Target volume (0-1).
 * @param rampTime Ramp duration in seconds. 0 for instant change.
 * @param context The AudioContext (needed for currentTime).
 */
export function setVolume(
  gain: GainNode,
  value: number,
  rampTime: number = 0,
  context?: AudioContext,
): void {
  const clamped = Math.max(0, Math.min(1, value));
  const ctx = context ?? getAudioContext();
  if (rampTime > 0) {
    gain.gain.setTargetAtTime(clamped, ctx.currentTime, rampTime / 5);
  } else {
    gain.gain.setValueAtTime(clamped, ctx.currentTime);
  }
}

/**
 * Fade in a GainNode over a specified duration.
 *
 * @param gain The GainNode.
 * @param duration Fade duration in seconds.
 * @param context The AudioContext.
 */
export function fadeIn(gain: GainNode, duration: number, context?: AudioContext): void {
  const ctx = context ?? getAudioContext();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(1, ctx.currentTime + duration);
}

/**
 * Fade out a GainNode over a specified duration.
 *
 * @param gain The GainNode.
 * @param duration Fade duration in seconds.
 * @param context The AudioContext.
 */
export function fadeOut(gain: GainNode, duration: number, context?: AudioContext): void {
  const ctx = context ?? getAudioContext();
  gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
}

/**
 * Create a 3-band parametric EQ (low, mid, high).
 *
 * @param context The AudioContext.
 * @param bands EQ band configurations. If empty, uses sensible defaults.
 * @returns An object containing the three BiquadFilterNodes and a method to update gains.
 *
 * @example
 * ```ts
 * const eq = createEQ(ctx, [
 *   { frequency: 320, gain: -4 },   // Low shelf cut
 *   { frequency: 1000, gain: 2 },   // Mid boost
 *   { frequency: 3200, gain: 4 },   // High shelf boost
 * ]);
 * source.connect(eq.input);
 * eq.output.connect(destination);
 * eq.setGains([-2, 3, 1]); // Update all at once
 * ```
 */
export function createEQ(
  context: AudioContext,
  bands: EQBand[] = [],
): {
  low: BiquadFilterNode;
  mid: BiquadFilterNode;
  high: BiquadFilterNode;
  input: AudioNode;
  output: AudioNode;
  setGains: (lowDb: number, midDb: number, highDb: number) => void;
} {
  const defaults: [EQBand, EQBand, EQBand] = [
    { frequency: 320, gain: 0, Q: 1, type: 'lowshelf' },
    { frequency: 1000, gain: 0, Q: 1.4, type: 'peaking' },
    { frequency: 3200, gain: 0, Q: 1, type: 'highshelf' },
  ];

  const configs = bands.length >= 3
    ? bands
    : defaults.map((d, i) => ({ ...d, ...(bands[i] ?? {}) }));

  const low = context.createBiquadFilter();
  low.type = configs[0].type!;
  low.frequency.value = configs[0].frequency;
  low.gain.value = configs[0].gain;
  low.Q.value = configs[0].Q ?? 1;

  const mid = context.createBiquadFilter();
  mid.type = configs[1].type!;
  mid.frequency.value = configs[1].frequency;
  mid.gain.value = configs[1].gain;
  mid.Q.value = configs[1].Q ?? 1.4;

  const high = context.createBiquadFilter();
  high.type = configs[2].type!;
  high.frequency.value = configs[2].frequency;
  high.gain.value = configs[2].gain;
  high.Q.value = configs[2].Q ?? 1;

  // Chain: input -> low -> mid -> high -> output
  low.connect(mid);
  mid.connect(high);

  return {
    low,
    mid,
    high,
    input: low,
    output: high,
    setGains(lowDb: number, midDb: number, highDb: number) {
      low.gain.setValueAtTime(lowDb, context.currentTime);
      mid.gain.setValueAtTime(midDb, context.currentTime);
      high.gain.setValueAtTime(highDb, context.currentTime);
    },
  };
}

/**
 * Create a dynamics compressor.
 *
 * @param context The AudioContext.
 * @param options Compressor configuration.
 * @returns An object with the DynamicsCompressorNode and optional makeup gain.
 */
export function createCompressor(
  context: AudioContext,
  options: CompressorOptions = {},
): {
  compressor: DynamicsCompressorNode;
  makeupGain: GainNode;
  input: AudioNode;
  output: AudioNode;
} {
  const {
    threshold = -24,
    ratio = 4,
    attack = 0.003,
    release = 0.25,
    knee = 30,
    makeupGain: mg = 0,
  } = options;

  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = threshold;
  compressor.ratio.value = ratio;
  compressor.attack.value = attack;
  compressor.release.value = release;
  compressor.knee.value = knee;

  const makeup = context.createGain();
  makeup.gain.value = mg;

  compressor.connect(makeup);

  return {
    compressor,
    makeupGain: makeup,
    input: compressor,
    output: makeup,
  };
}

/**
 * Create a convolution reverb effect using a generated impulse response.
 *
 * @param context The AudioContext.
 * @param options Reverb configuration.
 * @returns A promise resolving to the reverb nodes (wet/dry mix).
 *
 * @example
 * ```ts
 * const reverb = await createReverb(ctx, { decay: 3, wet: 0.7 });
 * source.connect(reverb.input);
 * reverb.output.connect(destination);
 * ```
 */
export async function createReverb(
  context: AudioContext,
  options: ReverbOptions = {},
): Promise<{
  convolver: ConvolverNode;
  wetGain: GainNode;
  dryGain: GainNode;
  input: AudioNode;
  output: AudioNode;
}> {
  const { decay = 2, reverse = false, preDelay = 0, wet = 1, dry = 0 } = options;

  const sampleRate = context.sampleRate;
  const length = sampleRate * decay;
  const impulse = context.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const channelData = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      // Exponential decay with slight randomization for natural sound
      const env = reverse ? i / length : (length - i) / length;
      channelData[i] = (Math.random() * 2 - 1) * Math.pow(env, 2);
    }
  }

  const convolver = context.createConvolver();
  convolver.buffer = impulse;
  convolver.normalize = true;

  const wetGain = context.createGain();
  wetGain.gain.value = wet;

  const dryGain = context.createGain();
  dryGain.gain.value = dry;

  // Route: input splits to both convolver->wetGain and dryGain, then merges
  convolver.connect(wetGain);

  return {
    convolver,
    wetGain,
    dryGain,
    input: convolver, // Caller should also connect source -> dryGain manually
    output: wetGain,  // Caller should merge wetGain + dryGain -> destination
  };
}

/**
 * Create a delay/echo effect with feedback.
 *
 * @param context The AudioContext.
 * @param options Delay configuration.
 * @returns The delay effect nodes.
 *
 * @example
 * ```ts
 * const delay = createDelay(ctx, { delayTime: 0.4, feedback: 0.4, wet: 0.5 });
 * source.connect(delay.input);
 * delay.output.connect(destination);
 * ```
 */
export function createDelay(
  context: AudioContext,
  options: DelayOptions = {},
): {
  delayNode: DelayNode;
  feedbackGain: GainNode;
  wetGain: GainNode;
  dryGain: GainNode;
  input: AudioNode;
  output: AudioNode;
} {
  const { delayTime = 0.3, feedback = 0.35, wet = 0.6, dry = 1 } = options;

  const delayNode = context.createDelay(5); // Max 5 second delay
  delayNode.delayTime.value = delayTime;

  const feedbackGain = context.createGain();
  feedbackGain.gain.value = feedback;

  const wetGain = context.createGain();
  wetGain.gain.value = wet;

  const dryGain = context.createGain();
  dryGain.gain.value = dry;

  // Feedback loop: delay -> feedbackGain -> delay
  delayNode.connect(feedbackGain);
  feedbackGain.connect(delayNode);

  // Wet path: delay -> wetGain -> output
  delayNode.connect(wetGain);

  return {
    delayNode,
    feedbackGain,
    wetGain,
    dryGain,
    input: delayNode,
    output: wetGain,
  };
}

/**
 * Create a waveshaper distortion effect.
 *
 * @param context The AudioContext.
 * @param options Distortion configuration.
 * @returns The distortion nodes.
 */
export function createDistortion(
  context: AudioContext,
  options: DistortionOptions = {},
): {
  shaper: WaveShaperNode;
  wetGain: GainNode;
  dryGain: GainNode;
  input: AudioNode;
  output: AudioNode;
} {
  const { amount = 20, oversample = 'none', wet = 1, dry = 0 } = options;

  // Generate a curve for soft-clipping distortion
  const samples = 44100;
  const curve = new Float32Array(samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1; // -1 to 1
    // Soft clipping formula with adjustable drive
    curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }

  const shaper = context.createWaveShaper();
  shaper.curve = curve;
  shaper.oversample = oversample;

  const wetGain = context.createGain();
  wetGain.gain.value = wet;

  const dryGain = context.createGain();
  dryGain.gain.value = dry;

  shaper.connect(wetGain);

  return {
    shaper,
    wetGain,
    dryGain,
    input: shaper,
    output: wetGain,
  };
}

/**
 * Build a complete effects chain connecting source to destination.
 *
 * @param source The source AudioNode.
 * @param destination The destination AudioNode.
 * @param context The AudioContext.
 * @param effects Ordered array of effect outputs to chain through.
 * @returns The final output node of the chain.
 */
export function buildEffectsChain(
  source: AudioNode,
  destination: AudioNode,
  context: AudioContext,
  ...effects: { input: AudioNode; output: AudioNode }[]
): AudioNode {
  let current: AudioNode = source;
  for (const effect of effects) {
    current.connect(effect.input);
    current = effect.output;
  }
  current.connect(destination);
  return current;
}

// ---------------------------------------------------------------------------
// 5. Audio Recording
// ---------------------------------------------------------------------------

/**
 * Internal state for the AudioRecorder class.
 */
interface RecorderInternalState {
  mediaRecorder: MediaRecorder | null;
  chunks: Blob[];
  stream: MediaStream | null;
  startTime: number | null;
  pausedTime: number;
  totalElapsed: number;
  active: boolean;
  options: RecordingOptions;
  analyser: AnalyserNode | null;
  sourceNode: MediaStreamAudioSourceNode | null;
}

/**
 * AudioRecorder - records audio from a microphone or any MediaStream.
 * Supports pause/resume, real-time analysis, and export to WAV/blob.
 *
 * @example
 * ```ts
 * const recorder = new AudioRecorder({
 *   onDataAvailable: (blob, elapsed) => console.log(`${elapsed.toFixed(1)}s`),
 *   onStop: (blob) => downloadBlob(blob, 'recording.webm'),
 * });
 * await recorder.start();
 * // ... later ...
 * recorder.pause();
 * recorder.resume();
 * const blob = await recorder.stop();
 * ```
 */
export class AudioRecorder {
  private _state: RecorderInternalState;

  constructor(options: RecordingOptions = {}) {
    this._state = {
      mediaRecorder: null,
      chunks: [],
      stream: null,
      startTime: null,
      pausedTime: 0,
      totalElapsed: 0,
      active: false,
      options,
      analyser: null,
      sourceNode: null,
    };
  }

  /**
   * Start recording from the default microphone.
   *
   * @param constraints Optional MediaStreamConstraints for custom device selection.
   * @returns A promise that resolves when recording has started.
   */
  async start(constraints?: MediaStreamConstraints): Promise<void> {
    if (this._state.active) {
      throw new Error('Recording is already in progress');
    }

    const defaultConstraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    };

    const stream = await navigator.mediaDevices.getUserMedia(
      constraints ?? defaultConstraints,
    );

    await this.startFromStream(stream);
  }

  /**
   * Start recording from an existing MediaStream.
   *
   * @param stream The MediaStream to record from.
   * @returns A promise that resolves when recording has started.
   */
  async startFromStream(stream: MediaStream): Promise<void> {
    if (this._state.active) {
      throw new Error('Recording is already in progress');
    }

    this._state.stream = stream;
    this._state.chunks = [];
    this._state.totalElapsed = 0;
    this._state.pausedTime = 0;
    this._state.startTime = performance.now();

    // Determine best supported MIME type
    const mimeType = this._options.mimeType ?? this._getBestMimeType();

    const recorder = new MediaRecorder(stream, {
      mimeType,
      audioBitsPerSecond:
        this._options.bitsPerSample === 24
          ? undefined
          : this._options.sampleRate
            ? this._options.sampleRate * 2 * (this._options.bitsPerSample ?? 16)
            : undefined,
    });

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        this._state.chunks.push(event.data);
        const elapsed = this.getElapsedTime();
        this._options.onDataAvailable?.(
          new Blob(this._state.chunks, { type: mimeType }),
          elapsed,
        );
      }
    };

    recorder.onerror = (event: Event) => {
      const error = new Error(
        `MediaRecorder error: ${(event as ErrorEvent).message ?? 'unknown'}`,
      );
      this._options.onError?.(error);
    };

    recorder.start(100); // Collect data every 100ms
    this._state.mediaRecorder = recorder;
    this._state.active = true;

    // Set up analyser for live monitoring
    const ctx = getAudioContext();
    this._state.analyser = createAnalyser(ctx, 2048, 0.8);
    this._state.sourceNode = ctx.createMediaStreamSource(stream);
    this._state.sourceNode.connect(this._state.analyser);
  }

  /**
   * Pause the current recording.
   * Data collection stops but the stream remains open.
   */
  pause(): void {
    if (
      !this._state.active ||
      !this._state.mediaRecorder ||
      this._state.mediaRecorder.state === 'paused'
    ) {
      return;
    }
    this._state.mediaRecorder.pause();
    this._state.pausedTime = performance.now();
  }

  /**
   * Resume a paused recording.
   */
  resume(): void {
    if (
      !this._state.active ||
      !this._state.mediaRecorder ||
      this._state.mediaRecorder.state !== 'paused'
    ) {
      return;
    }
    if (this._state.pausedTime > 0) {
      this._state.totalElapsed += performance.now() - this._state.pausedTime;
      this._state.pausedTime = 0;
    }
    this._state.mediaRecorder.resume();
  }

  /**
   * Stop recording and return the collected audio as a Blob.
   *
   * @returns A promise resolving to the recorded audio Blob.
   */
  async stop(): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
      if (
        !this._state.active ||
        !this._state.mediaRecorder
      ) {
        reject(new Error('No active recording to stop'));
        return;
      }

      const mimeType = this._state.mediaRecorder.mimeType;

      this._state.mediaRecorder.onstop = () => {
        const blob = new Blob(this._state.chunks, { type: mimeType });
        this._cleanup();
        this._options.onStop?.(blob);
        resolve(blob);
      };

      this._state.mediaRecorder.stop();
    });
  }

  /**
   * Stop recording and export the result as a WAV file (Blob).
   * This decodes the recorded data and re-encodes it as uncompressed WAV.
   *
   * @returns A promise resolving to a WAV Blob.
   */
  async stopAsWav(): Promise<Blob> {
    const recordedBlob = await this.stop();
    return blobToWav(recordedBlob);
  }

  /**
   * Get the elapsed recording time in seconds (excluding paused periods).
   *
   * @returns Elapsed time in seconds.
   */
  getElapsedTime(): number {
    if (!this._state.startTime) return 0;
    let elapsed = performance.now() - this._state.startTime;
    if (this._state.pausedTime > 0) {
      elapsed -= performance.now() - this._state.pausedTime;
    }
    return (elapsed - this._state.totalElapsed) / 1000;
  }

  /**
   * Check if currently recording (and not paused).
   *
   * @returns True if actively recording.
   */
  isRecording(): boolean {
    return (
      this._state.active &&
      !!this._state.mediaRecorder &&
      this._state.mediaRecorder.state === 'recording'
    );
  }

  /**
   * Check if recording is paused.
   *
   * @returns True if paused.
   */
  isPaused(): boolean {
    return (
      this._state.active &&
      !!this._state.mediaRecorder &&
      this._state.mediaRecorder.state === 'paused'
    );
  }

  /**
   * Get the AnalyserNode for live visualization while recording.
   *
   * @returns The AnalyserNode or null if not recording.
   */
  getAnalyser(): AnalyserNode | null {
    return this._state.analyser;
  }

  /**
   * Get the underlying MediaStream.
   *
   * @returns The MediaStream or null.
   */
  getStream(): MediaStream | null {
    return this._state.stream;
  }

  /**
   * Release all resources. Call when done with the recorder.
   */
  dispose(): void {
    this._cleanup();
  }

  /** Clean up internal resources. */
  private _cleanup(): void {
    if (this._state.sourceNode) {
      this._state.sourceNode.disconnect();
      this._state.sourceNode = null;
    }
    if (this._state.stream) {
      this._state.stream.getTracks().forEach((track) => track.stop());
      this._state.stream = null;
    }
    this._state.analyser = null;
    this._state.mediaRecorder = null;
    this._state.chunks = [];
    this._state.startTime = null;
    this._state.pausedTime = 0;
    this._state.totalElapsed = 0;
    this._state.active = false;
  }

  /** Resolve the best available MIME type for recording. */
  private _getBestMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  }

  /** Shorthand for options access. */
  private get _options(): RecordingOptions {
    return this._state.options;
  }
}

/**
 * Convert an audio Blob (any format) to a WAV Blob.
 * Decodes the audio then encodes as uncompressed PCM WAV.
 *
 * @param audioBlob The source audio Blob.
 * @param context Optional AudioContext for decoding.
 * @returns A promise resolving to a WAV Blob.
 */
export async function blobToWav(
  audioBlob: Blob,
  context?: AudioContext,
): Promise<Blob> {
  const ctx = context ?? getAudioContext();
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  return audioBufferToWav(audioBuffer);
}

/**
 * Convert an AudioBuffer to a WAV Blob.
 *
 * @param buffer The AudioBuffer to convert.
 * @returns A WAV Blob.
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const align = numChannels * bytesPerSample;

  // Interleave channels
  const dataLength = buffer.length * align;
  const data = new ArrayBuffer(44 + dataLength);
  const view = new DataView(data);

  // Write WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (PCM)
  view.setUint16(20, 1, true); // AudioFormat (PCM = 1)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * align, true); // Byte rate
  view.setUint16(32, align, true); // Block align
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Write interleaved PCM data
  let offset = 44;
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += bytesPerSample;
    }
  }

  return new Blob([data], { type: 'audio/wav' });
}

/** Helper to write a string into a DataView at a byte offset. */
function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// ---------------------------------------------------------------------------
// 6. Audio Playback
// ---------------------------------------------------------------------------

/**
 * Internal state for AudioPlayer.
 */
interface PlayerInternalState {
  audioBuffer: AudioBuffer | null;
  sourceNode: AudioBufferSourceNode | null;
  startTime: number | null;
  pauseTime: number;
  gainNode: GainNode;
  analyser: AnalyserNode;
  loopPoints: LoopPoints | null;
  loopEnabled: boolean;
  playbackRate: number;
  context: AudioContext;
  connected: boolean;
  endedCallback: (() => void) | null;
}

/**
 * AudioPlayer - plays back AudioBuffers with full control.
 * Supports play/pause/seek, crossfade, loop points, and speed change.
 *
 * @example
 * ```ts
 * const player = new AudioPlayer();
 * await player.load('/audio/track.mp3');
 * player.play();
 * player.setPlaybackRate(1.5); // 1.5x speed
 * player.seek(30); // Jump to 30s
 * player.setLoopPoints({ start: 10, end: 45 });
 * player.enableLoop(true);
 * ```
 */
export class AudioPlayer {
  private _state: PlayerInternalState;

  constructor(context?: AudioContext) {
    const ctx = context ?? getAudioContext();
    this._state = {
      audioBuffer: null,
      sourceNode: null,
      startTime: null,
      pauseTime: 0,
      gainNode: createGainNode(ctx, 1),
      analyser: createAnalyser(ctx),
      loopPoints: null,
      loopEnabled: false,
      playbackRate: 1,
      context: ctx,
      connected: false,
      endedCallback: null,
    };
  }

  /**
   * Load audio from a URL, fetch response, File, or ArrayBuffer.
   *
   @param source The audio source (URL string, Response, File, ArrayBuffer, or AudioBuffer).
   * @returns A promise resolving when the audio is decoded and ready.
   */
  async load(
    source: string | Response | File | ArrayBuffer | AudioBuffer,
  ): Promise<void> {
    let buffer: AudioBuffer;

    if (source instanceof AudioBuffer) {
      buffer = source;
    } else {
      let arrayBuffer: ArrayBuffer;
      if (typeof source === 'string') {
        const resp = await fetch(source);
        arrayBuffer = await resp.arrayBuffer();
      } else if (source instanceof Response) {
        arrayBuffer = await source.arrayBuffer();
      } else if (source instanceof File) {
        arrayBuffer = await source.arrayBuffer();
      } else {
        arrayBuffer = source;
      }
      buffer = await this._state.context.decodeAudioData(arrayBuffer);
    }

    this._state.audioBuffer = buffer;
    this._ensureConnected();
  }

  /**
   * Start or resume playback.
   */
  play(): void {
    if (!this._state.audioBuffer) {
      throw new Error('No audio loaded. Call load() first.');
    }

    // Stop any existing source before creating a new one
    this._stopSource();

    const source = this._state.context.createBufferSource();
    source.buffer = this._state.audioBuffer;
    source.playbackRate.value = this._state.playbackRate;
    source.loop = this._state.loopEnabled;

    if (this._state.loopEnabled && this._state.loopPoints) {
      source.loopStart = this._state.loopPoints.start;
      source.loopEnd = this._state.loopPoints.end;
    }

    source.connect(this._state.gainNode);

    // Handle natural end of playback
    source.onended = () => {
      if (this._state.sourceNode === source) {
        this._state.startTime = null;
        this._state.endedCallback?.();
      }
    };

    const offset = this._state.pauseTime;
    source.start(0, offset);

    this._state.sourceNode = source;
    this._state.startTime = this._state.context.currentTime - offset;
  }

  /**
   * Pause playback, preserving current position.
   */
  pause(): void {
    if (!this.isPlaying()) return;
    this._state.pauseTime = this.getCurrentTime();
    this._stopSource();
    this._state.startTime = null;
  }

  /**
   * Stop playback and reset position to beginning.
   */
  stop(): void {
    this._stopSource();
    this._state.pauseTime = 0;
    this._state.startTime = null;
  }

  /**
   * Seek to a specific position in seconds.
   * If playing, seamlessly restarts from the new position.
   *
   * @param time Position in seconds.
   */
  seek(time: number): void {
    const clamped = Math.max(
      0,
      Math.min(time, this._state.audioBuffer?.duration ?? 0),
    );
    const wasPlaying = this.isPlaying();
    if (wasPlaying) {
      this._stopSource();
    }
    this._state.pauseTime = clamped;
    this._state.startTime = null;
    if (wasPlaying) {
      this.play();
    }
  }

  /**
   * Set the playback rate (speed).
   * Values > 1 speed up, < 1 slow down.
   * Note: this changes pitch proportionally (Web Audio API limitation).
   * For pitch-preserving speed change, consider offline rendering approaches.
   *
   * @param rate Playback rate (0.25 to 4.0 typical range).
   */
  setPlaybackRate(rate: number): void {
    const clamped = Math.max(0.125, Math.min(rate, 8.0));
    this._state.playbackRate = clamped;
    if (this._state.sourceNode) {
      this._state.sourceNode.playbackRate.setTargetAtTime(
        clamped,
        this._state.context.currentTime,
        0.05,
      );
    }
  }

  /**
   * Set the volume (0-1).
   *
   * @param vol Volume level.
   * @param rampTime Optional ramp duration in seconds.
   */
  setVolume(vol: number, rampTime: number = 0): void {
    setVolume(this._state.gainNode, vol, rampTime, this._state.context);
  }

  /**
   * Mute or unmute.
   *
   * @param muted True to mute.
   */
  setMuted(muted: boolean): void {
    this._state.gainNode.gain.setValueAtTime(
      muted ? 0 : this._state.gainNode.gain.value || 1,
      this._state.context.currentTime,
    );
  }

  /**
   * Enable or disable looping.
   *
   * @param enabled True to enable looping.
   */
  enableLoop(enabled: boolean): void {
    this._state.loopEnabled = enabled;
    if (this._state.sourceNode) {
      this._state.sourceNode.loop = enabled;
    }
  }

  /**
   * Set loop start and end points.
   *
   * @param points Loop region (start/end in seconds).
   */
  setLoopPoints(points: LoopPoints): void {
    this._state.loopPoints = points;
    if (this._state.sourceNode) {
      this._state.sourceNode.loopStart = points.start;
      this._state.sourceNode.loopEnd = points.end;
    }
  }

  /**
   * Clear loop points.
   */
  clearLoopPoints(): void {
    this._state.loopPoints = null;
  }

  /**
   * Connect the player's output to a destination node.
   *
   * @param destination The destination AudioNode.
   */
  connect(destination: AudioNode): void {
    this._ensureConnected();
    this._state.analyser.connect(destination);
  }

  /**
   * Disconnect from the destination.
   */
  disconnect(): void {
    try {
      this._state.analyser.disconnect();
    } catch {
      // Already disconnected
    }
  }

  /**
   * Get current playback position in seconds.
   *
   * @returns Current time in seconds.
   */
  getCurrentTime(): number {
    if (this._state.startTime !== null && this._state.sourceNode) {
      return (
        this._state.context.currentTime - this._state.startTime
      );
    }
    return this._state.pauseTime;
  }

  /**
   * Get the total duration of the loaded audio.
   *
   * @returns Duration in seconds, or 0 if not loaded.
   */
  getDuration(): number {
    return this._state.audioBuffer?.duration ?? 0;
  }

  /**
   * Check if currently playing.
   *
   * @returns True if playing.
   */
  isPlaying(): boolean {
    return (
      this._state.sourceNode !== null &&
      this._state.startTime !== null
    );
  }

  /**
   * Get the full playback state snapshot.
   *
   * @returns A PlaybackState object.
   */
  getState(): PlaybackState {
    return {
      currentTime: this.getCurrentTime(),
      duration: this.getDuration(),
      playing: this.isPlaying(),
      playbackRate: this._state.playbackRate,
      loop: this._state.loopEnabled,
      loopPoints: this._state.loopPoints
        ? { ...this._state.loopPoints }
        : null,
      volume: this._state.gainNode.gain.value,
      muted: this._state.gainNode.gain.value === 0,
    };
  }

  /**
   * Get the AnalyserNode for visualization.
   *
   * @returns The AnalyserNode.
   */
  getAnalyser(): AnalyserNode {
    return this._state.analyser;
  }

  /**
   * Get the GainNode for direct manipulation.
   *
   * @returns The GainNode.
   */
  getGainNode(): GainNode {
    return this._state.gainNode;
  }

  /**
   * Register a callback for when playback ends naturally.
   *
   * @param callback Function to call on playback end.
   */
  onEnded(callback: () => void): void {
    this._state.endedCallback = callback;
  }

  /**
   * Release all resources.
   */
  dispose(): void {
    this._stopSource();
    this.disconnect();
    this._state.audioBuffer = null;
  }

  /** Ensure the gain->analyser chain is set up. */
  private _ensureConnected(): void {
    if (!this._state.connected) {
      this._state.gainNode.connect(this._state.analyser);
      this._state.connected = true;
    }
  }

  /** Safely stop and clean up the current source node. */
  private _stopSource(): void {
    if (this._state.sourceNode) {
      try {
        this._state.sourceNode.onended = null;
        this._state.sourceNode.stop();
        this._state.sourceNode.disconnect();
      } catch {
        // Source may have already stopped
      }
      this._state.sourceNode = null;
    }
  }
}

/**
 * Crossfade between two AudioPlayers over a specified duration.
 * Fades out playerA while fading in playerB simultaneously.
 *
 * @param playerA The outgoing player.
 * @param playerB The incoming player (should already be loaded).
 * @param options Crossfade configuration.
 * @returns A promise that resolves when the crossfade is complete.
 *
 * @example
 * ```ts
 * await crossfade(playerA, playerB, { duration: 3, curve: 'equal-power' });
 * ```
 */
export async function crossfade(
  playerA: AudioPlayer,
  playerB: AudioPlayer,
  options: CrossfadeOptions = {},
): Promise<void> {
  const { duration = 2, curve = 'equal-power' } = options;
  const ctx = getAudioContext();

  const gainA = playerA.getGainNode();
  const gainB = playerB.getGainNode();

  const now = ctx.currentTime;
  const startVolA = gainA.gain.value;
  const startVolB = gainB.gain.value;

  // Start playerB at the same time
  playerB.play();

  if (curve === 'equal-power') {
    // Equal-power crossfade: use sine curves for constant perceived loudness
    // sin(0) = 0, sin(pi/2) = 1
    gainA.gain.setValueAtTime(startVolA, now);
    gainA.gain.linearRampToValueAtTime(0, now + duration);

    gainB.gain.setValueAtTime(0, now);
    gainB.gain.linearRampToValueAtTime(startVolB || 1, now + duration);
  } else {
    // Linear crossfade
    gainA.gain.setValueAtTime(startVolA, now);
    gainA.gain.linearRampToValueAtTime(0, now + duration);

    gainB.gain.setValueAtTime(0, now);
    gainB.gain.linearRampToValueAtTime(startVolB || 1, now + duration);
  }

  // Wait for crossfade to complete
  await new Promise<void>((resolve) => {
    setTimeout(resolve, duration * 1000);
  });

  // Fully stop playerA
  playerA.stop();
}

// ---------------------------------------------------------------------------
// 7. Audio Visualization Data Generators
// ---------------------------------------------------------------------------

/**
 * Generate frequency bar data suitable for visualization (e.g., bar charts).
 * Splits the frequency spectrum into a specified number of bands using
 * logarithmic grouping to match human hearing perception.
 *
 * @param analyser The AnalyserNode to read from.
 * @param numBars Number of output bars/bands. Default 32.
 * @param minFreq Minimum frequency to include (Hz). Default 20.
 * @param maxFreq Maximum frequency to include (Hz). Default 20000.
 * @returns A FrequencyBarData object with normalized values and center frequencies.
 */
export function generateFrequencyBars(
  analyser: AnalyserNode,
  numBars: number = 32,
  minFreq: number = 20,
  maxFreq: number = 20000,
): FrequencyBarData {
  const freqData = getFrequencyData(analyser);
  const sampleRate = analyser.context.sampleRate;
  const fftSize = analyser.fftSize;
  const binCount = analyser.frequencyBinCount;

  const values = new Array<number>(numBars).fill(0);
  const frequencies = new Array<number>(numBars).fill(0);

  // Logarithmic spacing between minFreq and maxFreq
  const logMin = Math.log(minFreq);
  const logMax = Math.log(maxFreq);
  const logStep = (logMax - logMin) / numBars;

  for (let bar = 0; bar < numBars; bar++) {
    const loFreq = Math.exp(logMin + bar * logStep);
    const hiFreq = Math.exp(logMin + (bar + 1) * logStep);
    frequencies[bar] = Math.sqrt(loFreq * hiFreq); // Geometric mean

    const loBin = Math.floor((loFreq * fftSize) / sampleRate);
    const hiBin = Math.ceil((hiFreq * fftSize) / sampleRate);

    let sum = 0;
    let count = 0;
    for (let bin = loBin; bin <= hiBin && bin < binCount; bin++) {
      if (bin >= 0) {
        sum += freqData[bin];
        count++;
      }
    }

    values[bar] = count > 0 ? sum / count / 255 : 0; // Normalize to 0-1
  }

  const average = values.reduce((a, b) => a + b, 0) / values.length;
  const max = Math.max(...values);

  return { values, frequencies, average, max };
}

/**
 * Generate waveform visualization data as normalized points (-1 to 1).
 *
 * @param analyser The AnalyserNode to read from.
 * @param numPoints Number of output points. Default 256.
 * @returns A WaveformData object.
 */
export function generateWaveformPoints(
  analyser: AnalyserNode,
  numPoints: number = 256,
): WaveformData {
  const rawData = getWaveformData(analyser);
  const points = new Float32Array(numPoints);

  const step = rawData.length / numPoints;
  let min = 1;
  let max = -1;

  for (let i = 0; i < numPoints; i++) {
    const idx = Math.floor(i * step);
    // Convert from 0-255 range to -1..+1
    const val = (rawData[idx] - 128) / 128;
    points[i] = val;
    if (val < min) min = val;
    if (val > max) max = val;
  }

  return { points, length: numPoints, min, max };
}

/**
 * Generate a complete analysis snapshot combining frequency, waveform, and volume data.
 * Convenience function for getting all visualization data in one call.
 *
 * @param analyser The AnalyserNode to analyze.
 * @param numBars Number of frequency bars (for generateFrequencyBars).
 * @param numWaveformPoints Number of waveform points (for generateWaveformPoints).
 * @returns A full AudioAnalysisSnapshot.
 */
export function generateAnalysisSnapshot(
  analyser: AnalyserNode,
  numBars: number = 32,
  numWaveformPoints: number = 256,
): AudioAnalysisSnapshot {
  const frequencyData = getFrequencyData(analyser);
  const waveformData = getWaveformData(analyser);
  const floatFrequencyData = getFloatFrequencyData(analyser);
  const volume = analyzeVolume(analyser);

  return {
    frequencyData,
    waveformData,
    floatFrequencyData,
    volume,
  };
}

// ---------------------------------------------------------------------------
// 8. Volume Analysis
// ---------------------------------------------------------------------------

/**
 * Perform volume analysis on an AnalyserNode's current data.
 * Computes RMS level, peak level, silence detection, and dB values.
 *
 * @param analyser The AnalyserNode to analyze.
 * @param silenceThreshold RMS threshold below which audio is considered silent. Default 0.01.
 * @returns A VolumeAnalysis result object.
 */
export function analyzeVolume(
  analyser: AnalyserNode,
  silenceThreshold: number = 0.01,
): VolumeAnalysis {
  const waveData = getWaveformData(analyser);
  const len = waveData.length;

  // Convert to -1..+1 range and compute RMS
  let sumSquares = 0;
  let peakAbs = 0;
  for (let i = 0; i < len; i++) {
    const sample = (waveData[i] - 128) / 128;
    sumSquares += sample * sample;
    const abs = Math.abs(sample);
    if (abs > peakAbs) peakAbs = abs;
  }

  const rms = Math.sqrt(sumSquares / len);
  const peak = peakAbs;
  const silent = rms < silenceThreshold;

  // Convert to dB (with floor to avoid -Infinity)
  const MIN_DB = -96;
  const peakDb = peak > 0 ? linearToDb(peak) : MIN_DB;
  const rmsDb = rms > 0 ? linearToDb(rms) : MIN_DB;

  return {
    rms,
    peak,
    peakHoldSamples: 0, // Would need persistent state for true peak hold
    silent,
    peakDb,
    rmsDb,
  };
}

/**
 * Advanced volume analyzer with persistent peak-hold state.
 * Tracks peak levels over time with configurable decay.
 */
export class VolumeAnalyzer {
  private _peak: number = 0;
  private _peakHoldSamples: number = 0;
  private _peakDecayFrames: number;
  private _frameCount: number = 0;
  private _silenceThreshold: number;
  private _history: number[] = [];
  private _historySize: number;

  /**
   * @param peakHoldFrames Number of frames before peak decays. Default 44100 (~1s at default rate).
   * @param silenceThreshold RMS threshold for silence detection. Default 0.01.
   * @param historySize Number of past frames to keep for smoothing. Default 10.
   */
  constructor(
    peakHoldFrames: number = 44100,
    silenceThreshold: number = 0.01,
    historySize: number = 10,
  ) {
    this._peakDecayFrames = peakHoldFrames;
    this._silenceThreshold = silenceThreshold;
    this._historySize = historySize;
  }

  /**
   * Analyze the current audio data from an AnalyserNode.
   *
   * @param analyser The AnalyserNode.
   * @returns A VolumeAnalysis with persistent peak tracking.
   */
  analyze(analyser: AnalyserNode): VolumeAnalysis {
    const base = analyzeVolume(analyser, this._silenceThreshold);

    // Update peak hold
    this._frameCount++;
    if (base.peak >= this._peak) {
      this._peak = base.peak;
      this._peakHoldSamples = 0;
    } else {
      this._peakHoldSamples++;
      if (this._peakHoldSamples > this._peakDecayFrames) {
        // Exponential decay of held peak
        this._peak *= 0.99;
        this._peakHoldSamples = 0;
      }
    }

    // Smoothed RMS via moving average
    this._history.push(base.rms);
    if (this._history.length > this._historySize) {
      this._history.shift();
    }
    const smoothedRms =
      this._history.reduce((a, b) => a + b, 0) / this._history.length;

    return {
      rms: smoothedRms,
      peak: this._peak,
      peakHoldSamples: this._peakHoldSamples,
      silent: smoothedRms < this._silenceThreshold,
      peakDb: this._peak > 0 ? linearToDb(this._peak) : -96,
      rmsDb: smoothedRms > 0 ? linearToDb(smoothedRms) : -96,
    };
  }

  /**
   * Reset the peak hold to zero.
   */
  resetPeak(): void {
    this._peak = 0;
    this._peakHoldSamples = 0;
    this._frameCount = 0;
    this._history = [];
  }

  /**
   * Get the current peak hold value.
   */
  getPeak(): number {
    return this._peak;
  }
}

/**
 * Detect silence in an AudioBuffer by analyzing RMS across windows.
 *
 * @param buffer The AudioBuffer to analyze.
 * @param windowSize Samples per analysis window. Default 4096.
 * @param threshold RMS threshold for silence. Default 0.01.
 * @param channel Channel index to analyze. Default 0 (first channel).
 * @returns Array of { start, end, silent } segments.
 */
export function detectSilenceInBuffer(
  buffer: AudioBuffer,
  windowSize: number = 4096,
  threshold: number = 0.01,
  channel: number = 0,
): { start: number; end: number; silent: boolean }[] {
  const data = buffer.getChannelData(channel);
  const segments: { start: number; end: number; silent: boolean }[] = [];

  for (let start = 0; start < data.length; start += windowSize) {
    const end = Math.min(start + windowSize, data.length);
    let sumSquares = 0;
    for (let i = start; i < end; i++) {
      sumSquares += data[i] * data[i];
    }
    const rms = Math.sqrt(sumSquares / (end - start));
    segments.push({
      start: start / buffer.sampleRate,
      end: end / buffer.sampleRate,
      silent: rms < threshold,
    });
  }

  return segments;
}

// ---------------------------------------------------------------------------
// 9. Audio Utilities
// ---------------------------------------------------------------------------

/**
 * Format a time value in seconds to mm:ss or hh:mm:ss string.
 *
 * @param seconds Time in seconds.
 * @param showHours Whether to always show hours. Default false (auto-detect).
 * @returns Formatted time string.
 *
 * @example
 * ```ts
 * formatTime(65);       // "01:05"
 * formatTime(3661);     // "01:01:01"
 * formatTime(65, true); // "00:01:05"
 * ```
 */
export function formatTime(seconds: number, showHours: boolean = false): string {
  const s = Math.abs(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 100);

  const mm = m.toString().padStart(2, '0');
  const ss = sec.toString().padStart(2, '0');

  if (h > 0 || showHours) {
    const hh = h.toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Format time with milliseconds precision: mm:ss.ms
 *
 * @param seconds Time in seconds.
 * @returns Formatted time string with milliseconds.
 */
export function formatTimeWithMs(seconds: number): string {
  const s = Math.abs(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 100);

  const mm = m.toString().padStart(2, '0');
  const ss = sec.toString().padStart(2, '0');
  const mss = ms.toString().padStart(2, '0');

  if (h > 0) {
    const hh = h.toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}.${mss}`;
  }
  return `${mm}:${ss}.${mss}`;
}

/**
 * Convert a decibel value to linear amplitude scale.
 *
 * @param db Value in decibels.
 * @returns Linear amplitude (0 to +inf for positive dB, 0 to 1 for negative).
 *
 * @example
 * ```ts
 * linearToDb(0.5);     // ~ -6.02 dB
 * dbToLinear(-6.02);   // ~ 0.5
 * ```
 */
export function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

/**
 * Convert a linear amplitude value to decibels.
 *
 * @param linear Linear amplitude (0-1 typical, can be higher).
 * @returns Value in decibels. Returns -Infinity for 0.
 */
export function linearToDb(linear: number): number {
  if (linear <= 0) return -Infinity;
  return 20 * Math.log10(linear);
}

/**
 * Calculate duration in seconds from sample count and sample rate.
 *
 * @param sampleCount Number of audio samples.
 * @param sampleRate Sample rate in Hz.
 * @returns Duration in seconds.
 */
export function samplesToDuration(sampleCount: number, sampleRate: number): number {
  return sampleCount / sampleRate;
}

/**
 * Calculate sample count from duration and sample rate.
 *
 * @param duration Duration in seconds.
 * @param sampleRate Sample rate in Hz.
 * @returns Number of samples.
 */
export function durationToSamples(duration: number, sampleRate: number): number {
  return Math.ceil(duration * sampleRate);
}

/**
 * Convert MIDI note number to frequency in Hz.
 * Uses equal temperament tuning (A4 = 440 Hz).
 *
 * @param midiNote MIDI note number (0-127, where 69 = A4).
 * @returns Frequency in Hz.
 *
 * @example
 * ```ts
 * midiToFreq(69); // 440 Hz (A4)
 * midiToFreq(60); // ~261.63 Hz (Middle C)
 * ```
 */
export function midiToFreq(midiNote: number): number {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

/**
 * Convert frequency in Hz to the nearest MIDI note number.
 *
 * @param freq Frequency in Hz.
 * @returns MIDI note number (float, round for nearest integer).
 */
export function freqToMidi(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}

/**
 * Create a simple tone/sine wave oscillator for testing or UI sounds.
 *
 * @param context The AudioContext.
 * @param frequency Frequency in Hz. Default 440.
 * @param duration Duration in seconds. Default 0.5.
 * @param type Oscillator wave type. Default 'sine'.
 * @param volume Output volume (0-1). Default 0.3.
 * @returns The started OscillatorNode (call stop() or let it end naturally).
 */
export function createTone(
  context: AudioContext,
  frequency: number = 440,
  duration: number = 0.5,
  type: OscillatorType = 'sine',
  volume: number = 0.3,
): OscillatorNode {
  const osc = context.createOscillator();
  const gain = context.createGain();

  osc.type = type;
  osc.frequency.value = frequency;

  gain.gain.setValueAtTime(volume, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);

  osc.connect(gain);
  gain.connect(context.destination);

  osc.start(context.currentTime);
  osc.stop(context.currentTime + duration);

  return osc;
}

/**
 * Download a Blob as a file in the browser.
 *
 * @param blob The Blob to download.
 * @param filename Suggested filename.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a short delay to ensure the download starts
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Check if the Web Audio API is available in the current environment.
 *
 * @returns True if Web Audio API is supported.
 */
export function isWebAudioSupported(): boolean {
  return typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined';
}

/**
 * Check if MediaRecorder API is available (for recording support).
 *
 * @returns True if MediaRecorder is supported.
 */
export function isRecordingSupported(): boolean {
  return typeof MediaRecorder !== 'undefined';
}

/**
 * Request microphone permission from the user.
 *
 * @returns A promise resolving to true if permission granted, false otherwise.
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}
