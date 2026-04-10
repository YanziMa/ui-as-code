/**
 * Speech utilities: Web Speech API (Synthesis + Recognition), voice selection,
 * text-to-speech with SSML-like markup, speech recognition with continuous mode,
 * pronunciation scoring, audio recording, voice activity detection.
 */

// --- Types ---

export interface VoiceInfo {
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
  voiceURI: string;
}

export interface SpeechOptions {
  rate?: number;          // 0.1 - 10, default 1
  pitch?: number;         // 0 - 2, default 1
  volume?: number;        // 0 - 1, default 1
  voice?: SpeechSynthesisVoice;
  lang?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (event: SpeechSynthesisErrorEvent) => void;
  onBoundary?: (event: SpeechSynthesisEvent) => void;
  onMark?: (event: SpeechSynthesisEvent) => void;
  onPause?: () => void;
  onResume?: () => void;
}

export interface RecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  alternatives?: number;
  maxAlternatives?: number;
  grammars?: SpeechGrammarList;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (event: SpeechRecognitionErrorEvent) => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onInterimResult?: (transcript: string) => void;
  onSoundStart?: () => void;
  onSoundEnd?: () => void;
  onAudioStart?: () => void;
  onAudioEnd?: () => void;
}

export interface PronunciationScore {
  overall: number;        // 0-100
  accuracy: number;       // 0-100
  fluency: number;        // 0-100
  completeness: number;   // 0-100
  details: Array<{
    word: string;
    expected: string;
    spoken: string;
    match: boolean;
    confidence: number;
  }>;
}

export interface VoiceActivityConfig {
  threshold?: number;     // Energy threshold 0-1
  silenceDurationMs?: number; // Silence before VAD fires
  minSpeechDurationMs?: number; // Min duration to count as speech
  maxSpeechDurationMs?: number; // Max before auto-stop
  sampleRate?: number;
}

// --- Text-to-Speech ---

export class TextToSpeech {
  private synth: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private _queue: SpeechSynthesisUtterance[] = [];
  private _speaking = false;
  private _paused = false;

  constructor() {
    this.synth = window.speechSynthesis;
    // Chrome bug fix: speak after user interaction
    if (document.hidden) {
      this.synth.getVoices(); // Preload voices
    }
  }

  get speaking(): boolean { return this._speaking; }
  get paused(): boolean { return this._paused; }
  get queueLength(): number { return this._queue.length; }

