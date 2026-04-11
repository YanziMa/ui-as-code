/**
 * Audio Player: Custom HTML5 audio player with waveform visualization,
 * playlist support, volume control, playback speed, keyboard shortcuts,
 * progress scrubbing, and accessibility.
 */

// --- Types ---

export interface AudioTrack {
  id: string;
  title: string;
  src: string;
  artist?: string;
  album?: string;
  duration?: number;
  coverUrl?: string;
}

export interface AudioPlayerOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Audio source URL or <audio> element */
  src?: string | HTMLAudioElement;
  /** Initial tracks for playlist */
  tracks?: AudioTrack[];
  /** Auto-play first track? */
  autoplay?: boolean;
  /** Volume 0-1 */
  volume?: number;
  /** Muted by default? */
  muted?: boolean;
  /** Loop current track? */
  loop?: boolean;
  /** Shuffle? */
  shuffle?: boolean;
  /** Playback speed options */
  speeds?: number[];
  /** Show waveform visualization? */
  showWaveform?: boolean;
  /** Show playlist panel? */
  showPlaylist?: boolean;
  /** Show cover art? */
  showCover?: boolean;
  /** Accent color */
  accentColor?: string;
  /** Callback on time update */
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  /** Callback on track change */
  onTrackChange?: (track: AudioTrack, index: number) => void;
  /** Callback on play/pause state change */
  onPlayStateChange?: (playing: boolean) => void;
  /** Callback on ended (track finished) */
  onEnded?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Custom CSS class */
  className?: string;
}

export interface AudioPlayerInstance {
  element: HTMLElement;
  audioEl: HTMLAudioElement;
  play: () => Promise<void>;
  pause: () => void;
  togglePlay: () => Promise<void>;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  setSpeed: (speed: number) => void;
  next: () => void;
  prev: () => void;
  loadTrack: (index: number) => void;
  addTrack: (track: AudioTrack) => void;
  removeTrack: (id: string) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getTrackIndex: () => number;
  getTracks: () => AudioTrack[];
  destroy: () => void;
}

// --- Main Factory ---

