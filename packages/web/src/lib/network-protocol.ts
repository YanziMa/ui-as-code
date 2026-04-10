/**
 * network-protocol.ts — Comprehensive Network Protocol Utilities for Browser Environments
 *
 * Provides URL/URI manipulation, HTTP helpers, WebSocket management, simplified binary protocol,
 * JSON-RPC 2.0, SSE utilities, and network quality detection.
 *
 * @module network-protocol
 * @license MIT
 */

// ──────────────────────────────────────────────────────────────
// 1. Types & Interfaces
// ──────────────────────────────────────────────────────────────

/** Parsed URL components. */
export interface ParsedUrl {
  protocol: string;
  host: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  username: string;
  password: string;
}

/** Query parameters with support for repeated keys. */
export interface QueryParams {
  [key: string]: string | string[];
}

/** HTTP headers as a plain key-value map. */
export interface HttpHeaders {
  [key: string]: string;
}

/** JSON-RPC 2.0 request object. */
export interface RpcRequest {
  jsonrpc: "2.0";
  method: string;
  params?: unknown[];
  id?: number | string;
}

/** JSON-RPC 2.0 response or error object. */
export interface RpcResponse {
  jsonrpc: "2.0";
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
  id?: number | string;
}

/** WebSocket connection configuration. */
export interface WsConfig {
  url: string;
  protocols?: string[];
  reconnect?: boolean;
  maxRetries?: number;
  heartbeatInterval?: number;
}

/** Network quality report. */
export interface NetworkQualityReport {
  score: number; // 0–100
  bandwidthEstimateMbps: number | null;
  latencyMs: number | null;
  connectionType: string;
  isOnline: boolean;
  effectiveType: string;
  downlink: number | null;
  rtt: number | null;
}

// ──────────────────────────────────────────────────────────────
// 1. URL & URI Utilities
// ──────────────────────────────────────────────────────────────

/**
 * Parse a URL string into its component parts.
 * Falls back to a manual parser when the native `URL` constructor rejects the input.
 */
export function parseUrl(raw: string): ParsedUrl {
  try {
    const u = new URL(raw);
    return {
      protocol: u.protocol.replace(/:$/, ""),
      host: u.host,
      hostname: u.hostname,
      port: u.port,
      pathname: u.pathname,
      search: u.search,
      hash: u.hash,
      username: u.username,
      password: u.password,
    };
  } catch {
    return parseUrlManual(raw);
  }
}

function parseUrlManual(raw: string): ParsedUrl {
  const defaultResult: ParsedUrl = {
    protocol: "",
    host: "",
    hostname: "",
    port: "",
    pathname: "/",
    search: "",
    hash: "",
    username: "",
    password: "",
  };

  const protoMatch = raw.match(/^([a-z][a-z0-9+.-]*):\/\//i);
  if (!protoMatch) return defaultResult;

  const proto = protoMatch[1].toLowerCase();
  let rest = raw.slice(protoMatch[0].length);

  // Auth section (user[:pass]@)
  const atIdx = rest.indexOf("@");
  if (atIdx > 0) {
    const auth = rest.slice(0, atIdx);
    const colonIdx = auth.indexOf(":");
    if (colonIdx >= 0) {
      defaultResult.username = decodeURIComponent(auth.slice(0, colonIdx));
      defaultResult.password = decodeURIComponent(auth.slice(colonIdx + 1));
    } else {
      defaultResult.username = decodeURIComponent(auth);
    }
    rest = rest.slice(atIdx + 1);
  }

  // Host:port
  const hashOrSlash = rest.indexOf("/");
  const hashOnly = rest.indexOf("#");
  const queryOnly = rest.indexOf("?");
  const endHost =
    hashOrSlash < 0 ? (hashOnly < 0 ? rest.length : hashOnly) :
    hashOnly < 0 ? hashOrSlash :
    Math.min(hashOrSlash, hashOnly);
  const hostPart = rest.slice(0, endHost === -1 ? rest.length : endHost);
  const colonPort = hostPart.lastIndexOf(":");
  if (colonPort > 0) {
    defaultResult.hostname = hostPart.slice(0, colonPort);
    defaultResult.port = hostPart.slice(colonPort + 1);
  } else {
    defaultResult.hostname = hostPart;
  }
  defaultResult.host = hostPart;
  rest = rest.slice(hostPart.length);

  // Path / query / fragment
  const qIdx = rest.indexOf("?");
  const fIdx = rest.indexOf("#");
  if (qIdx >= 0 && fIdx >= 0) {
    defaultResult.pathname = rest.slice(0, qIdx) || "/";
    defaultResult.search = rest.slice(qIdx, fIdx);
    defaultResult.hash = rest.slice(fIdx);
  } else if (qIdx >= 0) {
    defaultResult.pathname = rest.slice(0, qIdx) || "/";
    defaultResult.search = rest.slice(qIdx);
  } else if (fIdx >= 0) {
    defaultResult.pathname = rest.slice(0, fIdx) || "/";
    defaultResult.hash = rest.slice(fIdx);
  } else {
    defaultResult.pathname = rest || "/";
  }

  defaultResult.protocol = proto;
  return defaultResult;
}

/**
 * Build a URL string from parsed components.
 */
export function buildUrl(parts: Partial<ParsedUrl>): string {
  const proto = parts.protocol ? parts.protocol + "://" : "//";
  let auth = "";
  if (parts.username) {
    auth = encodeURIComponent(parts.username);
    if (parts.password) auth += ":" + encodeURIComponent(parts.password);
    auth += "@";
  }
  let host = parts.hostname || "";
  if (parts.port) host += ":" + parts.port;
  const path = parts.pathname || "/";
  const search = parts.search || "";
  const hash = parts.hash || "";
  return `${proto}${auth}${host}${path}${search}${hash}`;
}

/**
 * Normalize a URL by sorting query params, removing trailing slashes from path,
 * lower-casing the hostname, and stripping default ports.
 */
export function normalizeUrl(url: string): string {
  const p = parseUrl(url);
  p.hostname = p.hostname.toLowerCase();
  if ((p.protocol === "http" && p.port === "80") ||
      (p.protocol === "https" && p.port === "443")) {
    p.port = "";
  }
  p.pathname = p.pathname.replace(/\/+$/, "") || "/";
  if (p.search) {
    const qs = parseQueryString(p.search.slice(1));
    p.search = "?" + stringifyQuery(sortQueryParams(qs));
  }
  return buildUrl(p);
}

/**
 * Parse a query string into an object.
 * Repeated keys produce string arrays.
 */
export function parseQueryString(raw: string): QueryParams {
  const result: QueryParams = {};
  if (!raw) return result;
  raw.split("&").forEach((pair) => {
    const eq = pair.indexOf("=");
    const key = eq >= 0 ? decodeURIComponent(pair.slice(0, eq).replace(/\+/g, " ")) : decodeURIComponent(pair.replace(/\+/g, " "));
    const val = eq >= 0 ? decodeURIComponent(pair.slice(eq + 1).replace(/\+/g, " ")) : "";
    if (key in result) {
      const prev = result[key];
      result[key] = Array.isArray(prev) ? [...prev, val] : [prev as string, val];
    } else {
      result[key] = val;
    }
  });
  return result;
}

/**
 * Stringify a query-params object into a query string (without leading '?').
 */
export function stringifyQuery(params: QueryParams): string {
  const pairs: string[] = [];
  for (const key of Object.keys(params)) {
    const val = params[key];
    if (Array.isArray(val)) {
      for (const v of val) pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
    } else {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
    }
  }
  return pairs.join("&");
}

/**
 * Merge two query-param objects. Later values win for scalar keys; arrays are concatenated.
 */
export function mergeQueryParams(base: QueryParams, overlay: QueryParams): QueryParams {
  const result: QueryParams = { ...base };
  for (const [k, v] of Object.entries(overlay)) {
    if (Array.isArray(v)) {
      const prev = result[k];
      result[k] = Array.isArray(prev) ? [...prev, ...v] : v;
    } else {
      result[k] = v;
    }
  }
  return result;
}

function sortQueryParams(params: QueryParams): QueryParams {
  const sorted: QueryParams = {};
  for (const k of Object.keys(params).sort()) sorted[k] = params[k];
  return sorted;
}

/**
 * Join URL path segments, normalizing slashes.
 */
export function joinPath(...segments: string[]): string {
  return segments
    .map((s) => s.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/")
    .replace(/\/+/g, "/");
}

/**
 * Normalize a file-system style path (resolve '.' and '..').
 */
export function normalizePath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  const stack: string[] = [];
  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return (path.startsWith("/") ? "/" : "") + stack.join("/") || ".";
}

/**
 * Resolve a possibly-relative reference against a base URL.
 */
export function resolveUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).href;
  } catch {
    return relative;
  }
}

