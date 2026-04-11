/**
 * Audio Utilities: Audio playback, recording, visualization, waveform display,
 * audio analysis, effects, format conversion helpers, and Web Audio API wrappers.
 */

// --- Types ---

export type AudioVisualizerType = "bars" | "wave" | "circle" | "frequency";
export type AudioEffect = "reverb" | "delay" | "lowpass" | "highpass" | "compressor" | "distortion";

export interface AudioPlayerOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Audio source URL or HTMLAudioElement */
  src?: string | HTMLAudioElement;
  /** Show controls? */
  showControls?: boolean;
  /** Show visualizer? */
  showVisualizer?: boolean;
  /** Visualizer type */
  visualizerType?: AudioVisualizerType;
  /** Visualizer color(s) */
  visualizerColors?: string[];
  /** Auto-play? */
  autoplay?: boolean;
  /** Loop? */
  loop?: boolean;
  /** Volume (0-1) */
  volume?: number;
  /** Playback rate (0.5 - 2) */
  playbackRate?: number;
  /** Callback on time update */
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  /** Callback on play/pause */
  onPlayStateChange?: (playing: boolean) => void;
  /** Callback on ended */
  onEnded?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Custom CSS class */
  className?: string;
}

export interface AudioRecorderOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Show visualizer while recording? */
  showVisualizer?: boolean;
  /** MIME type for encoding */
  mimeType?: string;
  /** Sample rate */
  sampleRate?: number;
  /** Number of channels */
  channels?: number;
  /** Max recording duration in seconds (0 = unlimited) */
  maxDuration?: number;
  /** Callback when recording starts */
  onStart?: () => void;
  /** Callback with blob when stopped */
  onStop?: (blob: Blob, url: string) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Custom CSS class */
  className?: string;
}

export interface AudioAnalyzerNode {
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  getAverageFrequency: () => number;
  getPeakFrequency: () => { frequency: number; magnitude: number };
  getRMS: () => number;
}

