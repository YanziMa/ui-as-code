/**
 * Screen Recorder: Browser-based screen/video/audio recording utility.
 * Uses MediaRecorder API with fallback strategies, supports:
 * - Screen capture (getDisplayMedia)
 * - Camera/microphone capture (getUserMedia)
 * - Picture-in-Picture preview window
 * - Pause/resume, time limit, file size limit
 * - Multiple output formats (webm, mp4 via mux.js concept)
 * - Recording stats (duration, file size, bitrate)
 * - Countdown timer, countdown overlay
 */

// --- Types ---

export type RecorderSource = "screen" | "camera" | "audio-only" | "screen+camera" | "custom";
export type OutputFormat = "webm" | "mp4" | "gif";
export type RecorderStatus = "idle" | "countdown" | "recording" | "paused" | "stopped" | "error";

export interface RecorderConstraints {
  /** Video constraints for screen/camera */
  video?: {
    width?: { ideal?: number; max?: number; min?: number };
    height?: { ideal?: number; max?: number; min?: number };
    frameRate?: { ideal?: number; max?: number };
    facingMode?: "user" | "environment";
    displaySurface?: "monitor" | "window" | "browser";
  };
  /** Audio constraints */
  audio?: {
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
    sampleRate?: number;
    channelCount?: number;
  };
  /** System audio capture (screen recording) */
  systemAudio?: boolean;
  /** Microphone audio */
  microphoneAudio?: boolean;
}

export interface RecorderOptions {
  /** Recording source type (default: screen) */
  source?: RecorderSource;
  /** Media constraints */
  constraints?: RecorderConstraints;
  /** Output format (default: webm) */
  format?: OutputFormat;
  /** Video bitrate in bps (default: 2500000) */
  videoBitrate?: number;
  /** Audio bitrate in bps (default: 128000) */
  audioBitrate?: number;
  /** Max recording duration in seconds (0 = unlimited, default: 0) */
  maxDuration?: number;
  /** Max file size in bytes (0 = unlimited, default: 0) */
  maxSize?: number;
  /** Countdown seconds before recording starts (default: 3) */
  countdown?: number;
  /** Show countdown overlay (default: true) */
  showCountdownOverlay?: boolean;
  /** Show PiP preview during recording (default: false) */
  pipPreview?: boolean;
  /** Target container for preview/stats (optional) */
  container?: HTMLElement | string;
  /** MIME type override (auto-detected by default) */
  mimeType?: string;
  /** Time slice interval for ondataavailable (default: 1000ms) */
  timeSlice?: number;
  /** Auto-pause when tab hidden (default: true) */
  autoPauseOnHidden?: boolean;
  /** Callback on status change */
  onStatusChange?: (status: RecorderStatus) => void;
  /** Callback on time update (seconds) */
  onTimeUpdate?: (seconds: number) => void;
  /** Callback on size update (bytes) */
  onSizeUpdate?: (bytes: number) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Callback when recording stops with blob */
  onStop?: (blob: Blob, url: string) => void;
  /** Custom CSS class */
  className?: string;
}

export interface RecorderStats {
  status: RecorderStatus;
  duration: number;       // seconds
  fileSize: number;       // bytes
  bitrate: number;        // estimated bps
  resolution: string;     // e.g., "1920x1080"
  frameRate: number;
  mimeType: string;
}

export interface ScreenRecorderInstance {
  element: HTMLElement | null;
  /** Current recorder status */
  getStatus: () => RecorderStatus;
  /** Get recording statistics */
  getStats: () => RecorderStats;
  /** Start recording (with countdown if configured) */
  start: () => Promise<void>;
  /** Pause recording */
  pause: () => void;
  /** Resume recording */
  resume: () => void;
  /** Stop recording */
  stop: () => void;
  /** Cancel recording without saving */
  cancel: () => void;
  /** Take a snapshot/thumbnail of current frame */
  snapshot: () => Promise<string>; // data URL
  /** Toggle PiP preview */
  togglePiP: () => Promise<void>;
  /** Download recorded file */
  download: (filename?: string) => void;
  /** Get recorded blob (null while recording) */
  getBlob: () => Blob | null;
  /** Get object URL for playback */
  getUrl: () => string | null;
  /** Destroy recorder and cleanup resources */
  destroy: () => void;
}

// --- Helpers ---

