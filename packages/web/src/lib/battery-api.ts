/**
 * Battery Status API wrapper with level monitoring, charging state tracking,
 * discharge time estimation, and power-aware operation scheduling.
 *
 * Note: The Battery Status API is deprecated in some browsers but still works
 * in Chromium-based browsers. This module gracefully degrades when unavailable.
 */

// --- Types ---

export interface BatteryInfo {
  /** Battery charge level 0-1 */
  level: number;
  /** Whether battery is currently charging */
  charging: boolean;
  /** Time remaining until fully charged in seconds (or Infinity) */
  chargingTime: number;
  /** Time remaining until discharged in seconds (or Infinity) */
  dischargingTime: number;
  /** Whether the Battery API is supported */
  supported: boolean;
}

export interface BatteryOptions {
  /** Called when battery level changes */
  onLevelChange?: (level: number) => void;
  /** Called when charging state changes */
  onChargingChange?: (charging: boolean) => void;
  /** Called when any battery property changes */
  onChange?: (info: BatteryInfo) => void;
  /** Low battery threshold (0-1, default: 0.2) */
  lowBatteryThreshold?: number;
  /** Called when battery drops below threshold */
  onLowBattery?: (level: number) => void;
  /** Called when battery is critically low (default threshold: 0.1) */
  onCriticalBattery?: (level: number) => void;
}