export interface AudioPlayerInstance {
  element: HTMLElement;
  audio: HTMLAudioElement;
  /** Play audio */
  play: () => Promise<void>;
  /** Pause audio */
  pause: () => void;
  /** Toggle play/pause */
  toggle: () => Promise<void>;
  /** Seek to position (seconds) */
  seek: (time: number) => void;
  /** Set volume (0-1) */
  setVolume: (volume: number) => void;
  /** Get current volume */
  getVolume: () => number;
  /** Set mute state */
  setMute: (muted: boolean) => void;
  /** Set playback rate */
  setPlaybackRate: (rate: number) => void;
  /** Get duration */
  getDuration: () => number;
  /** Get current time */
  getCurrentTime: () => number;
  /** Is playing? */
  isPlaying: () => boolean;
  /** Load new source */
  loadSource: (src: string) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

export interface AudioRecorderInstance {
  element: HTMLElement;
  /** Start recording */
  start: () => Promise<void>;
  /** Stop recording */
  stop: () => Promise<Blob>;
  /** Pause recording */
  pause: () => void;
  /** Resume recording */
  resume: () => void;
  /** Is recording? */
  isRecording: () => boolean;
  /** Get current duration */
  getDuration: () => number;
  /** Cancel recording */
  cancel: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Audio Player ---

/**
 * Create an audio player with optional visualizer.
 */
export function createAudioPlayer(options: AudioPlayerOptions): AudioPlayerInstance {
  const opts = {
    showControls: options.showControls ?? true,
    showVisualizer: options.showVisualizer ?? false,
    visualizerType: options.visualizerType ?? "bars",
    visualizerColors: options.visualizerColors ?? ["#4338ca", "#ec4899"],
    autoplay: options.autoplay ?? false,
    loop: options.loop ?? false,
    volume: options.volume ?? 1,
    playbackRate: options.playbackRate ?? 1,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("AudioPlayer: container not found");

  // Audio element
  const audio = typeof options.src === "string"
    ? Object.assign(document.createElement("audio"), { src: options.src, preload: "metadata" })
    : options.src ?? document.createElement("audio");

  audio.loop = opts.loop;
  audio.volume = opts.volume;
  audio.playbackRate = opts.playbackRate;

  const wrapper = document.createElement("div");
  wrapper.className = `audio-player ${opts.className ?? ""}`;
  wrapper.style.cssText = "display:flex;flex-direction:column;gap:8px;width:100%;";
  container.appendChild(wrapper);

  let analyser: AnalyserNode | null = null;
  let audioCtx: AudioContext | null = null;
  let sourceNode: MediaElementAudioSourceNode | null = null;
  let animFrameId: number | null = null;
  let destroyed = false;

  // Visualizer canvas
  let visCanvas: HTMLCanvasElement | null = null;
  let visCtx: CanvasRenderingContext2D | null = null;

  if (opts.showVisualizer) {
    visCanvas = document.createElement("canvas");
    visCanvas.className = "audio-visualizer";
    visCanvas.width = 400;
    visCanvas.height = 100;
    visCanvas.style.cssText = "width:100%;height:100px;border-radius:6px;background:#1e1b4b;";
    wrapper.appendChild(visCanvas);
    visCtx = visCanvas.getContext("2d")!;
  }

  // Controls
  if (opts.showControls) {
    const controls = document.createElement("div");
    controls.className = "audio-controls";
    controls.style.cssText = `
      display:flex;align-items:center;gap:8px;padding:8px 12px;
      background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;
    `;

    // Play/Pause button
    const playBtn = document.createElement("button");
    playBtn.type = "button";
    playBtn.textContent = "\u25B6";
    playBtn.title = "Play/Pause";
    playBtn.style.cssText = `
      width:36px;height:36px;border:none;border-radius:50%;background:#4338ca;color:#fff;
      cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;
      transition:transform 0.15s;
    `;

    // Progress bar
    const progressContainer = document.createElement("div");
    progressContainer.style.cssText = "flex:1;height:6px;background:#e5e7eb;border-radius:3px;cursor:pointer;position:relative;";
    const progressBar = document.createElement("div");
    progressBar.style.cssText = "height:100%;background:#4338ca;border-radius:3px;width:0%;transition:width 0.1s linear;";
    progressContainer.appendChild(progressBar);

    // Time display
    const timeDisplay = document.createElement("span");
    timeDisplay.style.cssText = "font-size:12px;color:#6b7280;min-width:80px;text-align:right;font-variant-numeric:tabular-nums;";
    timeDisplay.textContent = "0:00 / 0:00";

    // Volume slider
    const volumeSlider = document.createElement("input");
    volumeSlider.type = "range";
    volumeSlider.min = "0"; volumeSlider.max = "1"; volumeSlider.step = "0.01";
    volumeSlider.value = String(opts.volume);
    volumeSlider.style.cssText = "width:60px;accent-color:#4338ca;";

    controls.append(playBtn, progressContainer, timeDisplay, volumeSlider);
    wrapper.appendChild(controls);

    // Event handlers
    playBtn.addEventListener("click", () => instance.toggle());
    progressContainer.addEventListener("click", (e) => {
      const rect = progressContainer.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      instance.seek(pct * audio.duration);
    });
    volumeSlider.addEventListener("input", () => {
      instance.setVolume(parseFloat(volumeSlider.value));
    });

    function updateTime() {
      if (!audio.duration) return;
      const pct = (audio.currentTime / audio.duration) * 100;
      progressBar.style.width = `${pct}%`;
      timeDisplay.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
    }
    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateTime);
  }

  // Setup Web Audio API for visualizer
  function setupAnalyser(): void {
    if (!opts.showVisualizer || analyser) return;
    try {
      audioCtx = new AudioContext();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      sourceNode = audioCtx.createMediaElementSource(audio);
      sourceNode.connect(analyser);
      analyser.connect(audioCtx.destination);
    } catch {
      // Web Audio API not available
    }
  }

  // Visualizer render loop
  function drawVisualizer(): void {
    if (!visCtx || !visCanvas || !analyser || destroyed) return;

    const w = visCanvas.width;
    const h = visCanvas.height;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    visCtx.clearRect(0, 0, w, h);

    switch (opts.visualizerType) {
      case "bars":
        drawBars(dataArray, w, h);
        break;
      case "wave":
        drawWave(dataArray, w, h);
        break;
      case "circle":
        drawCircleVis(dataArray, w, h);
        break;
      case "frequency":
        drawFrequency(dataArray, w, h);
        break;
    }

    animFrameId = requestAnimationFrame(drawVisualizer);
  }

  function drawBars(data: Uint8Array, w: number, h: number): void {
    const barCount = data.length;
    const barW = w / barCount - 1;
    for (let i = 0; i < barCount; i++) {
      const barH = (data[i]! / 255) * h;
      const hue = (i / barCount) * 360;
      visCtx!.fillStyle = `hsl(${hue}, 80%, 60%)`;
      visCtx!.fillRect(i * (barW + 1), h - barH, barW, barH);
    }
  }

  function drawWave(data: Uint8Array, w: number, h: number): void {
    visCtx!.beginPath();
    const sliceW = w / data.length;
    let x = 0;
    for (let i = 0; i < data.length; i++) {
      const v = data[i]! / 128.0;
      const y = (v * h) / 2;
      if (i === 0) visCtx!.moveTo(x, y);
      else visCtx!.lineTo(x, y);
      x += sliceW;
    }
    visCtx!.lineTo(w, h / 2);
    visCtx!.strokeStyle = opts.visualizerColors[0] ?? "#4338ca";
    visCtx!.lineWidth = 2;
    visCtx!.stroke();
  }

  function drawCircleVis(data: Uint8Array, w: number, h: number): void {
    const cx = w / 2;
    const cy = h / 2;
    const baseR = Math.min(w, h) / 4;
    visCtx!.beginPath();
    for (let i = 0; i < data.length; i++) {
      const angle = (i / data.length) * Math.PI * 2 - Math.PI / 2;
      const r = baseR + (data[i]! / 255) * baseR;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) visCtx!.moveTo(x, y);
      else visCtx!.lineTo(x, y);
    }
    visCtx!.closePath();
    visCtx!.strokeStyle = opts.visualizerColors[0] ?? "#4338ca";
    visCtx!.lineWidth = 2;
    visCtx!.stroke();
  }