/**
 * RFC 3986 compliant encode — does NOT encode `~`, `'`, `(`, `)`, `!`, `*`.
 */
export function encodeRfc3986(str: string): string {
  return encodeURIComponent(str)
    .replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

/**
 * RFC 3986 compliant decode.
 */
export function decodeRfc3986(str: string): string {
  try {
    return decodeURIComponent(str.replace(/\+/g, " "));
  } catch {
    return str;
  }
}

/**
 * Test whether a URL matches a pattern that may contain `*` wildcards.
 * The wildcard matches zero or more characters within a single path segment.
 */
export function matchUrlPattern(url: string, pattern: string): boolean {
  const regexStr = "^" +
    pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, "[^/]*") +
    "$";
  return new RegExp(regexStr).test(url);
}

/**
 * Test whether a URL matches a full regular expression.
 */
export function matchUrlRegex(url: string, regex: RegExp): boolean {
  const re = new RegExp(regex.source, regex.flags);
  re.lastIndex = 0;
  return re.test(url);
}

// ──────────────────────────────────────────────────────────────
// 2. HTTP Protocol Helpers
// ──────────────────────────────────────────────────────────────

/** Standard HTTP methods. */
export const HttpMethod = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
  PATCH: "PATCH",
  HEAD: "HEAD",
  OPTIONS: "OPTIONS",
  CONNECT: "CONNECT",
  TRACE: "TRACE",
} as const;

export type HttpMethodValue = typeof HttpMethod[keyof typeof HttpMethod];

/** HTTP status code categories. */
export const HttpStatusCategory = {
  INFORMATIONAL: (code: number) => code >= 100 && code < 200,
  SUCCESS: (code: number) => code >= 200 && code < 300,
  REDIRECT: (code: number) => code >= 300 && code < 400,
  CLIENT_ERROR: (code: number) => code >= 400 && code < 500,
  SERVER_ERROR: (code: number) => code >= 500 && code < 600,
} as const;

/**
 * Parse a Content-Type header value into media type, charset, and boundary.
 */
export function parseContentType(header: string | null | undefined): { mediaType: string; charset: string; boundary: string | null } {
  if (!header) return { mediaType: "", charset: "", boundary: null };
  const parts = header.split(";").map((s) => s.trim());
  const mediaType = parts[0]?.toLowerCase() ?? "";
  let charset = "";
  let boundary: string | null = null;
  for (let i = 1; i < parts.length; i++) {
    const p = parts[i];
    const eq = p.indexOf("=");
    if (eq <= 0) continue;
    const name = p.slice(0, eq).trim().toLowerCase();
    const val = p.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (name === "charset") charset = val.toLowerCase();
    if (name === "boundary") boundary = val;
  }
  return { mediaType, charset, boundary };
}

/**
 * Parse an Accept header into an array of `{ type, q, params }` entries, sorted by quality (q).
 */
export function parseAcceptHeader(header: string | null | undefined): Array<{ type: string; q: number; params: Record<string, string> }> {
  if (!header) return [];
  return header
    .split(",")
    .map((part) => {
      const segs = part.trim().split(";").map((s) => s.trim());
      const type = segs[0] ?? "*/*";
      const params: Record<string, string> = {};
      let q = 1;
      for (let i = 1; i < segs.length; i++) {
        const eq = segs[i].indexOf("=");
        if (eq > 0) {
          const n = segs[i].slice(0, eq).trim().toLowerCase();
          const v = segs[i].slice(eq + 1).trim();
          params[n] = v;
          if (n === "q") q = parseFloat(v) || 0;
        }
      }
      return { type, q, params };
    })
    .sort((a, b) => b.q - a.q);
}

/**
 * Parse Cache-Control directives into a map of directive → value (or true).
 */
export function parseCacheControl(header: string | null | undefined): Record<string, string | true> {
  const result: Record<string, string | true> = {};
  if (!header) return result;
  header.split(",").forEach((dir) => {
    const d = dir.trim();
    const eq = d.indexOf("=");
    if (eq > 0) {
      result[d.slice(0, eq).trim().toLowerCase()] = d.slice(eq + 1).trim().toLowerCase();
    } else if (d) {
      result[d.toLowerCase()] = true;
    }
  });
  return result;
}

