/**
 * network-protocol.ts — Comprehensive Network Protocol Utilities for Browser Environments
 *
 * Provides URL/URI manipulation, HTTP helpers, WebSocket management, simplified binary protocol,
 * JSON-RPC 2.0, SSE utilities, and network quality detection.
 * @module network-protocol
 */

// ── Types ──────────────────────────────────────────────────────

/** Parsed URL components. */
export interface ParsedUrl { protocol: string; host: string; hostname: string; port: string; pathname: string; search: string; hash: string; username: string; password: string; }
/** Query parameters with support for repeated keys. */
export interface QueryParams { [key: string]: string | string[]; }
/** HTTP headers as a plain key-value map. */
export interface HttpHeaders { [key: string]: string; }
/** JSON-RPC 2.0 request object. */
export interface RpcRequest { jsonrpc: "2.0"; method: string; params?: unknown[]; id?: number | string; }
/** JSON-RPC 2.0 response or error object. */
export interface RpcResponse { jsonrpc: "2.0"; result?: unknown; error?: { code: number; message: string; data?: unknown }; id?: number | string; }
/** WebSocket connection configuration. */
export interface WsConfig { url: string; protocols?: string[]; reconnect?: boolean; maxRetries?: number; heartbeatInterval?: number; }
/** Network quality report (0–100). */
export interface NetworkQualityReport { score: number; bandwidthEstimateMbps: number | null; latencyMs: number | null; connectionType: string; isOnline: boolean; effectiveType: string; downlink: number | null; rtt: number | null; }

// ══════════════════════════════════════════════════════════════
// 1. URL & URI Utilities
// ══════════════════════════════════════════════════════════════

/** Parse a URL string into its component parts. Falls back to manual parser when native `URL` rejects. */
export function parseUrl(raw: string): ParsedUrl {
  try {
    const u = new URL(raw);
    return { protocol: u.protocol.replace(/:$/, ""), host: u.host, hostname: u.hostname, port: u.port, pathname: u.pathname, search: u.search, hash: u.hash, username: u.username, password: u.password };
  } catch { return parseUrlManual(raw); }
}

function parseUrlManual(raw: string): ParsedUrl {
  const r: ParsedUrl = { protocol: "", host: "", hostname: "", port: "", pathname: "/", search: "", hash: "", username: "", password: "" };
  const pm = raw.match(/^([a-z][a-z0-9+.-]*):\/\//i);
  if (!pm) return r;
  r.protocol = pm[1].toLowerCase();
  let rest = raw.slice(pm[0].length);
  const atIdx = rest.indexOf("@");
  if (atIdx > 0) {
    const auth = rest.slice(0, atIdx), ci = auth.indexOf(":");
    r.username = decodeURIComponent(ci >= 0 ? auth.slice(0, ci) : auth);
    if (ci >= 0) r.password = decodeURIComponent(auth.slice(ci + 1));
    rest = rest.slice(atIdx + 1);
  }
  const hEnd = [rest.indexOf("/"), rest.indexOf("#"), rest.indexOf("?")].filter((i) => i > 0).sort((a, b) => a - b)[0] ?? rest.length;
  const hp = rest.slice(0, hEnd === -1 ? rest.length : hEnd), cpi = hp.lastIndexOf(":");
  r.hostname = cpi > 0 ? hp.slice(0, cpi) : hp; r.port = cpi > 0 ? hp.slice(cpi + 1) : ""; r.host = hp;
  rest = rest.slice(hp.length);
  const qi = rest.indexOf("?"), fi = rest.indexOf("#");
  if (qi >= 0 && fi >= 0) { r.pathname = rest.slice(0, qi) || "/"; r.search = rest.slice(qi, fi); r.hash = rest.slice(fi); }
  else if (qi >= 0) { r.pathname = rest.slice(0, qi) || "/"; r.search = rest.slice(qi); }
  else if (fi >= 0) { r.pathname = rest.slice(0, fi) || "/"; r.hash = rest.slice(fi); }
  else { r.pathname = rest || "/"; }
  return r;
}

/** Build a URL string from parsed components. */
export function buildUrl(parts: Partial<ParsedUrl>): string {
  let auth = "";
  if (parts.username) { auth = encodeURIComponent(parts.username) + (parts.password ? ":" + encodeURIComponent(parts.password) : "") + "@"; }
  return `${parts.protocol ? parts.protocol + "://" : "//"}${auth}${parts.hostname || ""}${parts.port ? ":" + parts.port : ""}${parts.pathname || "/"}${parts.search || ""}${parts.hash || ""}`;
}

/** Normalize a URL: sort query params, strip trailing slashes, lowercase host, remove default ports. */
export function normalizeUrl(url: string): string {
  const p = parseUrl(url);
  p.hostname = p.hostname.toLowerCase();
  if ((p.protocol === "http" && p.port === "80") || (p.protocol === "https" && p.port === "443")) p.port = "";
  p.pathname = p.pathname.replace(/\/+$/, "") || "/";
  if (p.search) p.search = "?" + stringifyQuery(Object.keys(parseQueryString(p.search.slice(1))).sort().reduce((o, k) => { o[k] = (parseQueryString(p.search.slice(1)) as QueryParams)[k]; return o; }, {} as QueryParams));
  return buildUrl(p);
}

/** Parse a query string into an object. Repeated keys produce string arrays. */
export function parseQueryString(raw: string): QueryParams {
  const result: QueryParams = {};
  if (!raw) return result;
  raw.split("&").forEach((pair) => {
    const eq = pair.indexOf("="), key = eq >= 0 ? decodeURIComponent(pair.slice(0, eq).replace(/\+/g, " ")) : decodeURIComponent(pair.replace(/\+/g, " "));
    const val = eq >= 0 ? decodeURIComponent(pair.slice(eq + 1).replace(/\+/g, " ")) : "";
    result[key] = key in result ? (Array.isArray(result[key]) ? [...result[key] as string[], val] : [result[key] as string, val]) : val;
  });
  return result;
}

/** Stringify query-params into a query string (without leading '?'). */
export function stringifyQuery(params: QueryParams): string {
  return Object.keys(params).flatMap((k) => {
    const v = params[k];
    return Array.isArray(v) ? v.map((vv) => `${encodeURIComponent(k)}=${encodeURIComponent(vv)}`) : [`${encodeURIComponent(k)}=${encodeURIComponent(v)}`];
  }).join("&");
}

/** Merge two query-param objects. Later values win for scalars; arrays are concatenated. */
export function mergeQueryParams(base: QueryParams, overlay: QueryParams): QueryParams {
  const r: QueryParams = { ...base };
  for (const [k, v] of Object.entries(overlay)) r[k] = Array.isArray(v) ? (Array.isArray(r[k]) ? [...r[k] as string[], ...v] : v) : v;
  return r;
}

/** Join URL path segments, normalizing slashes. */
export function joinPath(...segments: string[]): string {
  return segments.map((s) => s.replace(/^\/+|\/+$/g, "")).filter(Boolean).join("/").replace(/\/+/g, "/");
}

/** Normalize a file-system style path (resolve '.' and '..'). */
export function normalizePath(path: string): string {
  const stack: string[] = [];
  path.split("/").filter(Boolean).forEach((part) => { part === ".." ? stack.pop() : part !== "." && stack.push(part); });
  return (path.startsWith("/") ? "/" : "") + stack.join("/") || ".";
}

/** Resolve a possibly-relative reference against a base URL. */
export function resolveUrl(base: string, relative: string): string {
  try { return new URL(relative, base).href; } catch { return relative; }
}

/** RFC 3986 compliant encode — does NOT encode `~`, `'`, `(`, `)`, `!`, `*`. */
export function encodeRfc3986(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}
/** RFC 3986 compliant decode. */
export function decodeRfc3986(str: string): string { try { return decodeURIComponent(str.replace(/\+/g, " ")); } catch { return str; } }

/** Test whether a URL matches a pattern with `*` wildcards (matches within one segment). */
export function matchUrlPattern(url: string, pattern: string): boolean {
  return new RegExp("^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*") + "$").test(url);
}
/** Test whether a URL matches a regular expression. */
export function matchUrlRegex(url: string, regex: RegExp): boolean { const r = new RegExp(regex.source, regex.flags); r.lastIndex = 0; return r.test(url); }