  function drawFrequency(data: Uint8Array, w: number, h: number): void {
    visCtx!.fillStyle = "#1e1b4b";
    visCtx!.fillRect(0, 0, w, h);
    for (let i = 0; i < data.length; i++) {
      const x = (i / data.length) * w;
      const barH = (data[i]! / 255) * h;
      const gradient = visCtx!.createLinearGradient(x, h, x, h - barH);
      gradient.addColorStop(0, opts.visualizerColors[0] ?? "#4338ca");
      gradient.addColorStop(1, opts.visualizerColors[1] ?? "#ec4899");
      visCtx!.fillStyle = gradient;
      visCtx!.fillRect(x, h - barH, w / data.length - 1, barH);
    }
  }

  function formatTime(seconds: number): string {
    if (!isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // Audio event handlers
  audio.addEventListener("play", () => {
    if (opts.showVisualizer && !analyser) setupAnalyser();
    if (analyser && !animFrameId) drawVisualizer();
    opts.onPlayStateChange?.(true);
  });
  audio.addEventListener("pause", () => {
    if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
    opts.onPlayStateChange?.(false);
  });
  audio.addEventListener("ended", () => {
    if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
    opts.onEnded?.();
  });
  audio.addEventListener("error", () => {
    opts.onError?.(new Error("Audio loading error"));
  });
  audio.addEventListener("timeupdate", () => {
    opts.onTimeUpdate?.(audio.currentTime, audio.duration);
  });

  wrapper.appendChild(audio);

  if (opts.autoplay) audio.play().catch(() => {});

  const instance: AudioPlayerInstance = {
    element: wrapper,
    audio,

    async play() {
      if (audioCtx?.state === "suspended") await audioCtx.resume();
      return audio.play();
    },

    pause() { audio.pause(); },

    async toggle() {
      if (audio.paused) return instance.play();
      audio.pause();
    },

    seek(time: number) {
      if (isFinite(time) && isFinite(audio.duration)) {
        audio.currentTime = Math.max(0, Math.min(time, audio.duration));
      }
    },

    setVolume(vol: number) {
      audio.volume = Math.max(0, Math.min(1, vol));
    },

    getVolume() { return audio.volume; },

    setMute(muted: boolean) { audio.muted = muted; },

    setPlaybackRate(rate: number) {
      audio.playbackRate = Math.max(0.5, Math.min(2, rate));
    },

    getDuration() { return audio.duration || 0; },
    getCurrentTime() { return audio.currentTime; },
    isPlaying() { return !audio.paused; },

    loadSource(src: string) {
      audio.src = src;
      audio.load();
    },

    destroy() {
      destroyed = true;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (sourceNode) { sourceNode.disconnect(); sourceNode = null; }
      if (audioCtx && audioCtx.state !== "closed") audioCtx.close();
      wrapper.remove();
    },
  };

  return instance;
}

// --- Audio Recorder ---

/**
 * Create an audio recorder using MediaRecorder API.
 */
export function createAudioRecorder(options: AudioRecorderOptions): AudioRecorderInstance {
  const opts = {
    showVisualizer: options.showVisualizer ?? false,
    mimeType: options.mimeType ?? "",
    sampleRate: options.sampleRate ?? 44100,
    channels: options.channels ?? 1,
    maxDuration: options.maxDuration ?? 0,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("AudioRecorder: container not found");

  let mediaStream: MediaStream | null = null;
  let mediaRecorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let isRecordingFlag = false;
  let startTime = 0;
  let pausedTime = 0;
  let destroyed = false;

  // Visualizer
  let analyser: AnalyserNode | null = null;
  let audioCtx: AudioContext | null = null;
  let animFrameId: number | null = null;
  let visCanvas: HTMLCanvasElement | null = null;
  let visCtx: CanvasRenderingContext2D | null = null;

  const wrapper = document.createElement("div");
  wrapper.className = `audio-recorder ${opts.className ?? ""}`;
  wrapper.style.cssText = "display:flex;flex-direction:column;gap:8px;align-items:center;";
  container.appendChild(wrapper);

  // Status indicator
  const statusEl = document.createElement("div");
  statusEl.className = "recorder-status";
  statusEl.style.cssText = `
    font-size:14px;color:#6b7280;padding:8px 16px;border-radius:20px;
    background:#f3f4f6;display:flex;align-items:center;gap:8px;
  `;
  statusEl.innerHTML = '<span style="width:10px;height:10px;border-radius:50%;background:#9ca3af;"></span>Ready';
  wrapper.appendChild(statusEl);

  // Visualizer canvas
  if (opts.showVisualizer) {
    visCanvas = document.createElement("canvas");
    visCanvas.className = "recorder-visualizer";
    visCanvas.width = 300;
    visCanvas.height = 60;
    visCanvas.style.cssText = "width:300px;height:60px;border-radius:6px;background:#1e1b4b;";
    wrapper.appendChild(visCanvas);
    visCtx = visCanvas.getContext("2d")!;
  }

  // Record button
  const recordBtn = document.createElement("button");
  recordBtn.type = "button";
  recordBtn.textContent = "\u{1F3A4} Record";
  recordBtn.style.cssText = `
    padding:10px 24px;border:none;border-radius:20px;background:#ef4444;color:#fff;
    cursor:pointer;font-size:14px;font-weight:600;transition:all 0.2s;
  `;
  wrapper.appendChild(recordBtn);

  // Duration display
  const durEl = document.createElement("span");
  durEl.style.cssText = "font-size:13px;color:#6b7280;font-variant-numeric:tabular-nums;";
  durEl.textContent = "0:00";
  wrapper.appendChild(durEl);

  function updateStatus(recording: boolean, text: string): void {
    const dot = statusEl.querySelector("span") as HTMLElement;
    if (dot) dot.style.background = recording ? "#ef4444" : "#9ca3af";
    if (recording) dot.style.animation = "pulse 1s infinite";
    else dot.style.animation = "";
    statusEl.lastChild!.textContent = text;
  }

  function updateDuration(): void {
    if (!isRecordingFlag) return;
    const elapsed = (Date.now() - startTime) / 1000;
    durEl.textContent = formatRecTime(elapsed);

    if (opts.maxDuration > 0 && elapsed >= opts.maxDuration) {
      instance.stop().catch(() => {});
      return;
    }

    requestAnimationFrame(updateDuration);
  }

  function formatRecTime(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // Draw recorder visualizer
  function drawRecorderVis(): void {
    if (!visCtx || !visCanvas || !analyser || destroyed) return;
    const w = visCanvas.width;
    const h = visCanvas.height;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    visCtx.fillStyle = "#1e1b4b";
    visCtx.fillRect(0, 0, w, h);
    visCtx.lineWidth = 2;
    visCtx.strokeStyle = "#ef4444";
    visCtx.beginPath();

    const sliceW = w / dataArray.length;
    let x = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i]! / 128.0;
      const y = (v * h) / 2;
      if (i === 0) visCtx.moveTo(x, y);
      else visCtx.lineTo(x, y);
      x += sliceW;
    }
    visCtx.lineTo(w, h / 2);
    visCtx.stroke();

    animFrameId = requestAnimationFrame(drawRecorderVis);
  }

  recordBtn.addEventListener("click", async () => {
    if (!isRecordingFlag) {
      await instance.start();
    } else {
      await instance.stop();
    }
  });

  const instance: AudioRecorderInstance = {
    element: wrapper,

    async start() {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mime = opts.mimeType || MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "";

        mediaRecorder = new MediaRecorder(mediaStream, { mimeType: mime });
        chunks = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: mediaRecorder!.mimeType || "audio/webm" });
          const url = URL.createObjectURL(blob);
          opts.onStop?.(blob, url);
        };

        mediaRecorder.start(100); // Collect data every 100ms
        isRecordingFlag = true;
        startTime = Date.now();
        pausedTime = 0;

        // Setup analyzer
        if (opts.showVisualizer && !analyser) {
          try {
            audioCtx = new AudioContext();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            const src = audioCtx.createMediaStreamSource(mediaStream);
            src.connect(analyser);
            drawRecorderVis();
          } catch { /* ignore */ }
        }

        updateStatus(true, "Recording...");
        recordBtn.textContent = "\u23F9 Stop";
        recordBtn.style.background = "#dc2626";
        opts.onStart?.();
        updateDuration();
      } catch (err) {
        opts.onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    },

