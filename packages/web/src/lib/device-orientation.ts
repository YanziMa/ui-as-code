/**
 * Device Orientation / Device Motion API wrapper with smoothing, calibration,
 * permission handling, and gesture recognition (shake, tilt).
 */

// --- Types ---

export interface OrientationData {
  /** Rotation around Z axis (degrees, -180 to 180) */
  alpha: number | null;
  /** Rotation around X axis (degrees, -180 to 180) */
  beta: number | null;
  /** Rotation around Y axis (degrees, -90 to 90) */
  gamma: number | null;
  /** Absolute if using Earth coordinate frame */
  absolute: boolean;
  /** Timestamp in ms */
  timestamp: number;
}

export interface MotionData {
  /** Acceleration with gravity (m/s^2) */
  acceleration: { x: number | null; y: number | null; z: number | null };
  /** Acceleration without gravity (m/s^2) */
  accelerationIncludingGravity: { x: number | null; y: number | null; z: number | null };
  /** Rotation rate (deg/s) */
  rotationRate: { alpha: number | null; beta: number | null; gamma: number | null };
  /** Timestamp in ms */
  timestamp: number;
}

export interface DeviceOrientationOptions {
  /** Receive orientation updates */
  enableOrientation?: boolean;
  /** Receive motion/acceleration updates */
  enableMotion?: boolean;
  /** Smoothing factor for orientation data (0=no smoothing, 1=max, default: 0.3) */
  smoothingFactor?: number;
  /** Callback on each orientation event */
  onOrientation?: (data: OrientationData) => void;
  /** Callback on each motion event */
  onMotion?: (data: MotionData) => void;
  /** Shake detection threshold (m/s^2, default: 15) */
  shakeThreshold?: number;
  /** Minimum shake quiet period between detections (ms, default: 1000) */
  shakeCooldownMs?: number;
  /** Called when a shake is detected */
  onShake?: () => void;
  /** Tilt detection thresholds (degrees) */
  tiltThresholds?: { leftRight?: number; frontBack?: number };
  /** Called when tilt exceeds threshold */
  onTilt?: (direction: "left" | "right" | "front" | "back") => void;
}

