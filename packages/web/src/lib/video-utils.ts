/**
 * Video Utilities: Media recording, video playback controls, frame extraction,
 * camera access, video processing, thumbnail generation, stream management,
 * and screen capture.
 */

// --- Types ---

export interface VideoConstraints {
  width?: number | { ideal?: number; min?: number; max?: number };
  height?: number | { ideal?: number; min?: number; max?: number };
  facingMode?: "user" | "environment" | { exact?: string };
  frameRate?: number | { ideal?: number; min?: number; max?: number };
  deviceId?: string;
}

export interface RecordingConfig {
  mimeType?: string;
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
  intervalMs?: number;
  onDataAvailable?: (blob: Blob, elapsed: number) => void;
  onStop?: (blob: Blob) => void;
  onError?: (error: Error) => void;
}

export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: "image/png" | "image/jpeg";
  timeOffset?: number; // seconds into video
}

export interface FrameExtractResult {
  blob: Blob;
  dataUrl: string;
  timestamp: number; // seconds
  width: number;
  height: number;
}

export interface VideoDeviceInfo {
  deviceId: string;
  label: string;
  kind: "videoinput" | "audioinput";
}

export interface StreamStats {
  resolution: { width: number; height: number };
  frameRate: number;
  bandwidthEstimate?: number;
  packetsLost?: number;
  jitter?: number;
}

export interface PlaybackState {
  currentTime: number;
  duration: number;
  playing: boolean;
  buffered: { start: number; end: number }[];
  playbackRate: number;
  volume: number;
  muted: boolean;
  paused: boolean;
  ended: boolean;
}

// --- Camera / Device Access ---

/** Enumerate available video input devices */
export async function enumerateVideoDevices(): Promise<VideoDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === "videoinput")
      .map((d) => ({
        deviceId: d.deviceId,
        label: d.label || `Camera ${d.deviceId.slice(0, 8)}`,
        kind: d.kind as "videoinput",
      }));
  } catch {
    return [];
  }
}

/** Request camera access with optional constraints */
export async function getCameraStream(
  constraints?: VideoConstraints,
): Promise<MediaStream> {
  const defaultConstraints: MediaStreamConstraints = {
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: "user",
      ...(constraints ?? {}),
    },
    audio: false,
  };

  return navigator.mediaDevices.getUserMedia(defaultConstraints);
}

/** Request screen capture stream */
export async function getScreenCaptureStream(
  options?: DisplayMediaStreamOptions,
): Promise<MediaStream> {
  const defaultOptions: DisplayMediaStreamOptions = {
    video: { displaySurface: "monitor" },
    audio: false,
    ...options,
  };
  return navigator.mediaDevices.getDisplayMedia(defaultOptions);
}

/** Switch camera between front/back */
export async function switchCamera(
  currentStream: MediaStream,
  constraints?: VideoConstraints,
): Promise<MediaStream> {
  // Stop current tracks
  currentStream.getVideoTracks().forEach((t) => t.stop());

  // Determine new facing mode
  const currentTrack = currentStream.getVideoTracks()[0];
  const settings = currentTrack?.getSettings();
  const currentFacing = settings?.facingMode === "environment" ? "user" : "environment";

  return getCameraStream({
    ...constraints,
    facingMode: currentFacing,
  });
}

/** Check if camera permission is granted */
export async function checkCameraPermission(): Promise<PermissionState | null> {
  try {
    const result = await navigator.permissions.query({ name: "camera" as PermissionName });
    return result.state;
  } catch {
    return null;
  }
}

// --- Video Recorder ---

/**
 * VideoRecorder - records video from MediaStreams with pause/resume support.
 */
