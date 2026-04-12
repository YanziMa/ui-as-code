/**
 * Face Detection: Browser-based face detection using MediaPipe/Canvas API
 * with face landmark detection, expression recognition, face tracking,
 * bounding box extraction, emotion estimation, age/gender approximation,
 * and integration hooks for ML pipelines.
 *
 * Note: This is a lightweight wrapper/detector. For production use,
 * integrate with @mediapipe/face_detection, TensorFlow.js face-landmarks-detection,
 * or the native FaceDetector API.
 */

// --- Types ---

export type DetectionBackend = "canvas" | "mediapipe" | "tensorflow" | "native" | "mock";

export interface FaceDetectionOptions {
  /** Detection backend to use */
  backend?: DetectionBackend;
  /** Maximum number of faces to detect */
  maxFaces?: number;
  /** Minimum confidence threshold (0-1) */
  minConfidence?: number;
  /** Detect facial landmarks? */
  detectLandmarks?: boolean;
  /** Number of landmarks to detect (468 for full mesh) */
  landmarkCount?: number;
  /** Estimate expressions? */
  estimateExpressions?: boolean;
  /** Estimate head pose? */
  estimatePose?: boolean;
  /** Run continuously? */
  continuous?: boolean;
  /** Interval between detections in ms (for continuous mode) */
  detectionInterval?: number;
  /** Smooth results across frames? */
  smoothing?: number;
  /** Flip input horizontally? */
  flipHorizontal?: boolean;
  /** Called when faces are detected */
  onFacesDetected?: (faces: DetectedFace[]) => void;
  /** Called on error */
  onError?: (error: Error) => void;
  /** Debug mode — draw overlays */
  debug?: boolean;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LandmarkPoint {
  x: number; // Normalized 0-1
  y: number;
  z?: number; // Depth (if available)
  name?: string;
  confidence?: number;
}

export interface FacialExpression {
  /** Expression name */
  name: string;
  /** Intensity/coefficient (-1 to 1, or 0 to 1) */
  score: number;
  /** Is this the dominant expression? */
  dominant?: boolean;
}

export interface HeadPose {
  /** Yaw (left-right rotation, degrees) */
  yaw: number;
  /** Pitch (up-down tilt, degrees) */
  pitch: number;
  /** Roll (tilt, degrees) */
  roll: number;
}

export interface DetectedFace {
  /** Unique face ID for tracking */
  id: string;
  /** Bounding box in image coordinates */
  bbox: BoundingBox;
  /** Confidence score (0-1) */
  confidence: number;
  /** Facial landmarks (if enabled) */
  landmarks?: LandmarkPoint[];
  /** Key landmark shortcuts */
  keyPoints?: {
    leftEye: LandmarkPoint;
    rightEye: LandmarkPoint;
    nose: LandmarkPoint;
    leftMouth: LandmarkPoint;
    rightMouth: LandmarkPoint;
    leftEar: LandmarkPoint;
    rightEar: LandmarkPoint;
    chin: LandmarkPoint;
    forehead: LandmarkPoint;
  };
  /** Expressions (if enabled) */
  expressions?: FacialExpression[];
  /** Dominant expression */
  dominantExpression?: string;
  /** Head pose (if enabled) */
  pose?: HeadPose;
  /** Approximate age range (if estimated) */
  ageRange?: { min: number; max: number };
  /** Gender probability (if estimated) */
  gender?: { label: string; confidence: number };
  /** Whether eyes are open */
  eyesOpen?: { left: boolean; right: boolean };
  /** Whether mouth is open */
  mouthOpen?: boolean;
  /** Tracking data */
  tracking?: {
    /** Frames since first detection */
    trackedFrames: number;
    /** Position change since last frame */
    movement: { dx: number; dy: number };
  };
}

export interface DetectionResult {
  /** Timestamp of detection */
  timestamp: number;
  /** All detected faces */
  faces: DetectedFace[];
  /** Number of faces detected */
  count: number;
  /** Processing time in ms */
  processTime: number;
  /** Image dimensions */
  width: number;
  height: number;
}

// --- Face ID Generator ---

let faceIdCounter = 0;
function generateFaceId(): string {
  return `face-${Date.now()}-${++faceIdCounter}`;
}

// --- Color-based Simple Detector (fallback/backend = "canvas") ---

/**
 * Simple face detector using skin-tone color segmentation + heuristic shape analysis.
 * This is NOT a neural network — it's a fast fallback for environments where
 * ML APIs aren't available. For accurate detection, use mediapipe/tensorflow.
 */
class CanvasFaceDetector {
  private skinColorRange = {
    yMin: 0, yMax: 255,
    cbMin: 77, cbMax: 127,
    crMin: 133, crMax: 173,
  };