function detectMimeType(preferred: string | undefined, format: OutputFormat): string {
  if (preferred) return preferred;

  const types: Record<OutputFormat, string[]> = {
    webm: ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"],
    mp4: ["video/mp4;codecs=h264", "video/mp4"],
    gif: ["image/gif;codecs=vp9", "video/webm"], // GIF often falls back to webm
  };

  const candidates = types[format] ?? types.webm;
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }

  return "video/webm"; // Ultimate fallback
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// --- Countdown Overlay ---

function createCountdownOverlay(container: HTMLElement, seconds: number, onComplete: () => void): HTMLElement {
  const overlay = document.createElement("div");
  overlay.className = "recorder-countdown-overlay";
  overlay.style.cssText = `
    position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;
    display:flex;align-items:center;justify-content:center;
    background:rgba(0,0,0,0.7);color:#fff;font-family:-apple-system,sans-serif;
  `;

  const counter = document.createElement("div");
  counter.style.cssText = "text-align:center;";
  overlay.appendChild(counter);

  let remaining = seconds;
  const numEl = document.createElement("div");
  numEl.style.cssText = "font-size:120px;font-weight:800;line-height:1;animation:pulse 1s ease infinite;";
  numEl.textContent = String(remaining);
  counter.appendChild(numEl);

  const label = document.createElement("div");
  label.textContent = "Recording starts in...";
  label.style.cssText = "font-size:18px;margin-top:8px;opacity:0.8;";
  counter.appendChild(label);

  container.appendChild(overlay);

  const interval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(interval);
      overlay.remove();
      onComplete();
    } else {
      numEl.textContent = String(remaining);
    }
  }, 1000);

  return overlay;
}

// --- Stats Display ---