/**
 * Extract max-age (in seconds) from a Cache-Control header. Returns null if not present.
 */
export function getMaxAge(cc: Record<string, string | true>): number | null {
  if ("max-age" in cc && typeof cc["max-age"] === "string") {
    return parseInt(cc["max-age"], 10) || null;
  }
  if ("s-maxage" in cc && typeof cc["s-maxage"] === "string") {
    return parseInt(cc["s-maxage"], 10) || null;
  }
  return null;
}

/**
 * Check whether a cache entry must be revalidated before use.
 */
export function mustRevalidate(cc: Record<string, string | true>): boolean {
  return "must-revalidate" in cc || "proxy-revalidate" in cc || "no-cache" in cc;
}

/**
 * Parse an Accept-Language header into sorted language tags with quality values.
 */
export function parseAcceptLanguage(header: string | null | undefined): Array<{ tag: string; q: number }> {
  if (!header) return [{ tag: "*", q: 0.001 }];
  return header
    .split(",")
    .map((part) => {
      const s = part.trim();
      const semi = s.indexOf(";");
      if (semi < 0) return { tag: s, q: 1 };
      const tag = s.slice(0, semi).trim();
      const qVal = s.slice(semi + 1).replace(/^\s*q\s*=\s*/i, "");
      return { tag, q: parseFloat(qVal) || 0.001 };
    })
    .sort((a, b) => b.q - a.q);
}

/**
 * Parse an Accept-Encoding header into sorted encodings with quality values.
 */
export function parseAcceptEncoding(header: string | null | undefined): Array<{ encoding: string; q: number }> {
  if (!header) return [{ encoding: "identity", q: 1 }];
  return header
    .split(",")
    .map((part) => {
      const s = part.trim();
      const semi = s.indexOf(";");
      if (semi < 0) return { encoding: s, q: 1 };
      const enc = s.slice(0, semi).trim();
      const qVal = s.slice(semi + 1).replace(/^\s*q\s*=\s*/i, "");
      return { encoding: enc, q: parseFloat(qVal) || 0.001 };
    })
    .sort((a, b) => b.q - a.q);
}

/**
 * Compare two ETags per RFC 7232 §2.3. Weak ETags never match strong comparators.
 * @param etagA First ETag (may include W/ prefix)
 * @param etagB Second ETag
 * @param strong If true, perform a strong comparison only
 */
export function compareEtags(etagA: string, etagB: string, strong: boolean = false): boolean {
  const norm = (e: string) => e.trim().replace(/^W\//i, "").replace(/^"|"$/g, "");
  const weakA = /^W\//i.test(etagA);
  const weakB = /^W\//i.test(etagB);
  if (strong && (weakA || weakB)) return false;
  return norm(etagA) === norm(etagB);
}

/**
 * Check whether an ETag matches any entry in an If-Match or If-None-Match list.
 * @param etag The ETag to test
 * @param headerValue Comma-separated list (or '*')
 * @param noneMatch True when testing against If-None-Match logic
 */
export function etagMatchesList(etag: string, headerValue: string | null | undefined, noneMatch: boolean = false): boolean {
  if (!headerValue) return noneMatch; // no header → If-Match fails, If-None-Match passes
  if (headerValue.trim() === "*") return !noneMatch;
  const tags = headerValue.split(",").map((t) => t.trim());
  const hit = tags.some((t) => compareEtags(etag, t));
  return noneMatch ? !hit : hit;
}

/**
 * Build a Cookie header string from name-value pairs.
 */
export function buildCookieHeader(cookies: Array<[string, string]>): string {
  return cookies.map(([name, val]) => `${encodeURIComponent(name)}=${encodeURIComponent(val)}`).join("; ");
}

/**
 * Generate a Basic authentication header value.
 */
export function basicAuthHeader(username: string, password: string): string {
  const creds = `${username}:${password}`;
  // Use btoa for browser environments
  const encoded = typeof btoa !== "undefined"
    ? btoa(unescape(encodeURIComponent(creds)))
    : Buffer.from(creds).toString("base64");
  return `Basic ${encoded}`;
}

/**
 * Generate a Bearer token authorization header value.
 */
export function bearerAuthHeader(token: string): string {
  return `Bearer ${token}`;
}

/**
 * Generate a Digest authentication header value (simplified — intended for pre-computed digests).
 */
export function digestAuthHeader(
  username: string,
  realm: string,
  nonce: string,
  uri: string,
  method: string,
  password: string,
  algorithm: string = "MD5",
  qop: string = "auth",
  nc: string = "00000001",
  cnonce: string = ""
): string {
  // Simplified HA1/HA2 construction (real implementations should use a crypto library)
  const ha1Input = `${username}:${realm}:${password}`;
  const ha2Input = `${method}:${uri}`;
  // Placeholder hashing — in production replace with actual MD5/SHA
  const ha1 = simpleHash(ha1Input);
  const ha2 = simpleHash(ha2Input);
  const response = simpleHash(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
  const parts = [
    `username="${username}"`,
    `realm="${realm}"`,
    `nonce="${nonce}"`,
    `uri="${uri}"`,
    `algorithm=${algorithm}`,
    `response="${response}"`,
  ];
  if (qop) parts.push(`qop=${qop}`, `nc=${nc}`);
  if (cnonce) parts.push(`cnonce="${cnonce}"`);
  return `Digest ${parts.join(", ")}`;
}

/** Very lightweight non-cryptographic hash for demo purposes. */
function simpleHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16).padStart(8, "0");
}

/**
 * Build a CORS preflight OPTIONS request configuration.
 */
export function buildCorsPreflight(origin: string, targetUrl: string, method: string, customHeaders?: string[]): RequestInit {
  const url = new URL(targetUrl);
  const headers: HttpHeaders = {
    Origin: origin,
    "Access-Control-Request-Method": method,
    "Access-Control-Request-Headers": (customHeaders ?? []).join(", "),
  };
  return {
    method: HttpMethod.OPTIONS,
    headers,
    mode: "cors",
  };
}

/**
 * Format a fetch Request or Response for logging.
 */
export function formatHttpLog(req: Request | Response, extra?: Record<string, unknown>): string {
  const lines: string[] = [];
  if (req instanceof Request) {
    lines.push(`>> ${req.method} ${req.url}`);
    req.headers.forEach((v, k) => lines.push(`   ${k}: ${v}`));
  } else {
    lines.push(`<< ${req.status} ${req.statusText}`);
    req.headers.forEach((v, k) => lines.push(`   ${k}: ${v}`));
  }
  if (extra) {
    for (const [k, v] of Object.entries(extra)) lines.push(`   [${k}] ${JSON.stringify(v)}`);
  }
  return lines.join("\n");
}