// ══════════════════════════════════════════════════════════════
// 2. HTTP Protocol Helpers
// ══════════════════════════════════════════════════════════════

/** Standard HTTP methods. */
export const HttpMethod = Object.freeze({ GET: "GET", POST: "POST", PUT: "PUT", DELETE: "DELETE", PATCH: "PATCH", HEAD: "HEAD", OPTIONS: "OPTIONS", CONNECT: "CONNECT", TRACE: "TRACE" }) as Record<string, string>;
export type HttpMethodValue = typeof HttpMethod[keyof typeof HttpMethod];

/** HTTP status code category predicates. */
export const HttpStatusCategory = Object.freeze({
  INFORMATIONAL: (c: number) => c >= 100 && c < 200,
  SUCCESS:       (c: number) => c >= 200 && c < 300,
  REDIRECT:      (c: number) => c >= 300 && c < 400,
  CLIENT_ERROR:  (c: number) => c >= 400 && c < 500,
  SERVER_ERROR:  (c: number) => c >= 500 && c < 600,
}) as Record<string, (code: number) => boolean>;

/** Parse Content-Type into media type, charset, and boundary. */
export function parseContentType(h: string | null | undefined): { mediaType: string; charset: string; boundary: string | null } {
  if (!h) return { mediaType: "", charset: "", boundary: null };
  const parts = h.split(";").map((s) => s.trim()), mt = (parts[0] ?? "").toLowerCase();
  let cs = "", bd: string | null = null;
  for (let i = 1; i < parts.length; i++) { const eq = parts[i].indexOf("="); if (eq <= 0) continue; const n = parts[i].slice(0, eq).trim().toLowerCase(), v = parts[i].slice(eq + 1).trim().replace(/^["']|["']$/g, ""); if (n === "charset") cs = v.toLowerCase(); if (n === "boundary") bd = v; }
  return { mediaType: mt, charset: cs, boundary: bd };
}

/** Parse Accept header into sorted entries by quality value. */
export function parseAcceptHeader(h: string | null | undefined): Array<{ type: string; q: number; params: Record<string, string> }> {
  if (!h) return [];
  return h.split(",").map((part) => {
    const segs = part.trim().split(";").map((s) => s.trim()), type = segs[0] ?? "*/*", params: Record<string, string> = {}; let q = 1;
    for (let i = 1; i < segs.length; i++) { const eq = segs[i].indexOf("="); if (eq > 0) { const n = segs[i].slice(0, eq).trim().toLowerCase(), v = segs[i].slice(eq + 1).trim(); params[n] = v; if (n === "q") q = parseFloat(v) || 0; } }
    return { type, q, params };
  }).sort((a, b) => b.q - a.q);
}

/** Parse Cache-Control directives into directive -> value map. */
export function parseCacheControl(h: string | null | undefined): Record<string, string | true> {
  const r: Record<string, string | true> = {};
  if (!h) return r;
  h.split(",").forEach((d) => { const t = d.trim(); const eq = t.indexOf("="); r[eq > 0 ? t.slice(0, eq).trim().toLowerCase() : t.toLowerCase()] = eq > 0 ? t.slice(eq + 1).trim().toLowerCase() : true; });
  return r;
}

/** Extract max-age from Cache-Control directives. Returns null if absent. */
export function getMaxAge(cc: Record<string, string | true>): number | null {
  if ("max-age" in cc && typeof cc["max-age"] === "string") return parseInt(cc["max-age"], 10) || null;
  if ("s-maxage" in cc && typeof cc["s-maxage"] === "string") return parseInt(cc["s-maxage"], 10) || null;
  return null;
}
/** Check whether cache must be revalidated before use. */
export function mustRevalidate(cc: Record<string, string | true>): boolean { return "must-revalidate" in cc || "proxy-revalidate" in cc || "no-cache" in cc; }

/** Parse Accept-Language header into sorted language tags with quality values. */
export function parseAcceptLanguage(h: string | null | undefined): Array<{ tag: string; q: number }> {
  if (!h) return [{ tag: "*", q: 0.001 }];
  return h.split(",").map((p) => { const s = p.trim(), si = s.indexOf(";"); return si < 0 ? { tag: s, q: 1 } : { tag: s.slice(0, si).trim(), q: parseFloat(s.slice(si + 1).replace(/^\s*q\s*=\s*/i, "")) || 0.001 }; }).sort((a, b) => b.q - a.q);
}

/** Parse Accept-Encoding header into sorted encodings with quality values. */
export function parseAcceptEncoding(h: string | null | undefined): Array<{ encoding: string; q: number }> {
  if (!h) return [{ encoding: "identity", q: 1 }];
  return h.split(",").map((p) => { const s = p.trim(), si = s.indexOf(";"); return si < 0 ? { encoding: s, q: 1 } : { encoding: s.slice(0, si).trim(), q: parseFloat(s.slice(si + 1).replace(/^\s*q\s*=\s*/i, "")) || 0.001 }; }).sort((a, b) => b.q - a.q);
}

/** Compare two ETags per RFC 7232 §2.3. Weak ETags never match strong comparators. */
export function compareEtags(etagA: string, etagB: string, strong: boolean = false): boolean {
  const norm = (e: string) => e.trim().replace(/^W\//i, "").replace(/^"|"$/g, "");
  if (strong && (/^W\//i.test(etagA) || /^W\//i.test(etagB))) return false;
  return norm(etagA) === norm(etagB);
}

/** Check whether an ETag matches any entry in If-Match / If-None-Match list. */
export function etagMatchesList(etag: string, hv: string | null | undefined, noneMatch: boolean = false): boolean {
  if (!hv) return noneMatch;
  if (hv.trim() === "*") return !noneMatch;
  const hit = hv.split(",").some((t) => compareEtags(etag, t.trim()));
  return noneMatch ? !hit : hit;
}

/** Build a Cookie header from name-value pairs. */
export function buildCookieHeader(cookies: Array<[string, string]>): string {
  return cookies.map(([n, v]) => `${encodeURIComponent(n)}=${encodeURIComponent(v)}`).join("; ");
}

/** Generate Basic authentication header. */
export function basicAuthHeader(user: string, pass: string): string {
  const creds = `${user}:${pass}`;
  const encoded = typeof btoa !== "undefined" ? btoa(unescape(encodeURIComponent(creds))) : typeof TextEncoder !== "undefined" ? btoa(Array.from(new TextEncoder().encode(creds), (b) => String.fromCharCode(b)).join("")) : "";
  return `Basic ${encoded}`;
}
/** Generate Bearer token authorization header. */
export function bearerAuthHeader(token: string): string { return `Bearer ${token}`; }

/** Generate Digest authentication header (simplified — placeholder hashing). */
export function digestAuthHeader(username: string, realm: string, nonce: string, uri: string, method: string, password: string, algorithm: string = "MD5", qop: string = "auth", nc: string = "00000001", cnonce: string = ""): string {
  const sh = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return Math.abs(h).toString(16).padStart(8, "0"); };
  const ha1 = sh(`${username}:${realm}:${password}`), ha2 = sh(`${method}:${uri}`), resp = sh(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
  const parts = [`username="${username}"`, `realm="${realm}"`, `nonce="${nonce}"`, `uri="${uri}"`, `algorithm=${algorithm}`, `response="${resp}"`];
  if (qop) parts.push(`qop=${qop}`, `nc=${nc}`); if (cnonce) parts.push(`cnonce="${cnonce}"`);
  return `Digest ${parts.join(", ")}`;
}

/** Build a CORS preflight OPTIONS request config. */
export function buildCorsPreflight(origin: string, targetUrl: string, method: string, customHeaders?: string[]): RequestInit {
  return { method: HttpMethod.OPTIONS, headers: { Origin: origin, "Access-Control-Request-Method": method, "Access-Control-Request-Headers": (customHeaders ?? []).join(", ") }, mode: "cors" as RequestMode };
}

/** Format a fetch Request or Response for logging. */
export function formatHttpLog(req: Request | Response, extra?: Record<string, unknown>): string {
  const lines: string[] = [];
  if (req instanceof Request) { lines.push(`>> ${req.method} ${req.url}`); req.headers.forEach((v, k) => lines.push(`   ${k}: ${v}`)); }
  else { lines.push(`<< ${req.status} ${req.statusText}`); req.headers.forEach((v, k) => lines.push(`   ${k}: ${v}`)); }
  if (extra) for (const [k, v] of Object.entries(extra)) lines.push(`   [${k}] ${JSON.stringify(v)}`);
  return lines.join("\n");
}

// ══════════════════════════════════════════════════════════════
// 3. WebSocket Protocol
// ══════════════════════════════════════════════════════════════

/** WebSocket connection states. */
export enum WsState { CONNECTING = "connecting", OPEN = "open", CLOSING = "closing", CLOSED = "closed", RECONNECTING = "reconnecting" }

type WsMsgFn = (data: unknown) => void;
type WsErrFn = (ev: Event) => void;
type WsStFn = (state: WsState, prev: WsState) => void;

/**
 * Managed WebSocket with auto-reconnect (exponential backoff), heartbeat/ping keepalive,
 * message acknowledgment (request-response correlation via `_cid`), and room subscription tracking.
 */
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private _state: WsState = WsState.CLOSED;
  private cfg: Required<WsConfig>;
  private retries = 0;
  private rtimer: ReturnType<typeof setTimeout> | null = null;
  private htimer: ReturnType<typeof setInterval> | null = null;
  private msgHandlers = new Map<string, WsMsgFn>();
  private globalHandlers: WsMsgFn[] = [];
  private errHandlers: WsErrFn[] = [];
  private stHandlers: WsStFn[] = [];
  private pending = new Map<number, { resolve: (d: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  private nextCid = 1;
  private subs = new Set<string>();
  private intentionalClose = false;

  constructor(config: WsConfig) {
    this.cfg = { url: config.url, protocols: config.protocols ?? [], reconnect: config.reconnect ?? true, maxRetries: config.maxRetries ?? 10, heartbeatInterval: config.heartbeatInterval ?? 30000 };
  }
  get state(): WsState { return this._state; }
  get isOpen(): boolean { return this._state === WsState.OPEN && this.ws?.readyState === WebSocket.OPEN; }

  /** Open (or reopen) the connection. */
  connect(): void {
    this.intentionalClose = false;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.setState(WsState.CONNECTING);
    try {
      this.ws = new WebSocket(this.cfg.url, this.cfg.protocols.length > 0 ? this.cfg.protocols : undefined);
      this.ws.binaryType = "arraybuffer";
      this.ws.onopen = () => { this.retries = 0; this.setState(WsState.OPEN); this.startHb(); for (const room of this.subs) this.send({ type: "subscribe", channel: room }); };
      this.ws.onmessage = (evt) => {
        const data = this.parseMsg(evt.data);
        if (data && typeof data === "object" && "_cid" in data) {
          const cid = (data as Record<string, unknown>)._cid as number, p = this.pending.get(cid);
          if (p) { clearTimeout(p.timer); this.pending.delete(cid); p.resolve(data); return; }
        }
        if (data && typeof data === "object" && "type" in data) { const h = this.msgHandlers.get((data as Record<string, unknown>).type as string); if (h) h(data); }
        for (const g of this.globalHandlers) g(data);
      };
      this.ws.onerror = (ev) => { for (const h of this.errHandlers) h(ev); };
      this.ws.onclose = (_evt) => {
        this.stopHb(); this.rejectAll(new Error("WebSocket closed"));
        if (!this.intentionalClose && this.cfg.reconnect && this.retries < this.cfg.maxRetries) this.scheduleReconn(); else this.setState(WsState.CLOSED);
      };
    } catch (err) { this.setState(WsState.CLOSED); for (const h of this.errHandlers) h(err as Event); }
  }

  /** Gracefully close the connection. */
  disconnect(code?: number, reason?: string): void {
    this.intentionalClose = true;
    if (this.rtimer) { clearTimeout(this.rtimer); this.rtimer = null; }
    this.stopHb();
    if (this.ws) { if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) this.ws.close(code ?? 1000, reason ?? "client disconnect"); this.ws = null; }
    this.setState(WsState.CLOSED);
  }

  /** Send data (auto-stringified to JSON). Returns true if sent. */
  send(data: unknown): boolean { if (!this.isOpen) return false; this.ws!.send(typeof data === "string" ? data : JSON.stringify(data)); return true; }

  /** Send and wait for correlated response (request-response pattern via `_cid`). */
  async sendAndWait<T = unknown>(data: unknown, timeoutMs = 15000): Promise<T> {
    if (!this.isOpen) throw new Error("WebSocket not connected");
    const cid = this.nextCid++, payload = typeof data === "object" && data !== null ? { ...(data as Record<string, unknown>), _cid: cid } : { _data: data, _cid: cid };
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(cid); reject(new Error(`WS ack timeout (${timeoutMs}ms)`)); }, timeoutMs);
      this.pending.set(cid, { resolve: resolve as (d: unknown) => void, reject, timer }); this.ws!.send(JSON.stringify(payload));
    });
  }

  /** Subscribe to messages of a given type. Returns unsubscribe fn. */
  onMessage(type: string, handler: WsMsgFn): () => void { this.msgHandlers.set(type, handler); return () => this.msgHandlers.delete(type); }
  /** Add global message handler. Returns unsubscribe fn. */
  onAnyMessage(handler: WsMsgFn): () => void { this.globalHandlers.push(handler); return () => { const i = this.globalHandlers.indexOf(handler); if (i >= 0) this.globalHandlers.splice(i, 1); }; }
  /** Register error handler. Returns unsubscribe fn. */
  onError(handler: WsErrFn): () => void { this.errHandlers.push(handler); return () => { const i = this.errHandlers.indexOf(handler); if (i >= 0) this.errHandlers.splice(i, 1); }; }
  /** Register state-change listener. Returns unsubscribe fn. */
  onStateChange(handler: WsStFn): () => void { this.stHandlers.push(handler); return () => { const i = this.stHandlers.indexOf(handler); if (i >= 0) this.stHandlers.splice(i, 1); }; }

  /** Join a room/channel (tracked across reconnects). */
  subscribe(channel: string): void { this.subs.add(channel); this.send({ type: "subscribe", channel }); }
  /** Leave a room/channel. */
  unsubscribe(channel: string): void { this.subs.delete(channel); this.send({ type: "unsubscribe", channel }); }
  /** Get active subscriptions. */
  getSubscriptions(): string[] { return [...this.subs]; }

  // ── Internal ──
  private setState(n: WsState): void { const p = this._state; this._state = n; for (const h of this.stHandlers) h(n, p); }
  private scheduleReconn(): void { this.setState(WsState.RECONNECTING); this.retries++; this.rtimer = setTimeout(() => this.connect(), Math.min(1000 * 2 ** this.retries, 30000)); }
  private startHb(): void { this.stopHb(); this.htimer = setInterval(() => { if (this.isOpen) this.send({ type: "__ping__", ts: Date.now() }); }, this.cfg.heartbeatInterval); }
  private stopHb(): void { if (this.htimer) { clearInterval(this.htimer); this.htimer = null; } }
  private parseMsg(data: string | ArrayBuffer | Blob): unknown {
    if (typeof data === "string") { try { return JSON.parse(data); } catch { return data; } }
    if (data instanceof ArrayBuffer) { try { return decodeLengthPrefixedFrame(data); } catch { return data; } }
    return data;
  }
  private rejectAll(err: Error): void { for (const [, p] of this.pending) { clearTimeout(p.timer); p.reject(err); } this.pending.clear(); }
}

/** Encode binary length-prefixed frame: [4 bytes BE length][payload]. */
export function encodeLengthPrefixedFrame(payload: string | Uint8Array): ArrayBuffer {
  const bytes = typeof payload === "string" ? new TextEncoder().encode(payload) : payload, buf = new ArrayBuffer(4 + bytes.byteLength);
  new DataView(buf).setUint32(0, bytes.byteLength, false); new Uint8Array(buf, 4, bytes.byteLength).set(bytes); return buf;
}
/** Decode binary length-prefixed frame to UTF-8 string. */
export function decodeLengthPrefixedFrame(buf: ArrayBuffer): string {
  const len = new DataView(buf).getUint32(0, false); return new TextDecoder().decode(new Uint8Array(buf, 4, len));
}

// ══════════════════════════════════════════════════════════════
// 4. Protocol Buffers-like (Simplified Binary Protocol)
// ══════════════════════════════════════════════════════════════

/** Wire types matching protobuf conventions. */
export enum WireType { VARINT = 0, BIT64 = 1, LENGTH_DELIMITED = 2, BIT32 = 5 }
/** Field descriptor for schema registry. */
export interface FieldDescriptor { fieldNumber: number; wireType: WireType; name: string; repeated?: boolean; }
/** Registry mapping field numbers to descriptors. */
export type FieldRegistry = Map<number, FieldDescriptor>;

/** Encode unsigned integer as varint (up to 32-bit). */
export function encodeVarint(value: number): Uint8Array {
  const out: number[] = []; let v = value >>> 0;
  do { let b = v & 0x7f; v >>>= 7; if (v > 0) b |= 0x80; out.push(b); } while (v > 0);
  return new Uint8Array(out);
}
/** Decode varint from byte array at offset. Returns [value, bytesRead]. */
export function decodeVarint(bytes: Uint8Array, offset = 0): [number, number] {
  let res = 0, shift = 0, read = 0;
  while (offset + read < bytes.length) { const b = bytes[offset + read]; res |= (b & 0x7f) << shift; read++; if ((b & 0x80) === 0) break; shift += 7; if (shift >= 35) throw new Error("Varint too long"); }
  return [res, read];
}

/** Encode field tag (fieldNumber << 3 | wireType) as varint. */
export function encodeTag(fn: number, wt: WireType): Uint8Array { return encodeVarint((fn << 3) | wt); }
/** Decode field tag. Returns [fieldNumber, wireType]. */
export function decodeTag(v: number): [number, WireType] { return [v >>> 3, (v & 0x07) as WireType]; }

/** Encode a single field value using the given wire type. */
export function encodeFieldValue(wt: WireType, value: unknown): Uint8Array {
  switch (wt) {
    case WireType.VARINT: return encodeVarint(typeof value === "boolean" ? (value ? 1 : 0) : Number(value));
    case WireType.BIT64: { const dv = new DataView(new ArrayBuffer(8)); dv.setFloat64(0, Number(value), true); return new Uint8Array(dv.buffer); }
    case WireType.BIT32: { const dv = new DataView(new ArrayBuffer(4)); dv.setFloat32(0, Number(value), true); return new Uint8Array(dv.buffer); }
    case WireType.LENGTH_DELIMITED:
      if (typeof value === "string") { const e = new TextEncoder().encode(value), l = encodeVarint(e.length), c = new Uint8Array(l.length + e.length); c.set(l, 0); c.set(e, l.length); return c; }
      if (value instanceof Uint8Array) { const l = encodeVarint(value.length), c = new Uint8Array(l.length + value.length); c.set(l, 0); c.set(value, l.length); return c; }
      { const j = new TextEncoder().encode(JSON.stringify(value)), jl = encodeVarint(j.length), c = new Uint8Array(jl.length + j.length); c.set(jl, 0); c.set(j, jl.length); return c; }
    default: throw new Error(`Unsupported wire type: ${wt}`);
  }
}

/** Decode a field value from bytes at offset. Returns [value, bytesConsumed]. */
export function decodeFieldValue(wt: WireType, bytes: Uint8Array, offset: number): [unknown, number] {
  switch (wt) {
    case WireType.VARINT: return decodeVarint(bytes, offset);
    case WireType.BIT64: { const dv = new DataView(bytes.buffer, bytes.byteOffset || 0); return [dv.getFloat64(offset, true), 8]; }
    case WireType.BIT32: { const dv = new DataView(bytes.buffer, bytes.byteOffset || 0); return [dv.getFloat32(offset, true), 4]; }
    case WireType.LENGTH_DELIMITED: { const [len, ls] = decodeVarint(bytes, offset), sl = bytes.slice(offset + ls, offset + ls + len); try { return [new TextDecoder().decode(sl), ls + len]; } catch { return [new Uint8Array(sl), ls + len]; } }
    default: throw new Error(`Cannot decode wire type: ${wt}`);
  }
}

/** Serialize a plain object into binary using a field registry. */
export function serializeMessage(msg: Record<string, unknown>, reg: FieldRegistry): Uint8Array {
  const parts: Uint8Array[] = [];
  for (const [fn, val] of Object.entries(msg)) {
    let desc: FieldDescriptor | undefined;
    for (const d of reg.values()) { if (d.name === fn) { desc = d; break; } }
    if (!desc) continue;
    if (desc.repeated && Array.isArray(val)) for (const item of val) { parts.push(encodeTag(desc.fieldNumber, desc.wireType)); parts.push(encodeFieldValue(desc.wireType, item)); }
    else { parts.push(encodeTag(desc.fieldNumber, desc.wireType)); parts.push(encodeFieldValue(desc.wireType, val)); }
  }
  const r = new Uint8Array(parts.reduce((s, p) => s + p.length, 0)); let pos = 0;
  for (const p of parts) { r.set(p, pos); pos += p.length; } return r;
}

/** Deserialize binary data into a plain object using a field registry. */
export function deserializeMessage(data: Uint8Array, reg: FieldRegistry): Record<string, unknown> {
  const r: Record<string, unknown> = {}; let off = 0;
  while (off < data.length) {
    const [tv, tl] = decodeVarint(data, off); off += tl;
    const [fn, wt] = decodeTag(tv), desc = reg.get(fn);
    if (!desc) { off += decodeFieldValue(wt, data, off)[1]; continue; }
    const [val, consumed] = decodeFieldValue(wt, data, off); off += consumed;
    r[desc.name] = desc.repeated ? [...(r[desc.name] as unknown[] ?? []), val] : val;
  }
  return r;
}

// ══════════════════════════════════════════════════════════════
// 5. RPC Protocol (JSON-RPC 2.0)
// ══════════════════════════════════════════════════════════════

/** Standard JSON-RPC 2.0 error codes. */
export const RpcErrorCode = Object.freeze({ PARSE_ERROR: -32700, INVALID_REQUEST: -32600, METHOD_NOT_FOUND: -32601, INVALID_PARAMS: -32602, INTERNAL_ERROR: -32603 }) as Record<string, number>;
type RpcHandler = (params?: unknown[]) => Promise<unknown>;

/**
 * JSON-RPC 2.0 client/server supporting call, notify, batch, dispatch, timeout, and streaming.
 * Transport must be set via constructor arg or `setTransport()` before use.
 */
export class JsonRpcClient {
  private rid = 0;
  private handlers = new Map<string, RpcHandler>();
  private pending = new Map<number | string, { resolve: (r: RpcResponse) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  private transport: (payload: string) => Promise<string>;

  constructor(transport?: (payload: string) => Promise<string>) { this.transport = transport ?? (() => Promise.reject(new Error("Transport not configured"))); }
  /** Override the transport function. */
  setTransport(fn: (payload: string) => Promise<string>): void { this.transport = fn; }
  /** Register a server-side method handler. Returns unsubscribe fn. */
  registerMethod(name: string, handler: RpcHandler): () => void { this.handlers.set(name, handler); return () => this.handlers.delete(name); }

  /** Call a remote method and await the result. */
  async call(method: string, params?: unknown[], timeoutMs = 30000): Promise<unknown> {
    const id = ++this.rid, req: RpcRequest = { jsonrpc: "2.0", method, params, id };
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`RPC '${method}' timed out (${timeoutMs}ms)`)); }, timeoutMs);
      this.pending.set(id, {
        resolve: (resp) => { if (resp.error) reject(new RpcError(resp.error.code, resp.error.message, resp.error.data)); else resolve(resp.result); },
        reject, timer
      });
      this.transport(JSON.stringify(req)).then((raw) => {
        clearTimeout(timer); this.pending.delete(id);
        try { const resp = JSON.parse(raw) as RpcResponse; if (resp.error) reject(new RpcError(resp.error.code, resp.error.message, resp.error.data)); else resolve(resp.result); }
        catch (e) { reject(new Error(`Invalid RPC response: ${(e as Error).message}`)); }
      }).catch(reject);
    });
  }

  /** Send a notification (fire-and-forget, no id). */
  notify(method: string, params?: unknown[]): void { this.transport(JSON.stringify({ jsonrpc: "2.0", method, params })).catch(() => {}); }

  /** Send batch requests. Results returned in order; notifications yield undefined. */
  async batch(items: Array<{ method: string; params?: unknown[]; notification?: boolean }>, timeoutMs = 30000): Promise<(unknown | undefined)[]> {
    const reqs: RpcRequest[] = items.map((it, i) => ({ jsonrpc: "2.0" as const, method: it.method, params: it.params, id: it.notification ? undefined : ++this.rid + (i * 1000) }));
    const raw = await this.transport(JSON.stringify(reqs));
    return (JSON.parse(raw) as RpcResponse[]).map((resp) => { if (resp.error) throw new RpcError(resp.error.code, resp.error.message, resp.error.data); return resp.result; });
  }

  /** Dispatch incoming JSON-RPC request(s) server-side. Returns response string. */
  async dispatch(rawPayload: string): Promise<string> {
    let reqs: RpcRequest[];
    try { const p = JSON.parse(rawPayload); reqs = Array.isArray(p) ? p : [p]; } catch { return JSON.stringify({ jsonrpc: "2.0", error: { code: RpcErrorCode.PARSE_ERROR, message: "Parse error" }, id: null }); }
    const responses: (RpcResponse | null)[] = await Promise.all(reqs.map((req) => this.dispatchOne(req)));
    const filtered = responses.filter((r): r is RpcResponse => r !== null);
    return filtered.length === 0 ? "" : reqs.length === 1 ? JSON.stringify(filtered[0]) : JSON.stringify(filtered);
  }

  private async dispatchOne(req: RpcRequest): Promise<RpcResponse | null> {
    if (req.jsonrpc !== "2.0") return { jsonrpc: "2.0", error: { code: RpcErrorCode.INVALID_REQUEST, message: "Invalid Request" }, id: req.id };
    if (!req.method || typeof req.method !== "string") return { jsonrpc: "2.0", error: { code: RpcErrorCode.INVALID_REQUEST, message: "Invalid Request" }, id: req.id };
    if (req.id === undefined) { const h = this.handlers.get(req.method); if (h) h(req.params).catch(() => {}); return null; }
    const h = this.handlers.get(req.method);
    if (!h) return { jsonrpc: "2.0", error: { code: RpcErrorCode.METHOD_NOT_FOUND, message: "Method not found" }, id: req.id };
    try { return { jsonrpc: "2.0", result: await h(req.params), id: req.id }; } catch (e) { return { jsonrpc: "2.0", error: { code: RpcErrorCode.INTERNAL_ERROR, message: (e as Error).message }, id: req.id }; }
  }
}

