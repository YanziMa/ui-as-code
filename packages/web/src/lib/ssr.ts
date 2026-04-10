/**
 * Server-Side Rendering Utilities: Streaming HTML, route matching, hydration,
 * component serialization, RSC (React Server Components) helpers, and
 * SSR-safe environment detection.
 */

// --- Types ---

export interface Route {
  path: string;
  pattern: RegExp;
  params?: Record<string, string>;
  handler: () => Promise<string> | string;
}

export interface SSRContext {
  /** The URL being rendered */
  url: string;
  /** Pathname (without query string) */
  pathname: string;
  /** Query parameters */
  query: Record<string, string>;
  /** HTTP headers */
  headers: Record<string, string>;
  /** Request method */
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  /** Request body */
  body?: unknown;
  /** Custom data passed through the render pipeline */
  data?: Record<string, unknown>;
  /** Whether this is an SSR request */
  isSSR: boolean;
}

export interface RenderResult {
  html: string;
  status: number;
  headers: Record<string, string>;
  statusCode: number;
}

export interface HydrationData {
  /** Component name */
  name: string;
  /** Props serialized for hydration */
  props: Record<string, unknown>;
  /** Element ID to hydrate into */
  elementId: string;
}

export interface StreamOptions {
  /** Chunk size in bytes (default: 8KB) */
  chunkSize?: number;
  /** Flush interval (ms) — send chunks at least this often */
  flushInterval?: number;
  /** Called before each chunk is sent */
  onChunk?: (chunk: string) => void;
  /** Called when streaming is complete */
  onComplete?: () => void;
}

// --- Environment Detection ---

/** Check if code is running in a server/Node.js environment */
export function isServer(): boolean {
  return typeof window === "undefined";
}

/** Check if code is running in a browser environment */
export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Check if running in Node.js specifically */
export function isNode(): boolean {
  return typeof process !== "undefined" && process.versions != null;
}

/** Check if running in a Web Worker */
export function isWorker(): boolean {
  return typeof self !== "undefined" && typeof Window === "undefined" && self instanceof WorkerGlobalScope;
}

/** Get the current runtime environment name */
export function getEnvironment(): "node" | "deno" | "browser" | "worker" | "unknown" {
  if (isNode()) return "node";
  if (typeof Deno !== "undefined") return "deno";
  if (isWorker()) return "worker";
  if (isBrowser()) return "browser";
  return "unknown";
}

// --- URL Parsing ---

/**
 * Parse a URL into components (pathname, query, hash).
 * Works in both browser and Node.js.
 */
export function parseURL(url: string): { pathname: string; query: Record<string, string>; hash: string } {
  let pathname = "";
  const query: Record<string, string> = {};
  let hash = "";

  // Separate hash
  const hashIdx = url.indexOf("#");
  if (hashIdx >= 0) {
    hash = url.slice(hashIdx);
    url = url.slice(0, hashIdx);
  }

  // Separate query
  const queryIdx = url.indexOf("?");
  if (queryIdx >= 0) {
    const queryString = url.slice(queryIdx + 1);
    url = url.slice(0, queryIdx);

    if (queryString) {
      for (const pair of queryString.split("&")) {
        const [key, ...rest] = pair.split("=");
        query[decodeURIComponent(key)] = decodeURIComponent(rest.join("="));
      }
    }
  }

  pathname = decodeURIComponent(url);

  return { pathname, query, hash };
}

/**
 * Build a URL from components.
 */
export function buildURL(base: string, params?: Record<string, string>, hash?: string): string {
  let url = base;

  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      searchParams.set(key, value);
    }
    url += `?${searchParams.toString()}`;
  }

  if (hash) url += `#${hash}`;

  return url;
}

// --- Router ---

/**
 * Simple client-side router with route matching and parameter extraction.
 */
export class Router {
  private routes: Route[] = [];
  private middleware: Array<(ctx: SSRContext) => Promise<SSRContext | null>> = [];