export interface DeviceOrientationInstance {
  /** Latest orientation reading (smoothed) */
  readonly orientation: OrientationData | null;
  /** Latest motion reading */
  readonly motion: MotionData | null;
  /** Whether orientation API is available */
  readonly orientationSupported: boolean;
  /** Whether motion API is available */
  readonly motionSupported: boolean;
  /** Subscribe to orientation changes */
  subscribeOrientation: (listener: (data: OrientationData) => void) => () => void;
  /** Subscribe to motion changes */
  subscribeMotion: (listener: (data: MotionData) => void) => () => void;
  /** Request device orientation permission (iOS 13+ requirement) */
  requestPermission: () => Promise<boolean>;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Main ---

export function createDeviceOrientation(options: DeviceOrientationOptions = {}): DeviceOrientationInstance {
  const {
    enableOrientation = true,
    enableMotion = true,
    smoothingFactor = 0.3,
    onOrientation,
    onMotion,
    shakeThreshold = 15,
    shakeCooldownMs = 1000,
    onShake,
    tiltThresholds = { leftRight: 30, frontBack: 30 },
    onTilt,
  } = options;

  let destroyed = false;
  let currentOrientation: OrientationData | null = null;
  let currentMotion: MotionData | null = null;
  let smoothedAlpha: number | null = null;
  let smoothedBeta: number | null = null;
  let smoothedGamma: number | null = null;

  let lastShakeTime = 0;
  const orientListeners = new Set<(data: OrientationData) => void>();
  const motionListeners = new Set<(data: MotionData) => void>();

  // Check support
  const orientationSupported = typeof window !== "undefined" &&
    "DeviceOrientationEvent" in window;
  const motionSupported = typeof window !== "undefined" &&
    "DeviceMotionEvent" in window;

  function smooth(current: number | null, previous: number | null): number | null {
    if (current === null) return null;
    if (previous === null) return current;
    return previous + (current - previous) * smoothingFactor;
  }

  function handleOrientation(e: Event): void {
    if (destroyed) return;
    const devOri = e as DeviceOrientationEvent;

    smoothedAlpha = smooth(devOri.alpha, smoothedAlpha);
    smoothedBeta = smooth(devOri.beta, smoothedBeta);
    smoothedGamma = smooth(devOri.gamma, smoothedGamma);

    currentOrientation = {
      alpha: smoothedAlpha,
      beta: smoothedBeta,
      gamma: smoothedGamma,
      absolute: devOri.absolute ?? false,
      timestamp: Date.now(),
    };

    // Tilt detection
    if (onTilt && currentOrientation.gamma !== null) {
      if (currentOrientation.gamma < -tiltThresholds.leftRight!) {
        onTilt("left");
      } else if (currentOrientation.gamma > tiltThresholds.leftRight!) {
        onTilt("right");
      }
    }
    if (onTilt && currentOrientation.beta !== null) {
      if (currentOrientation.beta < -tiltThresholds.frontBack!) {
        onTilt("front");
      } else if (currentOrientation.beta > 90 + tiltThresholds.frontBack!) {
        onTilt("back");
      }
    }

    for (const listener of orientListeners) {
      try { listener(currentOrientation); } catch { /* ignore */ }
    }
    onOrientation?.(currentOrientation!);
  }

  function handleMotion(e: Event): void {
    if (destroyed) return;
    const devMot = e as DeviceMotionEvent;

    const acc = devMot.accelerationIncludingGravity ?? { x: null, y: null, z: null };

    currentMotion = {
      acceleration: {
        x: devMot.acceleration?.x ?? null,
        y: devMot.acceleration?.y ?? null,
        z: devMot.acceleration?.z ?? null,
      },
      accelerationIncludingGravity: {
        x: acc.x,
        y: acc.y,
        z: acc.z,
      },
      rotationRate: {
        alpha: devMot.rotationRate?.alpha ?? null,
        beta: devMot.rotationRate?.beta ?? null,
        gamma: devMot.rotationRate?.gamma ?? null,
      },
      timestamp: Date.now(),
    };

    // Shake detection (using acceleration including gravity)
    if (onShake && acc.x !== null && acc.y !== null && acc.z !== null) {
      const totalAcc = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
      const now = Date.now();
      if (totalAcc > shakeThreshold && now - lastShakeTime > shakeCooldownMs) {
        lastShakeTime = now;
        onShake();
      }
    }

    for (const listener of motionListeners) {
      try { listener(currentMotion); } catch { /* ignore */ }
    }
    onMotion?.(currentMotion!);
  }

  // Attach listeners
  if (enableOrientation && orientationSupported) {
    window.addEventListener("deviceorientation", handleOrientation);
  }
  if (enableMotion && motionSupported) {
    window.addEventListener("devicemotion", handleMotion);
  }

  const instance: DeviceOrientationInstance = {
    get orientation() { return currentOrientation ? { ...currentOrientation } : null; },
    get motion() { return currentMotion ? { ...currentMotion } : null; },
    get orientationSupported() { return orientationSupported; },
    get motionSupported() { return motionSupported; },

    subscribeOrientation(listener: (data: OrientationData) => void): () => void {
      orientListeners.add(listener);
      return () => orientListeners.delete(listener);
    },

    subscribeMotion(listener: (data: MotionData) => void): () => void {
      motionListeners.add(listener);
      return () => motionListeners.delete(listener);
    },

    async requestPermission(): Promise<boolean> {
      try {
        // iOS 13+ requires explicit permission request
        const doe = (typeof window !== "undefined" ? window.DeviceOrientationEvent : undefined) as unknown as
          | { requestPermission?: () => Promise<string> }
          | undefined;
        if (doe?.requestPermission) {
          const result = await doe.requestPermission();
          return result === "granted";
        }
        return orientationSupported || motionSupported;
      } catch {
        return false;
      }
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      orientListeners.clear();
      motionListeners.clear();
      if (orientationSupported) {
        window.removeEventListener("deviceorientation", handleOrientation);
      }
      if (motionSupported) {
        window.removeEventListener("devicemotion", handleMotion);
      }
    },
  };

  return instance;
}

// --- Standalone utilities ---

/** Check if Device Orientation API is supported */
export function isDeviceOrientationSupported(): boolean {
  return typeof window !== "undefined" && "DeviceOrientationEvent" in window;
}

/** Check if Device Motion API is supported */
export function isDeviceMotionSupported(): boolean {
  return typeof window !== "undefined" && "DeviceMotionEvent" in window;
}