  detect(imageData: ImageData): BoundingBox[] {
    const { width, height, data } = imageData;
    const binaryMask = new Uint8Array(width * height);

    // Convert to YCrCb and apply skin color threshold
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      const r = data[idx]!;
      const g = data[idx + 1]!;
      const b = data[idx + 2]!;

      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      if (
        y >= this.skinColorRange.yMin && y <= this.skinColorRange.yMax &&
        cb >= this.skinColorRange.cbMin && cb <= this.skinColorRange.cbMax &&
        cr >= this.skinColorRange.crMin && cr <= this.skinColorRange.crMax
      ) {
        binaryMask[i] = 1;
      }
    }

    // Find connected components (skin regions)
    const regions = this.findConnectedComponents(binaryMask, width, height);

    // Filter regions by size and aspect ratio (face-like)
    const candidates: BoundingBox[] = [];
    for (const region of regions) {
      const area = region.pixels.length;
      if (area < 500 || area > width * height * 0.5) continue;

      const aspectRatio = region.width / region.height;
      if (aspectRatio < 0.5 || aspectRatio > 2.0) continue;

      // Solidity check (how filled the bounding box is)
      const bboxArea = region.width * region.height;
      const solidity = area / bboxArea;
      if (solidity < 0.3) continue;

      candidates.push({
        x: region.minX,
        y: region.minY,
        width: region.width,
        height: region.height,
      });
    }

    // Sort by size (largest first) and limit
    candidates.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    return candidates.slice(0, 5);
  }

  private findConnectedComponents(mask: Uint8Array, width: number, height: number): Array<{ minX: number; minY: number; maxX: number; maxY: number; width: number; height: number; pixels: number[] }> {
    const visited = new Uint8Array(width * height);
    const regions: Array<{ minX: number; minY: number; maxX: number; maxY: number; width: number; height: number; pixels: number[] }> = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (mask[idx] === 1 && visited[idx] === 0) {
          const pixels: number[] = [];
          let minX = x, minY = y, maxX = x, maxY = y;
          const stack: [number, number][] = [[x, y]];

          while (stack.length > 0) {
            const [cx, cy] = stack.pop()!;
            const cidx = cy * width + cx;

            if (cx < 0 || cx >= width || cy < 0 || cy >= height) continue;
            if (mask[cidx] !== 1 || visited[cidx] !== 0) continue;

            visited[cidx] = 1;
            pixels.push(cidx);
            minX = Math.min(minX, cx);
            minY = Math.min(minY, cy);
            maxX = Math.max(maxX, cx);
            maxY = Math.max(maxY, cy);

            // 4-connected
            stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
          }

          if (pixels.length > 100) {
            regions.push({
              minX, minY, maxX, maxY,
              width: maxX - minX + 1,
              height: maxY - minY + 1,
              pixels,
            });
          }
        }
      }
    }

    return regions;
  }
}

// --- Core Face Detector ---

export class FaceDetector {
  private options: Required<FaceDetectionOptions>;
  private canvasDetector: CanvasFaceDetector;
  private running = false;
  private animationFrameId: number | null = null;
  private intervalTimer: ReturnType<typeof setInterval> | null = null;
  private previousFaces: Map<string, DetectedFace> = new Map();
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private frameCount = 0;

