/**
 * Vibration API: Haptic feedback control with pattern presets, custom
 * sequences, intensity simulation (via pattern density), cancellation,
 * compatibility detection, and cross-platform abstraction.
 */

// --- Types ---

export type VibrationPreset =
  | "tap"
  | "double-tap"
  | "triple-tap"
  | "success"
  | "error"
  | "warning"
  | "heavy"
  | "light"
  | "notification"
  | "ring"
  | "heartbeat"
  | "morse";

export interface VibrationPattern {
  /** Pattern: alternating durations in ms (vibrate, pause, vibrate, pause, ...) */
  pattern: number[];
  /** Human-readable name */
  name?: string;
}

export interface VibrationManagerOptions {
  /** Default intensity multiplier (0-2, default: 1) */
  intensity?: number;
  /** Callback when vibration is not supported */
  onUnsupported?: () => void;
  /** Log vibration calls for debugging? */
  debug?: boolean;
}

export interface VibrationManagerInstance {
  /** Check if vibration API is available */
  isAvailable: () => boolean;
  /** Vibrate with a preset pattern */
  vibrate: (presetOrPattern: VibrationPreset | number[], options?: { intensity?: number }) => void;
  /** Vibrate for a single duration (ms) */
  pulse: (duration: number) => void;
  /** Play a named preset */
  playPreset: (preset: VibrationPreset) => void;
  /** Play a custom pattern */
  playPattern: (pattern: number[]) => void;
  /** Cancel any ongoing vibration */
  cancel: () => void;
  /** Create a Morse code vibration from text */
  morse: (text: string) => void;
  /** Get list of available presets */
  getPresets: () => Record<VibrationPreset, VibrationPattern>;
  /** Register a custom preset */
  registerPreset: (name: string, pattern: VibrationPattern) => void;
  /** Destroy */
  destroy: () => void;
}

// --- Preset patterns ---

const PRESETS: Record<string, VibrationPattern> = {
  "tap":           { pattern: [15],                    name: "Tap" },
  "double-tap":    { pattern: [15, 50, 15],             name: "Double Tap" },
  "triple-tap":    { pattern: [15, 50, 15, 50, 15],     name: "Triple Tap" },
  "success":       { pattern: [50, 50, 100],             name: "Success" },
  "error":         { pattern: [100, 50, 100, 50, 100],   name: "Error" },
  "warning":       { pattern: [100, 80, 100],            name: "Warning" },
  "heavy":         { pattern: [200],                     name: "Heavy" },
  "light":         { pattern: [10],                      name: "Light" },
  "notification":  { pattern: [30, 100, 30, 100, 30],    name: "Notification" },
  "ring":          { pattern: [500, 200, 500, 200, 500], name: "Ring" },
  "heartbeat":     { pattern: [30, 150, 80, 300],        name: "Heartbeat" },
};

// --- Morse code mapping ---

const MORSE_CODE: Record<string, string> = {
  "a": ".-",   "b": "-...", "c": "-.-.", "d": "-..",  "e": ".",
  "f": "..-.", "g": "--.",  "h": "....", "i": "..",   "j": ".---",
  "k": "-.-",  "l": ".-..", "m": "--",   "n": "-.",   "o": "---",
  "p": ".--.", "q": "--.-", "r": ".-.",  "s": "...",  "t": "-",
  "u": "..-",  "v": "...-", "w": ".--",  "x": "-..-", "y": "-.--",
  "z": "--..",
  "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-",
  "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.",
  " ": "/",  ".": ".-.-.-", ",": "--..--", "?": "..--..", "!": "-.-.--",
};

// --- Helpers ---

function applyIntensity(pattern: number[], intensity: number): number[] {
  if (intensity === 1) return pattern;

  // Scale vibration durations by intensity
  // Higher intensity = longer vibrations + shorter pauses = feels stronger
  return pattern.map((val, i) => {
    if (i % 2 === 0) {
      // Vibration duration — scale up with intensity
      return Math.round(val * Math.max(0.3, intensity));
    } else {
      // Pause duration — scale down with intensity
      return Math.round(val * Math.max(0.3, 2 - intensity));
    }
  });
}