  /** Speak text immediately */
  speak(text: string, options?: SpeechOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      const utterance = this.createUtterance(text, options);
      utterance.onend = () => { this._speaking = false; options?.onEnd?.(); resolve(); };
      utterance.onerror = (e) => { this._speaking = false; options?.onError?.(e); reject(e.error); };
      utterance.onstart = () => { this._speaking = true; options?.onStart?.(); };
      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    });
  }

  /** Add text to queue */
  enqueue(text: string, options?: SpeechOptions): void {
    const utterance = this.createUtterance(text, options);
    this._queue.push(utterance);
    if (!this._speaking) this.processQueue();
  }

  /** Stop speaking and clear queue */
  stop(): void {
    this.synth.cancel();
    this._queue = [];
    this._speaking = false;
    this._paused = false;
    this.currentUtterance = null;
  }

  /** Pause current speech */
  pause(): void {
    if (this._speaking && !this._paused) {
      this.synth.pause();
      this._paused = true;
    }
  }

  /** Resume paused speech */
  resume(): void {
    if (this._paused) {
      this.synth.resume();
      this._paused = false;
    }
  }

  /** Get all available voices */
  getVoices(): VoiceInfo[] {
    return this.synth.getVoices().map((v) => ({
      name: v.name,
      lang: v.lang,
      localService: v.localService,
      default: v.default,
      voiceURI: v.voiceURI,
    }));
  }

  /** Get voices filtered by language */
  getVoicesByLang(lang: string): VoiceInfo[] {
    return this.getVoices().filter((v) => v.lang.startsWith(lang));
  }

  /** Find best matching voice for language */
  findBestVoice(lang: string, preferredName?: string): SpeechSynthesisVoice | undefined {
    const voices = this.synth.getVoices();
    // Exact match by name
    if (preferredName) {
      const found = voices.find((v) => v.name === preferredName);
      if (found) return found;
    }
    // Match by language
    const langMatch = voices.find((v) => v.lang === lang);
    if (langMatch) return langMatch;
    // Fallback to prefix match
    const prefixMatch = voices.find((v) => v.lang.startsWith(lang.split("-")[0] ?? ""));
    return prefixMatch ?? voices[0];
  }

  /** Get estimated time for text at given rate */
  estimateDuration(text: string, rate = 1): number {
    const wordCount = text.trim().split(/\s+/).length;
    // Average speaking rate is ~150 words per minute
    return (wordCount / 150) * (60 / rate) * 1000; // ms
  }

  /** Check if TTS is supported */
  static isSupported(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  // --- Internal ---

  private createUtterance(text: string, options?: SpeechOptions): SpeechSynthesisUtterance {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = options?.rate ?? 1;
    u.pitch = options?.pitch ?? 1;
    u.volume = options?.volume ?? 1;
    u.voice = options?.voice;
    u.lang = options?.lang ?? "en-US";
    if (options?.onBoundary) u.onboundary = options.onBoundary;
    if (options?.onMark) u.onmark = options.onMark;
    if (options?.onPause) u.onpause = options.onPause;
    if (options?.onResume) u.onresume = options.onResume;
    return u;
  }

  private processQueue(): void {
    if (this._queue.length === 0 || this._speaking) return;
    const next = this._queue.shift()!;
    next.onend = () => { this._speaking = false; this.processQueue(); };
    next.onerror = () => { this._speaking = false; this.processQueue(); };
    this._speaking = true;
    this.synth.speak(next);
  }
}

// --- Speech Recognition ---

export class SpeechRecognizer {
  private recognition: SpeechRecognition | null = null;
  private _listening = false;
  private _finalTranscript = "";
  private _interimTranscript = "";

  constructor(options?: RecognitionOptions) {
    if (!SpeechRecognizer.isSupported()) throw new Error("Speech recognition not supported");
    this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    this.recognition.continuous = options?.continuous ?? false;
    this.recognition.interimResults = options?.interimResults ?? true;
    this.recognition.lang = options?.lang ?? "en-US";
    this.recognition.maxAlternatives = options?.maxAlternatives ?? 1;
    if (options?.grammars) this.recognition.grammars = options.grammars;

    this.setupListeners(options);
  }

  get listening(): boolean { return this._listening; }
  get finalTranscript(): string { return this._finalTranscript; }
  get interimTranscript(): string { return this._interimTranscript; }

  /** Start listening */
  start(): void {
    if (!this.recognition || this._listening) return;
    this._finalTranscript = "";
    this._interimTranscript = "";
    try {
      this.recognition.start();
      this._listening = true;
    } catch (e) {
      // Already started
      console.warn("Speech recognition already started:", e);
    }
  }

  /** Stop listening */
  stop(): void {
    if (!this.recognition || !this._listening) return;
    this.recognition.stop();
    this._listening = false;
  }

  /** Abort listening immediately */
  abort(): void {
    if (!this.recognition) return;
    this.recognition.abort();
    this._listening = false;
  }

  /** Reset transcript state */
  reset(): void {
    this._finalTranscript = "";
    this._interimTranscript = "";
  }

  /** Set language dynamically */
  setLanguage(lang: string): void {
    if (this.recognition) this.recognition.lang = lang;
  }

  static isSupported(): boolean {
    return typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  }

