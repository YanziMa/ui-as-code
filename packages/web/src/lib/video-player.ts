/**
 * Video Player: Custom video player with controls, playlist support,
 * keyboard shortcuts, quality selection, playback speed, picture-in-picture,
 * fullscreen, chapters, and accessibility.
 */

// --- Types ---

export interface VideoTrack {
  label: string;
  src: string;
  type?: string;
}

export interface QualityOption {
  label: string;
  src: string;
}

export interface Chapter {
  title: string;
  time: number; // seconds
}

export interface PlaylistItem {
  id: string;
  title: string;
  src: string;
  poster?: string;
  duration?: number;
  artist?: string;
}

export interface VideoPlayerOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Video source URL or <video> element */
  src?: string | HTMLVideoElement;
  /** Poster image URL */
  poster?: string;
  /** Show controls? */
  showControls?: boolean;
  /** Auto-play? */
  autoplay?: boolean;
  /** Muted by default? */
  muted?: boolean;
  /** Loop? */
  loop?: boolean;
  /** Preload strategy */
  preload?: "none" | "metadata" | "auto";
  /** Show play/pause overlay button? */
  showBigPlayButton?: boolean;
  /** Volume 0-1 */
  volume?: number;
  /** Playback speed options */
  speeds?: number[];
  /** Quality sources for adaptive switching */
  qualities?: QualityOption[];
  /** Subtitle tracks */
  subtitles?: VideoTrack[];
  /** Audio tracks */
  audioTracks?: VideoTrack[];
  /** Chapters */
  chapters?: Chapter[];
  /** Playlist items */
  playlist?: PlaylistItem[];
  /** Callback on time update */
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  /** Callback on play/pause */
  onPlayStateChange?: (playing: boolean) => void;
  /** Callback on volume change */
  onVolumeChange?: (volume: number) => void;
  /** Callback on ended */
  onEnded?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Custom CSS class */
  className?: string;
  /** Theme color for accent elements */
  accentColor?: string;
  /** Height (default: auto/100%) */
  height?: string;
}

export interface VideoPlayerInstance {
  element: HTMLElement;
  videoEl: HTMLVideoElement;
  play: () => Promise<void>;
  pause: () => void;
  togglePlay: () => Promise<void>;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  setSpeed: (speed: number) => void;
  setQuality: (src: string) => void;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
  isFullscreen: () => boolean;
  enablePiP: () => Promise<void>;
  getCurrentTime: () => number;
  getDuration: () => number;
  getBuffered: () => { start: number; end: number }[];
  loadVideo: (src: string) => void;
  addToPlaylist: (item: PlaylistItem) => void;
  destroy: () => void;
}

// --- Main Factory ---