/** Custom error for JSON-RPC errors. */
export class RpcError extends Error { code: number; data?: unknown; constructor(code: number, message: string, data?: unknown) { super(message); this.name = "RpcError"; this.code = code; this.data = data; } }

/** Create streaming RPC from SSE-style async iterable transport. */
export function createStreamingRpc(transport: () => AsyncIterable<string>, onMessage: (line: string) => unknown): AsyncGenerator<unknown> {
  return (async function* () { for await (const line of transport()) yield onMessage(line); })();
}

// ══════════════════════════════════════════════════════════════
// 6. EventSource / SSE Utilities
// ══════════════════════════════════════════════════════════════

/** Configuration for SSE manager. */
export interface SseConfig { url: string; withCredentials?: boolean; eventTypes?: string[]; reconnect?: boolean; maxReconnectDelay?: number; lastEventId?: string; headers?: Record<string, string>; }

type SseDataFn = (data: unknown, eventType: string, lastEventId: string) => void;
type SseErrFn = (ev: Event) => void;
type SseOpenFn = () => void;

/**
 * Enhanced EventSource wrapper with auto-reconnection (exponential backoff),
 * Last-Event-ID tracking, custom event types, and health monitoring.
 */
export class SseManager {
  private es: EventSource | null = null;
  private cfg: Required<SseConfig>;
  private dataHandlers: SseDataFn[] = []; private errHandlers: SseErrFn[] = []; private openHandlers: SseOpenFn[] = [];
  private lastId = ""; private reconnAttempts = 0; private rtimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false; private healthTimer: ReturnType<typeof setInterval> | null = null;
  private lastMsgTime = 0; private _connected = false;

