/**
 * Web Share API + Share Target API wrapper for sharing content to other apps,
 * with fallback handling for unsupported browsers/contexts.
 */

// --- Types ---

export interface ShareData {
  /** Title to share */
  title?: string;
  /** Text content to share */
  text?: string;
  /** URL to share */
  url?: string;
  /** Files to share (requires ShareTarget registration) */
  files?: File[];
}

export interface ShareOptions {
  /** Fallback: copy to clipboard instead (default: true) */
  useClipboardFallback?: boolean;
  /** Fallback: show a custom dialog/panel */
  fallbackDialog?: (data: ShareData) => void;
  /** Called on successful share */
  onSuccess?: () => void;
  /** Called on error or abort */
  onError?: (error: unknown) => void;
}

export interface ShareTargetRegistration {
  /** Action URL for the share target */
  action: string;
  /** Method ("GET" or "POST") */
  method: "GET" | "POST";
  /** Encoded type */
  enctype: string;
  /** Accepted parameters */
  params: {
    title?: string;
    text?: string;
    url?: string;
    files?: string[];
  };
}

export interface ShareInstance {
  /** Whether Web Share API is available */
  readonly canShare: boolean;
  /** Whether file sharing is supported */
  readonly canShareFiles: boolean;
  /** Share content */
  share: (data: ShareData, options?: ShareOptions) => Promise<boolean>;
  /** Check if specific data can be shared */
  checkCanShare: (data: Partial<ShareData>) => boolean;
  /** Destroy */
  destroy: () => void;
}

// --- Helpers ---

function buildShareText(data: ShareData): string {
  const parts: string[] = [];
  if (data.title) parts.push(data.title);
  if (data.text) parts.push(data.text);
  if (data.url) parts.push(data.url);
  return parts.join("\n");
}

// --- Main ---

export function createShareApi(): ShareInstance {
  const supported = typeof navigator !== "undefined" && "share" in navigator;
  let canFiles = false;

  // Check file support
  if (supported && "canShare" in navigator) {
    try {
      canFiles = (navigator as unknown as { canShare: (data: { files?: File[] }) => boolean })
        .canShare({ files: [new File([""], "test.txt")] });
    } catch { canFiles = false; }
  }

  async function doShare(data: ShareData, options: ShareOptions = {}): Promise<boolean> {
    const { useClipboardFallback = true, fallbackDialog, onSuccess, onError } = options;

    if (!supported) {
      // Fallback path
      if (fallbackDialog) {
        fallbackDialog(data);
        return true;
      }
      if (useClipboardFallback) {
        try {
          const text = buildShareText(data);
          await navigator.clipboard.writeText(text);
          onSuccess?.();
          return true;
        } catch (err) {
          onError?.(err);
          return false;
        }
      }
      onError?.(new Error("Web Share API not supported"));
      return false;
    }

    try {
      const sharePayload: { title?: string; text?: string; url?: string; files?: File[] } = {};
      if (data.title) sharePayload.title = data.title;
      if (data.text) sharePayload.text = data.text;
      if (data.url) sharePayload.url = data.url;
      if (data.files && data.files.length > 0 && canFiles) {
        sharePayload.files = data.files;
      }

      await navigator.share(sharePayload);
      onSuccess?.();
      return true;
    } catch (err) {
      // User cancelled or error
      if ((err as DOMException).name === "AbortError") {
        // User dismissed share dialog — not really an error
        return false;
      }
      // Try clipboard fallback
      if (useClipboardFallback) {
        try {
          const text = buildShareText(data);
          await navigator.clipboard.writeText(text);
          onSuccess?.();
          return true;
        } catch { /* fall through */ }
      }
      if (fallbackDialog) {
        fallbackDialog(data);
        return true;
      }
      onError?.(err);
      return false;
    }
  }

  function checkCanShareData(data: Partial<ShareData>): boolean {
    if (!supported || !("canShare" in navigator)) return false;
    try {
      const payload: Record<string, unknown> = {};
      if (data.title) payload.title = data.title;
      if (data.text) payload.text = data.text;
      if (data.url) payload.url = data.url;
      if (data.files) payload.files = data.files;
      return (navigator as unknown as { canShare: (data: Record<string, unknown>) => boolean }).canShare(payload);
    } catch {
      return false;
    }
  }

  return {
    get canShare() { return supported; },
    get canShareFiles() { return canFiles; },
    share: doShare,
    checkCanShare: checkCanShareData,
    destroy() {}, // No persistent resources
  };
}

// --- Standalone utilities ---

/** Quick share convenience function */
export async function shareContent(data: ShareData, options?: ShareOptions): Promise<boolean> {
  return createShareApi().share(data, options);
}

/** Check if Web Share API is available */
export function isShareSupported(): boolean {
  return typeof navigator !== "undefined" && "share" in navigator;
}

/** Generate Web App Manifest share_target entry for registration */
export function generateShareTarget(reg: ShareTargetRegistration): string {
  return JSON.stringify({
    share_target: {
      action: reg.action,
      method: reg.method,
      enctype: reg.enctype,
      params: reg.params,
    },
  }, null, 2);
}

/** Parse incoming share target data from URL query params (GET method) */
export function parseShareTargetFromUrl(url?: URL): Partial<ShareData> {
  const u = url ?? (typeof window !== "undefined" ? new URL(window.location.href) : null);
  if (!u) return {};

  const data: Partial<ShareData> = {
    title: u.searchParams.get("title") ?? undefined,
    text: u.searchParams.get("text") ?? undefined,
    url: u.searchParams.get("url") ?? undefined,
  };

  // Clean empty values
  Object.keys(data).forEach((k) => {
    if (!data[k as keyof ShareData]) delete data[k as keyof ShareData];
  });

  return data;
}
