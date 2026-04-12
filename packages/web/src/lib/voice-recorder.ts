/**
 * Voice Recorder: Browser audio recording with MediaRecorder API,
 * waveform visualization, silence detection, auto-pause/resume,
 * format selection (WebM/OGG/MP4), quality settings, real-time
 * audio level monitoring, transcription integration hooks,
 * and blob export with metadata.
 */

// --- Types ---

export type AudioFormat = "webm" | "ogg" | "mp4" | "wav";

export type RecordingState = "idle" | "recording" | "paused" | "stopped" | "error";

export interface RecorderOptions {
  /** Audio MIME type / format */
  format?: AudioFormat;
  /** Audio codec preference */
  codec?: string;
  /** Sample rate (Hz) */
  sampleRate?: number;
  /** Bitrate (bps) */
  bitrate?: number;
  /** Number of audio channels (1=mono, 2=stereo) */
  channels?: number | "default";
  /** Enable echo cancellation */
  echoCancellation?: boolean;
  /** Enable noise suppression */
  noiseSuppression?: boolean;
  /** Enable auto-gain control */
  autoGainControl?: boolean;
  /** Silence detection threshold (0-1, 0 = no detection) */
  silenceThreshold?: number;
  /** Minimum silence duration to trigger pause (ms) */
  silenceDurationMs?: number;
  /** Auto-pause on silence? */
  autoPauseOnSilence?: boolean;
  /** Max recording duration (ms, 0 = unlimited) */
  maxDuration?: number;
  /** Request time slice for data availability callback */
  timeSlice?: number;
  /** Called when audio data chunk is available */
  onDataAvailable?: (blob: Blob) => void;
  /** Called on state change */
  onStateChange?: (state: RecordingState) => void;
  /** Called with current audio level (0-1) */
  onAudioLevel?: (level: number) => void;
  /** Called when silence is detected */
  onSilenceDetected?: (duration: number) => void;
  /** Called when speech resumes after silence */
  onSpeechResumed?: () => void;
  /** Called when max duration is reached */
  onMaxDurationReached?: () => void;
  /** Called on error */
  onError?: (error: RecorderError) => void;
  /** Device ID for specific microphone */
  deviceId?: string;
}

export interface RecorderError {
  code: string;
  message: string;
  fatal: boolean;
}

export interface RecordingResult {
  /** Recorded audio as Blob */
  blob: Blob;
  /** Data URL for playback */
  dataURL: string;
  /** Format used */
  format: AudioFormat;
  /** Duration in ms */
  duration: number;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
  /** Number of recorded chunks */
  chunks: number;
  /** Timestamp of start */
  startedAt: number;
  /** Timestamp of stop */
  stoppedAt: number;
}

export interface WaveformData {
  /** Float32Array of amplitude values (normalized -1 to 1) */
  amplitudes: Float32Array;
  /** Sample count */
  length: number;
  /** Peak amplitude */
  peak: number;
  /** Average RMS (root mean square) */
  rms: number;
}

export interface DeviceInfo {
  deviceId: string;
  label: string;
  kind: "audioinput";
}

// --- MIME Type Resolution ---

function resolveMimeType(format: AudioFormat, codec?: string): string {
  const mimeMap: Record<AudioFormat, string> = {
    webm: "audio/webm",
    ogg: "audio/ogg",
    mp4: "audio/mp4",
    wav: "audio/wav",
  };

  const base = mimeMap[format] ?? "audio/webm";

  if (codec && format !== "wav") {
    return `${base};codecs=${codec}`;
  }

  // Try common codecs per format
  const codecHints: Record<string, string> = {
    "audio/webm": ";codecs=opus",
    "audio/ogg": ";codecs=opus",
    "audio/mp4": ";codecs=mp4a.40.2", // AAC
  };

  return base + (codecHints[base] ?? "");
}

/** Check if a MIME type is supported by the browser. */
function isMimeTypeSupported(mimeType: string): boolean {
  if (typeof MediaRecorder === "undefined") return false;
  return MediaRecorder.isTypeSupported(mimeType);
}

// --- Core Recorder ---

export class VoiceRecorder {
  private options: Required<RecorderOptions>;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private analyserNode: AnalyserNode | null = null;
  private _state: RecordingState = "idle";
  private chunks: Blob[] = [];
  private startTime: number | null = null;
  private pausedDuration = 0;
  private pauseStartTime: number | null = null;
  private animationFrameId: number | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private isSilent = false;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;

  constructor(options: RecorderOptions = {}) {
    this.options = {
      format: "webm",
      codec: undefined,
      sampleRate: 44100,
      bitrate: 128000,
      channels: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      silenceThreshold: 0.02,
      silenceDurationMs: 1500,
      autoPauseOnSilence: false,
      maxDuration: 0,
      timeSlice: 1000,
      ...options,
    };
  }

  get state(): RecordingState {
    return this._state;
  }

