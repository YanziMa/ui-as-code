/**
 * Sharing: Social sharing, Web Share API, clipboard sharing,
 * link generation for social platforms, open graph meta generation,
 * and share dialog utilities.
 */

// --- Types ---

export interface ShareData {
  /** Page/document title */
  title: string;
  /** Page URL */
  url: string;
  /** Description text */
  description?: string;
  /** Image URL (for preview) */
  image?: string;
  /** Author/creator name */
  author?: string;
  /** Hashtags (without #) */
  tags?: string[];
}

export interface ShareOptions {
  /** Fallback when native share is unavailable */
  fallback?: boolean;
  /** Show a toast/notification after sharing? */
  showNotification?: boolean;
  /** Notification duration in ms */
  notificationDuration?: number;
  /** Custom text for share button/fallback */
  buttonText?: string;
}

export interface ShareResult {
  /** Which method was used ("native" | "clipboard" | "fallback") */
  method: "native" | "clipboard" | "fallback";
  /** Whether the share was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

// --- Platform URL Generators ---

/** Generate a Twitter/X share URL */
export function twitterShareURL(data: ShareData): string {
  const params = new URLSearchParams();
  params.set("text", data.title);
  params.set("url", data.url);
  if (data.tags) params.set("hashtags", data.tags.map((t) => `#${t}`).join(","));
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/** Generate a Facebook share URL */
export function facebookShareURL(data: ShareData): string {
  const params = new URLSearchParams();
  params.set("u", data.url);
  if (data.quote) params.set("quote", data.description ?? "");
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}

/** Generate a LinkedIn share URL */
export function linkedInShareURL(data: ShareData): string {
  const params = new URLSearchParams();
  params.set("url", data.url);
  params.set("mini", "true");
  if (data.title) params.set("title", data.title);
  if (data.summary) params.set("summary", data.description ?? "");
  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
}

/** Generate a Reddit submit URL */
export function redditShareURL(data: ShareData): string {
  const params = new URLSearchParams();
  params.set("url", data.url);
  params.set("title", data.title);
  if (data.subreddit) params.set("subreddit", data.subreddit);
  return `https://reddit.com/submit?${params.toString()}`;
}

/** Generate an email share mailto link */
export function emailShareURL(data: ShareData): string {
  const subject = encodeURIComponent(data.title);
  const body = encodeURIComponent(
    `${data.description ?? ""}\n\n${data.url}${data.author ? `\n\nVia ${data.author}` : ""}`,
  );
  return `mailto:?subject=${subject}&body=${body}`;
}

/** Generate a Telegram share URL */
export function telegramShareURL(data: ShareData): string {
  const params = new URLSearchParams();
  params.set("url", data.url);
  params.set("text", data.title);
  return `https://t.me/share/url?${params.toString()}`;
}

/** Generate a WhatsApp share URL */
export function whatsAppShareURL(data: ShareData): string {
  const text = `${data.title}\n${data.url}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Get all available share URLs as a record */
export function getAllShareURLs(data: ShareData): Record<string, string> {
  return {
    twitter: twitterShareURL(data),
    facebook: facebookShareURL(data),
    linkedin: linkedInShareURL(data),
    reddit: redditShareURL(data),
    email: emailShareURL(data),
    telegram: telegramShareURL(data),
    whatsapp: whatsAppShareURL(data),
  };
}

// --- Web Share API ---

/** Check if the Web Share API is available */
export function isNativeShareAvailable(): boolean {
  return typeof navigator !== "undefined" && "share" in navigator;
}

/**
 * Share content using the Web Share API with fallback.
 *
 * @example
 * const result = await share({
 *   title: "My Article",
 *   url: "https://example.com/article",
 *   description: "Check this out!",
 * });
 */
export async function share(
  data: ShareData,
  options: ShareOptions = {},
): Promise<ShareResult> {
  // Try native Web Share API first
  if (isNativeShareAvailable()) {
    try {
      await navigator.share({
        title: data.title,
        text: data.description ?? "",
        url: data.url,
      });

      // Show success notification
      if (options.showNotification !== false) {
        showShareNotification("success");
      }

      return { method: "native", success: true };
    } catch (err) {
      // User cancelled or API not available — fall through to fallback
      if ((err as DOMException).name === "AbortError") {
        return { method: "native", success: false, error: "Cancelled by user" };
      }
    }
  }

  // Fallback: copy URL to clipboard
  if (options.fallback !== false) {
    try {
      await navigator.clipboard.writeText(data.url);

      if (options.showNotification !== false) {
        showShareNotification("clipboard");
      }

      return { method: "clipboard", success: true };
    } catch {
      return { method: "fallback", success: false, error: "Clipboard access denied" };
    }
  }

  return { method: "fallback", success: false, error: "No sharing method available" };
}

// --- Open Graph Meta ---

/** Generate Open Graph meta tags as HTML string */
export function generateOpenGraphMeta(data: ShareData): string {
  const tags: Array<{ property: string; content: string }> = [
    { property: "og:title", content: data.title },
    { property: "og:url", content: data.url },
    { property: "og:type", content: "website" },
  ];

  if (data.description) tags.push({ property: "og:description", content: data.description });
  if (data.image) tags.push({ property: "og:image", content: data.image });
  if (data.author) tags.push({ property: "article:author", content: data.author });

  // Also set standard meta tags
  tags.push({ property: "name", content: data.title });
  if (data.description) tags.push({ property: "description", content: data.description });

  return tags
    .map((tag) => `<meta property="${tag.property}" content="${escapeAttr(tag.content)}">`)
    .join("\n");
}

/** Inject Open Graph meta tags into document head */
export function injectOpenGraphMeta(data: ShareData): void {
  const existing = document.querySelector('meta[property="og:title"]');
  if (existing) return; // Already injected

  const container = document.createElement("div");
  container.innerHTML = generateOpenGraphMeta(data);
  while (container.firstChild) {
    document.head.appendChild(container.firstChild!);
  }
}

// --- Twitter Card Meta ---

/** Generate Twitter card meta tags */
export function generateTwitterCardMeta(data: ShareData, cardType: "summary" | "summary_large_image" = "summary"): string {
  const tags = [
    `<meta name="twitter:card" content="${cardType}">`,
    `<meta name="twitter:title" content="${escapeAttr(data.title)}">`,
    `<meta name="twitter:description" content="${escapeAttr(data.description ?? "")}">`,
    `<meta name="twitter:image" content="${escapeAttr(data.image ?? "")}">`,
    `<meta name="twitter:url" content="${escapeAttr(data.url)}">`,
  ];
  return tags.join("\n");
}

// --- Helpers ---

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&#x2F;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function showShareNotification(type: "success" | "clipboard"): void {
  // Simple inline notification — could be replaced with a proper toast system
  const el = document.createElement("div");
  el.textContent = type === "success"
    ? "Link copied! Ready to share."
    : "Copied to clipboard";
  el.style.cssText = `
    position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
    padding:8px 16px;background:#1f2937;color:#fff;border-radius:6px;
    font-size:13px;font-family:-apple-system,sans-serif;z-index:99999;
    animation:share-notification-in 0.3s ease forwards;
  `;
  document.body.appendChild(el);

  setTimeout(() => {
    el.style.animation = "share-notification-out 0.3s ease forwards";
    setTimeout(() => el.remove(), 300);
  }, 2000);

  // Inject keyframes if needed
  if (!document.getElementById("share-styles")) {
    const style = document.createElement("style");
    style.id = "share-styles";
    style.textContent = `
      @keyframes share-notification-in { from{opacity:0;transform:translateX(-50%) translateY(10px);} to{opacity:1;transform:translateX(-50%) translateY(0);} }
      @keyframes share-notification-out { from{opacity:1;} to{opacity:0;transform:translateX(-50%) translateY(10px);} }
    `;
    document.head.appendChild(style);
  }
}