// ──────────────────────────────────────────────────────────────
// 3. WebSocket Protocol
// ──────────────────────────────────────────────────────────────

/** WebSocket connection states. */
export enum WsState {
  CONNECTING = "connecting",
  OPEN = "open",
  CLOSING = "closing",
  CLOSED = "closed",
  RECONNECTING = "reconnecting",
}

type WsMessageHandler = (data: unknown) => void;
type WsErrorHandler = (event: Event) => void;
type WsStateChangeHandler = (state: WsState, prevState: WsState) => void;

/**
 * A managed WebSocket wrapper with auto-reconnect, heartbeat, and message correlation.
 */
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private _state: WsState = WsState.CLOSED;
  private config: Required<WsConfig>;
  private retryCount = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private messageHandlers = new Map<string, WsMessageHandler>();
  private globalHandlers: WsMessageHandler[] = [];
  private errorHandlers: WsErrorHandler[] = [];
  private stateHandlers: WsStateChangeHandler[] = [];
  private pendingAcks = new Map<number, { resolve: (data: unknown) => void; reject: (err: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  private nextCorrelationId = 1;
  private subscriptions = new Set<string>();
  private intentionalClose = false;

  constructor(config: WsConfig) {
    this.config = {
      url: config.url,
      protocols: config.protocols ?? [],
      reconnect: config.reconnect ?? true,
      maxRetries: config.maxRetries ?? 10,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
    };
  }

  /** Current connection state. */
  get state(): WsState {
    return this._state;
  }

  /** Whether the socket is currently open and usable. */
  get isOpen(): boolean {
    return this._state === WsState.OPEN && this.ws?.readyState === WebSocket.OPEN;
  }

  /** Open (or reopen) the connection. */
  connect(): void {
    this.intentionalClose = false;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.setState(WsState.CONNECTING);
    try {
      this.ws = new WebSocket(this.config.url, this.config.protocols.length > 0 ? this.config.protocols : undefined);
      this.ws.binaryType = "arraybuffer";

      this.ws.onopen = () => {
        this.retryCount = 0;
        this.setState(WsState.OPEN);
        this.startHeartbeat();
        // Resubscribe to rooms after reconnect
        for (const room of this.subscriptions) {
          this.send({ type: "subscribe", channel: room });
        }
      };

      this.ws.onmessage = (evt) => {
        const data = this.parseMessage(evt.data);
        if (data && typeof data === "object" && "_cid" in data) {
          const cid = (data as Record<string, unknown>)._cid as number;
          const pending = this.pendingAcks.get(cid);
          if (pending) {
            clearTimeout(pending.timer);
            this.pendingAcks.delete(cid);
            pending.resolve(data);
            return;
          }
        }
        // Dispatch to typed handlers
        if (data && typeof data === "object" && "type" in data) {
          const type = (data as Record<string, unknown>).type as string;
          const handler = this.messageHandlers.get(type);
          if (handler) handler(data);
        }
        for (const h of this.globalHandlers) h(data);
      };

      this.ws.onerror = (ev) => {
        for (const h of this.errorHandlers) h(ev);
      };

      this.ws.onclose = (evt) => {
        this.stopHeartbeat();
        this.rejectAllPending(new Error(`WebSocket closed: code=${evt.code}`));
        if (!this.intentionalClose && this.config.reconnect && this.retryCount < this.config.maxRetries) {
          this.scheduleReconnect();
        } else {
          this.setState(WsState.CLOSED);
        }
      };
    } catch (err) {
      this.setState(WsState.CLOSED);
      for (const h of this.errorHandlers) h(err as Event);
    }
  }

  /** Gracefully close the connection. */
  disconnect(code?: number, reason?: string): void {
    this.intentionalClose = true;
    if (this.retryTimer) { clearTimeout(this.retryTimer); this.retryTimer = null; }
    this.stopHeartbeat();
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(code ?? 1000, reason ?? "client disconnect");
      }
      this.ws = null;
    }
    this.setState(WsState.CLOSED);
  }

  /** Send data (auto-stringified to JSON). Returns true if sent. */
  send(data: unknown): boolean {
    if (!this.isOpen) return false;
    this.ws!.send(typeof data === "string" ? data : JSON.stringify(data));
    return true;
  }

  /** Send a message and wait for a correlated response (request-response pattern). */
  async sendAndWait<T = unknown>(data: unknown, timeoutMs: number = 15000): Promise<T> {
    if (!this.isOpen) throw new Error("WebSocket not connected");
    const cid = this.nextCorrelationId++;
    const payload = typeof data === "object" && data !== null
      ? { ...(data as Record<string, unknown>), _cid: cid }
      : { _data: data, _cid: cid };
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingAcks.delete(cid);
        reject(new Error(`WebSocket ack timeout (${timeoutMs}ms)`));
      }, timeoutMs);
      this.pendingAcks.set(cid, { resolve: resolve as (d: unknown) => void, reject, timer });
      this.ws!.send(JSON.stringify(payload));
    });
  }

  /** Subscribe to messages of a given `type`. */
  onMessage(type: string, handler: WsMessageHandler): () => void {
    this.messageHandlers.set(type, handler);
    return () => this.messageHandlers.delete(type);
  }

  /** Add a global message handler (receives all messages). */
  onAnyMessage(handler: WsMessageHandler): () => void {
    this.globalHandlers.push(handler);
    return () => {
      const idx = this.globalHandlers.indexOf(handler);
      if (idx >= 0) this.globalHandlers.splice(idx, 1);
    };
  }

  /** Register an error handler. */
  onError(handler: WsErrorHandler): () => void {
    this.errorHandlers.push(handler);
    return () => {
      const idx = this.errorHandlers.indexOf(handler);
      if (idx >= 0) this.errorHandlers.splice(idx, 1);
    };
  }

  /** Register a state-change listener. */
  onStateChange(handler: WsStateChangeHandler): () => void {
    this.stateHandlers.push(handler);
    return () => {
      const idx = this.stateHandlers.indexOf(handler);
      if (idx >= 0) this.stateHandlers.splice(idx, 1);
    };
  }

  /** Join a room / channel (subscription tracked across reconnects). */
  subscribe(channel: string): void {
    this.subscriptions.add(channel);
    this.send({ type: "subscribe", channel });
  }

  /** Leave a room / channel. */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({ type: "unsubscribe", channel });
  }

  /** Get current set of active subscriptions. */
  getSubscriptions(): string[] {
    return [...this.subscriptions];
  }

  // ── Internal ──

  private setState(next: WsState): void {
    const prev = this._state;
    this._state = next;
    for (const h of this.stateHandlers) h(next, prev);
  }

  private scheduleReconnect(): void {
    this.setState(WsState.RECONNECTING);
    const delay = Math.min(1000 * 2 ** this.retryCount, 30000); // exponential backoff, max 30s
    this.retryCount++;
    this.retryTimer = setTimeout(() => this.connect(), delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isOpen) this.send({ type: "__ping__", ts: Date.now() });
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
  }

  private parseMessage(data: string | ArrayBuffer | Blob): unknown {
    if (typeof data === "string") {
      try { return JSON.parse(data); } catch { return data; }
    }
    if (data instanceof ArrayBuffer) {
      // Try to decode length-prefixed text frame
      try { return decodeLengthPrefixedFrame(data); } catch { return data; }
    }
    return data;
  }

  private rejectAllPending(err: Error): void {
    for (const [cid, p] of this.pendingAcks) {
      clearTimeout(p.timer);
      p.reject(err);
    }
    this.pendingAcks.clear();
  }
}