  /** Register a route */
  add(path: string, handler: Route["handler"]): void {
    const paramNames: string[] = [];
    const patternStr = path
      .replace(/\*/g, "(.*)")
      .replace(/:(\w+)/g, (_, name) => { paramNames.push(name); return "([^/]+)" });

    this.routes.push({
      path,
      pattern: new RegExp(`^${patternStr}$`),
      params: {},
      handler,
    });
  }

  /** Add middleware (runs before route handler) */
  use(middleware: (ctx: SSRContext) => Promise<SSRContext | null>): void {
    this.middleware.push(middleware);
  }

  /**
   * Match a URL against registered routes.
   * Returns the matched route or null.
   */
  match(url: string): { route: Route; params: Record<string, string> } | null {
    const { pathname } = parseURL(url);

    for (const route of this.routes) {
      const match = pathname.match(route.pattern);
      if (match) {
        const params: Record<string, string> = {};
        const paramNames = this.getParamNames(route.path);
        for (let i = 1; i < match.length; i++) {
          if (paramNames[i - 1]) {
            params[paramNames[i - 1]!] = decodeURIComponent(match[i]!);
          }
        }
        return { route, params };
      }
    }

    return null;
  }

  /**
   * Resolve a URL to HTML using matching route handler.
   */
  async resolve(url: string, ctx?: Partial<SSRContext>): Promise<RenderResult> {
    const fullCtx: SSRContext = {
      url,
      pathname: parseURL(url).pathname,
      query: parseURL(url).query,
      headers: {},
      method: "GET",
      isSSR: true,
      ...ctx,
    };

    // Run middleware chain
    for (const mw of this.middleware) {
      const result = await mw(fullCtx);
      if (result === null) {
        return { html: "", status: 403, headers: {}, statusCode: 403 };
      }
      Object.assign(fullCtx, result);
    }

    const matchResult = this.match(url);
    if (!matchResult) {
      return { html: "<h1>404 Not Found</h1>", status: 404, headers: {}, statusCode: 404 };
    }

    try {
      const html = await matchResult.route.handler();
      return { html, status: 200, headers: {}, statusCode: 200 };
    } catch (err) {
      console.error("[Router] Handler error:", err);
      return { html: "<h1>500 Internal Server Error</h1>", status: 500, headers: {}, statusCode: 500 };
    }
  }

  /** List all registered routes */
  getRoutes(): Route[] {
    return [...this.routes];
  }

  private getParamNames(path: string): string[] {
    const names: string[] = [];
    for (const segment of path.split("/")) {
      if (segment.startsWith(":")) names.push(segment.slice(1));
    }
    return names;
  }
}

// --- HTML Generation ---

/**
 * Build a complete HTML document from parts.
 */