export class VideoRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startTime: number | null = null;
  private pausedTime: number = 0;
  private totalPaused: number = 0;
  private active = false;
  private config: RecordingConfig;

  constructor(config: RecordingConfig = {}) {
    this.config = config;
  }

  /** Start recording from a MediaStream */
  async start(stream: MediaStream): Promise<void> {
    if (this.active) throw new Error("Recording already in progress");

    this.stream = stream;
    this.chunks = [];
    this.startTime = performance.now();
    this.pausedTime = 0;
    this.totalPaused = 0;

    const mimeType = this.config.mimeType ?? await this._detectBestMimeType();
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: this.config.videoBitsPerSecond,
      audioBitsPerSecond: this.config.audioBitsPerSecond,
    });

    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data);
        const elapsed = this.getElapsedTime();
        this.config.onDataAvailable?.(
          new Blob(this.chunks, { type: mimeType }),
          elapsed,
        );
      }
    };

    recorder.onerror = (ev: Event) => {
      this.config.onError?.(new Error(`Recording error: ${(ev as ErrorEvent).message}`));
    };

    recorder.start(this.config.intervalMs ?? 100);
    this.mediaRecorder = recorder;
    this.active = true;
  }

  /** Start recording from camera directly */
  async startFromCamera(constraints?: VideoConstraints): Promise<MediaStream> {
    const stream = await getCameraStream(constraints);
    await this.start(stream);
    return stream;
  }

  /** Pause recording */
  pause(): void {
    if (!this.active || !this.mediaRecorder || this.mediaRecorder.state !== "recording") return;
    this.mediaRecorder.pause();
    this.pausedTime = performance.now();
  }

  /** Resume paused recording */
  resume(): void {
    if (!this.active || !this.mediaRecorder || this.mediaRecorder.state !== "paused") return;
    if (this.pausedTime > 0) {
      this.totalPaused += performance.now() - this.pausedTime;
      this.pausedTime = 0;
    }
    this.mediaRecorder.resume();
  }

  /** Stop recording and return the final Blob */
  async stop(): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
      if (!this.active || !this.mediaRecorder) {
        reject(new Error("No active recording"));
        return;
      }

      const mimeType = this.mediaRecorder.mimeType;

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: mimeType });
        this._cleanup();
        this.config.onStop?.(blob);
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  /** Get elapsed recording time in seconds */
  getElapsedTime(): number {
    if (!this.startTime) return 0;
    let elapsed = performance.now() - this.startTime;
    if (this.pausedTime > 0) elapsed -= performance.now() - this.pausedTime;
    return (elapsed - this.totalPaused) / 1000;
  }

  /** Check if currently recording */
  isRecording(): boolean {
    return !!(
      this.active &&
      this.mediaRecorder &&
      this.mediaRecorder.state === "recording"
    );
  }

  /** Check if paused */
  isPaused(): boolean {
    return !!(this.active && this.mediaRecorder && this.mediaRecorder.state === "paused");
  }

  /** Get the underlying stream */
  getStream(): MediaStream | null { return this.stream; }

  /** Release resources */
  dispose(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try { this.mediaRecorder.stop(); } catch {}
    }
    this._cleanup();
  }

  private _cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.chunks = [];
    this.mediaRecorder = null;
    this.startTime = null;
    this.pausedTime = 0;
    this.totalPaused = 0;
    this.active = false;
  }

  private async _detectBestMimeType(): Promise<string> {
    const types = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return "";
  }
}

// --- Frame Extraction ---

/** Extract a single frame (thumbnail) from a video element or URL */
export async function extractFrame(
  source: HTMLVideoElement | string,
  options: ThumbnailOptions = {},
): Promise<FrameExtractResult> {
  const {
    width = 320,
    height = 180,
    quality = 0.8,
    format = "image/jpeg",
    timeOffset = 0,
  } = options;

  const video =
    typeof source === "string"
      ? await _loadVideo(source, timeOffset)
      : source;

  if (timeOffset > 0 && typeof source === "string") {
    video.currentTime = timeOffset;
    await _waitForVideo(video);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(video, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), format, quality),
  );

  return {
    blob,
    dataUrl: canvas.toDataURL(format, quality),
    timestamp: video.currentTime,
    width,
    height,
  };
}

/** Extract multiple frames at regular intervals from a video */
export async function extractFrames(
  source: HTMLVideoElement | string,
  intervalSeconds: number = 1,
  options: ThumbnailOptions = {},
): Promise<FrameExtractResult[]> {
  const video =
    typeof source === "string"
      ? await _loadVideo(source)
      : source;

  const frames: FrameExtractResult[] = [];
  const duration = video.duration;

  for (let t = 0; t < duration; t += intervalSeconds) {
    video.currentTime = t;
    await _waitForVideo(video);
    const frame = await extractFrame(video, { ...options, timeOffset: 0 });
    frames.push(frame);
  }

  return frames;
}