  private setupListeners(options?: RecognitionOptions): void {
    if (!this.recognition) return;
    this.recognition.onstart = () => { this._listening = true; options?.onStart?.(); };
    this.recognition.onend = () => { this._listening = false; options?.onEnd?.(); };
    this.recognition.onerror = (e) => { options?.onError?.(e); };
    this.recognition.onsoundstart = () => options?.onSoundStart?.();
    this.recognition.onsoundend = () => options?.onSoundEnd?.();
    this.recognition.onaudiostart = () => options?.onAudioStart?.();
    this.recognition.onaudioend = () => options?.onAudioEnd?.();

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]!;
        if (result.isFinal) {
          final += result[0]?.transcript ?? "";
        } else {
          interim += result[0]?.transcript ?? "";
        }
      }

      if (final) {
        this._finalTranscript += final;
        options?.onResult?.(this._finalTranscript, true);
      }
      this._interimTranscript = interim;
      if (interim) options?.onInterimResult?.(interim);
    };
  }
}

// --- SSML-like Markup Parser ---

export interface SsmlNode {
  type: "text" | "break" | "emphasis" | "prosody" | "say-as" | "phoneme" | "sub";
  content?: string;
  attributes?: Record<string, string>;
  children?: SsmlNode[];
}

/** Parse simple SSML-like markup into a tree of nodes */
export function parseSsml(ssml: string): SsmlNode[] {
  const nodes: SsmlNode[] = [];
  const tagRegex = /<(\w+)([^>]*)>([\s\S]*?)<\/\1>|<(\w+)([^/]*)\/>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(ssml)) !== null) {
    // Text before tag
    if (match.index > lastIndex) {
      const text = ssml.slice(lastIndex, match.index).trim();
      if (text) nodes.push({ type: "text", content: text });
    }

    if (match[4]) {
      // Self-closing tag <tag/>
      nodes.push({ type: match[4] as SsmlNode["type"], attributes: parseAttributes(match[5] ?? "") });
    } else {
      // Opening + closing tag
      nodes.push({
        type: match[1] as SsmlNode["type"],
        attributes: parseAttributes(match[2] ?? ""),
        children: parseSsml(match[3] ?? ""),
      });
    }
    lastIndex = (match.index ?? 0) + match[0].length;
  }

  // Remaining text
  if (lastIndex < ssml.length) {
    const text = ssml.slice(lastIndex).trim();
    if (text) nodes.push({ type: "text", content: text });
  }

  return nodes;
}

function parseAttributes(attrStr: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const regex = /(\w+)=["']([^"']*)["']/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(attrStr)) !== null) {
    attrs[m[1]!] = m[2]!;
  }
  return attrs;
}

/** Convert SSML tree to sequential speech commands */
export function ssmlToSpeechCommands(nodes: SsmlNode[]): Array<{ action: "speak" | "pause" | "setRate" | "setPitch" | "setVolume"; value?: string | number }> {
  const commands: Array<{ action: "speak" | "pause" | "setRate" | "setPitch" | "setVolume"; value?: string | number }> = [];

  for (const node of nodes) {
    switch (node.type) {
      case "text":
        if (node.content) commands.push({ action: "speak", value: node.content });
        break;
      case "break":
        const strength = node.attributes?.strength ?? "medium";
        const times: Record<string, number> = { weak: 200, medium: 500, strong: 1000, xstrong: 2000 };
        const ms = node.attributes?.time ? parseInt(node.attributes.time) : times[strength] ?? 500;
        commands.push({ action: "pause", value: ms });
        break;
      case "prosody":
        if (node.children) {
          if (node.attributes?.rate) commands.push({ action: "setRate", value: parseFloat(node.attributes.rate) });
          if (node.attributes?.pitch) commands.push({ action: "setPitch", value: parseFloat(node.attributes.pitch) });
          if (node.attributes?.volume) commands.push({ action: "setVolume", value: parseFloat(node.attributes.volume) });
          commands.push(...ssmlToSpeechCommands(node.children));
        }
        break;
      case "emphasis":
        const levelMap: Record<string, { rate: number; volume: number }> = {
          strong: { rate: 1.1, volume: 1.2 },
          moderate: { rate: 1.05, volume: 1.1 },
          reduced: { rate: 0.9, volume: 0.85 },
          none: { rate: 1, volume: 1 },
        };
        const level = levelMap[node.attributes?.level ?? "none"] ?? levelMap.none;
        commands.push({ action: "setRate", value: level.rate }, { action: "setVolume", value: level.volume });
        if (node.children) commands.push(...ssmlToSpeechCommands(node.children));
        break;
      case "say-as":
        if (node.content) commands.push({ action: "speak", value: node.content });
        break;
      default:
        if (node.content) commands.push({ action: "speak", value: node.content });
    }
  }
  return commands;
}