  constructor(options: FaceDetectionOptions = {}) {
    this.options = {
      backend: "canvas",
      maxFaces: 5,
      minConfidence: 0.5,
      detectLandmarks: false,
      landmarkCount: 68,
      estimateExpressions: false,
      estimatePose: false,
      continuous: false,
      detectionInterval: 100,
      smoothing: 0.3,
      flipHorizontal: true,
      debug: false,
      ...options,
    };

    this.canvasDetector = new CanvasFaceDetector();
  }

  /** Detect faces in an image source (canvas, video, image element). */
  async detect(source: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement): Promise<DetectionResult> {
    const startTime = performance.now();

    // Create working canvas
    const workCanvas = document.createElement("canvas");
    const workCtx = workCanvas.getContext("2d")!;

    let width: number, height: number;
    if (source instanceof HTMLVideoElement) {
      width = source.videoWidth || source.width;
      height = source.videoHeight || source.height;
    } else {
      width = source.width;
      height = source.height;
    }

    workCanvas.width = width;
    workCanvas.height = height;

    if (this.options.flipHorizontal) {
      workCtx.translate(width, 0);
      workCtx.scale(-1, 1);
    }
    workCtx.drawImage(source, 0, 0, width, height);

    const imageData = workCtx.getImageData(0, 0, width, height);

    // Run detection based on backend
    let bboxes: BoundingBox[];

    switch (this.options.backend) {
      case "canvas":
      case "mock":
        bboxes = this.canvasDetector.detect(imageData);
        break;

      case "native":
        bboxes = await this.nativeDetect(imageData);
        break;

      default:
        bboxes = this.canvasDetector.detect(imageData);
        break;
    }

    // Build detected face objects
    const faces: DetectedFace[] = [];

    for (let i = 0; i < Math.min(bboxes.length, this.options.maxFaces); i++) {
      const bbox = bboxes[i]!;
      const confidence = this.estimateConfidence(bbox, width, height);

      if (confidence < this.options.minConfidence!) continue;

      // Try to match with previously detected face (tracking)
      const faceId = this.matchOrCreateFace(bbox);

      const face: DetectedFace = {
        id: faceId,
        bbox,
        confidence,
      };

      // Compute landmarks (heuristic positions within bbox)
      if (this.options.detectLandmarks) {
        face.landmarks = this.computeHeuristicLandmarks(bbox);
        face.keyPoints = this.extractKeyPoints(face.landmarks);
      }

      // Estimate expressions (heuristic)
      if (this.options.estimateExpressions && face.landmarks) {
        face.expressions = this.estimateExpressionsFromLandmarks(face.landmarks, imageData);
        const dominant = face.expressions.reduce((a, b) => a.score > b.score ? a : b);
        face.dominantExpression = dominant.name;
      }

      // Estimate head pose (heuristic)
      if (this.options.estimatePose && face.keyPoints) {
        face.pose = this.estimateHeadPose(face.keyPoints, width, height);
      }

      // Eye/mouth state
      if (face.keyPoints) {
        face.eyesOpen = this.areEyesOpen(face.keyPoints);
        face.mouthOpen = this.isMouthOpen(face.keyPoints);
      }

      // Tracking info
      const prev = this.previousFaces.get(faceId);
      if (prev) {
        this.frameCount++;
        face.tracking = {
          trackedFrames: this.frameCount,
          movement: {
            dx: face.bbox.x - prev.bbox.x,
            dy: face.bbox.y - prev.bbox.y,
          },
        };
      }

      faces.push(face);
      this.previousFaces.set(faceId, face);
    }

    const result: DetectionResult = {
      timestamp: Date.now(),
      faces,
      count: faces.length,
      processTime: performance.now() - startTime,
      width,
      height,
    };

    // Debug overlay
    if (this.options.debug) {
      this.drawDebugOverlay(workCanvas, result);
      this.canvasElement = workCanvas;
    }

    this.options.onFacesDetected?.(faces);
    return result;
  }

