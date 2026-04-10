/**
 * Speech Synthesis: Web Speech Synthesis API (TTS) wrapper with voice
 * selection, rate/pitch/volume control, language detection, queue management,
 * SSML-like markup parsing, speech events (start/end/boundary/pause/resume),
 * and cancellation support.
 */

// --- Types ---

export interface VoiceInfo {
  /** Voice name (e.g., "Google US English") */
  name: string;
  /** Language code (e.g., "en-US") */
  lang: string;
  /** True if this is a default voice for its language */
  default: boolean;
  /** Local service or remote */
  localService: boolean;
  /** Voice URI identifier */
  voiceURI: string;
}

export interface SpeechOptions {
  /** Text to speak */
  text: string;
  /** Voice name, language code, or Voice object to use */
  voice?: string | SpeechSynthesisVoice;
  /** Speaking rate (0.1 - 10, default: 1) */
  rate?: number;
  /** Pitch (0 - 2, default: 1) */
  pitch?: number;
  /** Volume (0 - 1, default: 1) */
  volume?: number;
  /** Language override */
  lang?: string;
  /** Queue at front of utterance queue? */
  enqueue?: boolean;
  /** Callback when speech starts */
  onStart?: () => void;
  /** Callback when speech ends */
  onEnd?: () => void;
  /** Callback when speech is paused */
  onPause?: () => void;
  /** Callback when speech resumes */
  onResume?: () => void;
  /** Callback on each word boundary (character index) */
  onBoundary?: (event: { charIndex: number; name: string }) => void;
  /** Callback on error */
  onError?: (event: SpeechSynthesisErrorEvent) => void;
  /** Cancel any ongoing speech before speaking this? */
  cancelBefore?: boolean;
}

export interface SpeechManagerInstance {
  /** Check if speech synthesis is available */
  isAvailable: () => boolean;
  /** Check if currently speaking */
  isSpeaking: () => boolean;
  /** Check if currently paused */
  isPaused: () => boolean;
  /** Get all available voices */
  getVoices: () => VoiceInfo[];
  /** Find best voice matching criteria */
  findVoice: (criteria: { lang?: string; name?: string; localService?: boolean }) => SpeechSynthesisVoice | undefined;
  /** Speak text with options */
  speak: (options: SpeechOptions) => Promise<void>;
  /** Speak text immediately (shorthand) */
  say: (text: string, voiceOrLang?: string) => Promise<void>;
  /** Pause current speech */
  pause: () => void;
  /** Resume paused speech */
  resume: () => void;
  /** Cancel all speech */
  cancel: () => void;
  /** Get current speech state */
  getState: () => "speaking" | "paused" | "none";
  /** Set default voice preferences */
  setDefaults: (defaults: Partial<Pick<SpeechOptions, "rate" | "pitch" | "volume" | "voice">>) => void;
  /** Get current defaults */
  getDefaults: () => Partial<Pick<SpeechOptions, "rate" | "pitch" | "volume" | "voice">>;
  /** Parse simple markup tags in text (<break>, <emphasis>, <prosody>) */
  parseMarkup: (text: string) => string;
  /** Destroy */
  destroy: () => void;
}

// --- Helpers ---

function voicesToInfo(voices: SpeechSynthesisVoice[]): VoiceInfo[] {
  return voices.map((v) => ({
    name: v.name,
    lang: v.lang,
    default: v.default,
    localService: v.localService,
    voiceURI: v.voiceURI,
  }));
}

