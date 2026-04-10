/**
 * Speech Recognition: Web Speech Recognition API wrapper for voice input
 * with continuous/one-shot modes, interim/final results, confidence scoring,
 * language selection, grammar/command support, audio level visualization,
 * and cross-browser compatibility handling.
 */

// --- Types ---

export interface RecognitionResult {
  /** The recognized text */
  transcript: string;
  /** Confidence score (0-1) — may be 0 for some engines */
  confidence: number;
  /** Whether this is an interim (provisional) result */
  isFinal: boolean;
  /** Timestamp of when this result was received */
  timestamp: number;
}

export interface RecognitionOptions {
  /** Language code (default: browser locale or "en-US") */
  language?: string;
  /** Continuous listening mode? (default: false = one-shot) */
  continuous?: boolean;
  /** Return interim (provisional) results? (default: true for continuous) */
  interimResults?: boolean;
  /** Max number of alternatives per result (default: 1) */
  maxAlternatives?: number;
  /** Speech recognition service URI (for custom providers) */
  grammars?: SpeechGrammarList;
  /** Callback when a result is received */
  onResult?: (result: RecognitionResult) => void;
  /** Callback with all final results when speech ends */
  onEnd?: (results: RecognitionResult[]) => void;
  /** Callback when recognition starts */
  onStart?: () => void;
  /** Callback when recognition ends (user stops speaking or error) */
  onSpeechEnd?: () => void;
  /** Callback on error */
  onError?: (error: { message: string; error: string }) => void;
  /** Callback on each audio level update (for visualization) */
  onAudioLevel?: (level: number) => void;
  /** Callback when sound starts being detected */
  onSoundStart?: () => void;
  /** Callback when sound stops */
  onSoundEnd?: () => void;
  /** Auto-restart after end (for continuous mode) */
  autoRestart?: boolean;
  /** Stop after silence duration in ms (0 = no auto-stop) */
  silenceTimeout?: number;
}

export interface SpeechRecognitionInstance {
  /** Check if speech recognition is available */
  isAvailable: () => boolean;
  /** Start listening */
  start: () => void;
  /** Stop listening (finalize current utterance) */
  stop: () => void;
  /** Abort listening immediately (discard results) */
  abort: () => void;
  /** Check if currently listening */
  isListening: () => boolean;
  /** Get all accumulated results */
  getResults: () => RecognitionResult[];
  /** Get the final transcript (concatenated final results) */
  getTranscript: () => string;
  /** Set language */
  setLanguage: (lang: string) => void;
  /** Get current language */
  getLanguage: () => string;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Helpers ---

// Get the SpeechRecognition constructor (cross-browser)
function getSpeechRecognitionCtor(): typeof SpeechRecognition | null {
  const w = window as unknown as Record<string, unknown>;
  return (
    w.SpeechRecognition ??
    w.webkitSpeechRecognition ??
    null
  ) as typeof SpeechRecognition | null;
}

// --- Main Class ---

export class SpeechRecognitionManager {
  create(options: RecognitionOptions = {}): SpeechRecognitionInstance {
    let destroyed = false;

    // State
    let listening = false;
    const allResults: RecognitionResult[] = [];
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;

    // Resolve constructor
    const Ctor = getSpeechRecognitionCtor();

    // Create recognition instance
    let recognition: SpeechRecognition | null = null;
    if (Ctor) {
      try {
        recognition = new Ctor();
        setupRecognition(recognition);
      } catch {
        // May fail in insecure contexts
      }
    }

    function setupRecognition(rec: SpeechRecognition): void {
      rec.lang = options.language ?? navigator.language ?? "en-US";
      rec.continuous = options.continuous ?? false;
      rec.interimResults = options.interimResults ?? (options.continuous ?? false);
      rec.maxAlternatives = options.maxAlternatives ?? 1;

      if (options.grammars) {
        rec.grammars = options.grammars;
      }

      // Result event
      rec.onresult = (event: SpeechRecognitionEvent): void => {
        if (destroyed) return;

        // Reset silence timer
        resetSilenceTimer();

        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const alt = result[0];

          if (!alt) continue;

          const recognitionResult: RecognitionResult = {
            transcript: alt.transcript,
            confidence: alt.confidence,
            isFinal: result.isFinal,
            timestamp: Date.now(),
          };

          if (result.isFinal) {
            finalTranscript += alt.transcript;
            allResults.push(recognitionResult);
          } else {
            interimTranscript += alt.transcript;
          }

          options.onResult?.(recognitionResult);
        }

        // Audio level callback
        // Note: Some browsers don't support onaudiolevel
      };

      // Start event
      rec.onstart = (): void => {
        if (destroyed) return;
        listening = true;
        options.onStart?.();
      };

      // End event
      rec.onend = (): void => {
        if (destroyed) return;
        listening = false;
        clearTimeoutSilenceTimer();
        options.onSpeechEnd?.();
        options.onEnd?.([...allResults]);

        // Auto-restart for continuous mode
        if (options.autoRestart && !destroyed) {
          try {
            // Small delay before restarting
            setTimeout(() => {
              if (!destroyed && recognition) {
                try { recognition.start(); } catch { /* already started */ }
              }
            }, 100);
          } catch { /* ignore */ }
        }
      };

      // Error event
      rec.onerror = (event: SpeechRecognitionErrorEvent): void => {
        if (destroyed) return;
        listening = false;
        clearTimeoutSilenceTimer();

        const errorInfo = { message: event.message, error: event.error };
        options.onError?.(errorInfo);

        // "no-speech" is not really an error
        if (event.error !== "no-speech" && event.error !== "aborted") {
          console.warn(`[SpeechRecognition] Error: ${event.error}: ${event.message}`);
        }
      };

      // Sound events (Chrome-specific)
      (rec as unknown as { onsoundstart?: () => void }).onsoundstart = (): void => {
        options.onSoundStart?.();
      };

      (rec as unknown as { onsoundend?: () => void }).onsoundend = (): void => {
        options.onSoundEnd?.();
      };

      // Audio level (Firefox-specific, may not work everywhere)
      (rec as unknown as { onaudiolevel?: (ev: Event) => void }).onaudiolevel = (ev: Event): void => {
        // Firefox provides this; value is 0-1
        const level = (ev as unknown as { level: number }).level ?? 0;
        options.onAudioLevel?.(level);
      };
    }