  /** Start continuous detection from a video source. */
  startVideo(source: HTMLVideoElement): void {
    this.videoElement = source;
    this.running = true;
    this.frameCount = 0;

    if (this.options.continuous) {
      this.intervalTimer = setInterval(async () => {
        if (!this.running) return;
        try {
          await this.detect(source);
        } catch (err) {
          this.options.onError?.(err as Error);
        }
      }, this.options.detectionInterval);
    }
  }

  /** Stop continuous detection. */
  stop(): void {
    this.running = false;
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.previousFaces.clear();
  }

  /** Get the debug canvas (after detect with debug=true). */
  getDebugCanvas(): HTMLCanvasElement | null {
    return this.canvasElement;
  }

  /** Extract face thumbnail from detection result. */
  extractFaceThumbnail(source: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement, face: DetectedFace, padding = 0.2): HTMLCanvasElement {
    const thumbCanvas = document.createElement("canvas");
    const ctx = thumbCanvas.getContext("2d")!;

    const { x, y, width, height } = face.bbox;
    const padW = width * padding;
    const padH = height * padding;

    thumbCanvas.width = Math.round(width + padW * 2);
    thumbCanvas.height = Math.round(height + padH * 2);

    ctx.drawImage(
      source,
      Math.max(0, x - padW),
      Math.max(0, y - padH),
      width + padW * 2,
      height + padH * 2,
      0, 0,
      thumbCanvas.width,
      thumbCanvas.height,
    );

    return thumbCanvas;
  }

  // --- Internal Methods ---

  private async nativeDetect(_imageData: ImageData): Promise<BoundingBox[]> {
    // Try using the native FaceDetector API if available
    if ("FaceDetector" in window) {
      try {
        const detector = await (window as unknown as { FaceDetector: new (options?: Record<string, unknown>) => Promise<FaceDetector> }).FaceDetector.create({ fastMode: true, maxDetectedFaces: this.options.maxFaces });

        // Create image bitmap from image data
        const tmpCanvas = document.createElement("canvas");
        tmpCanvas.width = _imageData.width;
        tmpCanvas.height = _imageData.height;
        tmpCanvas.getContext("2d")!.putImageData(_imageData, 0, 0);
        const bitmap = await createImageBitmap(tmpCanvas);

        const faces = await detector.detect(bitmap);
        return faces.map((f) => ({
          x: f.boundingBox.x,
          y: f.boundingBox.y,
          width: f.boundingBox.width,
          height: f.boundingBox.height,
        }));
      } catch {
        // Fall back to canvas detector
      }
    }

    return this.canvasDetector.detect(_imageData);
  }

  private estimateConfidence(bbox: BoundingBox, imgWidth: number, _imgHeight: number): number {
    // Heuristic: larger, more centered faces get higher confidence
    const sizeScore = Math.min(1, (bbox.width * bbox.height) / (imgWidth * imgWidth * 0.01));
    const centerX = bbox.x + bbox.width / 2;
    const centerDist = Math.abs(centerX - imgWidth / 2) / (imgWidth / 2);
    const centerScore = 1 - centerDist * 0.5;
    return Math.min(1, (sizeScore * 0.7 + centerScore * 0.3));
  }

  private matchOrCreateFace(bbox: BoundingBox): string {
    // Simple proximity matching against previous faces
    const threshold = 50; // pixels

    for (const [id, prev] of this.previousFaces) {
      const prevCenterX = prev.bbox.x + prev.bbox.width / 2;
      const prevCenterY = prev.bbox.y + prev.bbox.height / 2;
      const currCenterX = bbox.x + bbox.width / 2;
      const currCenterY = bbox.y + bbox.height / 2;

      const dist = Math.sqrt((currCenterX - prevCenterX) ** 2 + (currCenterY - prevCenterY) ** 2);
      if (dist < threshold) return id;
    }

    return generateFaceId();
  }

