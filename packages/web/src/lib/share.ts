/**
 * Share API: Web Share API wrapper with fallback strategies for sharing
 * content to other apps/platforms. Supports sharing text, URLs, files,
 * and rich data with automatic fallback to clipboard, mailto links,
 * and custom share sheets when native sharing is unavailable.
 */

// --- Types ---

export interface ShareData {
  /** Title of the content being shared */
  title?: string;
  /** Text description */
  text?: string;
  /** URL to share */
  url?: string;
  /** Files to share (requires user gesture) */
  files?: File[];
}

export interface ShareOptions {
  /** Fallback strategy if Web Share API is not available */
  fallback?: "clipboard" | "mailto" | "custom" | "none";
  /** Custom fallback handler */
  onFallback?: (data: ShareData) => Promise<void>;
  /** Callback on successful share */
  onSuccess?: () => void;
  /** Callback on error or cancellation */
  onError?: (error: unknown) => void;
  /** Reset share state after ms (0 = no reset) */
  resetAfterMs?: number;
}

export interface ShareTarget {
  name: string;
  icon: string;       // URL or emoji
  url: string;        // URL template with {url}, {text}, {title} placeholders
  color?: string;     // Brand color for UI
}

export interface ShareManagerInstance {
  /** Check if Web Share API is available */
  isAvailable: () => boolean;
  /** Check if file sharing is supported */
  canShareFiles: () => boolean;
  /** Share content using best available method */
  share: (data: ShareData, options?: ShareOptions) => Promise<boolean>;
  /** Share just a URL */
  shareUrl: (url: string, title?: string) => Promise<boolean>;
  /** Share just text */
  shareText: (text: string, title?: string) => Promise<boolean>;
  /** Share files */
  shareFiles: (files: File[], title?: string, text?: string) => Promise<boolean>;
  /** Get list of available share targets for fallback UI */
  getShareTargets: () => ShareTarget[];
  /** Register a custom share target */
  registerTarget: (target: ShareTarget) => void;
  /** Remove a custom share target */
  unregisterTarget: (name: string) => void;
  /** Generate a mailto link for email sharing */
  generateMailtoLink: (data: ShareData) => string;
  /** Copy share data to clipboard as fallback */
  copyToClipboardFallback: (data: ShareData) => Promise<boolean>;
  /** Destroy */
  destroy: () => void;
}

// --- Default share targets ---

const DEFAULT_SHARE_TARGETS: ShareTarget[] = [
  {
    name: "Twitter / X",
    icon: "\u{1D54F}",
    url: "https://twitter.com/intent/tweet?text={text}&url={url}",
    color: "#1DA1F2",
  },
  {
    name: "Facebook",
    icon: "\u{1D540}",
    url: "https://www.facebook.com/sharer/sharer.php?u={url}",
    color: "#1877F2",
  },
  {
    name: "LinkedIn",
    icon: "\u{1D541}",
    url: "https://www.linkedin.com/sharing/share-offsite/?url={url}",
    color: "#0A66C2",
  },
  {
    name: "WhatsApp",
    icon: "\u{1D542}",
    url: "https://wa.me/?text={text}%20{url}",
    color: "#25D366",
  },
  {
    name: "Telegram",
    icon: "\u{1D543}",
    url: "https://t.me/share/url?url={url}&text={text}",
    color: "#0088CC",
  },
  {
    name: "Email",
    icon: "\u2709",
    url: "",
    color: "#EA4335",
  },
];

// --- Helpers ---

function encodeShareParam(value: string): string {
  return encodeURIComponent(value);
}

function renderTemplate(template: string, data: ShareData): string {
  return template
    .replace(/\{url\}/g, encodeShareParam(data.url ?? ""))
    .replace(/\{text\}/g, encodeShareParam(data.text ?? ""))
    .replace(/\{title\}/g, encodeShareParam(data.title ?? ""));
}

// --- Main Class ---

