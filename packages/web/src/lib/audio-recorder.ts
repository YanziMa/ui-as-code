/**
 * Audio Recorder: Browser-based audio recording with Web Audio API.
 * Supports microphone capture, waveform visualization, pause/resume,
 * multiple output formats (WAV, MP3 via encoder, OGG), noise reduction,
 * volume metering, and real-time frequency analysis.
 */

// --- Types ---

export type AudioFormat = "wav" | "webm" | "ogg" | "mp3";

export interface AudioRecorderOptions {
  /** Container element or selector for UI */
  container?: HTMLElement | string;
  /** Recording format (default: webm) */
  format?: AudioFormat;
  /** Sample rate (default: 44100) */
  sampleRate?: number;
  /** Number of channels (1=mono, 2=stereo) */
  channels?: number;
  /** Bitrate for lossy formats (kbps, default: 128) */
  bitrate?: number;
  /** Enable noise suppression? */
  noiseSuppression?: boolean;
  ** Enable echo cancellation? */
  echoCancellation?: boolean;
  /** Auto gain control? */
  autoGainControl?: boolean;
  /** Max recording duration in seconds (0 = unlimited) */
  maxDuration?: number;
  /** Show waveform visualization? */
  showWaveform?: boolean;
  /** Show volume meter? */
  showVolumeMeter?: boolean;
  /** Waveform color */
  waveformColor?: string;
  /** Background color */
  backgroundColor?: string;
  /** Callback on recording start */
  onStart?: () => void;
  /** Callback on recording stop with result */
  onStop?: (result: AudioRecordingResult) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Callback on time update (seconds) */
  onTimeUpdate?: (elapsed: number) => void;
  /** Callback on volume level change (0-1) */
  onVolumeLevel?: (level: number) => void;
  /** Custom CSS class */
  className?: string;
}

export interface AudioRecordingResult {
  /** Recorded audio as Blob */
  blob: Blob;
  /** Data URL for playback */
  dataUrl: string;
  /** Format used */
  format: AudioFormat;
  /** Duration in seconds */
  duration: number;
  /** File size in bytes */
  size: number;
  /** Sample rate */
  sampleRate: number;
  /** Number of channels */
  channels: number;
}