  get isRecording(): boolean {
    return this._state === "recording";
  }

  get isPaused(): boolean {
    return this._state === "paused";
  }

  get duration(): number {
    if (!this.startTime) return 0;
    const base = Date.now() - this.startTime - this.pausedDuration;
    if (this._state === "paused" && this.pauseStartTime) {
      return base - (Date.now() - this.pauseStartTime);
    }
    return base;
  }

  /** Enumerate available audio input devices. */
  static async listDevices(): Promise<DeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter((d) => d.kind === "audioinput")
        .map((d) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.slice(0, 6)}`,
          kind: "audioinput" as const,
        }));
    } catch {
      return [];
    }
  }

  /** Request microphone permission and set up stream. */
  async requestPermission(): Promise<boolean> {
    try {
      const constraints: MediaTrackConstraints = {
        audio: {
          echoCancellation: this.options.echoCancellation,
          noiseSuppression: this.options.noiseSuppression,
          autoGainControl: this.options.autoGainControl,
          ...(this.options.deviceId ? { deviceId: { exact: this.options.deviceId } } : {}),
        },
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Set up analyser for level monitoring
      this.setupAnalyser();

      return true;
    } catch (err) {
      this.setState("error");
      this.emitError({
        code: "PERMISSION_DENIED",
        message: err instanceof Error ? err.message : "Microphone access denied",
        fatal: true,
      });
      return false;
    }
  }

  /** Start recording. */
  async start(): Promise<void> {
    if (this._state === "recording") return;

    // Ensure we have a stream
    if (!this.stream) {
      const granted = await this.requestPermission();
      if (!granted) return;
    }

    // Resolve best supported MIME type
    let mimeType = resolveMimeType(this.options.format, this.options.codec);
    if (!isMimeTypeSupported(mimeType)) {
      // Fallback chain
      const fallbacks = [
        "audio/webm;codecs=opus",
        "audio/ogg;codecs=opus",
        "audio/mp4",
        "audio/webm",
        "",
      ];
      mimeType = fallbacks.find(isMimeTypeSupported) ?? "";
    }

    try {
      this.chunks = [];
      this.startTime = Date.now();
      this.pausedDuration = 0;

      this.mediaRecorder = new MediaRecorder(this.stream!, {
        mimeType: mimeType || undefined,
        audioBitsPerSecond: this.options.bitrate,
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
          this.options.onDataAvailable?.(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.stopLevelMonitoring();
        this.setState("stopped");
      };

      this.mediaRecorder.onerror = (event) => {
        this.emitError({
          code: "RECORDER_ERROR",
          message: (event as ErrorEvent).message || "MediaRecorder error",
          fatal: true,
        });
        this.setState("error");
      };

      this.mediaRecorder.start(this.options.timeSlice);
      this.setState("recording");
      this.startLevelMonitoring();

      // Max duration timer
      if (this.options.maxDuration > 0) {
        setTimeout(() => {
          if (this._state === "recording") {
            this.options.onMaxDurationReached?.();
            this.stop();
          }
        }, this.options.maxDuration);
      }
    } catch (err) {
      this.emitError({
        code: "START_ERROR",
        message: err instanceof Error ? err.message : "Failed to start recording",
        fatal: true,
      });
      this.setState("error");
    }
  }

  /** Pause recording. */
  pause(): void {
    if (this._state !== "recording" || !this.mediaRecorder) return;

    try {
      this.mediaRecorder.pause();
      this.pauseStartTime = Date.now();
      this.setState("paused");
    } catch {
      // Some browsers don't support pause
    }
  }

  /** Resume recording. */
  resume(): void {
    if (this._state !== "paused" || !this.mediaRecorder) return;

    try {
      this.mediaRecorder.resume();
      if (this.pauseStartTime) {
        this.pausedDuration += Date.now() - this.pauseStartTime;
        this.pauseStartTime = null;
      }
      this.setState("recording");
    } catch {}
  }

  /** Stop recording and return result. */
  stop(): Promise<RecordingResult> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || (this._state !== "recording" && this._state !== "paused")) {
        resolve(this.emptyResult());
        return;
      }

      const onStop = () => {
        const result = this.buildResult();
        resolve(result);
      };

      if (this._state === "paused") {
        if (this.pauseStartTime) {
          this.pausedDuration += Date.now() - this.pauseStartTime;
        }
      }

      // Use event-based approach for reliable stop
      this.mediaRecorder!.onstop = () => {
        this.stopLevelMonitoring();
        this.setState("stopped");
        onStop();
      };

      try {
        this.mediaRecorder!.stop();
      } catch {
        this.setState("stopped");
        onStop();
      }
    });
  }

  /** Cancel recording without saving. */
  cancel(): void {
    if (this.mediaRecorder && (this._state === "recording" || this._state === "paused")) {
      try { this.mediaRecorder.stop(); } catch {}
    }
    this.chunks = [];
    this.startTime = null;
    this.pausedDuration = 0;
    this.pauseStartTime = null;
    this.setState("idle");
  }

  /** Get current waveform data (for visualization). */
  getWaveform(sampleCount = 256): WaveformData {
    if (!this.analyserNode || !this.stream) {
      return { amplitudes: new Float32Array(0), length: 0, peak: 0, rms: 0 };
    }

    const bufferLength = Math.min(this.analyserNode.fftSize, sampleCount * 2);
    const data = new Float32Array(bufferLength);
    this.analyserNode.getFloatTimeDomainData(data);

    // Downsample to requested size
    const step = Math.max(1, Math.floor(data.length / sampleCount));
    const amplitudes = new Float32Array(sampleCount);
    let peak = 0;
    let sumSquares = 0;

    for (let i = 0; i < sampleCount; i++) {
      const idx = Math.min(i * step, data.length - 1);
      amplitudes[i] = data[idx]!;
      const abs = Math.abs(amplitudes[i]);
      if (abs > peak) peak = abs;
      sumSquares += amplitudes[i] * amplitudes[i];
    }

    return {
      amplitudes,
      length: sampleCount,
      peak,
      rms: Math.sqrt(sumSquares / sampleCount),
    };
  }

  /** Get current audio level (0-1). */
  getAudioLevel(): number {
    if (!this.analyserNode) return 0;

    const data = new Float32Array(this.analyserNode.fftSize);
    this.analyserNode.getFloatTimeDomainData(data);

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i]! * data[i]!;
    }
    return Math.sqrt(sum / data.length);
  }

  /** Destroy recorder — release all resources. */
  destroy(): void {
    this.cancel();
    this.stopLevelMonitoring();

    if (this.sourceNode) {
      try { this.sourceNode.disconnect(); } catch {}
      this.sourceNode = null;
    }
    if (this.audioContext) {
      try { this.audioContext.close(); } catch {}
      this.audioContext = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.analyserNode = null;
    this.mediaRecorder = null;
    this.setState("idle");
  }

  // --- Internal ---

  private setupAnalyser(): void {
    if (!this.stream) return;

    this.audioContext = new AudioContext({ sampleRate: this.options.sampleRate });
    this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
    this.analyserNode = this.audioContext.createAnalyser();

    this.analyserNode.fftSize = 2048;
    this.analyserNode.smoothingTimeConstant = 0.8;
    this.sourceNode.connect(this.analyserNode);
    // Don't connect to destination to avoid feedback
  }

  private startLevelMonitoring(): void {
    if (this.animationFrameId) return;

    const monitor = () => {
      if (this._state !== "recording") return;

      const level = this.getAudioLevel();
      this.options.onAudioLevel?.(level);

      // Silence detection
      if (this.options.silenceThreshold > 0) {
        if (level < this.options.silenceThreshold) {
          if (!this.isSilent) {
            this.isSilent = true;
            this.silenceTimer = setTimeout(() => {
              if (this.isSilent && this._state === "recording") {
                this.options.onSilenceDetected?.(this.options.silenceDurationMs!);
                if (this.options.autoPauseOnSilence) {
                  this.pause();
                }
              }
            }, this.options.silenceDurationMs);
          }
        } else {
          if (this.isSilent) {
            this.isSilent = false;
            if (this.silenceTimer) clearTimeout(this.silenceTimer);
            this.options.onSpeechResumed?.();
            if (this.options.autoPauseOnSilence && this._state === "paused") {
              this.resume();
            }
          }
        }
      }

      this.animationFrameId = requestAnimationFrame(monitor);
    };

    this.animationFrameId = requestAnimationFrame(monitor);
  }

  private stopLevelMonitoring(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    this.isSilent = false;
  }

  private setState(state: RecordingState): void {
    this._state = state;
    this.options.onStateChange?.(state);
  }

  private emitError(error: RecorderError): void {
    this.options.onError?.(error);
  }

  private buildResult(): RecordingResult {
    const blob = new Blob(this.chunks, {
      type: this.mediaRecorder?.mimeType ?? "audio/webm",
    });

    return {
      blob,
      dataURL: URL.createObjectURL(blob),
      format: this.options.format,
      duration: this.duration,
      size: blob.size,
      mimeType: this.mediaRecorder?.mimeType ?? "audio/webm",
      chunks: this.chunks.length,
      startedAt: this.startTime ?? 0,
      stoppedAt: Date.now(),
    };
  }

  private emptyResult(): RecordingResult {
    return {
      blob: new Blob([], { type: "audio/webm" }),
      dataURL: "",
      format: this.options.format,
      duration: 0,
      size: 0,
      mimeType: "audio/webm",
      chunks: 0,
      startedAt: 0,
      stoppedAt: Date.now(),
    };
  }
}

// --- Factory ---

/** Create a new voice recorder instance. */
export function createVoiceRecorder(options?: RecorderOptions): VoiceRecorder {
  return new VoiceRecorder(options);
}