/**
 * Encode a message as a binary length-prefixed frame:
 * [4 bytes BE length][payload bytes].
 */
export function encodeLengthPrefixedFrame(payload: string | Uint8Array): ArrayBuffer {
  const bytes = typeof payload === "string" ? new TextEncoder().encode(payload) : payload;
  const buf = new ArrayBuffer(4 + bytes.byteLength);
  const view = new DataView(buf);
  view.setUint32(0, bytes.byteLength, false); // big-endian
  new Uint8Array(buf, 4, bytes.byteLength).set(bytes);
  return buf;
}

/**
 * Decode a binary length-prefixed frame back to a UTF-8 string.
 */
export function decodeLengthPrefixedFrame(buffer: ArrayBuffer): string {
  const view = new DataView(buffer);
  const len = view.getUint32(0, false);
  const bytes = new Uint8Array(buffer, 4, len);
  return new TextDecoder().decode(bytes);
}

// ──────────────────────────────────────────────────────────────
// 4. Protocol Buffers-like (Simplified Binary Protocol)
// ──────────────────────────────────────────────────────────────

/** Wire types used in the simplified protobuf encoding. */
export enum WireType {
  VARINT = 0,
  BIT64 = 1,
  LENGTH_DELIMITED = 2,
  BIT32 = 5,
}

/** Descriptor for a single field in a schema. */
export interface FieldDescriptor {
  fieldNumber: number;
  wireType: WireType;
  name: string;
  repeated?: boolean;
}

/** Registry mapping field numbers to descriptors. */
export type FieldRegistry = Map<number, FieldDescriptor>;

/**
 * Encode an unsigned integer as a varint (up to 32-bit).
 */
export function encodeVarint(value: number): Uint8Array {
  const bytes: number[] = [];
  let v = value >>> 0;
  do {
    let byte = v & 0x7f;
    v >>>= 7;
    if (v > 0) byte |= 0x80;
    bytes.push(byte);
  } while (v > 0);
  return new Uint8Array(bytes);
}

/**
 * Decode a varint from a byte array starting at offset.
 * Returns [value, bytesRead].
 */
export function decodeVarint(bytes: Uint8Array, offset: number = 0): [number, number] {
  let result = 0;
  let shift = 0;
  let read = 0;
  while (offset + read < bytes.length) {
    const b = bytes[offset + read];
    result |= (b & 0x7f) << shift;
    read++;
    if ((b & 0x80) === 0) break;
    shift += 7;
    if (shift >= 35) throw new Error("Varint too long");
  }
  return [result, read];
}

/**
 * Encode a field tag (fieldNumber << 3 | wireType) as a varint.
 */
export function encodeTag(fieldNumber: number, wireType: WireType): Uint8Array {
  return encodeVarint((fieldNumber << 3) | wireType);
}

/**
 * Decode a field tag. Returns [fieldNumber, wireType].
 */
export function decodeTag(varintValue: number): [number, WireType] {
  return [varintValue >>> 3, varintValue & 0x07 as WireType];
}

/**
 * Encode a single field value into binary using the given wire type.
 */
export function encodeFieldValue(wireType: WireType, value: unknown): Uint8Array {
  switch (wireType) {
    case WireType.VARINT: {
      const n = typeof value === "boolean" ? (value ? 1 : 0) : Number(value);
      return encodeVarint(n);
    }
    case WireType.BIT64: {
      const dv = new DataView(new ArrayBuffer(8));
      dv.setFloat64(0, Number(value), true);
      return new Uint8Array(dv.buffer);
    }
    case WireType.BIT32: {
      const dv = new DataView(new ArrayBuffer(4));
      dv.setFloat32(0, Number(value), true);
      return new Uint8Array(dv.buffer);
    }
    case WireType.LENGTH_DELIMITED: {
      if (typeof value === "string") {
        const encoded = new TextEncoder().encode(value);
        const len = encodeVarint(encoded.length);
        const combined = new Uint8Array(len.length + encoded.length);
        combined.set(len, 0);
        combined.set(encoded, len.length);
        return combined;
      }
      if (value instanceof Uint8Array) {
        const len = encodeVarint(value.length);
        const combined = new Uint8Array(len.length + value.length);
        combined.set(len, 0);
        combined.set(value, len.length);
        return combined;
      }
      // Fallback: JSON string
      const json = new TextEncoder().encode(JSON.stringify(value));
      const jlen = encodeVarint(json.length);
      const combined = new Uint8Array(jlen.length + json.length);
      combined.set(jlen, 0);
      combined.set(json, jlen.length);
      return combined;
    }
    default:
      throw new Error(`Unsupported wire type: ${wireType}`);
  }
}

/**
 * Decode a field value from bytes given a wire type and the registry descriptor.
 */
export function decodeFieldValue(
  wireType: WireType,
  bytes: Uint8Array,
  offset: number,
  _desc?: FieldDescriptor
): [unknown, number] {
  switch (wireType) {
    case WireType.VARINT: {
      const [val, consumed] = decodeVarint(bytes, offset);
      return [val, consumed];
    }
    case WireType.BIT64: {
      const dv = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
      return [dv.getFloat64(true), 8];
    }
    case WireType.BIT32: {
      const dv = new DataView(bytes.buffer, bytes.byteOffset + offset, 4);
      return [dv.getFloat32(true), 4];
    }
    case WireType.LENGTH_DELIMITED: {
      const [len, lenSize] = decodeVarint(bytes, offset);
      const slice = bytes.slice(offset + lenSize, offset + lenSize + len);
      // Attempt UTF-8 decode first
      try {
        const str = new TextDecoder().decode(slice);
        return [str, lenSize + len];
      } catch {
        return [new Uint8Array(slice), lenSize + len];
      }
    }
    default:
      throw new Error(`Cannot decode wire type: ${wireType}`);
  }
}