function createStatsDisplay(container: HTMLElement): HTMLElement {
  const el = document.createElement("div");
  el.className = "recorder-stats";
  el.style.cssText = `
    position:fixed;bottom:20px;right:20px;z-index:99998;
    background:rgba(0,0,0,0.75);color:#fff;padding:12px 16px;
    border-radius:8px;font-size:13px;font-family:monospace;
    min-width:160px;pointer-events:none;
  `;
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
      <span style="width:10px;height:10px;border-radius:50%;background:#ef4444;animation:blink 1s infinite;"></span>
      <span class="rec-time">00:00</span>
    </div>
    <div class="rec-size" style="opacity:0.7;">0 KB</div>
    <div class="rec-bitrate" style="opacity:0.5;">-- kb/s</div>
  `;
  container.appendChild(el);
  return el;
}

// --- Main ---

export function createScreenRecorder(options: RecorderOptions = {}): ScreenRecorderInstance {
  const opts = {
    source: "screen" as RecorderSource,
    format: "webm" as OutputFormat,
    videoBitrate: 2_500_000,
    audioBitrate: 128_000,
    maxDuration: 0,
    maxSize: 0,
    countdown: 3,
    showCountdownOverlay: true,
    pipPreview: false,
    timeSlice: 1000,
    autoPauseOnHidden: true,
    ...options,
  };

  const container = typeof opts.container === "string"
    ? document.querySelector<HTMLElement>(opts.container)!
    : opts.container ?? document.body;

  // UI elements
  let statsEl: HTMLElement | null = null;
  let countdownOverlay: HTMLElement | null = null;

  // State
  let status: RecorderStatus = "idle";
  let mediaRecorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let recordedChunks: Blob[] = [];
  let recordedBlob: Blob | null = null;
  let recordedUrl: string | null = null;
  let startTime: number = 0;
  let pausedTime: number = 0;
  let totalPausedDuration: number = 0;
  let durationTimer: ReturnType<typeof setInterval> | null = null;
  let pipWindow: Window | null = null;
  let destroyed = false;
  let previewVideo: HTMLVideoElement | null = null;
  let mimeType = "";

  function setStatus(s: RecorderStatus): void {
    status = s;
    opts.onStatusChange?.(s);
  }

  function updateStats(): void {
    if (!statsEl) return;
    const elapsed = status === "recording"
      ? (Date.now() - startTime - totalPausedDuration) / 1000
      : totalPausedDuration > 0 ? (pausedTime - startTime - totalPausedDuration) / 1000 : 0;

    const timeEl = statsEl.querySelector(".rec-time");
    const sizeEl = statsEl.querySelector(".rec-size");
    const bitrateEl = statsEl.querySelector(".rec-bitrate");

    if (timeEl) timeEl.textContent = formatDuration(elapsed);

    const totalBytes = recordedChunks.reduce((sum, chunk) => sum + chunk.size, 0);
    if (sizeEl) sizeEl.textContent = formatFileSize(totalBytes);

    if (bitrateEl && elapsed > 0) {
      const br = Math.round((totalBytes * 8) / elapsed);
      bitrateEl.textContent = `${(br / 1000).toFixed(0)} kb/s`;
    }

    opts.onTimeUpdate?.(elapsed);
    opts.onSizeUpdate?.(totalBytes);
  }

  async function acquireStream(): Promise<MediaStream> {
    const constraints: RecorderConstraints = opts.constraints ?? {};

    switch (opts.source) {
      case "screen": {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: constraints.video ?? { frameRate: { ideal: 30 } },
          audio: constraints.systemAudio ?? true,
        });
        return stream;
      }

      case "camera": {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: constraints.video ?? { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: constraints.microphoneAudio ?? true,
        });
        return stream;
      }

      case "audio-only": {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: constraints.audio ?? { echoCancellation: true, noiseSuppression: true },
        });
        return stream;
      }

      case "screen+camera": {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: constraints.video ?? true,
          audio: constraints.systemAudio ?? true,
        });
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 320 }, height: { ideal: 240 } },
          audio: constraints.microphoneAudio ?? false,
        });
        // Combine streams
        const tracks = [...screenStream.getVideoTracks(), ...camStream.getVideoTracks()];
        const audioTracks = [
          ...screenStream.getAudioTracks(),
          ...camStream.getAudioTracks(),
        ];
        const combined = new MediaStream([...tracks, ...audioTracks]);
        return combined;
      }

      default:
        throw new Error(`Unsupported source: ${opts.source}`);
    }
  }

  function startRecording(): void {
    if (!stream) return;

    mimeType = detectMimeType(opts.mimeType, opts.format);
    recordedChunks = [];

    try {
      mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: opts.videoBitrate,
        audioBitsPerSecond: opts.audioBitrate,
      });
    } catch (e) {
      // Fallback: try without codec-specific mime type
      mediaRecorder = new MediaRecorder(stream, {
        videoBitsPerSecond: opts.videoBitrate,
      });
    }

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
        updateStats();

        // Check size limit
        if (opts.maxSize > 0) {
          const total = recordedChunks.reduce((s, c) => s + c.size, 0);
          if (total >= opts.maxSize) {
            stopRecording();
          }
        }
      }
    };

    mediaRecorder.onstop = () => {
      finalizeRecording();
    };

    mediaRecorder.onerror = (event) => {
      setStatus("error");
      opts.onError?.(new Error(`MediaRecorder error: ${(event as ErrorEvent).message}`));
    };

    mediaRecorder.start(opts.timeSlice);
    startTime = Date.now();
    totalPausedDuration = 0;
    setStatus("recording");

    // Duration timer
    durationTimer = setInterval(updateStats, opts.timeSlice);

    // Setup PiP
    if (opts.pipPreview && stream) {
      setupPiP();
    }

    // Max duration check
    if (opts.maxDuration > 0) {
      setTimeout(() => {
        if (status === "recording") stopRecording();
      }, opts.maxDuration * 1000);
    }
  }

  function stopRecording(): void {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    if (durationTimer) {
      clearInterval(durationTimer);
      durationTimer = null;
    }
    pausedTime = Date.now();
  }

  function finalizeRecording(): void {
    // Stop all tracks
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }

    // Close PiP
    if (pipWindow && !pipWindow.closed) {
      pipWindow.close();
      pipWindow = null;
    }

    // Create blob
    recordedBlob = new Blob(recordedChunks, { type: mimeType });
    recordedUrl = URL.createObjectURL(recordedBlob);

    setStatus("stopped");
    updateStats();
    opts.onStop?.(recordedBlob!, recordedUrl!);
  }

  async function setupPiP(): Promise<void> {
    if (!stream) return;

    if (!previewVideo) {
      previewVideo = document.createElement("video");
      previewVideo.muted = true;
      previewVideo.playsInline = true;
      previewVideo.autoplay = true;
      previewVideo.srcObject = stream;
      previewVideo.style.cssText = "width:100%;height:100%;";
      await previewVideo.play();
    }

    try {
      if ("documentPictureInPicture" in window) {
        pipWindow = await (window as unknown as { documentPictureInPicture: { requestWindow: (w: number, h: number) => Promise<Window> } }).documentPictureInWindow.requestWindow(320, 240);
        pipWindow.document.body.appendChild(previewVideo);
        pipWindow.document.title = "Recording Preview";
      }
    } catch {
      // PiP not supported or denied
    }
  }

  // Tab visibility handling
  if (opts.autoPauseOnHidden) {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && status === "recording") {
        pause();
      } else if (!document.hidden && status === "paused") {
        resume();
      }
    });
  }

  // Instance
  const instance: ScreenRecorderInstance = {
    element: statsEl,

    getStatus() { return status; },

    getStats(): RecorderStats {
      const vTrack = stream?.getVideoTracks()[0];
      const settings = vTrack?.getSettings();
      return {
        status,
        duration: status === "recording"
          ? (Date.now() - startTime - totalPausedDuration) / 1000
          : 0,
        fileSize: recordedChunks.reduce((s, c) => s + c.size, 0),
        bitrate: 0,
        resolution: settings
          ? `${settings.width ?? 0}x${settings.height ?? 0}`
          : "unknown",
        frameRate: settings?.frameRate ?? 0,
        mimeType,
      };
    },

    async start() {
      if (status !== "idle" && status !== "stopped") return;

      try {
        stream = await acquireStream();
      } catch (err) {
        setStatus("error");
        opts.onError?.(err instanceof Error ? err : new Error(String(err)));
        return;
      }

      // Create stats display
      if (opts.container && !statsEl) {
        statsEl = createStatsDisplay(container);
      }

      // Countdown
      if (opts.countdown > 0 && opts.showCountdownOverlay) {
        setStatus("countdown");
        countdownOverlay = createCountdownOverlay(container, opts.countdown, () => {
          startRecording();
        });
      } else {
        startRecording();
      }
    },

    pause() {
      if (status !== "recording" || !mediaRecorder) return;
      mediaRecorder.pause();
      totalPausedDuration += Date.now() - startTime;
      setStatus("paused");
    },

    resume() {
      if (status !== "paused" || !mediaRecorder) return;
      mediaRecorder.resume();
      startTime = Date.now();
      setStatus("recording");
    },

    stop() {
      if (status !== "recording" && status !== "paused") return;
      stopRecording();
    },

    cancel() {
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
      }
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
      }
      recordedChunks = [];
      recordedBlob = null;
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
        recordedUrl = null;
      }
      if (durationTimer) {
        clearInterval(durationTimer);
        durationTimer = null;
      }
      setStatus("idle");
      if (statsEl) { statsEl.remove(); statsEl = null; }
      if (countdownOverlay) { countdownOverlay.remove(); countdownOverlay = null; }
    },

    async snapshot(): Promise<string> {
      if (!stream) throw new Error("No active stream");
      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0);
      video.srcObject = null;
      return canvas.toDataURL("image/png");
    },

    async togglePiP() {
      if (pipWindow && !pipWindow.closed) {
        pipWindow.close();
        pipWindow = null;
      } else {
        await setupPiP();
      }
    },

    download(filename?: string) {
      if (!recordedBlob || !recordedUrl) return;
      const a = document.createElement("a");
      a.href = recordedUrl;
      a.download = filename ?? `recording_${Date.now()}.${opts.format === "mp4" ? "mp4" : "webm"}`;
      a.click();
    },

    getBlob() { return recordedBlob; },
    getUrl() { return recordedUrl; },

    destroy() {
      destroyed = true;
      instance.cancel();
      if (recordedUrl) { URL.revokeObjectURL(recordedUrl); }
      if (statsEl) statsEl.remove();
      if (previewVideo) { previewVideo.srcObject = null; }
    },
  };

  return instance;
}

/** Check if screen recording is supported in this browser */
export function isScreenRecordingSupported(): boolean {
  return !!(navigator.mediaDevices?.getDisplayMedia && MediaRecorder?.isTypeSupported);
}

/** Check if camera access is available */
export function isCameraAvailable(): boolean {
  return !!navigator.mediaDevices?.getUserMedia;
}