  constructor(config: SseConfig) {
    this.cfg = { url: config.url, withCredentials: config.withCredentials ?? false, eventTypes: config.eventTypes ?? [], reconnect: config.reconnect ?? true, maxReconnectDelay: config.maxReconnectDelay ?? 30000, lastEventId: config.lastEventId ?? "", headers: config.headers ?? {} };
    this.lastId = this.cfg.lastEventId;
  }
  get connected(): boolean { return this._connected; }
  getLastEventId(): string { return this.lastId; }

  connect(): void { this.intentionalClose = false; this.ensureEs(); }
  disconnect(): void {
    this.intentionalClose = true;
    if (this.rtimer) { clearTimeout(this.rtimer); this.rtimer = null; }
    this.stopHealth();
    if (this.es) { this.es.close(); this.es = null; }
    this._connected = false;
  }

  onData(h: SseDataFn): () => void { this.dataHandlers.push(h); return () => { const i = this.dataHandlers.indexOf(h); if (i >= 0) this.dataHandlers.splice(i, 1); }; }
  onError(h: SseErrFn): () => void { this.errHandlers.push(h); return () => { const i = this.errHandlers.indexOf(h); if (i >= 0) this.errHandlers.splice(i, 1); }; }
  onOpen(h: SseOpenFn): () => void { this.openHandlers.push(h); return () => { const i = this.openHandlers.indexOf(h); if (i >= 0) this.openHandlers.splice(i, 1); }; }