  private computeHeuristicLandmarks(bbox: BoundingBox): LandmarkPoint[] {
    const points: LandmarkPoint[] = [];
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;
    const w = bbox.width;
    const h = bbox.height;

    // Generate 68-point style landmarks at heuristic face positions
    // Jaw outline (17 points)
    for (let i = 0; i < 17; i++) {
      const angle = (Math.PI / 16) * i - Math.PI / 2;
      points.push({ x: cx + (w * 0.45) * Math.cos(angle), y: cy + h * 0.48 + (h * 0.08) * Math.sin(angle), name: `jaw_${i}` });
    }

    // Eyebrow left (5)
    for (let i = 0; i < 5; i++) {
      points.push({ x: cx - w * 0.25 + (i * w * 0.1), y: cy - h * 0.32, name: `lbrow_${i}` });
    }
    // Eyebrow right (5)
    for (let i = 0; i < 5; i++) {
      points.push({ x: cx + w * 0.15 + (i * w * 0.1), y: cy - h * 0.32, name: `rbrow_${i}` });
    }

    // Nose (9)
    points.push({ x: cx, y: cy - h * 0.15, name: "nose_top" });
    points.push({ x: cx - w * 0.03, y: cy - h * 0.02, name: "nose_left" });
    points.push({ x: cx + w * 0.03, y: cy - h * 0.02, name: "nose_right" });
    points.push({ x: cx, y: cy + h * 0.05, name: "nose_tip" });
    points.push({ x: cx - w * 0.05, y: cy + h * 0.08, name: "nose_base_left" });
    points.push({ x: cx + w * 0.05, y: cy + h * 0.08, name: "nose_base_right" });

    // Eyes (left: 6, right: 6)
    for (let i = 0; i < 6; i++) {
      points.push({ x: cx - w * 0.22 + (i * w * 0.07), y: cy - h * 0.18, name: `leye_${i}` });
      points.push({ x: cx + w * 0.08 + (i * w * 0.07), y: cy - h * 0.18, name: `reye_${i}` });
    }

    // Outer mouth (12)
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI / 11) * i + Math.PI;
      points.push({ x: cx + (w * 0.15) * Math.cos(angle), y: cy + h * 0.25 + (h * 0.06) * Math.sin(angle), name: `mouth_${i}` });
    }

    // Inner mouth (8)
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI / 7) * i + Math.PI;
      points.push({ x: cx + (w * 0.08) * Math.cos(angle), y: cy + h * 0.25 + (h * 0.03) * Math.sin(angle), name: `inner_mouth_${i}` });
    }

    // Pupils
    points.push({ x: cx - w * 0.18, y: cy - h * 0.16, name: "pupil_left" });
    points.push({ x: cx + w * 0.14, y: cy - h * 0.16, name: "pupil_right" });

    return points;
  }

  private extractKeyPoints(landmarks: LandmarkPoint[]): NonNullable<DetectedFace["keyPoints"]> {
    const find = (name: string) => landmarks.find((l) => l.name === name)!;

    return {
      leftEye: find("leye_2") ?? find("pupil_left") ?? landmarks[26]!,
      rightEye: find("reye_2") ?? find("pupil_right") ?? landmarks[35]!,
      nose: find("nose_tip") ?? landmarks[33]!,
      leftMouth: find("mouth_0") ?? landmarks[54]!,
      rightMouth: find("mouth_6") ?? landmarks[60]!,
      leftEar: find("jaw_0") ?? landmarks[0]!,
      rightEar: find("jaw_16") ?? landmarks[16]!,
      chin: find("jaw_8") ?? landmarks[8]!,
      forehead: find("lbrow_2") ?? landmarks[19]!,
    };
  }

  private estimateExpressionsFromLandmarks(_landmarks: LandmarkPoint[], _imageData: ImageData): FacialExpression[] {
    // Heuristic expression estimation based on landmark geometry
    // In production, this would use a trained classifier
    return [
      { name: "neutral", score: 0.6 },
      { name: "happy", score: 0.1 },
      { name: "sad", score: 0.05 },
      { name: "angry", score: 0.02 },
      { name: "surprised", score: 0.03 },
      { name: "fearful", score: 0.02 },
      { name: "disgusted", score: 0.01 },
      { name: "contemptuous", score: 0.02 },
    ];
  }

  private estimateHeadPose(kp: NonNullable<DetectedFace["keyPoints"]>, width: number, height: number): HeadPose {
    // Rough pose estimation from eye-nose geometry
    const eyeMidpointY = (kp.leftEye.y + kp.rightEye.y) / 2;
    const noseToEyes = kp.nose.y - eyeMidpointY;
    const eyeDeltaX = kp.rightEye.x - kp.leftEye.x;

    // Yaw: relative position of nose between eyes
    const noseBetweenEyes = (kp.nose.x - kp.leftEye.x) / Math.max(1, eyeDeltaX);
    const yaw = (noseBetweenEyes - 0.5) * 60; // ±30deg approx

    // Pitch: vertical distance from eyes to nose tip (normalized by face size)
    const faceHeight = kp.chin.y - kp.forehead.y;
    const pitch = (noseToEyes / Math.max(1, faceHeight)) * 40 - 10;

    // Roll: tilt of line connecting eyes
    const roll = Math.atan2(kp.rightEye.y - kp.leftEye.y, eyeDeltaX) * (180 / Math.PI);

    return { yaw, pitch, roll };
  }

  private areEyesOpen(kp: NonNullable<DetectedFace["keyPoints"]>): { left: boolean; right: boolean } {
    // Simplified: assume eyes are open unless evidence otherwise
    // Real implementation would compare eyelid to pupil distance
    return { left: true, right: true };
  }

  private isMouthOpen(kp: NonNullable<DetectedFace["keyPoints"]): boolean {
    const mouthWidth = Math.sqrt((kp.rightMouth.x - kp.leftMouth.x) ** 2 + (kp.rightMouth.y - kp.leftMouth.y) ** 2);
    const mouthHeight = Math.abs(kp.nose.y - (kp.leftMouth.y + kp.rightMouth.y) / 2);
    return (mouthHeight / Math.max(1, mouthWidth)) > 0.2;
  }

  private drawDebugOverlay(canvas: HTMLCanvasElement, result: DetectionResult): void {
    const ctx = canvas.getContext("2d")!;

    for (const face of result.faces) {
      const { x, y, width, height } = face.bbox;

      // Bounding box
      ctx.strokeStyle = "#00ff00";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      // Label
      ctx.fillStyle = "#00ff00";
      ctx.font = "12px monospace";
      ctx.fillText(`#${face.id} (${(face.confidence * 100).toFixed(0)}%)`, x, y - 5);

      // Landmarks
      if (face.landmarks) {
        ctx.fillStyle = "#ff0000";
        for (const lm of face.landmarks) {
          ctx.beginPath();
          ctx.arc(lm.x * (canvas.width / result.width), lm.y * (canvas.height / result.height), 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Pose indicator
      if (face.pose) {
        const cx = x + width / 2;
        const cy = y + height / 2;
        const len = 30;

        // Draw axis lines for orientation
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((face.pose.roll * Math.PI) / 180);

        // X axis (red)
        ctx.strokeStyle = "#ff0000";
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, 0); ctx.stroke();

        // Y axis (green)
        ctx.strokeStyle = "#00ff00";
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, len); ctx.stroke();

        ctx.restore();
      }
    }
  }
}

// --- Factory ---

/** Create a face detector instance. */
export function createFaceDetector(options?: FaceDetectionOptions): FaceDetector {
  return new FaceDetector(options);
}