/** Generate a grid of thumbnails for video preview */
export async function generateThumbnailGrid(
  source: HTMLVideoElement | string,
  cols: number = 4,
  rows: number = 3,
  thumbWidth: number = 160,
  thumbHeight: number = 90,
): Promise<HTMLCanvasElement> {
  const video =
    typeof source === "string"
      ? await _loadVideo(source)
      : source;

  const totalFrames = cols * rows;
  const duration = video.duration;
  const interval = duration / (totalFrames + 1);

  const gridCanvas = document.createElement("canvas");
  gridCanvas.width = thumbWidth * cols + (cols - 1) * 4; // 4px gap
  gridCanvas.height = thumbHeight * rows + (rows - 1) * 4;
  const gridCtx = gridCanvas.getContext("2d")!;
  gridCtx.fillStyle = "#111";
  gridCtx.fillRect(0, 0, gridCanvas.width, gridCanvas.height);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;
      const time = (idx + 1) * interval;

      video.currentTime = time;
      await _waitForVideo(video);

      const x = col * (thumbWidth + 4);
      const y = row * (thumbHeight + 4);
      gridCtx.drawImage(video, x, y, thumbWidth, thumbHeight);
    }
  }

  return gridCanvas;
}

/** Capture a single frame from a live MediaStream (camera) */
export function captureSnapshotFromStream(
  stream: MediaStream,
  options: ThumbnailOptions = {},
): FrameExtractResult {
  const { width = 640, height = 480, format = "image/jpeg", quality = 0.9 } = options;

  const track = stream.getVideoTracks()[0];
  const settings = track?.getSettings();
  const w = settings?.width ?? width;
  const h = settings?.height ?? height;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d")!;
  const video = document.createElement("video");
  video.srcObject = stream;
  video.muted = true;
  ctx.drawImage(video, 0, 0, w, h);

  const dataUrl = canvas.toDataURL(format, quality);

  // Convert dataURL to Blob
  const parts = dataUrl.split(",");
  const bstr = atob(parts[1]!);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i)!;
  const blob = new Blob([u8arr], { type: format });

  return {
    blob,
    dataUrl,
    timestamp: Date.now() / 1000,
    width: w,
    height: h,
  };
}

// --- Video Player Controller ---

/**
 * VideoController - wraps an HTMLVideoElement with enhanced controls.
 */
export class VideoController {
  private video: HTMLVideoElement;
  private _onTimeUpdateHandlers: Array<(time: number) => void> = [];
  private _onPlayHandlers: Array<() => void> = [];
  private _onPauseHandlers: Array<() => void> = [];
  private _onEndedHandlers: Array<() => void> = [];
  private _onErrorHandler: Array<(error: Error) => void> = [];

  constructor(videoOrSelector: HTMLVideoElement | string) {
    this.video =
      typeof videoOrSelector === "string"
        ? document.querySelector<HTMLVideoElement>(videoOrSelector)!
        : videoOrSelector;

    this.video.addEventListener("timeupdate", () =>
      this._onTimeUpdateHandlers.forEach((h) => h(this.video.currentTime)),
    );
    this.video.addEventListener("play", () =>
      this._onPlayHandlers.forEach((h) => h()),
    );
    this.video.addEventListener("pause", () =>
      this._onPauseHandlers.forEach((h) => h()),
    );
    this.video.addEventListener("ended", () =>
      this._onEndedHandlers.forEach((h) => h()),
    );
    this.video.addEventListener("error", () =>
      this._onErrorHandler.forEach((h) =>
        h(new Error(`Video error: ${this.video.error?.message ?? "unknown"}`)),
      ),
    );
  }

  /** Play the video */
  play(): Promise<void> { return this.video.play(); }

  /** Pause the video */
  pause(): void { this.video.pause(); }

  /** Toggle play/pause */
  togglePlay(): Promise<void> | undefined {
    return this.video.paused ? this.play() : (this.pause(), undefined);
  }

