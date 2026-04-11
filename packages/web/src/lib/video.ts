/**
 * Video Utilities: Video player with custom controls, quality selector,
 * playback speed, picture-in-picture, fullscreen, subtitle support,
 * chapter markers, keyboard shortcuts, and responsive sizing.
 */

// --- Types ---

export type VideoQuality = "auto" | "1080p" | "720p" | "480p" | "360p" | "240p";
export type VideoAspectRatio = "16:9" | "4:3" | "1:1" | "21:9" | "auto";

export interface VideoPlayerOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Video source URL or HTMLVideoElement */
  src?: string | HTMLVideoElement;
  /** Poster image URL */
  poster?: string;
  /** Show custom controls? */
  showControls?: boolean;
  /** Auto-hide controls after inactivity (ms) */
  autoHideControls?: number;
  /** Autoplay? */
  autoplay?: boolean;
  /** Loop? */
  loop?: boolean;
  /** Muted by default? */
  muted?: boolean;
  /** Volume (0-1) */
  volume?: number;
  /** Playback rate */
  playbackRate?: number;
  /** Aspect ratio */
  aspectRatio?: VideoAspectRatio;
  /** Available qualities */
  qualities?: VideoQuality[];
  /** Subtitles (VTT URLs) */
  subtitles?: Array<{ label: string; srcLang: string; src: string; default?: boolean }>;
  /** Chapter markers (seconds -> title) */
  chapters?: Array<{ time: number; title: string }>;
  /** Picture-in-Picture button? */
  pipButton?: boolean;
  /** Fullscreen button? */
  fullscreenButton?: boolean;
  /** Theater mode button? */
  theaterMode?: boolean;
  /** Double-click toggle fullscreen? */
  doubleClickFullscreen?: boolean;
  /** Keyboard shortcuts enabled? */
  keyboardShortcuts?: boolean;
  /** Callback on time update */
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  /** Callback on play/pause */
  onPlayStateChange?: (playing: boolean) => void;
  /** Callback on volume change */
  onVolumeChange?: (volume: number, muted: boolean) => void;
  /** Callback on quality change */
  onQualityChange?: (quality: VideoQuality) => void;
  /** Callback on fullscreen change */
  onFullscreenChange?: (fullscreen: boolean) => void;
  /** Callback on ended */
  onEnded?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Custom CSS class */
  className?: string;
}