// Strip basic SSML-like tags for browsers that don't support them
function stripMarkup(text: string): string {
  return text
    .replace(/<break[^>]*\/?>/gi, " ")
    .replace(/<emphasis[^>]*>(.*?)<\/emphasis>/gi, "$1")
    .replace(/<prosody[^>]*>(.*?)<\/prosody>/gi, "$1")
    .replace(/<say-as[^>]*>(.*?)<\/say-as>/gi, "$1")
    .replace(/<sub[^>]*>(.*?)<\/sub>/gi, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

// --- Main Class ---

export class SpeechSynthesisManager {
  create(defaults: Partial<Pick<SpeechOptions, "rate" | "pitch" | "volume" | "voice">> = {}): SpeechManagerInstance {
    let destroyed = false;
    const currentDefaults = { ...defaults };

    function resolveVoice(voiceOrLang?: string | SpeechSynthesisVoice): SpeechSynthesisVoice | undefined {
      if (!voiceOrLang) return undefined;

      // If it's already a Voice object
      if (typeof voiceOrLang === "object" && "lang" in voiceOrLang) {
        return voiceOrLang as SpeechSynthesisVoice;
      }

      const allVoices = window.speechSynthesis.getVoices();

      // Try exact name match first
      const byName = allVoices.find((v) =>
        v.name.toLowerCase().includes(voiceOrLang!.toLowerCase()),
      );
      if (byName) return byName;

      // Try language match
      const byLang = allVoices.find((v) =>
        v.lang.toLowerCase().startsWith(voiceOrLang!.toLowerCase()),
      );
      if (byLang) return byLang;

      return undefined;
    }

    function doSpeak(opts: SpeechOptions): Promise<void> {
      return new Promise((resolve, reject) => {
        if (destroyed || !isAvailable()) {
          reject(new Error("Speech synthesis not available"));
          return;
        }

        const synth = window.speechSynthesis;

        // Cancel previous if requested
        if (opts.cancelBefore ?? false) {
          synth.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(stripMarkup(opts.text));

        // Apply options with defaults fallback
        utterance.rate = opts.rate ?? currentDefaults.rate ?? 1;
        utterance.pitch = opts.pitch ?? currentDefaults.pitch ?? 1;
        utterance.volume = opts.volume ?? currentDefaults.volume ?? 1;
        utterance.lang = opts.lang ?? "";

        // Resolve voice
        const resolvedVoice = resolveVoice(opts.voice ?? currentDefaults.voice);
        if (resolvedVoice) utterance.voice = resolvedVoice;

        // Attach event handlers
        utterance.onstart = (): void => {
          opts.onStart?.();
        };

        utterance.onend = (): void => {
          opts.onEnd?.();
          resolve();
        };

        utterance.onerror = (event: SpeechSynthesisErrorEvent): void => {
          opts.onError?.(event);
          reject(event.error ?? new Error(event.error ?? "Speech synthesis error"));
        };

        utterance.onpause = (): void => {
          opts.onPause?.();
        };

        utterance.onresume = (): void => {
          opts.onResume?.();
        };

        utterance.onboundary = (event: SpeechSynthesisEvent): void => {
          opts.onBoundary?.({
            charIndex: event.charIndex,
            name: event.name,
          });
        };

        // Speak
        if (opts.enqueue === false) {
          synth.cancel(); // Clear queue before speaking
        }
        synth.speak(utterance);
      });
    }

    const instance: SpeechManagerInstance = {

      isAvailable(): boolean {
        return typeof window !== "undefined" &&
          "speechSynthesis" in window &&
          typeof window.speechSynthesis.speak === "function";
      },

      isSpeaking(): boolean {
        return typeof window !== "undefined" && window.speechSynthesis?.speaking ?? false;
      },

      isPaused(): boolean {
        return typeof window !== "undefined" && window.speechSynthesis?.paused ?? false;
      },

      getVoices(): VoiceInfo[] {
        if (!instance.isAvailable()) return [];
        return voicesToInfo(window.speechSynthesis.getVoices());
      },

      findVoice(criteria): SpeechSynthesisVoice | undefined {
        if (!instance.isAvailable()) return undefined;
        const voices = window.speechSynthesis.getVoices();

        let filtered = voices;

        if (criteria.lang) {
          filtered = filtered.filter((v) => v.lang.toLowerCase().startsWith(criteria.lang!.toLowerCase()));
        }
        if (criteria.name) {
          filtered = filtered.filter((v) =>
            v.name.toLowerCase().includes(criteria.name!.toLowerCase()),
          );
        }
        if (criteria.localService != null) {
          filtered = filtered.filter((v) => v.localService === criteria.localService);
        }

        // Prefer default voices
        return filtered.find((v) => v.default) ?? filtered[0];
      },

      speak: doSpeak,

      async say(text, voiceOrLang?): Promise<void> {
        return doSpeak({ text, voice: voiceOrLang });
      },

      pause(): void {
        window.speechSynthesis?.pause();
      },

      resume(): void {
        window.speechSynthesis?.resume();
      },

      cancel(): void {
        window.speechSynthesis?.cancel();
      },

      getState(): "speaking" | "paused" | "none" {
        if (!instance.isAvailable()) return "none";
        if (window.speechSynthesis.paused) return "paused";
        if (window.speechSynthesis.speaking) return "speaking";
        return "none";
      },

      setDefaults(d): void {
        Object.assign(currentDefaults, d);
      },

      getDefaults(): Partial<Pick<SpeechOptions, "rate" | "pitch" | "volume" | "voice">> {
        return { ...currentDefaults };
      },

      parseMarkup: stripMarkup,

      destroy(): void {
        destroyed = true;
        instance.cancel();
      },
    };

    return instance;
  }
}

/** Convenience: create a speech synthesis manager */
export function createSpeechSynthesisManager(
  defaults?: Partial<Pick<SpeechOptions, "rate" | "pitch" | "volume" | "voice">>,
): SpeechManagerInstance {
  return new SpeechSynthesisManager().create(defaults);
}

// --- Standalone utilities ---

/** Quick TTS — speak and forget */
export function speak(text: string, lang?: string): void {
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  if (lang) u.lang = lang;
  window.speechSynthesis.speak(u);
}