  private ensureEs(): void {
    if (this.es) return;
    let url = this.cfg.url;
    if (this.lastId) url += (url.includes("?") ? "&" : "?") + `lastEventId=${encodeURIComponent(this.lastId)}`;
    this.es = new EventSource(url, { withCredentials: this.cfg.withCredentials });
    this.es.onopen = () => { this._connected = true; this.reconnAttempts = 0; this.lastMsgTime = Date.now(); this.startHealth(); for (const h of this.openHandlers) h(); };
    this.es.onmessage = (evt) => { this.lastMsgTime = Date.now(); if (evt.lastEventId) this.lastId = evt.lastEventId; const d = this.parseSse(evt.data); for (const h of this.dataHandlers) h(d, "message", this.lastId); };
    for (const et of this.cfg.eventTypes) {
      this.es!.addEventListener(et, (evt: Event) => {
        this.lastMsgTime = Date.now(); const me = evt as MessageEvent; if (me.lastEventId) this.lastId = me.lastEventId;
        for (const h of this.dataHandlers) h(this.parseSse(me.data), et, this.lastId);
      });
    }
    this.es.onerror = () => {
      this._connected = false; this.stopHealth();
      if (this.es) { this.es.close(); this.es = null; }
      for (const h of this.errHandlers) h(new Event("sse-error"));
      if (!this.intentionalClose && this.cfg.reconnect) this.scheduleReconn();
    };
  }
  private scheduleReconn(): void { this.reconnAttempts++; this.rtimer = setTimeout(() => this.ensureEs(), Math.min(1000 * 2 ** this.reconnAttempts, this.cfg.maxReconnectDelay)); }
  private startHealth(): void { this.stopHealth(); this.healthTimer = setInterval(() => { if (Date.now() - this.lastMsgTime > 60000) for (const h of this.errHandlers) h(new Event("sse-health-timeout")); }, 15000); }
  private stopHealth(): void { if (this.healthTimer) { clearInterval(this.healthTimer); this.healthTimer = null; } }
  private parseSse(raw: string): unknown { try { return JSON.parse(raw); } catch { return raw; } }
}