/**
 * Serialize a plain object into a binary message using a field registry.
 * Each key in `message` must be registered in the registry by field number.
 */
export function serializeMessage(message: Record<string, unknown>, registry: FieldRegistry): Uint8Array {
  const parts: Uint8Array[] = [];
  for (const [fieldName, value] of Object.entries(message)) {
    // Find descriptor by name
    let desc: FieldDescriptor | undefined;
    for (const d of registry.values()) {
      if (d.name === fieldName) { desc = d; break; }
    }
    if (!desc) continue;

    if (desc.repeated && Array.isArray(value)) {
      for (const item of value) {
        parts.push(encodeTag(desc.fieldNumber, desc.wireType));
        parts.push(encodeFieldValue(desc.wireType, item));
      }
    } else {
      parts.push(encodeTag(desc.fieldNumber, desc.wireType));
      parts.push(encodeFieldValue(desc.wireType, value));
    }
  }
  const totalLen = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLen);
  let pos = 0;
  for (const p of parts) {
    result.set(p, pos);
    pos += p.length;
  }
  return result;
}

/**
 * Deserialize a binary message into a plain object using a field registry.
 */
export function deserializeMessage(data: Uint8Array, registry: FieldRegistry): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let offset = 0;
  while (offset < data.length) {
    const [tagVal, tagLen] = decodeVarint(data, offset);
    offset += tagLen;
    const [fieldNum, wt] = decodeTag(tagVal);
    const desc = registry.get(fieldNum);
    if (!desc) {
      // Skip unknown field
      const [, consumed] = decodeFieldValue(wt, data, offset);
      offset += consumed;
      continue;
    }
    const [val, consumed] = decodeFieldValue(wt, data, offset, desc);
    offset += consumed;
    if (desc.repeated) {
      const arr = result[desc.name] as unknown[] ?? [];
      arr.push(val);
      result[desc.name] = arr;
    } else {
      result[desc.name] = val;
    }
  }
  return result;
}

// ──────────────────────────────────────────────────────────────
// 5. RPC Protocol (JSON-RPC 2.0)
// ──────────────────────────────────────────────────────────────

/** Predefined JSON-RPC error codes. */
export const RpcErrorCode = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

type RpcMethodHandler = (params?: unknown[]) => Promise<unknown>;

/**
 * A JSON-RPC 2.0 client that can also act as a server (dispatch incoming requests).
 * Supports batch requests, notifications (no id), timeouts, and streaming via SSE-style callbacks.
 */