/** Speak SSML-marked up text using TTS engine */
export async function speakSsml(tts: TextToSpeech, ssml: string, baseOptions?: SpeechOptions): Promise<void> {
  const nodes = parseSsml(ssml);
  const commands = ssmlToSpeechCommands(nodes);

  for (const cmd of commands) {
    switch (cmd.action) {
      case "speak":
        if (typeof cmd.value === "string") await tts.speak(cmd.value, baseOptions);
        break;
      case "pause":
        if (typeof cmd.value === "number") await new Promise((r) => setTimeout(r, cmd.value));
        break;
      case "setRate":
        if (typeof cmd.value === "number") baseOptions = { ...baseOptions, rate: cmd.value };
        break;
      case "setPitch":
        if (typeof cmd.value === "number") baseOptions = { ...baseOptions, pitch: cmd.value };
        break;
      case "setVolume":
        if (typeof cmd.value === "number") baseOptions = { ...baseOptions, volume: cmd.value };
        break;
    }
  }
}

// --- Pronunciation Scoring (Simple Levenshtein-based) ---

/** Score pronunciation by comparing expected vs spoken text */
export function scorePronunciation(expected: string, spoken: string): PronunciationScore {
  const expectedWords = expected.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const spokenWords = spoken.toLowerCase().trim().split(/\s+/).filter(Boolean);

  const details: PronunciationScore["details"] = [];
  let matches = 0;
  let totalConfidence = 0;

  for (let i = 0; i < Math.max(expectedWords.length, spokenWords.length); i++) {
    const expWord = expectedWords[i] ?? "";
    const spkWord = spokenWords[i] ?? "";
    const similarity = levenshteinSimilarity(expWord, spkWord);
    const matched = similarity > 0.7;
    if (matched) matches++;
    totalConfidence += similarity;
    details.push({
      word: expWord || "(missing)",
      expected: expWord,
      spoken: spkWord,
      match: matched,
      confidence: Math.round(similarity * 100),
    });
  }

  const totalWords = expectedWords.length || 1;
  const accuracy = Math.round((matches / totalWords) * 100);
  const fluency = Math.round(totalConfidence / totalWords);
  const completeness = Math.round((spokenWords.length / Math.max(expectedWords.length, 1)) * 100);

  return {
    overall: Math.round((accuracy * 0.4 + fluency * 0.3 + completeness * 0.3)),
    accuracy,
    fluency,
    completeness,
    details,
  };
}

function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j]! + 1,
        matrix[i][j - 1]! + 1,
        matrix[i - 1][j - 1]! + cost,
      );
    }
  }
  const distance = matrix[b.length][a.length]!;
  const maxLen = Math.max(a.length, b.length);
  return 1 - distance / maxLen;
}

// --- Voice Activity Detection (Web Audio based) ---