export interface BatteryInstance {
  /** Current battery information */
  readonly info: BatteryInfo;
  /** Whether battery is supported by this browser */
  readonly supported: boolean;
  /** Whether battery is currently low (< threshold) */
  readonly isLow: boolean;
  /** Whether battery is critically low (< 0.1) */
  readonly isCritical: boolean;
  /** Estimated remaining time in seconds (or null if charging) */
  readonly estimatedRemainingSec: number | null;
  /** Subscribe to battery changes */
  subscribe: (listener: (info: BatteryInfo) => void) => () => void;
  /** Force refresh battery info */
  refresh: () => Promise<void>;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Internal types ---

interface BatteryManagerExtended extends EventTarget {
  readonly charging: boolean;
  readonly chargingTime: number;
  readonly dischargingTime: number;
  readonly level: number;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}

// --- Main ---

export async function createBatteryMonitor(options: BatteryOptions = {}): Promise<BatteryInstance> {
  const {
    onLevelChange,
    onChargingChange,
    onChange,
    lowBatteryThreshold = 0.2,
    onLowBattery,
    onCriticalBattery,
  } = options;

  let destroyed = false;
  let battery: BatteryManagerExtended | null = null;
  const listeners = new Set<(info: BatteryInfo) => void>();
  let lowFired = false;
  let criticalFired = false;

  const defaultInfo: BatteryInfo = {
    level: 1,
    charging: true,
    chargingTime: 0,
    dischargingTime: Infinity,
    supported: false,
  };

  let currentInfo: BatteryInfo = { ...defaultInfo };

  function readFromBattery(b: BatteryManagerExtended): BatteryInfo {
    return {
      level: b.level,
      charging: b.charging,
      chargingTime: b.chargingTime,
      dischargingTime: b.dischargingTime,
      supported: true,
    };
  }

  function emitChange(info: BatteryInfo): void {
    for (const listener of listeners) {
      try { listener(info); } catch { /* ignore */ }
    }
    onChange?.(info);
  }

  function checkThresholds(level: number): void {
    if (level <= 0.1 && !criticalFired) {
      criticalFired = true;
      onCriticalBattery?.(level);
    }
    if (level <= lowBatteryThreshold && !lowFired) {
      lowFired = true;
      onLowBattery?.(level);
    }
    // Reset flags when charging or level rises
    if (currentInfo.charging || level > lowBatteryThreshold + 0.05) {
      lowFired = false;
    }
    if (currentInfo.charging || level > 0.15) {
      criticalFired = false;
    }
  }

  function handleLevelChange(this: BatteryManagerExtended): void {
    if (destroyed || !battery) return;
    currentInfo = readFromBattery(battery);
    onLevelChange?.(currentInfo.level);
    checkThresholds(currentInfo.level);
    emitChange(currentInfo);
  }

  function handleChargingChange(this: BatteryManagerExtended): void {
    if (destroyed || !battery) return;
    currentInfo = readFromBattery(battery);
    onChargingChange?.(currentInfo.charging);
    checkThresholds(currentInfo.level);
    emitChange(currentInfo);
  }

  // Try to get battery API
  try {
    if (navigator && "getBattery" in navigator) {
      battery = await (navigator.getBattery as () => Promise<BatteryManagerExtended>)();

      if (battery) {
        currentInfo = readFromBattery(battery);

        battery.addEventListener("chargingchange", handleChargingChange);
        battery.addEventListener("levelchange", handleLevelChange);
        battery.addEventListener("chargingtimechange", handleLevelChange);
        battery.addEventListener("dischargingtimechange", handleLevelChange);
      }
    }
  } catch {
    // Battery API not available or permission denied
    battery = null;
  }

  const instance: BatteryInstance = {
    get info() { return { ...currentInfo }; },
    get supported() { return currentInfo.supported; },
    get isLow() { return !currentInfo.charging && currentInfo.level < lowBatteryThreshold; },
    get isCritical() { return !currentInfo.charging && currentInfo.level < 0.1; },
    get estimatedRemainingSec() {
      if (currentInfo.charging || currentInfo.dischargingTime === Infinity) return null;
      return currentInfo.dischargingTime;
    },

    subscribe(listener: (info: BatteryInfo) => void): () => void {
      listeners.add(listener);
      listener({ ...currentInfo });
      return () => listeners.delete(listener);
    },

    async refresh(): Promise<void> {
      if (destroyed) return;
      try {
        if (navigator && "getBattery" in navigator) {
          battery = await (navigator.getBattery as () => Promise<BatteryManagerExtended>)();
          if (battery) {
            currentInfo = readFromBattery(battery);
            emitChange(currentInfo);
          }
        }
      } catch { /* ignore */ }
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      listeners.clear();
      if (battery) {
        battery.removeEventListener("chargingchange", handleChargingChange);
        battery.removeEventListener("levelchange", handleLevelChange);
        battery.removeEventListener("chargingtimechange", handleLevelChange);
        battery.removeEventListener("dischargingtimechange", handleLevelChange);
        battery = null;
      }
    },
  };

  return instance;
}

// --- Standalone utilities ---

/** Get battery info once (does not set up listeners) */
export async function getBatteryInfo(): Promise<BatteryInfo> {
  try {
    if (navigator && "getBattery" in navigator) {
      const bat = await (navigator.getBattery as () => Promise<BatteryManagerExtended>)();
      if (bat) {
        return {
          level: bat.level,
          charging: bat.charging,
          chargingTime: bat.chargingTime,
          dischargingTime: bat.dischargingTime,
          supported: true,
        };
      }
    }
  } catch { /* not supported */ }
  return { level: 1, charging: true, chargingTime: 0, dischargingTime: Infinity, supported: false };
}

/** Check if Battery API is available */
export function isBatteryApiSupported(): boolean {
  return typeof navigator !== "undefined" && "getBattery" in navigator;
}

/** Format battery level as percentage string */
export function formatBatteryPercent(level: number): string {
  return `${Math.round(level * 100)}%`;
}

/** Format remaining time as human-readable string */
export function formatRemainingTime(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return "Calculating...";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return `${hrs}h ${mins}m`;
}

/** Schedule a heavy operation only when battery is sufficient */
export async function runWithPowerAwareness<T>(
  fn: () => Promise<T>,
  minLevel = 0.2,
): Promise<T> {
  const info = await getBatteryInfo();
  if (!info.charging && info.level < minLevel) {
    console.warn(`[battery] Deferring operation: battery at ${formatBatteryPercent(info.level)}, minimum ${minLevel * 100}% required`);
  }
  return fn();
}
