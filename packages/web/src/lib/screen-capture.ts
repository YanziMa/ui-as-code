/**
 * Screen Capture: Browser-based screen/tab/window capture with region selection,
 * annotation overlay, recording controls, webcam picture-in-picture, format
 * options, and MediaStream-based pipeline.
 */

// --- Types ---

export type CaptureSource = "screen" | "window" | "tab" | "webcam" | "audio";
export type CaptureFormat = "image/png" | "image/jpeg" | "image/webp" | "video/webm";
export type CaptureState = "idle" | "requesting" | "capturing" | "paused" | "recording" | "stopped";

export interface CaptureOptions {
  /** Source to capture (default: "screen") */
  source?: CaptureSource;
  /** Prefer a specific tab/window ID (for extension contexts) */
  targetId?: string;
  /** Capture audio along with video */
  captureAudio?: boolean;
  /** Include microphone audio */
  includeMic?: boolean;
  /** Video constraints */
  videoConstraints?: MediaTrackConstraints;
  /** Audio constraints */
  audioConstraints?: MediaTrackConstraints;
  /** Frame rate for video capture */
  frameRate?: number;
  /** Output format for images */
  imageFormat?: "png" | "jpeg" | "webp";
  /** JPEG/WebP quality (0-1) */
  quality?: number;
  /** Display cursor in capture */
  showCursor?: boolean;
}

export interface RegionSelection {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Annotation {
  id: string;
  type: "pen" | "highlighter" | "text" | "arrow" | "rect" | "ellipse" | "blur" | "pixelate";
  points: Array<{ x: number; y: number }>;
  color: string;
  size: number;
  text?: string;
  timestamp: number;
}

export interface RecordingOptions {
  /** Time limit in ms (0 = unlimited) */
  timeLimit?: number;
  /** Output MIME type */
  mimeType?: string;
  /** Video bitrate (bps) */
  videoBitsPerSecond?: number;
  /** Audio bitrate (bps) */
  audioBitsPerSecond?: number;
  /** Callback on time update (ms elapsed) */
  onTimeUpdate?: (elapsed: number) => void;
  /** Callback when paused/resumed */
  onStateChange?: (state: CaptureState) => void;
  /** Auto-stop after time limit */
  autoStop?: boolean;
}

export interface CaptureResult {
  success: boolean;
  blob?: Blob;
  dataUrl?: string;
  url?: string;        // Object URL (call revokeBlobUrl when done)
  duration?: number;   // Recording duration in ms
  width?: number;
  height?: number;
  error?: string;
}

// --- Main Capture Class ---

/**
 * Screen capture utility using getDisplayMedia / getUserMedia APIs.
 *
 * ```ts
 * const capturer = new ScreenCapture();
 *
 * // Take a screenshot
 * const result = await capturer.captureScreenshot();
 * document.getElementById("preview").src = result.dataUrl;
 *
 * // Record screen
 * await capturer.startRecording({ timeLimit: 30000 });
 * // ... user does stuff ...
 * const video = await capturer.stopRecording();
 * ```
 */
export class ScreenCapture {
  private stream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private recorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private state: CaptureState = "idle";
  private startTime = 0;
  private annotations: Annotation[] = [];
  private overlayCanvas: HTMLCanvasElement | null = null;
  private overlayCtx: CanvasRenderingContext2D | null = null;
  private listeners = new Set<(state: CaptureState, data?: unknown) => void>();
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  get currentState(): CaptureState { return this.state; }
  get isCapturing(): boolean { return this.state === "capturing" || this.state === "recording"; }