    async stop(): Promise<Blob> {
      return new Promise((resolve) => {
        if (!mediaRecorder || !isRecordingFlag) {
          resolve(new Blob([], { type: "audio/webm" }));
          return;
        }

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: mediaRecorder!.mimeType || "audio/webm" });
          const url = URL.createObjectURL(blob);
          isRecordingFlag = false;
          updateStatus(false, "Stopped");
          recordBtn.textContent = "\u{1F3A4} Record";
          recordBtn.style.background = "#ef4444";
          opts.onStop?.(blob, url);
          cleanup();
          resolve(blob);
        };

        mediaRecorder.stop();
      });
    },

    pause() {
      if (mediaRecorder && isRecordingFlag && mediaRecorder.state === "recording") {
        mediaRecorder.pause();
        pausedTime = Date.now();
        updateStatus(true, "Paused");
      }
    },

    resume() {
      if (mediaRecorder && isRecordingFlag && mediaRecorder.state === "paused") {
        mediaRecorder.resume();
        startTime += Date.now() - pausedTime;
        updateStatus(true, "Recording...");
      }
    },

    isRecording() { return isRecordingFlag; },

    getDuration() {
      if (!isRecordingFlag) return 0;
      return (Date.now() - startTime) / 1000;
    },

    cancel() {
      if (mediaRecorder && isRecordingFlag) {
        mediaRecorder.stop();
        chunks = [];
        isRecordingFlag = false;
        updateStatus(false, "Cancelled");
        recordBtn.textContent = "\u{1F3A4} Record";
        recordBtn.style.background = "#ef4444";
        cleanup();
      }
    },

    destroy() {
      destroyed = true;
      cleanup();
      wrapper.remove();
    },
  };

  function cleanup(): void {
    if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      mediaStream = null;
    }
    if (audioCtx && audioCtx.state !== "closed") audioCtx.close();
    analyser = null; audioCtx = null;
  }

  return instance;
}