  /** Seek to position in seconds */
  seek(time: number): void {
    this.video.currentTime = Math.max(0, Math.min(time, this.video.duration));
  }

  /** Seek by relative amount (+/- seconds) */
  seekRelative(delta: number): void {
    this.seek(this.video.currentTime + delta);
  }

  /** Jump forward by N seconds */
  forward(seconds = 5): void { this.seekRelative(seconds); }

  /** Jump backward by N seconds */
  backward(seconds = 5): void { this.seekRelative(-seconds); }

  /** Set playback rate (speed) */
  setPlaybackRate(rate: number): void {
    this.video.playbackRate = Math.max(0.125, Math.min(rate, 16));
  }

  /** Set volume (0-1) */
  setVolume(vol: number): void {
    this.video.volume = Math.max(0, Math.min(1, vol));
  }

  /** Mute/unmute */
  setMuted(muted: boolean): void { this.video.muted = muted; }

  /** Toggle mute */
  toggleMute(): void { this.video.muted = !this.video.muted; }

  /** Enter/exit fullscreen */
  async toggleFullscreen(): Promise<void> {
    if (!document.fullscreenElement) {
      await this.video.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }

  /** Enable/disable picture-in-picture mode */
  async togglePiP(): Promise<void> {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else {
      await this.video.requestPictureInPicture();
    }
  }

  /** Set loop */
  setLoop(loop: boolean): void { this.video.loop = loop; }

  /** Load a new source */
  load(src: string): void {
    this.video.src = src;
    this.video.load();
  }

  /** Load from Blob/File */
  loadFromBlob(blob: Blob): void {
    this.video.src = URL.createObjectURL(blob);
    this.video.load();
  }

  /** Get full state snapshot */
  getState(): PlaybackState {
    const v = this.video;
    const buffered: { start: number; end: number }[] = [];
    if (v.buffered.length > 0) {
      for (let i = 0; i < v.buffered.length; i++) {
        buffered.push({ start: v.buffered.start(i), end: v.buffered.end(i) });
      }
    }
    return {
      currentTime: v.currentTime,
      duration: v.duration || 0,
      playing: !v.paused && !v.ended,
      buffered,
      playbackRate: v.playbackRate,
      volume: v.volume,
      muted: v.muted,
      paused: v.paused,
      ended: v.ended,
    };
  }

  /** Get buffer percentage (0-100) */
  getBufferedPercent(): number {
    if (!this.video.duration || this.video.buffered.length === 0) return 0;
    const lastEnd = this.video.buffered.end(this.video.buffered.length - 1);
    return (lastEnd / this.video.duration) * 100;
  }

  /** Register event handlers */
  onTimeUpdate(handler: (time: number) => void): () => void {
    this._onTimeUpdateHandlers.push(handler);
    return () => {
      this._onTimeUpdateHandlers = this._onTimeUpdateHandlers.filter((h) => h !== handler);
    };
  }

  onPlay(handler: () => void): () => void {
    this._onPlayHandlers.push(handler);
    return () => { this._onPlayHandlers = this._onPlayHandlers.filter((h) => h !== handler); };
  }

  onPause(handler: () => void): () => void {
    this._onPauseHandlers.push(handler);
    return () => { this._onPauseHandlers = this._onPauseHandlers.filter((h) => h !== handler); };
  }

  onEnded(handler: () => void): () => void {
    this._onEndedHandlers.push(handler);
    return () => { this._onEndedHandlers = this._onEndedHandlers.filter((h) => h !== handler); };
  }

  onError(handler: (error: Error) => void): () => void {
    this._onErrorHandler.push(handler);
    return () => { this._onErrorHandler = this._onErrorHandler.filter((h) => h !== handler); };
  }

  /** Get the raw video element */
  getVideoElement(): HTMLVideoElement { return this.video; }

  /** Dispose event listeners */
  dispose(): void {
    this._onTimeUpdateHandlers = [];
    this._onPlayHandlers = [];
    this._onPauseHandlers = [];
    this._onEndedHandlers = [];
    this._onErrorHandler = [];
  }
}

// --- Video Processing ---

/** Apply a CSS filter to a video frame and return as canvas */
export function applyVideoFilter(
  video: HTMLVideoElement,
  filter: string,
  outputWidth?: number,
  outputHeight?: number,
): HTMLCanvasElement {
  const w = outputWidth ?? video.videoWidth;
  const h = outputHeight ?? video.videoHeight;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  ctx.filter = filter;
  ctx.drawImage(video, 0, 0, w, h);

  return canvas;
}

/** Common video filter presets */
export const VIDEO_FILTERS = {
  none: "",
  grayscale: "grayscale(100%)",
  sepia: "sepia(100%)",
  blur: "blur(3px)",
  brightness: "brightness(1.3)",
  contrast: "contrast(1.5)",
  saturate: "saturate(2)",
  hueRotate: "hue-rotate(90deg)",
  invert: "invert(100%)",
  vintage: "sepia(50%) contrast(1.1) brightness(0.9)",
  warm: "sepia(30%) saturate(1.4) brightness(1.05)",
  cool: "saturate(1.2) hue-rotate(20deg) brightness(1.05)",
  dramatic: "contrast(1.4) saturate(1.2) brightness(0.95)",
  noir: "grayscale(100%) contrast(1.2) brightness(0.9)",
} as const;

/** Flip video horizontally (mirror effect) */
export function mirrorVideo(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const w = canvas.width;
  const h = canvas.height;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(canvas, 0, 0, w, h);
  return out;
}

/** Rotate a video frame by 90/180/270 degrees */
export function rotateVideoFrame(
  source: HTMLCanvasElement | HTMLVideoElement,
  degrees: 90 | 180 | 270,
): HTMLCanvasElement {
  const isVideo = source instanceof HTMLVideoElement;
  const sw = isVideo ? source.videoWidth : source.width;
  const sh = isVideo ? source.videoHeight : source.height;

  const isRotated = degrees === 90 || degrees === 270;
  const cw = isRotated ? sh : sw;
  const ch = isRotated ? sw : sh;

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d")!;

  ctx.save();

  if (degrees === 90) {
    ctx.translate(0, ch);
    ctx.rotate((Math.PI / 2));
  } else if (degrees === 180) {
    ctx.translate(cw, ch);
    ctx.rotate(Math.PI);
  } else if (degrees === 270) {
    ctx.translate(cw, 0);
    ctx.rotate((-Math.PI / 2));
  }

  ctx.drawImage(source, 0, 0, sw, sh);
  ctx.restore();

  return canvas;
}

/** Resize a video frame to target dimensions (maintains aspect ratio) */
export function resizeVideoFrame(
  source: HTMLCanvasElement | HTMLVideoElement,
  maxWidth: number,
  maxHeight: number,
  fit: "contain" | "cover" = "contain",
): HTMLCanvasElement {
  const isVideo = source instanceof HTMLVideoElement;
  const sw = isVideo ? source.videoWidth : source.width;
  const sh = isVideo ? source.videoHeight : source.height;

  const scale = fit === "contain"
    ? Math.min(maxWidth / sw, maxHeight / sh)
    : Math.max(maxWidth / sw, maxHeight / sh);

  const dw = Math.round(sw * scale);
  const dh = Math.round(sh * scale);

  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(source, 0, 0, dw, dh);

  return canvas;
}

/** Crop a video frame to a region */
export function cropVideoFrame(
  source: HTMLCanvasElement | HTMLVideoElement,
  x: number,
  y: number,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(source, x, y, width, height, 0, 0, width, height);
  return canvas;
}

// --- Stream Utilities ---

/** Get stats about a MediaStream's video track */
export function getStreamResolution(stream: MediaStream): { width: number; height: number } | null {
  const track = stream.getVideoTracks()[0];
  if (!track) return null;
  const settings = track.getSettings();
  return {
    width: settings.width ?? 0,
    height: settings.height ?? 0,
  };
}

/** Check if a stream is active (has live tracks) */
export function isStreamActive(stream: MediaStream): boolean {
  return stream.active && stream.getTracks().some((t) => t.readyState === "live");
}

/** Stop all tracks in a stream */
export function stopStream(stream: MediaStream): void {
  stream.getTracks().forEach((t) => t.stop());
}

/** Clone a MediaStream (useful for multiple consumers) */
export function cloneStream(stream: MediaStream): MediaStream {
  return new MediaStream(stream.getTracks());
}

/** Mix two video streams side-by-side */
export function mixStreamsSideBySide(
  streamA: MediaStream,
  streamB: MediaStream,
  width = 640,
  height = 360,
): { canvas: HTMLCanvasElement; timer: ReturnType<typeof setInterval> } {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const videoA = document.createElement("video");
  videoA.srcObject = streamA;
  videoA.muted = true;
  videoA.autoplay = true;
  videoA.playsInline = true;

  const videoB = document.createElement("video");
  videoB.srcObject = streamB;
  videoB.muted = true;
  videoB.autoplay = true;
  videoB.playsInline = true;

  const halfW = width / 2;

  const timer = setInterval(() => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(videoA, 0, 0, halfW, height);
    ctx.drawImage(videoB, halfW, 0, halfW, height);
  }, 1000 / 30);