    function resetSilenceTimer(): void {
      if (options.silenceTimeout && options.silenceTimeout > 0) {
        clearTimeoutSilenceTimer();
        silenceTimer = setTimeout(() => {
          if (listening) {
            instance.stop();
          }
        }, options.silenceTimeout);
      }
    }

    function clearTimeoutSilenceTimer(): void {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
    }

    const instance: SpeechRecognitionInstance = {

      isAvailable(): boolean {
        return Ctor !== null;
      },

      start(): void {
        if (destroyed || !recognition || listening) return;

        // Clear previous results for new session
        allResults.length = 0;

        try {
          recognition.start();
        } catch (err) {
          options.onError?.({
            message: err instanceof Error ? err.message : String(err),
            error: "start-failed",
          });
        }
      },

      stop(): void {
        if (!recognition || !listening) return;
        try {
          recognition.stop();
        } catch { /* may already be stopped */ }
      },

      abort(): void {
        if (!recognition) return;
        try {
          recognition.abort();
        } catch { /* ignore */ }
        listening = false;
      },

      isListening(): boolean {
        return listening;
      },

      getResults(): RecognitionResult[] {
        return [...allResults];
      },

      getTranscript(): string {
        return allResults
          .filter((r) => r.isFinal)
          .map((r) => r.transcript)
          .join(" ");
      },

      setLanguage(lang: string): void {
        if (recognition) recognition.lang = lang;
      },

      getLanguage(): string {
        return recognition?.lang ?? options.language ?? "en-US";
      },

      destroy(): void {
        if (destroyed) return;
        destroyed = true;
        instance.abort();
        allResults.length = 0;
        recognition = null;
      },
    };

    return instance;
  }
}

/** Convenience: create a speech recognition manager */
export function createSpeechRecognition(options?: RecognitionOptions): SpeechRecognitionInstance {
  return new SpeechRecognitionManager().create(options);
}

// --- Standalone utilities ---

/** Quick one-shot speech recognition — returns a promise with the recognized text */
export function recognizeOnce(
  language?: string,
  options?: Partial<Omit<RecognitionOptions, "onResult" | "onEnd" | "continuous">>,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      reject(new Error("Speech recognition not supported"));
      return;
    }

    const manager = createSpeechRecognition({
      ...options,
      language,
      continuous: false,
      interimResults: false,
      onEnd(results) {
        const text = results.filter((r) => r.isFinal).map((r) => r.transcript).join(" ");
        resolve(text || "");
        manager.destroy();
      },
      onError(err) {
        reject(new Error(err.message));
        manager.destroy();
      },
    });

    manager.start();
  });
}