export function createAudioPlayer(options: AudioPlayerOptions): AudioPlayerInstance {
  const opts = {
    autoplay: options.autoplay ?? false,
    volume: options.volume ?? 0.8,
    muted: options.muted ?? false,
    loop: options.loop ?? false,
    shuffle: options.shuffle ?? false,
    speeds: options.speeds ?? [0.5, 0.75, 1, 1.25, 1.5, 2],
    showWaveform: options.showWaveform ?? true,
    showPlaylist: options.showPlaylist ?? true,
    showCover: options.showCover ?? true,
    accentColor: options.accentColor ?? "#4338ca",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("AudioPlayer: container not found");

  let destroyed = false;

  // Playlist state
  let tracks: AudioTrack[] = [...(options.tracks ?? [])];
  let currentTrackIndex = 0;
  let shuffledIndices: number[] = [];
  let isShuffleOrder = false;

  // Root wrapper
  const root = document.createElement("div");
  root.className = `audio-player ${opts.className ?? ""}`;
  root.style.cssText = `
    display:flex;flex-direction:column;width:100%;font-family:-apple-system,sans-serif;
    background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 2px 8px rgba(0,0,0,0.06);
  `;
  container.appendChild(root);

  // Audio element
  const audio = typeof options.src === "string" || !options.src
    ? document.createElement("audio")
    : options.src;

  if (typeof options.src === "string") {
    (audio as HTMLAudioElement).src = options.src;
  }
  (audio as HTMLAudioElement).volume = opts.volume;
  (audio as HTMLAudioElement).muted = opts.muted;
  (audio as HTMLAudioElement).loop = opts.loop;
  (audio as HTMLAudioElement).preload = "metadata";
  (audio as HTMLAudioElement).style.display = "none";
  root.appendChild(audio);

  // Top section: cover art + info + main controls
  const topSection = document.createElement("div");
  topSection.style.cssText = "display:flex;align-items:center;gap:16px;padding:16px;background:#fafbfc;";
  root.appendChild(topSection);

  // Cover art
  let coverEl: HTMLElement | null = null;
  if (opts.showCover) {
    coverEl = document.createElement("div");
    coverEl.className = "ap-cover";
    coverEl.style.cssText = `
      width:64px;height:64px;border-radius:8px;background:linear-gradient(135deg,#667eea,#764ba2);
      display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;
      flex-shrink:0;overflow:hidden;background-size:cover;background-position:center;
    `;
    coverEl.textContent = "\u{1F3B5}";
    topSection.appendChild(coverEl);
  }

  // Track info
  const infoArea = document.createElement("div");
  infoArea.className = "ap-info";
  infoArea.style.cssText = "flex:1;min-width:0;";
  topSection.appendChild(infoArea);

  const titleEl = document.createElement("div");
  titleEl.className = "ap-title";
  titleEl.textContent = "No track loaded";
  titleEl.style.cssText = "font-weight:600;font-size:14px;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
  infoArea.appendChild(titleEl);

  const artistEl = document.createElement("div");
  artistEl.className = "ap-artist";
  artistEl.textContent = "";
  artistEl.style.cssText = "font-size:12px;color:#6b7280;margin-top:2px;";
  infoArea.appendChild(artistEl);

  // Main transport controls row
  const transportRow = document.createElement("div");
  transportRow.className = "ap-transport";
  transportRow.style.cssText = `
    display:flex;align-items:center;gap:8px;padding:4px 16px 12px;
  `;
  infoArea.appendChild(transportRow);

  // Prev button
  const prevBtn = makeTransportBtn("\u23EA", "Previous", () => instance.prev());
  transportRow.appendChild(prevBtn);

  // Play/Pause button
  const playBtn = makeTransportBtn("\u25B6", "Play", () => instance.togglePlay(), true);
  playBtn.style.cssText += "width:40px;height:40px;font-size:18px;border-radius:50%;background:" + opts.accentColor + ";color:#fff;border:none;";
  transportRow.appendChild(playBtn);

  // Next button
  const nextBtn = makeTransportBtn("\u23E9", "Next", () => instance.next());
  transportRow.appendChild(nextBtn);

  // Waveform / Progress section
  const progressSection = document.createElement("div");
  progressSection.className = "ap-progress-section";
  progressSection.style.cssText = "padding:0 16px 12px;";
  root.appendChild(progressSection);

  // Waveform canvas
  let waveCanvas: HTMLCanvasElement | null = null;
  let waveCtx: CanvasRenderingContext2D | null = null;
  let waveformData: number[] = [];

  if (opts.showWaveform) {
    waveCanvas = document.createElement("canvas");
    waveCanvas.className = "ap-waveform";
    waveCanvas.style.cssText = "width:100%;height:48px;display:block;cursor:pointer;border-radius:4px;";
    waveCtx = waveCanvas.getContext("2d")!;
    progressSection.appendChild(waveCanvas);
  }

  // Progress bar (fallback / alongside waveform)
  const progressContainer = document.createElement("div");
  progressContainer.className = "ap-progress-bar";
  progressContainer.style.cssText = `
    position:relative;width:100%;height:6px;background:#e5e7eb;border-radius:3px;
    cursor:pointer;margin-top:${opts.showWaveform ? "4px" : "0"};
  `;
  progressContainer.addEventListener("click", handleProgressClick);

  const progressPlayed = document.createElement("div");
  progressPlayed.className = "ap-progress-played";
  progressPlayed.style.cssText = `position:absolute;top:0;left:0;height:100%;background:${opts.accentColor};border-radius:3px;transition:width 0.1s linear;`;

  const progressHandle = document.createElement("div");
  progressHandle.style.cssText = `
    position:absolute;top:50%;width:14px;height:14px;margin-left:-7px;margin-top:-7px;
    border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.2);
    transform:translateY(-50%) scale(0);transition:transform 0.15s;
  `;

  progressContainer.append(progressPlayed, progressHandle);
  progressSection.appendChild(progressContainer);

  // Time display
  const timeRow = document.createElement("div");
  timeRow.style.cssText = "display:flex;justify-content:space-between;padding:0 16px 8px;font-size:11px;color:#6b7280;font-family:'SF Mono',monospace;";

  const currentTimeEl = document.createElement("span");
  currentTimeEl.textContent = "0:00";
  timeRow.appendChild(currentTimeEl);

  const durationEl = document.createElement("span");
  durationEl.textContent = "0:00";
  timeRow.appendChild(durationEl);
  root.appendChild(timeRow);

  // Bottom controls bar
  const bottomBar = document.createElement("div");
  bottomBar.className = "ap-bottom-bar";
  bottomBar.style.cssText = `
    display:flex;align-items:center;gap:12px;padding:8px 16px;
    border-top:1px solid #f0f0f0;background:#fafbfc;
  `;
  root.appendChild(bottomBar);

  // Volume control
  const volumeGroup = document.createElement("div");
  volumeGroup.style.cssText = "display:flex;align-items:center;gap:4px;";

  const volumeIcon = document.createElement("button");
  volumeIcon.type = "button";
  volumeIcon.innerHTML = "\u{1F50A}";
  volumeIcon.title = "Mute";
  volumeIcon.style.cssText = "background:none;border:none;cursor:pointer;font-size:14px;padding:2px;";
  volumeIcon.addEventListener("click", toggleMute);
  volumeGroup.appendChild(volumeIcon);

  const volumeSlider = document.createElement("input");
  volumeSlider.type = "range";
  volumeSlider.min = "0";
  volumeSlider.max = "1";
  volumeSlider.step = "0.05";
  volumeSlider.value = String(opts.volume);
  volumeSlider.style.cssText = "width:70px;accent-color:" + opts.accentColor + ";cursor:pointer;";
  volumeSlider.addEventListener("input", () => {
    audio.volume = parseFloat(volumeSlider.value);
    updateVolumeIcon();
  });
  volumeGroup.appendChild(volumeSlider);
  bottomBar.appendChild(volumeGroup);

  // Speed select
  const speedSelect = document.createElement("select");
  speedSelect.style.cssText = "background:#fff;border:1px solid #e5e7eb;border-radius:4px;font-size:11px;padding:2px 4px;cursor:pointer;color:#374151;";
  for (const s of opts.speeds) {
    const opt = document.createElement("option");
    opt.value = String(s);
    opt.textContent = s + "x";
    if (s === 1) opt.selected = true;
    speedSelect.appendChild(opt);
  }
  speedSelect.addEventListener("change", () => {
    instance.setSpeed(parseFloat(speedSelect.value));
  });
  bottomBar.appendChild(speedSelect);

  // Loop toggle
  const loopBtn = makeSmallBtn("\u{1F501}", "Loop", () => {
    audio.loop = !audio.loop;
    loopBtn.style.opacity = audio.loop ? "1" : "0.4";
  });
  loopBtn.style.opacity = opts.loop ? "1" : "0.4";
  bottomBar.appendChild(loopBtn);

  // Shuffle toggle
  const shuffleBtn = makeSmallBtn("\u{1F500}", "Shuffle", () => {
    opts.shuffle = !opts.shuffle;
    shuffleBtn.style.opacity = opts.shuffle ? "1" : "0.4";
    if (opts.shuffle && !isShuffleOrder) buildShuffleOrder();
  });
  shuffleBtn.style.opacity = opts.shuffle ? "1" : "0.4";
  bottomBar.appendChild(shuffleBtn);

  // Spacer
  const spacer = document.createElement("div");
  spacer.style.flex = "1";
  bottomBar.appendChild(spacer);

  // Playlist toggle
  let playlistPanel: HTMLElement | null = null;
  if (opts.showPlaylist && tracks.length > 0) {
    const plToggle = makeSmallBtn("\u{1F4DD}", "Playlist", togglePlaylist);
    bottomBar.appendChild(plToggle);
  }

  // --- Helper Functions ---

  function makeTransportBtn(label: string, title: string, handler: () => void, large = false): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = label;
    btn.title = title;
    btn.style.cssText = `
      background:none;border:none;cursor:pointer;font-size:${large ? "18" : "16"}px;
      color:#374151;padding:4px 6px;display:flex;align-items:center;justify-content:center;
      border-radius:50%;width:${large ? "40" : "32"}px;height:${large ? "40" : "32"}px;
      transition:background 0.15s;
    `;
    btn.addEventListener("click", handler);
    btn.addEventListener("mouseenter", () => { btn.style.background = "#f0f0f0"; });
    btn.addEventListener("mouseleave", () => { btn.style.background = ""; });
    return btn;
  }

  function makeSmallBtn(label: string, title: string, handler: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = label;
    btn.title = title;
    btn.style.cssText = "background:none;border:none;cursor:pointer;font-size:13px;padding:2px 4px;opacity:0.4;transition:opacity 0.15s;";
    btn.addEventListener("click", handler);
    return btn;
  }

  function formatTime(seconds: number): string {
    if (!isFinite(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function updateProgress(): void {
    const current = audio.currentTime;
    const dur = audio.duration || 0;
    const pct = dur > 0 ? (current / dur) * 100 : 0;

    progressPlayed.style.width = `${pct}%`;
    progressHandle.style.transform = `translateY(-50%) scale(${pct > 2 && pct < 98 ? 1 : 0})`;
    currentTimeEl.textContent = formatTime(current);
    durationEl.textContent = formatTime(dur);

    renderWaveform();

    opts.onTimeUpdate?.(current, dur);
  }

  function updatePlayState(): void {
    const playing = !audio.paused;
    playBtn.innerHTML = playing ? "\u23F8" : "\u25B6";
    playBtn.title = playing ? "Pause" : "Play";
    opts.onPlayStateChange?.(playing);
  }

  function updateVolumeIcon(): void {
    if (audio.muted || audio.volume === 0) volumeIcon.innerHTML = "\u{1F507}";
    else if (audio.volume < 0.5) volumeIcon.innerHTML = "\u{1F509}";
    else volumeIcon.innerHTML = "\u{1F50A}";
  }

  function toggleMute(): void {
    audio.muted = !audio.muted;
    updateVolumeIcon();
  }

  function handleProgressClick(e: MouseEvent): void {
    const rect = progressContainer.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (audio.duration) audio.currentTime = pct * audio.duration;
  }

  function updateTrackInfo(): void {
    if (tracks.length > 0 && currentTrackIndex >= 0 && currentTrackIndex < tracks.length) {
      const track = tracks[currentTrackIndex]!;
      titleEl.textContent = track.title;
      artistEl.textContent = track.artist ?? "";
      if (coverEl) {
        if (track.coverUrl) {
          coverEl.style.backgroundImage = `url(${track.coverUrl})`;
          coverEl.textContent = "";
        } else {
          coverEl.style.backgroundImage = "";
          coverEl.textContent = "\u{1F3B5}";
        }
      }
    } else {
      titleEl.textContent = "No track loaded";
      artistEl.textContent = "";
    }
  }

  // --- Waveform Rendering ---

  function generateWaveformData(): void {
    if (!audio.duration || !waveCanvas) return;
    const bars = Math.floor((waveCanvas.offsetWidth || 300) / 3);
    waveformData = [];
    for (let i = 0; i < bars; i++) {
      // Simulate waveform using pseudo-random based on position
      const x = i / bars;
      const base = 0.3 + 0.3 * Math.sin(x * Math.PI * 8);
      const variation = 0.2 * Math.sin(x * Math.PI * 23 + i);
      waveformData.push(Math.max(0.08, Math.min(1, base + variation)));
    }
  }

  function renderWaveform(): void {
    if (!waveCanvas || !waveCtx || waveformData.length === 0) return;

    const w = waveCanvas.offsetWidth || 300;
    const h = waveCanvas.offsetHeight || 48;

    if (waveCanvas.width !== w || waveCanvas.height !== h) {
      waveCanvas.width = w;
      waveCanvas.height = h;
      generateWaveformData();
    }

    waveCtx.clearRect(0, 0, w, h);

    const current = audio.currentTime;
    const dur = audio.duration || 1;
    const playPct = current / dur;
    const activeIndex = Math.floor(playPct * waveformData.length);

    const barWidth = Math.max(2, (w / waveformData.length) - 2);
    const gap = 2;

    for (let i = 0; i < waveformData.length; i++) {
      const barH = waveformData[i]! * (h * 0.75);
      const x = i * (barWidth + gap);
      const y = (h - barH) / 2;

      waveCtx.fillStyle = i <= activeIndex ? opts.accentColor : "#d1d5db";
      waveCtx.beginPath();
      waveCtx.roundRect(x, y, barWidth, barH, 1);
      waveCtx.fill();
    }
  }

  // --- Shuffle ---

  function buildShuffleOrder(): void {
    shuffledIndices = Array.from({ length: tracks.length }, (_, i) => i);
    // Fisher-Yates
    for (let i = shuffledIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j]!, shuffledIndices[i]!];
    }
    isShuffleOrder = true;
  }

  function getNextIndex(): number {
    if (tracks.length <= 1) return 0;
    if (opts.shuffle) {
      if (!isShuffleOrder) buildShuffleOrder();
      const curPos = shuffledIndices.indexOf(currentTrackIndex);
      const nextPos = (curPos + 1) % shuffledIndices.length;
      return shuffledIndices[nextPos]!;
    }
    return (currentTrackIndex + 1) % tracks.length;
  }

  function getPrevIndex(): number {
    if (tracks.length <= 1) return 0;
    if (opts.shuffle) {
      if (!isShuffleOrder) buildShuffleOrder();
      const curPos = shuffledIndices.indexOf(currentTrackIndex);
      const prevPos = (curPos - 1 + shuffledIndices.length) % shuffledIndices.length;
      return shuffledIndices[prevPos]!;
    }
    return (currentTrackIndex - 1 + tracks.length) % tracks.length;
  }

  // --- Playlist Panel ---

  function togglePlaylist(): void {
    if (!playlistPanel) createPlaylistPanel();
    if (playlistPanel!.style.display === "none") {
      playlistPanel!.style.display = "block";
    } else {
      playlistPanel!.style.display = "none";
    }
  }

  function createPlaylistPanel(): void {
    playlistPanel = document.createElement("div");
    playlistPanel.className = "ap-playlist-panel";
    playlistPanel.style.cssText = `
      display:none;border-top:1px solid #e5e7eb;max-height:240px;overflow-y:auto;
      background:#fff;
    `;

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i]!;
      const item = document.createElement("div");
      item.style.cssText = `
        display:flex;align-items:center;gap:10px;padding:8px 16px;cursor:pointer;
        border-bottom:1px solid #f5f5f5;${i === currentTrackIndex ? "background:#eff6ff;" : ""}
        transition:background 0.15s;
      `;
      item.dataset.trackIndex = String(i);

      const numEl = document.createElement("span");
      numEl.textContent = String(i + 1);
      numEl.style.cssText = "font-size:11px;color:#9ca3af;width:20px;text-align:right;";
      item.appendChild(numEl);

      const ti = document.createElement("div");
      ti.style.cssText = "flex:1;min-width:0;";

      const tn = document.createElement("div");
      tn.textContent = track.title;
      tn.style.cssText = `font-size:13px;font-weight:${i === currentTrackIndex ? "600" : "400"};color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
      ti.appendChild(tn);

      if (track.artist) {
        const ta = document.createElement("div");
        ta.textContent = track.artist;
        ta.style.cssText = "font-size:11px;color:#9ca3af;";
        ti.appendChild(ta);
      }
      item.appendChild(ti);

      const durEl = document.createElement("span");
      durEl.textContent = track.duration ? formatTime(track.duration) : "";
      durEl.style.cssText = "font-size:11px;color:#9ca3af;";
      item.appendChild(durEl);

      item.addEventListener("click", () => instance.loadTrack(i));
      item.addEventListener("mouseenter", () => { if (i !== currentTrackIndex) item.style.background = "#f9fafb"; });
      item.addEventListener("mouseleave", () => { if (i !== currentTrackIndex) item.style.background = ""; });

      playlistPanel.appendChild(item);
    }

    root.appendChild(playlistPanel);
  }

  // --- Progress dragging ---
  let isSeeking = false;
  progressContainer.addEventListener("mousedown", (e) => {
    e.preventDefault();
    isSeeking = true;
    handleProgressClick(e as MouseEvent);
  });
  document.addEventListener("mousemove", (e) => {
    if (!isSeeking) return;
    const rect = progressContainer.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (audio.duration) audio.currentTime = pct * audio.duration;
    updateProgress();
  });
  document.addEventListener("mouseup", () => { isSeeking = false; });

  // Audio events
  audio.addEventListener("play", updatePlayState);
  audio.addEventListener("pause", updatePlayState);
  audio.addEventListener("timeupdate", updateProgress);
  audio.addEventListener("loadedmetadata", () => {
    generateWaveformData();
    renderWaveform();
    durationEl.textContent = formatTime(audio.duration);
  });
  audio.addEventListener("ended", () => {
    opts.onEnded?.();
    if (!audio.loop) instance.next();
  });
  audio.addEventListener("error", () => {
    opts.onError?.(new Error("Audio loading error"));
  });

  // Keyboard shortcuts
  container.addEventListener("keydown", (e: KeyboardEvent) => {
    switch (e.key.toLowerCase()) {
      case " ": case "k":
        e.preventDefault(); instance.togglePlay(); break;
      case "arrowright":
        e.preventDefault(); audio.currentTime += 5; break;
      case "arrowleft":
        e.preventDefault(); audio.currentTime -= 5; break;
      case "arrowup":
        e.preventDefault(); audio.volume = Math.min(1, audio.volume + 0.05); volumeSlider.value = String(audio.volume); updateVolumeIcon(); break;
      case "arrowdown":
        e.preventDefault(); audio.volume = Math.max(0, audio.volume - 0.05); volumeSlider.value = String(audio.volume); updateVolumeIcon(); break;
      case "m": e.preventDefault(); toggleMute(); break;
      case "n": e.preventDefault(); instance.next(); break;
      case "p": e.preventDefault(); instance.prev(); break;
      case "l":
        e.preventDefault(); audio.loop = !audio.loop; loopBtn.style.opacity = audio.loop ? "1" : "0.4"; break;
    }
  });

  // Initialize
  if (tracks.length > 0) {
    loadTrackSrc(tracks[0]!.src);
    updateTrackInfo();
  } else if (typeof options.src === "string") {
    titleEl.textContent = options.src.split("/").pop() ?? "Audio";
  }

  function loadTrackSrc(src: string): void {
    audio.src = src;
    audio.load();
    if (opts.autoplay) audio.play().catch(() => {});
  }

  // --- Instance API ---

  const instance: AudioPlayerInstance = {
    element: root,
    audioEl: audio,

    async play() { await audio.play(); },
    pause() { audio.pause(); },
    async togglePlay() { if (audio.paused) await audio.play(); else audio.pause(); },

    seek(time: number) { audio.currentTime = time; },
    setVolume(vol: number) { audio.volume = vol; volumeSlider.value = String(vol); updateVolumeIcon(); },
    setSpeed(speed: number) { audio.playbackRate = speed; speedSelect.value = String(speed); },

    next() {
      if (tracks.length === 0) return;
      currentTrackIndex = getNextIndex();
      loadTrackSrc(tracks[currentTrackIndex]!.src);
      updateTrackInfo();
      opts.onTrackChange?.(tracks[currentTrackIndex]!, currentTrackIndex);
    },

    prev() {
      if (tracks.length === 0) return;
      // If more than 3 seconds in, restart current track
      if (audio.currentTime > 3) { audio.currentTime = 0; return; }
      currentTrackIndex = getPrevIndex();
      loadTrackSrc(tracks[currentTrackIndex]!.src);
      updateTrackInfo();
      opts.onTrackChange?.(tracks[currentTrackIndex]!, currentTrackIndex);
    },

    loadTrack(index: number) {
      if (index < 0 || index >= tracks.length) return;
      currentTrackIndex = index;
      loadTrackSrc(tracks[index]!.src);
      updateTrackInfo();
      // Update playlist highlight
      if (playlistPanel) {
        const items = playlistPanel.querySelectorAll("[data-track-index]");
        items.forEach(item => {
          const idx = parseInt((item as HTMLElement).dataset.trackIndex!);
          (item as HTMLElement).style.background = idx === index ? "#eff6ff" : "";
        });
      }
      opts.onTrackChange?.(tracks[index]!, index);
    },

    addTrack(track: AudioTrack) {
      tracks.push(track);
      if (playlistPanel) { playlistPanel.remove(); playlistPanel = null; }
    },

    removeTrack(id: string) {
      const idx = tracks.findIndex(t => t.id === id);
      if (idx >= 0) {
        tracks.splice(idx, 1);
        if (currentTrackIndex >= tracks.length) currentTrackIndex = Math.max(0, tracks.length - 1);
        if (playlistPanel) { playlistPanel.remove(); playlistPanel = null; }
      }
    },

    getCurrentTime() { return audio.currentTime; },
    getDuration() { return audio.duration || 0; },
    getTrackIndex() { return currentTrackIndex; },
    getTracks() { return [...tracks]; },

    destroy() {
      destroyed = true;
      audio.pause();
      root.remove();
    },
  };

  return instance;
}