export class ShareManager {
  create(options?: Partial<ShareOptions>): ShareManagerInstance {
    let destroyed = false;
    const customTargets = new Map<string, ShareTarget>();

    async function doShare(data: ShareData, opts: ShareOptions = {}): Promise<boolean> {
      if (destroyed) return false;

      const mergedOpts: ShareOptions = { ...options, ...opts };

      // Try native Web Share API first
      if (isNativeAvailable()) {
        try {
          const sharePayload: ShareData = {};
          if (data.title) sharePayload.title = data.title;
          if (data.text) sharePayload.text = data.text;
          if (data.url) sharePayload.url = data.url;

          // Files require canShare check
          if (data.files?.length && navigator.canShare?.({ files: data.files })) {
            sharePayload.files = data.files;
          }

          await navigator.share(sharePayload);
          mergedOpts.onSuccess?.();
          return true;
        } catch (err) {
          // User cancelled or error — fall through to fallback
          if ((err as Error).name === "AbortError") {
            mergedOpts.onError?.(err);
            return false;
          }
        }
      }

      // Fallback
      const fallback = mergedOpts.fallback ?? "clipboard";

      switch (fallback) {
        case "clipboard":
          return await copyFallback(data, mergedOpts);

        case "mailto":
          return await mailtoFallback(data, mergedOpts);

        case "custom":
          if (mergedOpts.onFallback) {
            await mergedOpts.onFallback(data);
            return true;
          }
          return await copyFallback(data, mergedOpts);

        case "none":
          mergedOpts.onError?.(new Error("No sharing method available"));
          return false;

        default:
          return await copyFallback(data, mergedOpts);
      }
    }

    function isNativeAvailable(): boolean {
      return typeof navigator !== "undefined" &&
        typeof navigator.share === "function";
    }

    async function copyFallback(data: ShareData, opts: ShareOptions): Promise<boolean> {
      const textParts: string[] = [];
      if (data.title) textParts.push(data.title);
      if (data.text) textParts.push(data.text);
      if (data.url) textParts.push(data.url);

      const text = textParts.join("\n");

      try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
          await navigator.clipboard.writeText(text);
          opts.onSuccess?.();
          return true;
        }

        // execCommand fallback
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0;";
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand("copy");
        document.body.removeChild(textarea);

        if (success) {
          opts.onSuccess?.();
          return true;
        }

        throw new Error("Copy failed");

      } catch (err) {
        opts.onError?.(err);
        return false;
      }
    }

    async function mailtoFallback(data: ShareData & { subject?: string }, _opts: ShareOptions): Promise<boolean> {
      try {
        const link = instance.generateMailtoLink(data);
        window.location.href = link;
        _opts.onSuccess?.();
        return true;
      } catch (err) {
        _opts.onError?.(err);
        return false;
      }
    }

    const instance: ShareManagerInstance = {

      isAvailable: isNativeAvailable,

      canShareFiles(): boolean {
        return typeof navigator !== "undefined" &&
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [new File([""], "test.txt")] });
      },

      share: doShare,

      async shareUrl(url, title): Promise<boolean> {
        return doShare({ url, title }, options);
      },

      async shareText(text, title): Promise<boolean> {
        return doShare({ text, title }, options);
      },

      async shareFiles(files, title, text): Promise<boolean> {
        return doShare({ title, text, files }, options);
      },

      getShareTargets(): ShareTarget[] {
        return [...DEFAULT_SHARE_TARGETS, ...Array.from(customTargets.values())];
      },

      registerTarget(target: ShareTarget): void {
        customTargets.set(target.name, target);
      },

      unregisterTarget(name: string): void {
        customTargets.delete(name);
      },

      generateMailtoLink(data: ShareData): string {
        const params: string[] = [];
        if (data.title) {
          params.push(`subject=${encodeShareParam(data.title)}`);
        }
        const bodyParts: string[] = [];
        if (data.text) bodyParts.push(data.text);
        if (data.url) bodyParts.push(data.url);
        if (bodyParts.length > 0) {
          params.push(`body=${encodeShareParam(bodyParts.join("\n"))}`);
        }
        return `mailto:?${params.join("&")}`;
      },

      copyToClipboardFallback: copyFallback,

      destroy(): void {
        destroyed = true;
        customTargets.clear();
      },
    };

    return instance;
  }
}

/** Convenience: create a share manager */
export function createShareManager(options?: Partial<ShareOptions>): ShareManagerInstance {
  return new ShareManager().create(options);
}

// --- Standalone utilities ---

/** Quick share — tries native, falls back to clipboard */
export async function quickShare(
  title: string,
  text?: string,
  url?: string,
): Promise<boolean> {
  return createShareManager().share({ title, text, url });
}

/** Check if Web Share API is available */
export function isShareAvailable(): boolean {
  return typeof navigator !== "undefined" &&
    typeof navigator.share === "function";
}