function textToMorsePattern(text: string): number[] {
  const DOT = 60;   // ms for dot
  const DASH = 200; // ms for dash
  const GAP = 60;   // ms between parts of same letter
  const LETTER_GAP = 180; // ms between letters

  const result: number[] = [];
  let first = true;

  for (const char of text.toLowerCase()) {
    const code = MORSE_CODE[char];
    if (!code) continue;

    if (!first) result.push(LETTER_GAP);
    first = false;

    if (char === " ") continue; // Word gap handled above

    for (let i = 0; i < code.length; i++) {
      if (i > 0) result.push(GAP);
      result.push(code[i] === "." ? DOT : DASH);
    }
  }

  return result.length > 0 ? result : [DOT];
}

// --- Main Class ---

export class VibrationManager {
  create(options: VibrationManagerOptions = {}): VibrationManagerInstance {
    let destroyed = false;
    const defaultIntensity = options.intensity ?? 1;
    const debug = options.debug ?? false;
    const customPresets = new Map<string, VibrationPattern>();

    function doVibrate(pattern: number[], intensity?: number): void {
      if (destroyed) return;

      const nav = navigator as unknown as { vibrate?: (pattern: number[] | number) => boolean };
      if (!nav?.vibrate) {
        options.onUnsupported?.();
        return;
      }

      const finalIntensity = intensity ?? defaultIntensity;
      const adjusted = applyIntensity(pattern, finalIntensity);

      try {
        nav.vibrate(adjusted);
        if (debug) console.log(`[Vibration] Pattern: [${adjusted.join(", ")}]`);
      } catch (err) {
        if (debug) console.warn("[Vibration] Failed:", err);
      }
    }

    const instance: VibrationManagerInstance = {

      isAvailable(): boolean {
        const nav = navigator as unknown as { vibrate?: (pattern: number[] | number) => boolean };
        return typeof navigator !== "undefined" && !!nav?.vibrate;
      },

      vibrate(presetOrPattern, opts): void {
        if (Array.isArray(presetOrPattern)) {
          doVibrate(presetOrPattern, opts?.intensity);
        } else {
          const preset = PRESETS[presetOrPattern] ?? customPresets.get(presetOrPattern);
          if (preset) {
            doVibrate(preset.pattern, opts?.intensity);
          } else if (debug) {
            console.warn(`[Vibration] Unknown preset: "${presetOrPattern}"`);
          }
        }
      },

      pulse(duration): void {
        doVibrate([Math.max(1, duration)]);
      },

      playPreset(preset): void {
        instance.vibrate(preset);
      },

      playPattern(pattern): void {
        doVibrate(pattern);
      },

      cancel(): void {
        const nav = navigator as unknown as { vibrate?: (pattern: number[]) => boolean };
        nav?.vibrate?.(0);
      },

      morse(text): void {
        const pattern = textToMorsePattern(text);
        doVibrate(pattern);
      },

      getPresets(): Record<string, VibrationPattern> {
        return { ...PRESETS, ...Object.fromEntries(customPresets) };
      },

      registerPreset(name, pattern): void {
        customPresets.set(name, pattern);
      },

      destroy(): void {
        destroyed = true;
        instance.cancel();
        customPresets.clear();
      },
    };

    return instance;
  }
}

/** Convenience: create a vibration manager */
export function createVibrationManager(options?: VibrationManagerOptions): VibrationManagerInstance {
  return new VibrationManager().create(options);
}

// --- Standalone utilities ---

/** Quick single vibration pulse */
export function vibrate(ms: number): void {
  const nav = navigator as unknown as { vibrate?: (pattern: number[] | number) => boolean };
  nav?.vibrate?.(ms);
}

/** Quick vibration with a preset */
export function vibratePreset(preset: VibrationPreset): void {
  const p = PRESETS[preset];
  if (!p) return;
  const nav = navigator as unknown as { vibrate?: (pattern: number[] | number) => boolean };
  nav?.vibrate?.(p.pattern);
}

/** Cancel all ongoing vibrations */
export function cancelVibration(): void {
  const nav = navigator as unknown as { vibrate?: (pattern: number[]) => boolean };
  nav?.vibrate?.(0);
}