  return { canvas, timer };
}

/** Stop a mixed stream rendering */
export function stopMixedStream(mix: { timer: ReturnType<typeof setInterval>; canvas: HTMLCanvasElement }): void {
  clearInterval(mix.timer);
}

// --- Format Detection ---

/** Detect video MIME type from file signature (magic bytes) */
export async function detectVideoFormat(file: File | Blob): Promise<string> {
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // MP4: ftyp box
  if (
    bytes[0] === 0x00 &&
    bytes[1] === 0x00 &&
    bytes[2] === 0x00 &&
    bytes[3] >= 0x14 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    return "video/mp4";
  }

  // WebM: EBML header
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return "video/webm";
  }

  // AVI: RIFF AVI
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46
  ) {
    return "video/avi";
  }

  // OGG
  if (bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
    return "video/ogg";
  }

  // Try MIME type from file
  return file.type || "video/mp4";
}

/** Check if a MIME type is a known video format */
export function isVideoMimeType(mimeType: string): boolean {
  return mimeType.startsWith("video/") ||
    ["video/mp4", "video/webm", "video/ogg", "video/avi", "video/quicktime"].includes(mimeType);
}

/** Get human-readable video duration string */
export function formatVideoDuration(seconds: number): string {
  const s = Math.abs(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);

  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m.toString().padStart(2, "0")}`);
  parts.push(sec.toString().padStart(2, "0"));

  return parts.join(":");
}

/** Calculate video file size estimate from duration and bitrate */
export function estimateFileSize(
  durationSeconds: number,
  bitrateKbps: number,
): number {
  return (durationSeconds * bitrateKbps * 1000) / 8; // bytes
}

/** Estimate optimal bitrate for given resolution and fps */
export function estimateOptimalBitrate(
  width: number,
  height: number,
  fps: number = 30,
): number {
  const pixels = width * height;
  const baseKbps = pixels <= 640 * 360 ? 800
    : pixels <= 1280 * 720 ? 2500
    : pixels <= 1920 * 1080 ? 5000
    : pixels <= 3840 * 2160 ? 20000
    : 40000;

  return Math.round(baseKbps * (fps / 30));
}

// --- Helpers ---

async function _loadVideo(src: string, startTime = 0): Promise<HTMLVideoElement> {
  return new Promise<HTMLVideoElement>((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "auto";
    video.muted = true;
    video.src = src;

    video.onloadedmetadata = () => {
      if (startTime > 0) video.currentTime = startTime;
      _waitForVideo(video).then(() => resolve(video)).catch(reject);
    };

    video.onerror = () => reject(new Error(`Failed to load video: ${src}`));

    // Timeout fallback
    setTimeout(() => reject(new Error(`Video load timeout: ${src}`)), 15000);
  });
}

function _waitForVideo(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    if (video.readyState >= 2) { resolve(); return; }
    const onSeeked = () => { video.removeEventListener("seeked", onSeeked); resolve(); };
    video.addEventListener("seeked", onSeeked);
    const onCanPlay = () => { video.removeEventListener("canplay", onCanPlay); resolve(); };
    video.addEventListener("canplay", onCanPlay);
  });
}