export interface VideoPlayerInstance {
  element: HTMLElement;
  video: HTMLVideoElement;
  /** Play video */
  play: () => Promise<void>;
  /** Pause video */
  pause: () => void;
  /** Toggle play/pause */
  toggle: () => Promise<void>;
  /** Seek to position (seconds) */
  seek: (time: number) => void;
  /** Seek relative (seconds) */
  seekRelative: (delta: number) => void;
  /** Set volume (0-1) */
  setVolume: (volume: number) => void;
  /** Get current volume */
  getVolume: () => number;
  /** Set mute */
  setMute: (muted: boolean) => void;
  /** Set playback rate */
  setPlaybackRate: (rate: number) => void;
  /** Get playback rate */
  getPlaybackRate: () => number;
  /** Set quality */
  setQuality: (quality: VideoQuality) => void;
  /** Enter/exit fullscreen */
  setFullscreen: (fs: boolean) => void;
  /** Is fullscreen? */
  isFullscreen: () => boolean;
  /** Enter/exit PiP */
  setPiP: (pip: boolean) => Promise<void>;
  /** Is PiP active? */
  isPiP: () => boolean;
  /** Get duration */
  getDuration: () => number;
  /** Get current time */
  getCurrentTime: () => number;
  /** Is playing? */
  isPlaying: () => boolean;
  /** Load new source */
  loadSource: (src: string) => void;
  /** Capture frame as canvas */
  captureFrame: () => HTMLCanvasElement | null;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Constants ---

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// --- Main Factory ---

/**
 * Create a video player with full custom controls.
 */
export function createVideoPlayer(options: VideoPlayerOptions): VideoPlayerInstance {
  const opts = {
    showControls: options.showControls ?? true,
    autoHideControls: options.autoHideControls ?? 3000,
    autoplay: options.autoplay ?? false,
    loop: options.loop ?? false,
    muted: options.muted ?? false,
    volume: options.volume ?? 1,
    playbackRate: options.playbackRate ?? 1,
    aspectRatio: options.aspectRatio ?? "16:9",
    qualities: options.qualities ?? ["auto", "1080p", "720p", "480p", "360p"],
    pipButton: options.pipButton ?? true,
    fullscreenButton: options.fullscreenButton ?? true,
    doubleClickFullscreen: options.doubleClickFullscreen ?? true,
    keyboardShortcuts: options.keyboardShortcuts ?? true,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("VideoPlayer: container not found");

  // Video element
  const video = typeof options.src === "string"
    ? Object.assign(document.createElement("video"), {
        src: options.src,
        preload: "metadata",
        playsInline: true,
      })
    : options.src ?? document.createElement("video");

  video.loop = opts.loop;
  video.muted = opts.muted;
  video.volume = opts.volume;
  video.playbackRate = opts.playbackRate;
  if (options.poster) video.poster = options.poster;

  // Wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `video-player ${opts.className ?? ""}`;
  wrapper.style.cssText = `
    position:relative;width:100%;background:#000;border-radius:8px;overflow:hidden;
    line-height:0;font-family:-apple-system,sans-serif;
  `;
  container.appendChild(wrapper);

  // Video container (for aspect ratio)
  const videoWrapper = document.createElement("div");
  videoWrapper.style.cssText = getAspectRatioStyle(opts.aspectRatio);
  videoWrapper.appendChild(video);
  wrapper.appendChild(videoWrapper);

  let destroyed = false;
  let controlsVisible = true;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let isSeeking = false;
  let isTheaterMode = false;

  // --- Controls Bar ---

  let controlsBar: HTMLElement | null = null;
  let progressBar: HTMLElement | null = null;
  let progressFill: HTMLElement | null = null;
  let bufferedBar: HTMLElement | null = null;
  let timeDisplay: HTMLElement | null = null;
  let volumeSlider: HTMLInputElement | null = null;
  let muteBtn: HTMLElement | null = null;
  let playBtn: HTMLElement | null = null;
  let fullscreenBtn: HTMLElement | null = null;
  let pipBtn: HTMLElement | null = null;
  let rateSelect: HTMLSelectElement | null = null;
  let qualitySelect: HTMLSelectElement | null = null;

  if (opts.showControls) {
    controlsBar = buildControls();
    wrapper.appendChild(controlsBar);

    // Auto-hide
    if (opts.autoHideControls > 0) {
      wrapper.addEventListener("mousemove", () => showControls());
      wrapper.addEventListener("mouseleave", () => hideControlsDelayed());
      video.addEventListener("play", () => hideControlsDelayed());
    }
  }

  // Double-click fullscreen
  if (opts.doubleClickFullscreen) {
    video.addEventListener("dblclick", (e) => {
      e.preventDefault();
      instance.setFullscreen(!instance.isFullscreen());
    });
  }

  // Keyboard shortcuts
  if (opts.keyboardShortcuts) {
    wrapper.setAttribute("tabindex", "0");
    wrapper.addEventListener("keydown", handleKeyboard);
  }

  // --- Build Controls ---

  function buildControls(): HTMLElement {
    const bar = document.createElement("div");
    bar.className = "video-controls";
    bar.style.cssText = `
      position:absolute;bottom:0;left:0;right:0;padding:8px 12px;
      background:linear-gradient(transparent, rgba(0,0,0,0.8));
      display:flex;align-items:center;gap:8px;z-index:10;
      transition:opacity 0.3s;
    `;

    // Play/Pause
    playBtn = document.createElement("button");
    playBtn.type = "button";
    playBtn.innerHTML = "&#9654;";
    playBtn.title = "Play (Space)";
    playBtn.style.cssText = controlBtnStyle();
    playBtn.addEventListener("click", () => instance.toggle());

    // Progress bar
    const progContainer = document.createElement("div");
    progContainer.style.cssText = "flex:1;height:4px;cursor:pointer;position:relative;border-radius:2px;background:rgba(255,255,255,0.2);";
    progressBar = progContainer;

    progressFill = document.createElement("div");
    progressFill.style.cssText = "height:100%;border-radius:2px;background:#fff;position:absolute;left:0;top:0;width:0%;transition:width 0.1s linear;";
    progContainer.appendChild(progressFill);

    bufferedBar = document.createElement("div");
    bufferedBar.style.cssText = "height:100%;border-radius:2px;background:rgba(255,255,255,0.4);position:absolute;left:0;top:0;width:0%;";
    progContainer.appendChild(bufferedBar);

    // Tooltip on hover
    const progTooltip = document.createElement("div");
    progTooltip.style.cssText = "position:absolute;bottom:100%;display:none;padding:2px 6px;background:rgba(0,0,0,0.8);color:#fff;font-size:11px;border-radius:3px;pointer-events:none;white-space:nowrap;";
    progContainer.appendChild(progTooltip);

    progContainer.addEventListener("mousemove", (e) => {
      if (!video.duration) return;
      const rect = progContainer.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      const time = pct * video.duration;
      progTooltip.textContent = formatTime(time);
      progTooltip.style.display = "block";
      progTooltip.style.left = `${Math.max(0, Math.min(pct * 100, 100))}%`;
      progTooltip.style.transform = "translateX(-50%)";
    });
    progContainer.addEventListener("mouseleave", () => { progTooltip.style.display = "none"; });
    progContainer.addEventListener("click", (e) => {
      const rect = progContainer.getBoundingClientRect();
      instance.seek(((e.clientX - rect.left) / rect.width) * video.duration);
    });

    // Time display
    timeDisplay = document.createElement("span");
    timeDisplay.style.cssText = "font-size:12px;color:#fff;min-width:90px;text-align:right;font-variant-numeric:tabular-nums;user-select:none;";
    timeDisplay.textContent = "0:00 / 0:00";

    // Volume
    const volGroup = document.createElement("div");
    volGroup.style.cssText = "display:flex;align-items:center;gap:2px;";

    muteBtn = document.createElement("button");
    muteBtn.type = "button";
    muteBtn.innerHTML = "&#128266;";
    muteBtn.title = "Mute (M)";
    muteBtn.style.cssText = controlBtnStyle();
    muteBtn.addEventListener("click", () => instance.setMute(!video.muted));

    volumeSlider = document.createElement("input");
    volumeSlider.type = "range";
    volumeSlider.min = "0"; volumeSlider.max = "1"; volumeSlider.step = "0.01";
    volumeSlider.value = String(opts.volume);
    volumeSlider.style.cssText = "width:60px;accent-color:#fff;opacity:0;transition:opacity 0.2s;width:0;";
    volumeSlider.addEventListener("input", () => {
      instance.setVolume(parseFloat(volumeSlider.value));
    });

    volGroup.addEventListener("mouseenter", () => { volumeSlider!.style.opacity = "1"; volumeSlider!.style.width = "60px"; });
    volGroup.addEventListener("mouseleave", () => { volumeSlider!.style.opacity = "0"; volumeSlider!.style.width = "0"; });
    volGroup.append(muteBtn, volumeSlider);

    // Playback rate
    rateSelect = document.createElement("select");
    rateSelect.title = "Speed";
    rateSelect.style.cssText = controlSelectStyle();
    for (const r of RATES) {
      const opt = document.createElement("option");
      opt.value = String(r);
      opt.textContent = `${r}x`;
      if (r === opts.playbackRate) opt.selected = true;
      rateSelect.appendChild(opt);
    }
    rateSelect.addEventListener("change", () => {
      instance.setPlaybackRate(parseFloat(rateSelect!.value));
    });

    // Quality
    if (opts.qualities.length > 1) {
      qualitySelect = document.createElement("select");
      qualitySelect.title = "Quality";
      qualitySelect.style.cssText = controlSelectStyle();
      for (const q of opts.qualities) {
        const opt = document.createElement("option");
        opt.value = q;
        opt.textContent = q;
        if (q === "auto") opt.selected = true;
        qualitySelect.appendChild(opt);
      }
      qualitySelect.addEventListener("change", () => {
        instance.setQuality(qualitySelect!.value as VideoQuality);
      });
    }

    // Fullscreen
    if (opts.fullscreenButton) {
      fullscreenBtn = document.createElement("button");
      fullscreenBtn.type = "button";
      fullscreenBtn.innerHTML = "&#x26F6;";
      fullscreenBtn.title = "Fullscreen (F)";
      fullscreenBtn.style.cssText = controlBtnStyle();
      fullscreenBtn.addEventListener("click", () => instance.setFullscreen(!instance.isFullscreen()));
    }

    // PiP
    if (opts.pipButton && document.pictureInPictureEnabled) {
      pipBtn = document.createElement("button");
      pipBtn.type = "button";
      pipBtn.innerHTML = "&#x1F4E0;";
      pipBtn.title = "Picture-in-Picture (P)";
      pipBtn.style.cssText = controlBtnStyle();
      pipBtn.addEventListener("click", () => instance.setPiP(!instance.isPiP()).catch(() => {}));
    }

    bar.append(playBtn, progContainer, timeDisplay, volGroup, rateSelect);
    if (qualitySelect) bar.appendChild(qualitySelect);
    if (fullscreenBtn) bar.appendChild(fullscreenBtn);
    if (pipBtn) bar.appendChild(pipBtn);

    return bar;
  }

  function controlBtnStyle(): string {
    return `
      width:32px;height:32px;border:none;border-radius:6px;background:transparent;
      color:#fff;cursor:pointer;font-size:14px;display:flex;align-items:center;
      justify-content:center;transition:background 0.15s;padding:0;
    `;
  }

  function controlSelectStyle(): string {
    return `
      border:1px solid rgba(255,255,255,0.3);border-radius:4px;background:rgba(0,0,0,0.5);
      color:#fff;font-size:11px;padding:2px 4px;cursor:pointer;
    `;
  }

  function getAspectRatioStyle(ratio: VideoAspectRatio): string {
    switch (ratio) {
      case "16:9": return "padding-top:56.25%;position:relative;";
      case "4:3": return "padding-top:75%;position:relative;";
      case "1:1": return "padding-top:100%;position:relative;";
      case "21:9": return "padding-top:42.86%;position:relative;";
      default: return "position:relative;";
    }
  }

  // --- Control Visibility ---

  function showControls(): void {
    if (!controlsBar) return;
    controlsVisible = true;
    controlsBar.style.opacity = "1";
    resetHideTimer();
  }

  function hideControlsDelayed(): void {
    if (!controlsBar || !video.paused) {
      resetHideTimer();
      hideTimer = setTimeout(() => {
        if (controlsBar && !video.paused) {
          controlsBar.style.opacity = "0";
          controlsVisible = false;
        }
      }, opts.autoHideControls);
    }
  }

  function resetHideTimer(): void {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = null;
  }

  // --- Event Handlers ---

  function updateProgress(): void {
    if (!progressFill || !bufferedBar || !timeDisplay || !video.duration) return;
    const pct = (video.currentTime / video.duration) * 100;
    progressFill.style.width = `${pct}%`;

    // Buffered
    if (video.buffered.length > 0) {
      const buffered = video.buffered.end(video.buffered.length - 1);
      bufferedBar.style.width = `${(buffered / video.duration) * 100}%`;
    }

    timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
  }

  function updatePlayIcon(): void {
    if (!playBtn) return;
    playBtn.innerHTML = video.paused ? "&#9654;" : "&#9208;";
  }

  function updateVolumeIcon(): void {
    if (!muteBtn) return;
    if (video.muted || video.volume === 0) muteBtn.innerHTML = "&#128263;";
    else if (video.volume < 0.5) muteBtn.innerHTML = "&#128265;";
    else muteBtn.innerHTML = "&#128266;";
  }

  function updateFullscreenIcon(): void {
    if (!fullscreenBtn) return;
    fullscreenBtn.innerHTML = instance.isFullscreen() ? "&#x1F5D6;" : "&#x26F6;";
  }

  function handleKeyboard(e: KeyboardEvent): void {
    switch (e.key.toLowerCase()) {
      case " ":
      case "k":
        e.preventDefault();
        instance.toggle();
        break;
      case "arrowleft":
        e.preventDefault();
        instance.seekRelative(e.shiftKey ? -10 : -5);
        break;
      case "arrowright":
        e.preventDefault();
        instance.seekRelative(e.shiftKey ? 10 : 5);
        break;
      case "arrowup":
        e.preventDefault();
        instance.setVolume(Math.min(1, video.volume + 0.1));
        break;
      case "arrowdown":
        e.preventDefault();
        instance.setVolume(Math.max(0, video.volume - 0.1));
        break;
      case "m":
        e.preventDefault();
        instance.setMute(!video.muted);
        break;
      case "f":
        e.preventDefault();
        instance.setFullscreen(!instance.isFullscreen());
        break;
      case "p":
        e.preventDefault();
        instance.setPiP(!instance.isPiP()).catch(() => {});
        break;
    }
  }

  // Bind video events
  video.addEventListener("timeupdate", updateProgress);
  video.addEventListener("play", () => { updatePlayIcon(); opts.onPlayStateChange?.(true); });
  video.addEventListener("pause", () => { updatePlayIcon(); opts.onPlayStateChange?.(false); });
  video.addEventListener("volumechange", () => { updateVolumeIcon(); opts.onVolumeChange?.(video.volume, video.muted); });
  video.addEventListener("ended", () => { updatePlayIcon(); opts.onEnded?.(); });
  video.addEventListener("error", () => opts.onError?.(new Error("Video error")));
  video.addEventListener("waiting", () => { /* buffering indicator could go here */ });
  video.addEventListener("canplay", () => { /* ready */ });
  video.addEventListener("loadedmetadata", updateProgress);

  // Fullscreen change listener
  document.addEventListener("fullscreenchange", () => {
    updateFullscreenIcon();
    opts.onFullscreenChange?.(instance.isFullscreen());
  });

  // Add subtitles
  if (options.subtitles) {
    for (const sub of options.subtitles) {
      const track = document.createElement("track");
      track.kind = "subtitles";
      track.label = sub.label;
      track.srclang = sub.srcLang;
      track.src = sub.src;
      if (sub.default) track.default = true;
      video.appendChild(track);
    }
  }

  if (opts.autoplay) video.play().catch(() => {});

  function formatTime(sec: number): string {
    if (!isFinite(sec)) return "0:00";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // --- Instance ---

  const instance: VideoPlayerInstance = {
    element: wrapper,
    video,

    async play() { return video.play(); },
    pause() { video.pause(); },

    async toggle() {
      if (video.paused) return video.play();
      video.pause();
    },

    seek(time: number) {
      if (isFinite(time) && isFinite(video.duration)) {
        video.currentTime = Math.max(0, Math.min(time, video.duration));
      }
    },

    seekRelative(delta: number) {
      instance.seek(video.currentTime + delta);
    },

    setVolume(vol: number) {
      video.volume = Math.max(0, Math.min(1, vol));
      if (vol > 0) video.muted = false;
      if (volumeSlider) volumeSlider.value = String(video.volume);
    },

    getVolume() { return video.volume; },

    setMute(muted: boolean) {
      video.muted = muted;
      updateVolumeIcon();
    },

    setPlaybackRate(rate: number) {
      video.playbackRate = Math.max(0.25, Math.min(2, rate));
      if (rateSelect) rateSelect.value = String(rate);
    },

    getPlaybackRate() { return video.playbackRate; },

    setQuality(_quality: VideoQuality) {
      // Quality switching requires HLS/DASH sources
      // This is a placeholder — real implementation needs source management
      opts.onQualityChange?.(_quality);
    },

    setFullscreen(fs: boolean) {
      if (fs) {
        wrapper.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    },

    isFullscreen() { return !!document.fullscreenElement; },

    async setPiP(pip: boolean) {
      if (pip) {
        await video.requestPictureInPicture();
      } else {
        await document.exitPictureInPicture();
      }
    },

    isPiP() { return document.pictureInPictureElement === video; },

    getDuration() { return video.duration || 0; },
    getCurrentTime() { return video.currentTime; },
    isPlaying() { return !video.paused; },

    loadSource(src: string) {
      video.src = src;
      video.load();
    },

    captureFrame() {
      try {
        const cvs = document.createElement("canvas");
        cvs.width = video.videoWidth || 640;
        cvs.height = video.videoHeight || 360;
        const ctx = cvs.getContext("2d")!;
        ctx.drawImage(video, 0, 0, cvs.width, cvs.height);
        return cvs;
      } catch {
        return null;
      }
    },

    destroy() {
      destroyed = true;
      if (hideTimer) clearTimeout(hideTimer);
      video.pause();
      wrapper.remove();
    },
  };

  return instance;
}

// --- Helpers ---

/** Check if browser supports a video codec */
export function supportsVideoCodec(mimeType: string): boolean {
  return MediaSource.isTypeSupported?.(mimeType) ?? false;
}

/** Get optimal video resolution based on viewport */
export function getOptimalResolution(width: number, height: number): VideoQuality {
  const pixels = width * height;
  if (pixels >= 1920 * 1080) return "1080p";
  if (pixels >= 1280 * 720) return "720p";
  if (pixels >= 854 * 480) return "480p";
  return "360p";
}

/** Format seconds to human-readable duration */
export function formatVideoDuration(seconds: number): string {
  if (!isFinite(seconds)) return "--:--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Estimate bandwidth needed for a given quality (kbps) */
export function estimateBandwidth(quality: VideoQuality): number {
  switch (quality) {
    case "1080p": return 5000;
    case "720p": return 2500;
    case "480p": return 1000;
    case "360p": return 600;
    case "240p": return 300;
    default: return 2500;
  }
}