export function buildHTML(options: {
  title?: string;
  lang?: string;
  charset?: string;
  viewport?: string;
  description?: string;
  head?: string;   /* Extra <head> content */
  styles?: string[]; /* CSS file URLs */
  scripts?: string[]; /* JS file URLs */
  body: string;
  hydrationData?: HydrationData[];
}): string {
  const {
    title = "",
    lang = "en",
    charset = "utf-8",
    viewport = "width=device-width, initial-scale=1",
    description = "",
    head = "",
    styles = [],
    scripts = [],
    body,
    hydrationData = [],
  } = options;

  const styleTags = styles.map((s) => `<link rel="stylesheet" href="${s}">`).join("\n");
  const scriptTags = scripts.map((s) => `<script src="${s}"><\/script>`).join("\n");

  const hydrationScript = hydrationData.length > 0
    ? `<script id="__HYDRATION_DATA__" type="application/json">${JSON.stringify(hydrationData)}<\/script>`
    : "";

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="${charset}">
<meta name="viewport" content="${viewport}">
${description ? `<meta name="description" content="${description}">` : ""}
<title>${title}</title>
${styleTags}
${head}
${hydrationScript}
</head>
<body>
${body}
${scriptTags}
</body>
</html>`;
}

/**
 * Create an HTML response with appropriate SSR headers.
 */
export function createSSRResponse(html: string, options?: {
  status?: number;
  headers?: Record<string, string>;
}): RenderResult {
  return {
    html,
    status: options?.status ?? 200,
    headers: options?.headers ?? {
      "Content-Type": "text/html; charset=utf-8",
      "X-Powered-By": "ui-as-code/ssr",
    },
    statusCode: options?.status ?? 200,
  };
}

// --- Streaming Renderer ---

/**
 * Stream HTML content in chunks. Useful for progressive rendering.
 *
 * @example
 * const stream = createStream({ chunkSize: 1024 });
 * stream.write("<!DOCTYPE html><html>");
 * stream.write("<body>");
 * stream.write(heavyContent); // Sent in chunks
 * stream.write("</body></html>");
 * await stream.end();
 */
export class StreamRenderer {
  private chunks: string[] = [];
  private options: Required<Omit<StreamOptions, "onChunk" | "onComplete">>;

  constructor(options: StreamOptions = {}) {
    this.options = {
      chunkSize: options.chunkSize ?? 8192,
      flushInterval: options.flushInterval ?? 0,
    };
  }

  /** Write content to the stream buffer */
  write(content: string): void {
    this.chunks.push(content);
  }

  /**
   * End streaming and return all content as a single string.
   * In a real implementation, this would flush to a writable stream.
   */
  async end(): Promise<string> {
    const fullHTML = this.chunks.join("");
    this.options.onComplete?.();
    return fullHTML;
  }

  /** Get current buffered content */
  getBufferedContent(): string {
    return this.chunks.join("");
  }

  /** Clear the buffer without ending the stream */
  clear(): void {
    this.chunks = [];
  }

  /** Get total bytes written so far */
  getBytesWritten(): number {
    return this.chunks.join("").length;
  }
}

// --- Hydration Helpers ---

/**
 * Serialize component data for client-side hydration.
 * Creates <script type="application/json"> tags that the client can read.
 */
export function serializeHydrationData(data: HydrationData[]): string {
  return JSON.stringify(data);
}

/**
 * Parse hydration data from a script tag embedded in SSR'd HTML.
 */
export function parseHydrationData(htmlOrString: string | Document): HydrationData[] {
  const doc = typeof htmlOrString === "string"
    ? new DOMParser().parseFromString(htmlOrString, "text/html")
    : htmlOrString;

  const script = doc.getElementById("__HYDRATION_DATA__");
  if (!script?.textContent) return [];

  try {
    return JSON.parse(script.textContent) as HydrationData[];
  } catch {
    return [];
  }
}

/**
 * Generate a unique element ID for hydration targeting.
 */
export function generateHydrationId(componentName: string): string {
  return `__hydrated_${componentName}_${Date.now().toString(36)}__`;
}

// --- DOM Parser Fallback (for non-browser environments) ---

class DOMParser {
  parseFromString(content: string, _type: string): Document {
    // Minimal DOM parser fallback for Node.js environments
    // In production, use a proper library like 'linkedom' or 'jsdom'
    return {
      getElementById(id: string) {
        // Extract JSON from a script tag pattern in raw HTML
        const regex = new RegExp(`<script\\s+id="${id}"[^>]*>([\\s\\S]*?)<\\/script>`, "i");
        const match = content.match(regex);
        return match ? { textContent: match[1] } : null;
      },
    } as unknown as Document;
  }
}

// --- Redirect Helpers ---

/**
 * Create a redirect response (for use in route handlers).
 */
export function redirect(location: string, status = 302): RenderResult {
  const html = `<!DOCTYPE html>
<html><head><meta http-equiv="refresh" content="0;url=${location}"></head>
<body>Redirecting to <a href="${location}">${location}</a></body></html>`;
  return { html, status, headers: { Location: location }, statusCode: status };
}

/**
 * Create a not-found response.
 */
export function notFound(message = "Page Not Found"): RenderResult {
  return createSSRResponse(
    buildHTML({ title: "404", body: `<h1>${message}</h1>` }),
    { status: 404 },
  );
}

/**
 * Create an error response.
 */
export function serverError(message = "Internal Server Error", status = 500): RenderResult {
  return createSSRResponse(
    buildHTML({ title: `${status}`, body: `<h1>${status}: ${message}</h1>` }),
    { status },
  );
}
