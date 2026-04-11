/**
 * Media Session API wrapper for controlling media playback from the OS
 * notification area / lock screen, with action handlers and metadata management.
 */

// --- Types ---

export interface MediaMetadata {
  /** Track title */
  title: string;
  /** Artist name */
  artist?: string;
  /** Album name */
  album?: string;
  /** Artwork URLs (by size) */
  artwork?: Array<{ src: string; sizes?: string; type?: string }>;
}

export interface MediaSessionAction {
  /** Action type */
  type: "play" | "pause" | "seekbackward" | "seekforward" | "previoustrack" | "nexttrack" | "stop" | "seekto" | "skipad";
  /** Display label (default: auto) */
  label?: string;
  /** Icon URL */
  icon?: string;
  /** Handler for this action */
  handler?: (details?: MediaSessionActionDetails) => void;
}

export interface MediaSessionOptions {
  /** Initial metadata */
  metadata?: MediaMetadata;
  /** Playback state */
  playbackState?: MediaSessionPlaybackState;
  /** Available actions with handlers */
  actions?: MediaSessionAction[];
  /** Seek backward/forward offset in seconds (default: 10) */
  seekOffset?: number;
  /** Called when position state changes (for progress bar) */
  onPositionUpdate?: (position: number, duration: number) => void;
  /** Auto-handle play/pause toggle (default: true) */
  autoTogglePlayPause?: boolean;
}

export interface MediaSessionInstance {
  /** Whether Media Session API is supported */
  readonly supported: boolean;
  /** Current playback state */
  readonly playbackState: MediaSessionPlaybackState | null;
  /** Update media metadata */
  setMetadata: (metadata: MediaMetadata) => void;
  /** Set playback state */
  setPlaybackState: (state: MediaSessionPlaybackState) => void;
  /** Set position state (for progress bar display) */
  setPositionState: (state?: { duration?: number; playbackRate?: number; position?: number }) => void;
  /** Register or update an action handler */
  setActionHandler: (action: MediaSessionAction["type"], handler?: (details?: MediaSessionActionDetails) => void) => void;
  /** Set all actions at once */
  setActions: (actions: MediaSessionAction[]) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Main ---

export function createMediaSession(options: MediaSessionOptions = {}): MediaSessionInstance {
  const {
    metadata,
    playbackState = "none",
    actions,
    seekOffset = 10,
    onPositionUpdate,
    autoTogglePlayPause = true,
  } = options;

  let destroyed = false;
  const supported = typeof navigator !== "undefined" && "mediaSession" in navigator;

  // Map of registered handlers
  const handlers = new Map<string, ((details?: MediaSessionActionDetails) => void) | undefined>();

  function applyMetadata(meta: MediaMetadata): void {
    if (!supported || destroyed) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: meta.title,
      artist: meta.artist,
      album: meta.album,
      artwork: meta.artwork,
    });
  }

  function applyPlaybackState(state: MediaSessionPlaybackState): void {
    if (!supported || destroyed) return;
    navigator.mediaSession.playbackState = state;
  }

  function registerHandler(type: string, handler?: (details?: MediaSessionActionDetails) => void): void {
    if (!supported || destroyed) return;
    handlers.set(type, handler);
    if (handler) {
      navigator.mediaSession.setActionHandler(type as MediaSessionActionType, handler);
    } else {
      try {
        navigator.mediaSession.setActionHandler(type as MediaSessionActionType, null);
      } catch { /* some actions cannot be removed */ }
    }
  }

  // Initialize
  if (supported) {
    if (metadata) applyMetadata(metadata);
    applyPlaybackState(playbackState);
    if (seekOffset > 0) {
      (navigator.mediaSession as unknown as { seekOffset?: number }).seekOffset = seekOffset;
    }

    // Register default actions
    if (actions) {
      for (const action of actions) {
        registerHandler(action.type, action.handler);
      }
    }

    // Auto-toggle play/pause
    if (autoTogglePlayPause) {
      if (!handlers.has("play")) {
        registerHandler("play", () => {
          applyPlaybackState("playing");
        });
      }
      if (!handlers.has("pause")) {
        registerHandler("pause", () => {
          applyPlaybackState("paused");
        });
      }
    }
  }

  const instance: MediaSessionInstance = {
    get supported() { return supported; },
    get playbackState() {
      return supported ? navigator.mediaSession.playbackState : null;
    },

    setMetadata(meta: MediaMetadata) { applyMetadata(meta); },

    setPlaybackState(state: MediaSessionPlaybackState) { applyPlaybackState(state); },

    setPositionState(state) {
      if (!supported || destroyed) return;
      if (state) {
        navigator.mediaSession.setPositionState(state);
      }
    },

    setActionHandler(type, handler) { registerHandler(type, handler); },

    setActions(actionList: MediaSessionAction[]) {
      for (const action of actionList) {
        registerHandler(action.type, action.handler);
      }
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      handlers.clear();
      if (supported) {
        try {
          navigator.mediaSession.playbackState = "none";
          const actionTypes: MediaSessionActionType[] = [
            "play", "pause", "seekbackward", "seekforward",
            "previoustrack", "nexttrack", "stop",
          ];
          for (const t of actionTypes) {
            try { navigator.mediaSession.setActionHandler(t, null); } catch { /* ignore */ }
          }
        } catch { /* ignore */ }
      }
    },
  };

  return instance;
}

// --- Standalone utilities ---

/** Check if Media Session API is supported */
export function isMediaSessionSupported(): boolean {
  return typeof navigator !== "undefined" && "mediaSession" in navigator;
}