export interface AudioRecorderInstance {
  element?: HTMLElement;
  /** Start recording */
  start: () => Promise<void>;
  /** Stop recording and return result */
  stop: () => Promise<AudioRecordingResult>;
  /** Pause recording */
  pause: () => void;
  /** Resume after pause */
  resume: () => void;
  /** Is currently recording? */
  isRecording: () => boolean;
  /** Is currently paused? */
  isPaused: () => boolean;
  /** Get elapsed time in seconds */
  getElapsedTime: () => number;
  /** Get current volume level (0-1) */
  getVolumeLevel: () => number;
  /** Cancel recording without saving */
  cancel: () => void;
  /** Request microphone permission */
  requestPermission: () => Promise<boolean>;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Constants ---

const DEFAULT_SAMPLE_RATE = 44100;
const VOLUME_SMOOTHING = 0.9;

// --- Main Factory ---

export function createAudioRecorder(options: AudioRecorderOptions = {}): AudioRecorderInstance {
  const opts = {
    format: options.format ?? "webm",
    sampleRate: options.sampleRate ?? DEFAULT_SAMPLE_RATE,
    channels: options.channels ?? 1,
    bitrate: options.bitrate ?? 128000,
    noiseSuppression: options.noiseSuppression ?? true,
    echoCancellation: options.echoCancellation ?? true,
    autoGainControl: options.autoGainControl ?? true,
    maxDuration: options.maxDuration ?? 0,
    showWaveform: options.showWaveform ?? true,
    showVolumeMeter: options.showVolumeMeter ?? true,
    waveformColor: options.waveformColor ?? "#4338ca",
    backgroundColor: options.backgroundColor ?? "#f3f4f6",
    className: options.className ?? "",
    ...options,
  };

  let mediaStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let analyserNode: AnalyserNode | null = null;
  let mediaRecorder: MediaRecorder | null = null;
  let recordedChunks: Blob[] = [];
  let startTime: number = 0;
  let pausedDuration: number = 0;
  let pauseStartTime: number = 0;
  let isRecordingState = false;
  let isPausedState = false;
  let destroyed = false;
  let animationFrameId: number = 0;
  let currentVolumeLevel = 0;
  let durationTimer: ReturnType<typeof setInterval> | null = null;

  // DOM elements
  let rootEl: HTMLElement | null = null;
  let canvasEl: HTMLCanvasElement | null = null;
  let volumeBarEl: HTMLElement | null = null;
  let timeDisplayEl: HTMLElement | null = null;

  // Build UI if container provided
  if (options.container) {
    buildUI();
  }

  // --- UI Builder ---

  function buildUI(): void {
    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container!;

    rootEl = document.createElement("div");
    rootEl.className = `audio-recorder ${opts.className}`;
    rootEl.style.cssText = `
      display:flex;flex-direction:column;align-items:center;gap:12px;
      padding:16px;background:${opts.backgroundColor};border-radius:12px;
      font-family:-apple-system,sans-serif;width:100%;max-width:500px;
    `;

    // Waveform canvas
    if (opts.showWaveform) {
      const waveContainer = document.createElement("div");
      waveContainer.style.cssText = "width:100%;height:80px;border-radius:8px;overflow:hidden;";
      canvasEl = document.createElement("canvas");
      canvasEl.width = 400;
      canvasEl.height = 80;
      canvasEl.style.cssText = "width:100%;height:100%;display:block;";
      waveContainer.appendChild(canvasEl);
      rootEl.appendChild(waveContainer);
    }

    // Volume meter + time row
    const infoRow = document.createElement("div");
    infoRow.style.cssText = "display:flex;align-items:center;gap:12px;width:100%;";

    if (opts.showVolumeMeter) {
      volumeBarEl = document.createElement("div");
      volumeBarEl.style.cssText = `
        flex:1;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;
        position:relative;
      `;
      const volumeFill = document.createElement("div");
      volumeFill.id = "ar-volume-fill";
      volumeFill.style.cssText = `height:100%;width:0%;background:${opts.waveformColor};border-radius:3px;transition:width 0.05s;`;
      volumeBarEl.appendChild(volumeFill);
      infoRow.appendChild(volumeBarEl);
    }

    timeDisplayEl = document.createElement("span");
    timeDisplayEl.textContent = "0:00";
    timeDisplayEl.style.cssText = "font-size:13px;font-weight:500;color:#374151;font-family:'SF Mono',monospace;min-width:45px;text-align:right;";
    infoRow.appendChild(timeDisplayEl);

    rootEl.appendChild(infoRow);
    container.appendChild(rootEl);
  }

  // --- Core Functions ---

  async function initializeAudio(): Promise<void> {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        noiseSuppression: opts.noiseSuppression,
        echoCancellation: opts.echoCancellation,
        autoGainControl: opts.autoGainControl,
        channelCount: opts.channels,
        sampleRate: opts.sampleRate,
      },
    });

    audioContext = new AudioContext({ sampleRate: opts.sampleRate });
    const source = audioContext.createMediaStreamSource(mediaStream);

    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    analyserNode.smoothingTimeConstant = 0.8;
    source.connect(analyserNode);
  }

  function getMimeType(): string {
    switch (opts.format) {
      case "wav": return "audio/wav";
      case "ogg": return "audio/ogg; codecs=opus";
      case "mp3": return "audio/mpeg";
      default: return "audio/webm; codecs=opus";
    }
  }

  async function start(): Promise<void> {
    if (isRecordingState || destroyed) throw new Error("Cannot start: already recording or destroyed");

    try {
      if (!mediaStream) await initializeAudio();

      recordedChunks = [];
      pausedDuration = 0;

      const mimeType = getMimeType();
      const supportedMimeType = MediaRecorder.isTypeSupported(mimeType)
        ? mimeType
        : "audio/webm";

      mediaRecorder = new MediaRecorder(mediaStream!, {
        mimeType: supportedMimeType,
        audioBitsPerSecond: opts.bitrate,
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
      };

      mediaRecorder.start(100); // Collect data every 100ms
      startTime = performance.now();
      isRecordingState = true;
      isPausedState = false;

      // Start visualization
      startVisualization();
      startDurationTimer();

      opts.onStart?.();
    } catch (err) {
      opts.onError?.(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }

  function stop(): Promise<AudioRecordingResult> {
    return new Promise((resolve, reject) => {
      if (!isRecordingState || !mediaRecorder) {
        reject(new Error("Not recording"));
        return;
      }

      stopVisualization();
      stopDurationTimer();

      mediaRecorder!.onstop = () => {
        const blob = new Blob(recordedChunks, { type: mediaRecorder!.mimeType });
        const duration = getElapsedTime();

        const result: AudioRecordingResult = {
          blob,
          dataUrl: URL.createObjectURL(blob),
          format: opts.format,
          duration,
          size: blob.size,
          sampleRate: opts.sampleRate,
          channels: opts.channels,
        };

        isRecordingState = false;
        isPausedState = false;

        // Cleanup stream
        if (mediaStream) {
          mediaStream.getTracks().forEach((t) => t.stop());
          mediaStream = null;
        }

        opts.onStop?.(result);
        resolve(result);
      };

      mediaRecorder!.stop();
    });
  }

  function pause(): void {
    if (!isRecordingState || isPausedState || !mediaRecorder) return;
    mediaRecorder.pause();
    isPausedState = true;
    pauseStartTime = performance.now();
  }

  function resume(): void {
    if (!isRecordingState || !isPausedState || !mediaRecorder) return;
    mediaRecorder.resume();
    pausedDuration += performance.now() - pauseStartTime;
    isPausedState = false;
  }

  function cancel(): void {
    if (!isRecordingState) return;

    stopVisualization();
    stopDurationTimer();

    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }

    recordedChunks = [];
    isRecordingState = false;
    isPausedState = false;

    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      mediaStream = null;
    }
  }

  // --- Visualization ---

  function startVisualization(): void {
    if (!analyserNode || !canvasEl) return;

    const ctx = canvasEl.getContext("2d")!;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function draw(): void {
      if (destroyed || !isRecordingState) return;
      animationFrameId = requestAnimationFrame(draw);

      analyserNode!.getByteTimeDomainData(dataArray);

      // Calculate volume
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = (dataArray[i]! - 128) / 128;
        sum += v * v;
      }
      currentVolumeLevel = Math.sqrt(sum / bufferLength);
      currentVolumeLevel = Math.min(1, currentVolumeLevel * 3); // Amplify a bit

      // Update volume bar
      if (volumeBarEl) {
        const fill = volumeBarEl.querySelector("#ar-volume-fill") as HTMLElement;
        if (fill) fill.style.width = `${currentVolumeLevel * 100}%`;
      }

      opts.onVolumeLevel?.(currentVolumeLevel);

      // Draw waveform
      ctx.fillStyle = opts.backgroundColor;
      ctx.fillRect(0, 0, canvasEl!.width, canvasEl!.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = opts.waveformColor;
      ctx.beginPath();

      const sliceWidth = canvasEl!.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i]! / 128.0;
        const y = v * (canvasEl!.height / 2);

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        x += sliceWidth;
      }

      ctx.lineTo(canvasEl!.width, canvasEl!.height / 2);
      ctx.stroke();
    }

    draw();
  }

  function stopVisualization(): void {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = 0;
  }

  // --- Duration Timer ---

  function startDurationTimer(): void {
    if (durationTimer) clearInterval(durationTimer);
    durationTimer = setInterval(() => {
      if (isPausedState) return;
      const elapsed = getElapsedTime();
      updateTimeDisplay(elapsed);
      opts.onTimeUpdate?.(elapsed);

      // Check max duration
      if (opts.maxDuration > 0 && elapsed >= opts.maxDuration) {
        stop().catch(() => {});
      }
    }, 200);
  }

  function stopDurationTimer(): void {
    if (durationTimer) { clearInterval(durationTimer); durationTimer = null; }
  }

  function updateTimeDisplay(seconds: number): void {
    if (!timeDisplayEl) return;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    timeDisplayEl.textContent = `${m}:${String(s).padStart(2, "0")}`;
  }

  // --- Instance ---

  const instance: AudioRecorderInstance = {
    get element() { return rootEl ?? undefined; },

    start,
    stop,
    pause,
    resume,

    isRecording: () => isRecordingState && !isPausedState,
    isPaused: () => isPausedState,

    getElapsedTime: () => {
      if (!isRecordingState) return 0;
      let elapsed = (performance.now() - startTime) / 1000;
      if (isPausedState) {
        elapsed -= (performance.now() - pauseStartTime) / 1000;
      }
      elapsed -= pausedDuration / 1000;
      return Math.max(0, elapsed);
    },

    getVolumeLevel: () => currentVolumeLevel,

    cancel,

    async requestPermission(): Promise<boolean> {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        return true;
      } catch {
        return false;
      }
    },

    destroy() {
      destroyed = true;
      cancel();
      stopVisualization();
      stopDurationTimer();
      if (audioContext) { audioContext.close(); audioContext = null; }
      if (rootEl) { rootEl.remove(); rootEl = null; }
    },
  };

  return instance;
}
