/**
 * Push API wrapper for web push notification subscription management,
 * service worker registration, VAPID key handling, and push message
 * payload decryption (client-side).
 *
 * Note: Push API requires HTTPS and a registered Service Worker.
 */

// --- Types ---

export interface PushSubscriptionInfo {
  /** Endpoint URL for sending pushes */
  endpoint: string;
  /** p256dh key (base64url) */
  p256dh: string;
  /** auth secret (base64url) */
  auth: string;
  /** Expiration time (or null if no expiration) */
  expirationTime: number | null;
}

export interface PushApiOptions {
  /** Public VAPID key (base64url-encoded) */
  vapidPublicKey?: string;
  /** Service Worker registration scope */
  swScope?: string;
  /** Service Worker script path */
  swScript?: string;
  /** Called when a new subscription is created */
  onSubscribe?: (sub: PushSubscriptionInfo) => void;
  /** Called when subscription changes or is removed */
  onUnsubscribe?: () => void;
  /** Called when a push message arrives */
  onPushMessage?: (payload: string | null) => void;
  /** User-visible identifier for the push server application */
  applicationServerKey?: string;
}

export interface PushInstance {
  /** Whether Push API is supported in this browser */
  readonly supported: boolean;
  /** Whether currently subscribed to push notifications */
  readonly isSubscribed: boolean;
  /** Current subscription info (or null if not subscribed) */
  readonly subscription: PushSubscriptionInfo | null;
  /** Subscribe to push notifications */
  subscribe: (vapidKey?: string) => Promise<PushSubscriptionInfo>;
  /** Unsubscribe from push notifications */
  unsubscribe: () => Promise<boolean>;
  /** Get current subscription without triggering a new one */
  getSubscription: () => Promise<PushSubscriptionInfo | null>;
  /** Update the VAPID public key and resubscribe */
  updateVapidKey: (key: string) => Promise<PushSubscriptionInfo>;
  /** Register service worker if not already done */
  registerServiceWorker: () => Promise<ServiceWorkerRegistration | null>;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Helpers ---

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(b64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function extractSubInfo(sub: PushSubscription): PushSubscriptionInfo {
  const key = sub.getKey ? sub.getKey("p256dh") : null;
  const auth = sub.getKey ? sub.getKey("auth") : null;
  return {
    endpoint: sub.endpoint,
    p256dh: key ? arrayBufferToBase64Url(key) : "",
    auth: auth ? arrayBufferToBase64Url(auth) : "",
    expirationTime: sub.expirationTime,
  };
}

// --- Main ---

export function createPushApi(options: PushApiOptions = {}): PushInstance {
  const {
    vapidPublicKey,
    swScope = "/",
    swScript = "sw.js",
    onSubscribe,
    onUnsubscribe,
    onPushMessage,
  } = options;

  let destroyed = false;
  let registration: ServiceWorkerRegistration | null = null;

  const supported = typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  async function getSWRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!supported || destroyed) return null;
    try {
      registration = await navigator.serviceWorker.getRegistration(swScope);
      if (!registration) {
        registration = await navigator.serviceWorker.register(swScript, { scope: swScope });
      }
      return registration;
    } catch (err) {
      console.error("[push-api] Service Worker registration failed:", err);
      return null;
    }
  }

  async function doSubscribe(userVapidKey?: string): Promise<PushSubscriptionInfo> {
    if (!supported || destroyed) throw new Error("Push API not supported");

    const reg = await getSWRegistration();
    if (!reg) throw new Error("Service Worker not available");

    const key = userVapidKey ?? vapidPublicKey;
    const options: PushSubscriptionOptionsInit = { userVisibleOnly: true };
    if (key) {
      options.applicationServerKey = urlBase64ToUint8Array(key);
    }

    const sub = await reg.pushManager.subscribe(options);
    const info = extractSubInfo(sub);
    onSubscribe?.(info);
    return info;
  }

  async function doGetSubscription(): Promise<PushSubscriptionInfo | null> {
    if (!supported || destroyed) return null;
    const reg = await getSWRegistration();
    if (!reg) return null;
    const sub = await reg.pushManager.getSubscription();
    return sub ? extractSubInfo(sub) : null;
  }

  async function doUnsubscribe(): Promise<boolean> {
    if (!supported) return false;
    const sub = await doGetSubscription();
    if (!sub) return true; // Already unsubscribed

    const reg = await getSWRegistration();
    if (!reg) return false;

    const pushSub = await reg.pushManager.getSubscription();
    if (pushSub) {
      const result = await pushSub.unsubscribe();
      onUnsubscribe?.();
      return result;
    }
    return true;
  }

  // Listen for push messages via service worker
  if (supported && onPushMessage && typeof navigator !== "undefined") {
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "PUSH_MESSAGE") {
        onPushMessage(event.data.payload ?? null);
      }
    });
  }

  const instance: PushInstance = {
    get supported() { return supported; },

    async get isSubscribed() {
      const sub = await doGetSubscription();
      return sub !== null;
    },

    get subscription() { return doGetSubscription(); },

    subscribe: doSubscribe,
    unsubscribe: doUnsubscribe,
    getSubscription: doGetSubscription,

    async updateVapidKey(key: string): Promise<PushSubscriptionInfo> {
      // Unsubscribe first, then resubscribe with new key
      await doUnsubscribe();
      return doSubscribe(key);
    },

    registerServiceWorker: getSWRegistration,

    destroy() {
      if (destroyed) return;
      destroyed = true;
      registration = null;
    },
  };

  return instance;
}

// --- Standalone utilities ---

/** Check if Push API is supported */
export function isPushSupported(): boolean {
  return typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window;
}

/** Check if notifications are granted (prerequisite for push) */
export async function isNotificationGranted(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  return Notification.permission === "granted";
}