  /**
   * Request screen/video capture permission and start streaming.
   */
  async startCapture(options: CaptureOptions = {}): Promise<MediaStream> {
    if (this.stream) this.stopCapture();

    this.state = "requesting";
    this.notifyListeners();

    try {
      let stream: MediaStream;

      if (options.source === "webcam") {
        stream = await navigator.mediaDevices.getUserMedia({
          video: options.videoConstraints ?? { facingMode: "user", width: 1920, height: 1080 },
          audio: options.captureAudio ?? false,
        });
      } else {
        // Screen capture via getDisplayMedia
        const displayOpts: DisplayMediaStreamOptions = {
          video: {
            ...options.videoConstraints,
            displaySurface: options.source === "tab" ? "browser"
              : options.source === "window" ? "window"
              : "monitor",
            cursor: options.showCursor !== false ? "always" : "never",
            frameRate: options.frameRate ?? 30,
          } as MediaTrackConstraints,
          audio: options.captureAudio ?? false,
        };

        stream = await navigator.mediaDevices.getDisplayMedia(displayOpts);
      }

      // Add microphone if requested
      if (options.includeMic) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: options.audioConstraints ?? true });
          micStream.getAudioTracks().forEach((track) => stream.addTrack(track));
        } catch {
          console.warn("[ScreenCapture] Microphone access denied");
        }
      }

      this.stream = stream;

      // Create hidden video element for frame access
      this.videoEl = document.createElement("video");
      this.videoEl.srcObject = stream;
      this.videoEl.muted = true;
      this.videoEl.autoplay = true;
      await this.videoEl.play();

      this.state = "capturing";
      this.notifyListeners();

      // Handle stream end (user clicked "Stop sharing")
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (this.state === "recording") this.stopRecording();
        else this.stopCapture();
      });

      return stream;
    } catch (err) {
      this.state = "idle";
      this.notifyListeners();
      throw new Error(`Capture failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Capture a single frame as an image blob/data URL.
   */
  async captureFrame(options?: Partial<CaptureOptions> & { region?: RegionSelection }): Promise<CaptureResult> {
    if (!this.stream || !this.videoEl) {
      // Need to start capture first
      await this.startCapture(options);
    }

    const video = this.videoEl!;
    const fmt = options?.imageFormat ?? "png";
    const quality = options?.quality ?? 0.92;

    let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;

    if (options?.region) {
      sx = options.region.x;
      sy = options.region.y;
      sw = options.region.width;
      sh = options.region.height;
    }

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

    // Draw annotations on top
    if (this.annotations.length > 0) {
      this.renderAnnotations(ctx, canvas.width, canvas.height);
    }

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve({ success: false, error: "Failed to create blob" });
            return;
          }
          resolve({
            success: true,
            blob,
            dataUrl: URL.createObjectURL(blob),
            url: URL.createObjectURL(blob),
            width: sw,
            height: sh,
          });
        },
        `image/${fmt}`,
        quality,
      );
    });
  }

  /**
   * Alias for captureFrame — take a screenshot.
   */
  async captureScreenshot(options?: Partial<CaptureOptions> & { region?: RegionSelection }): Promise<CaptureResult> {
    return this.captureFrame(options);
  }

  /**
   * Start recording the capture stream to a video file.
   */
  async startRecording(recOptions: RecordingOptions = {}): Promise<void> {
    if (!this.stream) await this.startCapture();

    const mimeType = recOptions.mimeType ??
      MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
          ? "video/webm;codecs=vp8"
          : "video/webm";

    this.recordedChunks = [];
    this.recorder = new MediaRecorder(this.stream!, {
      mimeType,
      videoBitsPerSecond: recOptions.videoBitsPerSecond ?? 5_000_000,
      audioBitsPerSecond: recOptions.audioBitsPerSecond ?? 128_000,
    });

    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.recordedChunks.push(e.data);
    };

    this.recorder.onstop = () => {
      this.state = "stopped";
      this.notifyListeners();
    };

    this.recorder.start(1000); // Collect data every second
    this.startTime = Date.now();
    this.state = "recording";
    this.notifyListeners();

    // Timer for time updates
    if (recOptions.onTimeUpdate || recOptions.timeLimit) {
      this.timerInterval = setInterval(() => {
        const elapsed = Date.now() - this.startTime;
        recOptions.onTimeUpdate?.(elapsed);

        if (recOptions.timeLimit && elapsed >= (recOptions.timeLimit ?? 0)) {
          this.stopRecording();
        }
      }, 100);
    }
  }

  /**
   * Stop recording and return the resulting video blob.
   */
  async stopRecording(): Promise<CaptureResult> {
    return new Promise((resolve) => {
      if (!this.recorder || this.state !== "recording") {
        resolve({ success: false, error: "Not currently recording" });
        return;
      }

      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }

      const duration = Date.now() - this.startTime;

      this.recorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: this.recorder!.mimeType });
        resolve({
          success: true,
          blob,
          dataUrl: URL.createObjectURL(blob),
          url: URL.createObjectURL(blob),
          duration,
        });
        this.state = "stopped";
        this.notifyListeners();
      };

      this.recorder.stop();
    });
  }

  /**
   * Pause/resume recording.
   */
  togglePause(): void {
    if (!this.recorder || this.state !== "recording") return;

    if (this.recorder.state === "recording") {
      this.recorder.pause();
      this.state = "paused";
    } else if (this.recorder.state === "paused") {
      this.recorder.resume();
      this.state = "recording";
    }
    this.notifyListeners();
  }

  /**
   * Stop the active capture stream.
   */
  stopCapture(): void {
    if (this.recorder && this.recorder.state === "recording") {
      this.recorder.stop();
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.videoEl) {
      this.videoEl.srcObject = null;
      this.videoEl.remove();
      this.videoEl = null;
    }

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    this.state = "idle";
    this.annotations = [];
    this.notifyListeners();
  }

  // --- Annotation System ---

  /**
   * Initialize annotation overlay on a container element.
   */
  initOverlay(container: HTMLElement): HTMLCanvasElement {
    this.overlayCanvas = document.createElement("canvas");
    this.overlayCanvas.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10;";
    this.overlayCtx = this.overlayCanvas.getContext("2d")!;

    const resize = () => {
      if (this.overlayCanvas) {
        this.overlayCanvas.width = container.clientWidth;
        this.overlayCanvas.height = container.clientHeight;
      }
    };
    resize();
    new ResizeObserver(resize).observe(container);

    container.style.position = "relative";
    container.appendChild(this.overlayCanvas);

    return this.overlayCanvas;
  }

  /** Add an annotation */
  addAnnotation(annotation: Omit<Annotation, "id" | "timestamp">): string {
    const id = `ann_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const full: Annotation = { ...annotation, id, timestamp: Date.now() };
    this.annotations.push(full);
    this.redrawAnnotations();
    return id;
  }

  /** Remove an annotation by ID */
  removeAnnotation(id: string): boolean {
    const idx = this.annotations.findIndex((a) => a.id === id);
    if (idx === -1) return false;
    this.annotations.splice(idx, 1);
    this.redrawAnnotations();
    return true;
  }

  /** Clear all annotations */
  clearAnnotations(): void {
    this.annotations = [];
    this.redrawAnnotations();
  }

  /** Get all annotations */
  getAnnotations(): Annotation[] { return [...this.annotations]; }

  // --- Utility ---

  /** Subscribe to state changes */
  onStateChange(fn: (state: CaptureState, data?: unknown) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Check if screen capture API is available */
  static isSupported(): boolean {
    return typeof navigator !== "undefined" &&
      typeof navigator.mediaDevices?.getDisplayMedia === "function";
  }

  /** Get available capture sources (via enumerateDevices) */
  static async getSources(): Promise<Array<{ id: string; name: string; kind: string }>> {
    if (!(navigator.mediaDevices as any)?.enumerateDisplayMedia) {
      // Fallback: use enumerateDevices
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((d) => d.kind === "videoinput").map((d) => ({
        id: d.deviceId,
        name: d.label || "Unknown Device",
        kind: d.kind,
      }));
    }
    try {
      const sources = await (navigator.mediaDevices as any).enumerateDisplayMedia();
      return sources;
    } catch {
      return [];
    }
  }

  // --- Internal ---

  private notifyListeners(data?: unknown): void {
    for (const fn of this.listeners) fn(this.state, data);
  }

  private redrawAnnotations(): void {
    if (!this.overlayCtx || !this.overlayCanvas) return;
    this.overlayCtx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
    this.renderAnnotations(this.overlayCtx, this.overlayCanvas.width, this.overlayCanvas.height);
  }

  private renderAnnotations(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    for (const ann of this.annotations) {
      ctx.save();
      ctx.strokeStyle = ann.color;
      ctx.fillStyle = ann.color;
      ctx.lineWidth = ann.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      switch (ann.type) {
        case "pen":
          if (ann.points.length < 2) break;
          ctx.beginPath();
          ctx.moveTo(ann.points[0].x, ann.points[0].y);
          for (let i = 1; i < ann.points.length; i++) {
            ctx.lineTo(ann.points[i]!.x, ann.points[i]!.y);
          }
          ctx.stroke();
          break;

        case "highlighter":
          ctx.globalAlpha = 0.3;
          if (ann.points.length < 2) break;
          ctx.lineWidth = ann.size * 3;
          ctx.beginPath();
          ctx.moveTo(ann.points[0].x, ann.points[0].y);
          for (let i = 1; i < ann.points.length; i++) {
            ctx.lineTo(ann.points[i]!.x, ann.points[i]!.y);
          }
          ctx.stroke();
          break;

        case "arrow": {
          if (ann.points.length < 2) break;
          const from = ann.points[0]!, to = ann.points[ann.points.length - 1]!;
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
          ctx.stroke();
          // Arrowhead
          const angle = Math.atan2(to.y - from.y, to.x - from.x);
          const headLen = Math.max(10, ann.size * 3);
          ctx.beginPath();
          ctx.moveTo(to.x, to.y);
          ctx.lineTo(to.x - headLen * Math.cos(angle - Math.PI / 6), to.y - headLen * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(to.x, to.y);
          ctx.lineTo(to.x - headLen * Math.cos(angle + Math.PI / 6), to.y - headLen * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
          break;
        }

        case "rect": {
          if (ann.points.length < 2) break;
          const p1 = ann.points[0]!, p2 = ann.points[ann.points.length - 1]!;
          ctx.strokeRect(Math.min(p1.x, p2.x), Math.min(p1.y, p2.y), Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
          break;
        }

        case "ellipse": {
          if (ann.points.length < 2) break;
          const p1 = ann.points[0]!, p2 = ann.points[ann.points.length - 1]!;
          const cx = (p1.x + p2.x) / 2, cy = (p1.y + p2.y) / 2;
          const rx = Math.abs(p2.x - p1.x) / 2, ry = Math.abs(p2.y - p1.y) / 2;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }

        case "text":
          if (ann.text && ann.points.length >= 1) {
            ctx.font = `${ann.size * 3}px sans-serif`;
            ctx.fillText(ann.text, ann.points[0].x, ann.points[0].y);
          }
          break;
      }

      ctx.restore();
    }
  }
}