export function createVideoPlayer(options: VideoPlayerOptions): VideoPlayerInstance {
  const opts = {
    showControls: options.showControls ?? true,
    autoplay: options.autoplay ?? false,
    muted: options.muted ?? false,
    loop: options.loop ?? false,
    preload: options.preload ?? "metadata",
    showBigPlayButton: options.showBigPlayButton ?? true,
    volume: options.volume ?? 0.8,
    speeds: options.speeds ?? [0.5, 0.75, 1, 1.25, 1.5, 2],
    accentColor: options.accentColor ?? "#4338ca",
    height: options.height ?? "100%",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("VideoPlayer: container not found");

  let destroyed = false;

  // Root wrapper
  const root = document.createElement("div");
  root.className = `video-player ${opts.className ?? ""}`;
  root.style.cssText = `
    position:relative;width:100%;height:${opts.height};
    background:#000;border-radius:8px;overflow:hidden;font-family:-apple-system,sans-serif;
  `;
  container.appendChild(root);

  // Video element
  const video = typeof options.src === "string" || !options.src
    ? document.createElement("video")
    : options.src;

  if (typeof options.src === "string") {
    (video as HTMLVideoElement).src = options.src;
  }
  if (options.poster) (video as HTMLVideoElement).poster = options.poster;
  (video as HTMLVideoElement).preload = opts.preload;
  (video as HTMLVideoElement).autoplay = opts.autoplay;
  (video as HTMLVideoElement).muted = opts.muted;
  (video as HTMLVideoElement).loop = opts.loop;
  (video as HTMLVideoElement).volume = opts.volume;
  (video as HTMLVideoElement).style.cssText = `
    width:100%;height:100%;display:block;background:#000;
  `;
  root.appendChild(video);

  // Big play button overlay
  let bigPlayBtn: HTMLElement | null = null;
  if (opts.showBigPlayButton) {
    bigPlayBtn = document.createElement("button");
    bigPlayBtn.type = "button";
    bigPlayBtn.innerHTML = "&#9654;";
    bigPlayBtn.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      width:64px;height:64px;border-radius:50%;background:rgba(0,0,0,0.6);
      border:2px solid #fff;color:#fff;font-size:28px;cursor:pointer;
      display:flex;align-items:center;justify-content:center;
      transition:opacity 0.2s;z-index:10;
    `;
    bigPlayBtn.addEventListener("click", () => instance.togglePlay());
    root.appendChild(bigPlayBtn);
  }

  // Controls bar
  const controls = document.createElement("div");
  controls.className = "vp-controls";
  controls.style.cssText = `
    position:absolute;bottom:0;left:0;right:0;padding:8px 12px;
    background:linear-gradient(transparent, rgba(0,0,0,0.7));
    display:flex;align-items:center;gap:8px;z-index:20;
    opacity:0;transition:opacity 0.3s;
  `;
  root.appendChild(controls);

  // Play/Pause button
  const playBtn = document.createElement("button");
  playBtn.type = "button";
  playBtn.innerHTML = "&#9654;";
  playBtn.title = "Play";
  playBtn.style.cssText = `
    background:none;border:none;color:#fff;font-size:16px;cursor:pointer;
    padding:4px;display:flex;align-items:center;justify-content:center;
    width:32px;height:32px;border-radius:50%;
  `;
  playBtn.addEventListener("click", () => instance.togglePlay());
  controls.appendChild(playBtn);

  // Progress bar
  const progressContainer = document.createElement("div");
  progressContainer.className = "vp-progress-container";
  progressContainer.style.cssText = "flex:1;height:6px;cursor:pointer;position:relative;";
  progressContainer.addEventListener("click", handleProgressClick);

  const progressBuffered = document.createElement("div");
  progressBuffered.className = "vp-progress-buffered";
  progressBuffered.style.cssText = "position:absolute;top:2px;left:0;height:2px;background:rgba(255,255,255,0.3);border-radius:3px;";

  const progressPlayed = document.createElement("div");
  progressPlayed.className = "vp-progress-played";
  progressPlayed.style.cssText = `position:absolute;top:2px;left:0;height:2px;background:${opts.accentColor};border-radius:3px;`;

  const progressHandle = document.createElement("div");
  progressHandle.className = "vp-progress-handle";
  progressHandle.style.cssText = `
    position:absolute;top:50%;width:14px;height:14px;margin-left:-7px;
    margin-top:-7px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);
    transform:scale(0);transition:transform 0.15s;
  `;

  progressContainer.append(progressBuffered, progressPlayed, progressHandle);
  controls.appendChild(progressContainer);

  // Time display
  const timeDisplay = document.createElement("span");
  timeDisplay.className = "vp-time";
  timeDisplay.textContent = "0:00 / 0:00";
  timeDisplay.style.cssText = "color:#fff;font-size:12px;font-family:'SF Mono',monospace;min-width:90px;text-align:right;user-select:none;";
  controls.appendChild(timeDisplay);

  // Volume control
  const volumeContainer = document.createElement("div");
  volumeContainer.className = "vp-volume";
  volumeContainer.style.cssText = "display:flex;align-items:center;gap:4px;";

  const volumeBtn = document.createElement("button");
  volumeBtn.type = "button";
  volumeBtn.innerHTML = "\u{1F50A}";
  volumeBtn.title = "Mute";
  volumeBtn.style.cssText = "background:none;border:none;color:#fff;cursor:pointer;font-size:14px;padding:2px;";
  volumeBtn.addEventListener("click", toggleMute);
  volumeContainer.appendChild(volumeBtn);

  const volumeSlider = document.createElement("input");
  volumeSlider.type = "range";
  volumeSlider.min = "0";
  volumeSlider.max = "1";
  volumeSlider.step = "0.05";
  volumeSlider.value = String(opts.volume);
  volumeSlider.style.cssText = "width:60px;accent-color:" + opts.accentColor + ";cursor:pointer;";
  volumeSlider.addEventListener("input", () => {
    video.volume = parseFloat(volumeSlider.value);
    updateVolumeIcon();
    opts.onVolumeChange?.(video.volume);
  });
  volumeContainer.appendChild(volumeSlider);
  controls.appendChild(volumeContainer);

  // Speed control
  const speedSelect = document.createElement("select");
  speedSelect.style.cssText = `background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:11px;padding:2px 4px;border-radius:4px;cursor:pointer;`;
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
  controls.appendChild(speedSelect);

  // Fullscreen button
  const fsBtn = document.createElement("button");
  fsBtn.type = "button";
  fsBtn.innerHTML = "\u{1F504}";
  fsBtn.title = "Fullscreen";
  fsBtn.style.cssText = "background:none;border:none;color:#fff;cursor:pointer;font-size:14px;padding:2px;";
  fsBtn.addEventListener("click", () => {
    if (instance.isFullscreen()) instance.exitFullscreen();
    else instance.enterFullscreen();
  });
  controls.appendChild(fsBtn);

  // PiP button
  const pipBtn = document.createElement("button");
  pipBtn.type = "button";
  pipBtn.innerHTML = "\u{1F3AF}";
  pipBtn.title = "Picture in Picture";
  pipBtn.style.cssText = "background:none;border:none;color:#fff;cursor:pointer;font-size:14px;padding:2px;";
  pipBtn.addEventListener("click", () => instance.enablePiP());
  controls.appendChild(pipBtn);

  // --- Helper Functions ---

  function formatTime(seconds: number): string {
    if (!isFinite(seconds)) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
  }

  function updateProgress(): void {
    const current = video.currentTime;
    const duration = video.duration || 0;
    const pct = duration > 0 ? current / duration : 0;

    progressPlayed.style.width = `${pct * 100}%`;
    progressHandle.style.transform = `translateX(-50%) scale(${pct > 0.02 && pct < 0.98 ? 1 : 0})`;
    timeDisplay.textContent = `${formatTime(current)} / ${formatTime(duration)}`;

    // Update buffered
    if (video.buffered.length > 0) {
      const buf = video.buffered.end(video.buffered.length - 1);
      progressBuffered.style.width = `${(buf / duration) * 100}%`;
    }

    opts.onTimeUpdate?.(current, duration);
  }

  function updatePlayState(): void {
    const playing = !video.paused;
    playBtn.innerHTML = playing ? "&#9208;" : "&#9654;";
    playBtn.title = playing ? "Pause" : "Play";
    if (bigPlayBtn) bigPlayBtn.style.display = playing ? "none" : "flex";
    opts.onPlayStateChange?.(playing);
  }

  function updateVolumeIcon(): void {
    if (video.muted || video.volume === 0) {
      volumeBtn.innerHTML = "\u{1F507}";
    } else if (video.volume < 0.5) {
      volumeBtn.innerHTML = "\u{1F509}";
    } else {
      volumeBtn.innerHTML = "\u{1F50A}";
    }
  }

  function toggleMute(): void {
    video.muted = !video.muted;
    updateVolumeIcon();
  }

  function handleProgressClick(e: MouseEvent): void {
    const rect = progressContainer.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (video.duration) video.currentTime = pct * video.duration;
  }

  // Progress dragging
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
    if (video.duration) video.currentTime = pct * video.duration;
    updateProgress();
  });
  document.addEventListener("mouseup", () => { isSeeking = false; });

  // Controls visibility
  root.addEventListener("mouseenter", () => { controls.style.opacity = "1"; });
  root.addEventListener("mouseleave", () => { if (!video.paused && opts.showControls) controls.style.opacity = "0"; });

  // Video events
  video.addEventListener("play", updatePlayState);
  video.addEventListener("pause", updatePlayState);
  video.addEventListener("timeupdate", updateProgress);
  video.addEventListener("volumechange", updateVolumeIcon);
  video.addEventListener("ended", () => { opts.onEnded?.(); });
  video.addEventListener("error", () => { opts.onError?.(new Error("Video error")); });

  // Keyboard shortcuts
  video.addEventListener("keydown", (e: KeyboardEvent) => {
    switch (e.key.toLowerCase()) {
      case " ": case "k": e.preventDefault(); instance.togglePlay(); break;
      case "f": if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); if (instance.isFullscreen()) instance.exitFullscreen(); else instance.enterFullscreen(); } break;
      case "m": e.preventDefault(); toggleMute(); break;
      case "arrowleft":
        e.preventDefault(); video.currentTime -= 5; break;
      case "arrowright":
        e.preventDefault(); video.currentTime += 5; break;
      case "j": e.preventDefault(); video.currentTime -= 10; break;
      case "l": e.preventDefault(); video.currentTime += 10; break;
      case "[": e.preventDefault(); video.currentTime -= 30; break;
      case "]": e.preventDefault(); video.currentTime += 30; break;
    }
  });

  // Double-click to toggle fullscreen
  root.addEventListener("dblclick", (e) => {
    if ((e.target as Element).tagName !== "BUTTON" && (e.target as Element).tagName !== "SELECT" && (e.target as Element).tagName !== "INPUT") {
      if (instance.isFullscreen()) instance.exitFullscreen();
      else instance.enterFullscreen();
    }
  });

  // --- Instance ---

  const instance: VideoPlayerInstance = {
    element: root,
    videoEl: video,

    async play() { await video.play(); },
    pause() { video.pause(); },
    async togglePlay() { if (video.paused) await video.play(); else video.pause(); },

    seek(time: number) { video.currentTime = time; },
    setVolume(vol: number) { video.volume = vol; volumeSlider.value = String(vol); updateVolumeIcon(); },
    setSpeed(speed: number) { video.playbackRate = speed; speedSelect.value = String(speed); },
    setQuality(src: string) { const cur = video.currentTime; video.src = src; video.currentTime = cur; },

    enterFullscreen() {
      if (root.requestFullscreen) root.requestFullscreen();
      else if ((root as any).webkitRequestFullscreen) (root as any).webkitRequestFullscreen();
    },

    exitFullscreen() {
      if (document.exitFullscreen) document.exitFullscreen();
    },

    isFullscreen(): boolean {
      return !!document.fullscreenElement;
    },

    async enablePiP() {
      if ("pictureInPicture" in video) {
        try { await (video as any).pictureInPicture.request(); } catch {}
      }
    },

    getCurrentTime() { return video.currentTime; },
    getDuration() { return video.duration || 0; },
    getBuffered() {
      const result: { start: number; end: number }[] = [];
      for (let i = 0; i < video.buffered.length; i++) {
        result.push({ start: video.buffered.start(i), end: video.buffered.end(i) });
      }
      return result;
    },

    loadVideo(src: string) {
      video.src = src;
      if (bigPlayBtn) bigPlayBtn.style.display = "flex";
    },

    addToPlaylist(item: PlaylistItem) {
      opts.playlist = [...(opts.playlist ?? []), item];
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}