export class JsonRpcClient {
  private requestId = 0;
  private handlers = new Map<string, RpcMethodHandler>();
  private pendingRequests = new Map<number | string, {
    resolve: (resp: RpcResponse) => void;
    reject: (err: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();
  private transport: (payload: string) => Promise<string>;

  /**
   * Create a new JSON-RPC client.
   * @param transport Function that sends a JSON-RPC string payload and returns the response string.
   */
  constructor(transport?: (payload: string) => Promise<string>) {
    this.transport = transport ?? defaultTransportStub;
  }

  /**
   * Override the transport function.
   */
  setTransport(fn: (payload: string) => Promise<string>): void {
    this.transport = fn;
  }

  /**
   * Register a method handler so this client can serve incoming requests.
   */
  registerMethod(name: string, handler: RpcMethodHandler): () => void {
    this.handlers.set(name, handler);
    return () => this.handlers.delete(name);
  }

  /**
   * Call a remote method and await the result.
   */
  async call(method: string, params?: unknown[], timeoutMs: number = 30000): Promise<unknown> {
    const id = ++this.requestId;
    const request: RpcRequest = { jsonrpc: "2.0", method, params, id };
    const payload = JSON.stringify(request);
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`JSON-RPC call '${method}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pendingRequests.set(id, {
        resolve: (resp) => {
          if (resp.error) reject(new RpcError(resp.error.code, resp.error.message, resp.error.data));
          else resolve(resp.result);
        },
        reject,
        timer,
      });
      this.transport(payload).then((raw) => {
        clearTimeout(timer);
        this.pendingRequests.delete(id);
        try {
          const resp = JSON.parse(raw) as RpcResponse;
          if (resp.id !== id) {
            // Could be out-of-order; re-queue? For now just resolve what we have.
          }
          if (resp.error) reject(new RpcError(resp.error.code, resp.error.message, resp.error.data));
          else resolve(resp.result);
        } catch (e) {
          reject(new Error(`Invalid JSON-RPC response: ${(e as Error).message}`));
        }
      }).catch(reject);
    });
  }

  /**
   * Send a notification (fire-and-forget, no response expected).
   */
  notify(method: string, params?: unknown[]): void {
    const request: RpcRequest = { jsonrpc: "2.0", method, params };
    this.transport(JSON.stringify(request)).catch(() => {}); // best-effort
  }

  /**
   * Send a batch of requests/notifications. Returns results in order (notifications yield undefined).
   */
  async batch(items: Array<{ method: string; params?: unknown[]; notification?: boolean }>, timeoutMs: number = 30000): Promise<(unknown | undefined)[]> {
    const requests: RpcRequest[] = items.map((item, idx) => ({
      jsonrpc: "2.0" as const,
      method: item.method,
      params: item.params,
      id: item.notification ? undefined : ++this.requestId + (idx * 1000), // unique-ish ids
    }));
    const payload = JSON.stringify(requests);
    const raw = await this.transport(payload);
    const responses = JSON.parse(raw) as RpcResponse[];
    return responses.map((resp) => {
      if (resp.error) throw new RpcError(resp.error.code, resp.error.message, resp.error.data);
      return resp.result;
    });
  }

  /**
   * Dispatch an incoming JSON-RPC request string (server-side). Returns the response string.
   */
  async dispatch(rawPayload: string): Promise<string> {
    let requests: RpcRequest[];
    try {
      const parsed = JSON.parse(rawPayload);
      requests = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return JSON.stringify({
        jsonrpc: "2.0",
        error: { code: RpcErrorCode.PARSE_ERROR, message: "Parse error" },
        id: null,
      });
    }

    const responses: RpcResponse[] = [];
    for (const req of requests) {
      const resp = await this.dispatchSingle(req);
      if (resp) responses.push(resp); // notifications return null
    }
    if (responses.length === 0) return ""; // all were notifications
    if (requests.length === 1) return JSON.stringify(responses[0]);
    return JSON.stringify(responses);
  }

  private async dispatchSingle(req: RpcRequest): Promise<RpcResponse | null> {
    // Validate request
    if (req.jsonrpc !== "2.0") {
      return { jsonrpc: "2.0", error: { code: RpcErrorCode.INVALID_REQUEST, message: "Invalid Request" }, id: req.id };
    }
    if (!req.method || typeof req.method !== "string") {
      return { jsonrpc: "2.0", error: { code: RpcErrorCode.INVALID_REQUEST, message: "Invalid Request" }, id: req.id };
    }
    // Notification?
    if (req.id === undefined) {
      const handler = this.handlers.get(req.method);
      if (handler) handler(req.params).catch(() => {});
      return null;
    }
    const handler = this.handlers.get(req.method);
    if (!handler) {
      return { jsonrpc: "2.0", error: { code: RpcErrorCode.METHOD_NOT_FOUND, message: "Method not found" }, id: req.id };
    }
    try {
      const result = await handler(req.params);
      return { jsonrpc: "2.0", result, id: req.id };
    } catch (err) {
      const e = err as Error;
      return { jsonrpc: "2.0", error: { code: RpcErrorCode.INTERNAL_ERROR, message: e.message }, id: req.id };
    }
  }
}

/** Custom error class for JSON-RPC errors. */
export class RpcError extends Error {
  code: number;
  data?: unknown;
  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = "RpcError";
    this.code = code;
    this.data = data;
  }
}

/** Default transport stub that throws (must be overridden). */
async function defaultTransportStub(_payload: string): Promise<string> {
  throw new Error("JSON-RPC transport not configured. Call client.setTransport() first.");
}

/**
 * Streaming RPC helper that wraps an SSE-like data stream into an async iterator.
 */
export function createStreamingRpc(
  transport: () => AsyncIterable<string>,
  onMessage: (line: string) => unknown
): AsyncGenerator<unknown> {
  const gen = async function* (): AsyncGenerator<unknown> {
    for await (const line of transport()) {
      yield onMessage(line);
    }
  };
  return gen();
}

// ──────────────────────────────────────────────────────────────
// 6. EventSource / SSE Utilities
// ──────────────────────────────────────────────────────────────

/** Configuration for the SSE manager. */
export interface SseConfig {
  url: string;
  withCredentials?: boolean;
  eventTypes?: string[];
  reconnect?: boolean;
  maxReconnectDelay?: number;
  lastEventId?: string;
  headers?: Record<string, string>;
}

type SseDataHandler = (data: unknown, eventType: string, lastEventId: string) => void;
type SseErrorHandler = (event: Event) => void;
type SseOpenHandler = () => void;

/**
 * Enhanced EventSource wrapper with auto-reconnection, custom event parsing,
 * Last-Event-ID tracking, and health monitoring.
 */
export class SseManager {
  private es: EventSource | null = null;
  private config: Required<SseConfig>;
  private dataHandlers: SseDataHandler[] = [];
  private errorHandlers: SseErrorHandler[] = [];
  private openHandlers: SseOpenHandler[] = [];
  private lastEventId = "";
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private lastMessageTime = 0;
  private _connected = false;

  constructor(config: SseConfig) {
    this.config = {
      url: config.url,
      withCredentials: config.withCredentials ?? false,
      eventTypes: config.eventTypes ?? [],
      reconnect: config.reconnect ?? true,
      maxReconnectDelay: config.maxReconnectDelay ?? 30000,
      lastEventId: config.lastEventId ?? "",
      headers: config.headers ?? {},
    };
    this.lastEventId = this.config.lastEventId;
  }

  /** Whether the SSE connection is currently open. */
  get connected(): boolean {
    return this._connected;
  }

  /** Get the Last-Event-ID from the most recent event. */
  getLastEventId(): string {
    return this.lastEventId;
  }

  /** Open the SSE connection. */
  connect(): void {
    this.intentionalClose = false;
    this.ensureEventSource();
  }

  /** Close the SSE connection. */
  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.stopHealthCheck();
    if (this.es) {
      this.es.close();
      this.es = null;
    }
    this._connected = false;
  }

  /** Register a data handler. */
  onData(handler: SseDataHandler): () => void {
    this.dataHandlers.push(handler);
    return () => {
      const idx = this.dataHandlers.indexOf(handler);
      if (idx >= 0) this.dataHandlers.splice(idx, 1);
    };
  }

  /** Register an error handler. */
  onError(handler: SseErrorHandler): () => void {
    this.errorHandlers.push(handler);
    return () => {
      const idx = this.errorHandlers.indexOf(handler);
      if (idx >= 0) this.errorHandlers.splice(idx, 1);
    };
  }

  /** Register an open handler. */
  onOpen(handler: SseOpenHandler): () => void {
    this.openHandlers.push(handler);
    return () => {
      const idx = this.openHandlers.indexOf(handler);
      if (idx >= 0) this.openHandlers.splice(idx, 1);
    };
  }

  // ── Internal ──

  private ensureEventSource(): void {
    if (this.es) return;

    let url = this.config.url;
    if (this.lastEventId) {
      const sep = url.includes("?") ? "&" : "?";
      url += `${sep}lastEventId=${encodeURIComponent(this.lastEventId)}`;
    }

    // Note: Native EventSource doesn't support custom headers.
    // For header support, consider using fetch-based polyfill or pass via URL params.
    this.es = new EventSource(url, { withCredentials: this.config.withCredentials });

    this.es.onopen = () => {
      this._connected = true;
      this.reconnectAttempts = 0;
      this.lastMessageTime = Date.now();
      this.startHealthCheck();
      for (const h of this.openHandlers) h();
    };

    this.es.onmessage = (evt) => {
      this.lastMessageTime = Date.now();
      if (evt.lastEventId) this.lastEventId = evt.lastEventId;
      const parsed = this.parseSseData(evt.data);
      for (const h of this.dataHandlers) h(parsed, "message", this.lastEventId);
    };

    // Listen for custom event types
    for (const et of this.config.eventTypes) {
      this.es.addEventListener(et, (evt: Event) => {
        this.lastMessageTime = Date.now();
        const msgEvt = evt as MessageEvent;
        if (msgEvt.lastEventId) this.lastEventId = msgEvt.lastEventId;
        const parsed = this.parseSseData(msgEvt.data);
        for (const h of this.dataHandlers) h(parsed, et, this.lastEventId);
      });
    }

    this.es.onerror = (_evt) => {
      this._connected = false;
      this.stopHealthCheck();
      if (this.es) { this.es.close(); this.es = null; }
      for (const h of this.errorHandlers) h(new Event("sse-error"));
      if (!this.intentionalClose && this.config.reconnect) {
        this.scheduleReconnect();
      }
    };
  }

  private scheduleReconnect(): void {
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, this.config.maxReconnectDelay);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.ensureEventSource(), delay);
  }

  private startHealthCheck(): void {
    this.stopHealthCheck();
    this.healthCheckInterval = setInterval(() => {
      const elapsed = Date.now() - this.lastMessageTime;
      if (elapsed > 60000) { // No message for 60s
        for (const h of this.errorHandlers) h(new Event("sse-health-timeout"));
      }
    }, 15000);
  }

  private stopHealthCheck(): void {
    if (this.healthCheckInterval) { clearInterval(this.healthCheckInterval); this.healthCheckInterval = null; }
  }

  private parseSseData(raw: string): unknown {
    // Try JSON first, then fall back to raw string
    try { return JSON.parse(raw); } catch { return raw; }
  }
}

// ──────────────────────────────────────────────────────────────
// 7. Network Quality Detection
// ──────────────────────────────────────────────────────────────

interface ConnectionInfo {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  type?: string;
}

declare global {
  interface Navigator {
    connection?: ConnectionInfo;
    mozConnection?: ConnectionInfo;
    webkitConnection?: ConnectionInfo;
  }
}

/**
 * Estimate download bandwidth by fetching a known-sized resource and measuring time.
 * Returns bandwidth in Mbps, or null if measurement failed.
 */
export async function estimateBandwidth(
  testUrl: string = "https://www.google.com/generate_204",
  expectedBytes: number = 512,
  timeoutMs: number = 10000
): Promise<number | null> {
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(testUrl, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    const body = await resp.arrayBuffer();
    const elapsed = (performance.now() - start) / 1000; // seconds
    const bits = body.byteLength * 8;
    const mbps = (bits / elapsed) / 1_000_000;
    return Math.round(mbps * 100) / 100;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Measure round-trip latency by sending timestamped pings to a server endpoint.
 * Uses a lightweight endpoint that echoes the timestamp.
 * Falls back to a HEAD request timing approach if no ping endpoint is available.
 */
export async function measureLatency(
  pingUrl: string,
  samples: number = 5,
  timeoutMs: number = 5000
): Promise<number | null> {
  const latencies: number[] = [];
  for (let i = 0; i < samples; i++) {
    const start = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      await fetch(pingUrl, {
        method: "HEAD",
        cache: "no-store",
        signal: controller.signal,
      });
      latencies.push(performance.now() - start);
    } catch {
      // ignore failures
    } finally {
      clearTimeout(timer);
    }
    if (i < samples - 1) await new Promise((r) => setTimeout(r, 100)); // small gap between pings
  }
  if (latencies.length === 0) return null;
  // Return median
  const sorted = [...latencies].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : Math.round(sorted[mid]);
}

/**
 * Detect the current connection type using the Network Information API.
 * Returns a normalized connection info object.
 */
export function detectConnectionType(): ConnectionInfo {
  const conn =
    (navigator as Navigator).connection ??
    (navigator as Navigator).mozConnection ??
    (navigator as Navigator).webkitConnection;
  if (!conn) return {};
  return {
    effectiveType: conn.effectiveType,
    downlink: conn.downlink,
    rtt: conn.rtt,
    saveData: conn.saveData,
    type: (conn as unknown as { type: string }).type,
  };
}

/**
 * Start listening for online/offline events. Returns an unsubscribe function.
 */
export function watchOnlineStatus(
  onChange: (online: boolean) => void
): () => void {
  const handler = () => onChange(navigator.onLine);
  window.addEventListener("online", handler);
  window.addEventListener("offline", handler);
  // Emit initial state
  onChange(navigator.onLine);
  return () => {
    window.removeEventListener("online", handler);
    window.removeEventListener("offline", handler);
  };
}

/**
 * Compute a composite network quality score from 0 (unusable) to 100 (excellent).
 * Factors in bandwidth, latency, connection type, and online status.
 */
export async function computeNetworkQualityScore(options?: {
  bandwidthTestUrl?: string;
  pingUrl?: string;
}): Promise<NetworkQualityReport> {
  const conn = detectConnectionType();
  const isOnline = navigator.onLine;

  // Run bandwidth and latency measurements in parallel
  const [bandwidthEstimate, latencyMs] = await Promise.all([
    estimateBandwidth(options?.bandwidthTestUrl),
    options?.pingUrl ? measureLatency(options.pingUrl) : Promise.resolve(conn.rtt ?? null),
  ]);

  // Score calculation
  let score = 0;

  // Online status: baseline 20 points if online
  if (isOnline) score += 20;

  // Effective type scoring (max 30 points)
  const effectiveTypeScores: Record<string, number> = {
    "4g": 30,
    "3g": 18,
    "2g": 8,
    "slow-2g": 2,
  };
  if (conn.effectiveType && conn.effectiveType in effectiveTypeScores) {
    score += effectiveTypeScores[conn.effectiveType];
  } else {
    score += 15; // unknown type, neutral
  }

  // Bandwidth scoring (max 25 points)
  if (bandwidthEstimate !== null) {
    if (bandwidthEstimate >= 50) score += 25;
    else if (bandwidthEstimate >= 20) score += 20;
    else if (bandwidthEstimate >= 10) score += 15;
    else if (bandwidthEstimate >= 5) score += 10;
    else if (bandwidthEstimate >= 1) score += 5;
    else score += 1;
  }

  // Latency scoring (max 25 points)
  if (latencyMs !== null) {
    if (latencyMs <= 50) score += 25;
    else if (latencyMs <= 100) score += 20;
    else if (latencyMs <= 200) score += 15;
    else if (latencyMs <= 500) score += 8;
    else score += 2;
  }

  // Clamp to 0–100
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    bandwidthEstimateMbps: bandwidthEstimate,
    latencyMs,
    connectionType: conn.type ?? (conn.effectiveType ?? "unknown"),
    isOnline,
    effectiveType: conn.effectiveType ?? "unknown",
    downlink: conn.downlink ?? null,
    rtt: conn.rtt ?? null,
  };
}