// ══════════════════════════════════════════════════════════════
// 7. Network Quality Detection
// ══════════════════════════════════════════════════════════════

interface ConnInfo { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean; type?: string; }
declare global { interface Navigator { connection?: ConnInfo; mozConnection?: ConnInfo; webkitConnection?: ConnInfo; } }

/** Estimate download bandwidth (Mbps) by fetching a resource with timing. Returns null on failure. */
export async function estimateBandwidth(testUrl = "https://www.google.com/generate_204", _expectedBytes = 512, timeoutMs = 10000): Promise<number | null> {
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), timeoutMs), start = performance.now();
  try {
    const body = await (await fetch(testUrl, { method: "GET", cache: "no-store", signal: ctrl.signal })).arrayBuffer();
    return Math.round(((body.byteLength * 8) / ((performance.now() - start) / 1000)) / 1_000_000 * 100) / 100;
  } catch { return null; } finally { clearTimeout(timer); }
}

/** Measure round-trip latency (median RTT in ms) via HEAD requests. Returns null if all fail. */
export async function measureLatency(pingUrl: string, samples = 5, timeoutMs = 5000): Promise<number | null> {
  const lats: number[] = [];
  for (let i = 0; i < samples; i++) {
    const s = performance.now(), ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), timeoutMs);
    try { await fetch(pingUrl, { method: "HEAD", cache: "no-store", signal: ctrl.signal }); lats.push(performance.now() - s); } catch { /* skip */ } finally { clearTimeout(t); }
    if (i < samples - 1) await new Promise((r) => setTimeout(r, 100));
  }
  if (!lats.length) return null;
  const sorted = [...lats].sort((a, b) => a - b), mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : Math.round(sorted[mid]);
}