export class VoiceActivityDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private animFrameId: number | null = null;
  private _isSpeaking = false;
  private silenceStart: number | null = null;
  private speechStart: number | null = null;
  private config: Required<VoiceActivityConfig>;

  private onSpeechStartCb?: () => void;
  private onSpeechEndCb?: (duration: number) => void;
  private onVadChangeCb?: (speaking: boolean) => void;

  constructor(config?: VoiceActivityConfig) {
    this.config = {
      threshold: config?.threshold ?? 0.02,
      silenceDurationMs: config?.silenceDurationMs ?? 500,
      minSpeechDurationMs: config?.minSpeechDurationMs ?? 200,
      maxSpeechDurationMs: config?.maxSpeechDurationMs ?? 30000,
      sampleRate: config?.sampleRate ?? 16000,
    };
  }

  get isSpeaking(): boolean { return this._isSpeaking; }

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    this.audioContext = new AudioContext({ sampleRate: this.config.sampleRate });
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.source.connect(this.analyser);
    this.monitor();
  }

  stop(): void {
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    this.source?.disconnect();
    this.audioContext?.close();
    this.stream?.getTracks().forEach((t) => t.stop());
    this._isSpeaking = false;
    this.analyser = null;
    this.audioContext = null;
    this.source = null;
    this.stream = null;
  }

  onSpeechStart(cb: () => void): this { this.onSpeechStartCb = cb; return this; }
  onSpeechEnd(cb: (duration: number) => void): this { this.onSpeechEndCb = cb; return this; }
  onVadChange(cb: (speaking: boolean) => void): this { this.onVadChangeCb = cb; return this; }

  private monitor(): void {
    if (!this.analyser) return;
    const dataArray = new Float32Array(this.analyser.fftSize);
    const check = () => {
      if (!this.analyser) return;
      this.analyser.getFloatTimeDomainData(dataArray);
      const rms = Math.sqrt(dataArray.reduce((sum, val) => sum + val * val, 0) / dataArray.length);
      const now = Date.now();

      if (rms > this.config.threshold) {
        if (this.speechStart === null) this.speechStart = now;
        this.silenceStart = null;
        if (!this._isSpeaking) {
          this._isSpeaking = true;
          this.onVadChangeCb?.(true);
          this.onSpeechStartCb?.();
        }
      } else {
        if (this._isSpeaking && this.silenceStart === null) {
          this.silenceStart = now;
        }
        if (this._isSpeaking && this.silenceStart && now - this.silenceStart >= this.config.silenceDurationMs) {
          const duration = this.speechStart ? now - this.speechStart : 0;
          if (duration >= this.config.minSpeechDurationMs) {
            this._isSpeaking = false;
            this.onVadChangeCb?.(false);
            this.onSpeechEndCb?.(duration);
          }
          this.speechStart = null;
          this.silenceStart = null;
        }
      }

      this.animFrameId = requestAnimationFrame(check);
    };
    this.animFrameId = requestAnimationFrame(check);
  }

  static isSupported(): boolean {
    return typeof navigator !== "undefined" && "mediaDevices" in navigator &&
      "getUserMedia" in navigator.mediaDevices;
  }
}

// --- Audio Recording ---

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private _recording = false;
  private _paused = false;

  async start(options?: { mimeType?: string; audioBitsPerSecond?: number }): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = options?.mimeType ?? MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType, audioBitsPerSecond: options?.audioBitsPerSecond });
    this.chunks = [];
    this.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) this.chunks.push(e.data); };
    this.mediaRecorder.start(100); // Collect data every 100ms
    this._recording = true;
    this._paused = false;
  }

  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) { resolve(new Blob()); return; }
      this.mediaRecorder.onstop = () => {
        this._recording = false;
        this.stream?.getTracks().forEach((t) => t.stop());
        const blob = new Blob(this.chunks, { type: this.mediaRecorder!.mimeType });
        resolve(blob);
      };
      this.mediaRecorder.stop();
    });
  }

  pause(): void { this.mediaRecorder?.pause(); this._paused = true; }
  resume(): void { this.mediaRecorder?.resume(); this._paused = false; }
  get recording(): boolean { return this._recording; }
  get paused(): boolean { return this._paused; }

  /** Get recording duration so far */
  getDuration(): number {
    // Approximate from chunk sizes
    const totalSize = this.chunks.reduce((sum, c) => sum + c.size, 0);
    // Rough estimate: ~24kbps for opus
    return (totalSize * 8) / 24000;
  }

  static isSupported(): boolean {
    return typeof navigator !== "undefined" && "mediaDevices" in navigator;
  }
}