// --- Audio Analysis Helpers ---

/**
 * Create an audio analyzer from a source.
 */
export function createAudioAnalyzer(source: HTMLAudioElement | MediaStream): AudioAnalyzerNode | null {
  try {
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;

    if (source instanceof HTMLAudioElement) {
      const src = ctx.createMediaElementSource(source);
      src.connect(analyser);
      analyser.connect(ctx.destination);
    } else {
      const src = ctx.createMediaStreamSource(source);
      src.connect(analyser);
    }

    const freqData = new Uint8Array(analyser.frequencyBinCount);
    const timeData = new Uint8Array(analyser.fftSize);

    return {
      get frequencyData() { analyser.getByteFrequencyData(freqData); return freqData; },
      get timeDomainData() { analyser.getByteTimeDomainData(timeData); return timeData; },
      getAverageFrequency: () => {
        analyser.getByteFrequencyData(freqData);
        return freqData.reduce((s, v) => s + v, 0) / freqData.length;
      },
      getPeakFrequency: () => {
        analyser.getByteFrequencyData(freqData);
        let maxIdx = 0;
        let maxVal = 0;
        for (let i = 0; i < freqData.length; i++) {
          if (freqData[i]! > maxVal) { maxVal = freqData[i]!; maxIdx = i; }
        }
        return { frequency: maxIdx * ctx.sampleRate / analyser.fftSize, magnitude: maxVal / 255 };
      },
      getRMS: () => {
        analyser.getByteTimeDomainData(timeData);
        let sum = 0;
        for (let i = 0; i < timeData.length; i++) {
          const n = (timeData[i]! - 128) / 128;
          sum += n * n;
        }
        return Math.sqrt(sum / timeData.length);
      },
    };
  } catch {
    return null;
  }
}

/** Generate a simple beep tone using Web Audio API */
export function playBeep(frequency = 440, duration = 200, type: OscillatorType = "sine"): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration / 1000);
      osc.onended = () => { ctx.close(); resolve(); };
    } catch {
      resolve();
    }
  });
}

/** Play a sequence of notes */
export function playMelody(notes: Array<{ freq: number; duration: number }>, tempo = 120): Promise<void> {
  const msPerBeat = 60000 / tempo;
  return notes.reduce(
    (chain, note) =>
      chain.then(() => playBeep(note.freq, note.duration * msPerBeat)),
    Promise.resolve(),
  );
}