/** Detect connection info via Network Information API. */
export function detectConnectionType(): ConnInfo {
  const conn = navigator.connection ?? navigator.mozConnection ?? navigator.webkitConnection;
  if (!conn) return {};
  return { effectiveType: conn.effectiveType, downlink: conn.downlink, rtt: conn.rtt, saveData: conn.saveData, type: (conn as unknown as { type: string }).type };
}

/** Watch online/offline events. Returns unsubscribe function. Emits initial state immediately. */
export function watchOnlineStatus(onChange: (online: boolean) => void): () => void {
  const h = () => onChange(navigator.onLine);
  window.addEventListener("online", h); window.addEventListener("offline", h); onChange(navigator.onLine);
  return () => { window.removeEventListener("online", h); window.removeEventListener("offline", h); };
}

/** Compute composite network quality score (0–100) factoring bandwidth, latency, connection type, and online status. */
export async function computeNetworkQualityScore(opts?: { bandwidthTestUrl?: string; pingUrl?: string }): Promise<NetworkQualityReport> {
  const ci = detectConnectionType(), isOnline = navigator.onLine;
  const [bw, lat] = await Promise.all([estimateBandwidth(opts?.bandwidthTestUrl), opts?.pingUrl ? measureLatency(opts.pingUrl) : Promise.resolve(ci.rtt ?? null)]);
  let score = 0;
  if (isOnline) score += 20;
  const etScores: Record<string, number> = { "4g": 30, "3g": 18, "2g": 8, "slow-2g": 2 };
  score += (ci.effectiveType != null && ci.effectiveType in etScores) ? etScores[ci.effectiveType!] : 15;
  if (bw !== null) score += bw >= 50 ? 25 : bw >= 20 ? 20 : bw >= 10 ? 15 : bw >= 5 ? 10 : bw >= 1 ? 5 : 1;
  if (lat !== null) score += lat <= 50 ? 25 : lat <= 100 ? 20 : lat <= 200 ? 15 : lat <= 500 ? 8 : 2;
  score = Math.max(0, Math.min(100, score));
  return { score, bandwidthEstimateMbps: bw, latencyMs: lat, connectionType: ci.type ?? ci.effectiveType ?? "unknown", isOnline, effectiveType: ci.effectiveType ?? "unknown", downlink: ci.downlink ?? null, rtt: ci.rtt ?? null };
}
