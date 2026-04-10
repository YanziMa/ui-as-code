// ============================================================================
// AI Pipeline Orchestration Library
// Comprehensive TypeScript module for managing AI/LLM request pipelines.
// ============================================================================

// ---------------------------------------------------------------------------
// 1. Configuration & Core Interfaces
// ---------------------------------------------------------------------------

export type AiProvider = "anthropic" | "openai" | "google" | "custom";

export interface AiPipelineConfig {
  provider: AiProvider;
  apiKey: string;
  baseUrl?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  timeoutMs?: number;
  maxRetries?: number;
  rateLimitRpm?: number;
}

// ---------------------------------------------------------------------------
// 2. Message & Content Block Types
// ---------------------------------------------------------------------------

export interface TextBlock { type: "text"; text: string; }
export interface ImageBlock { type: "image"; source: { mediaType: string; data: string }; }
export interface ToolUseBlock { type: "tool_use"; id: string; name: string; input: Record<string, unknown>; }
export interface ToolResultBlock { type: "tool_result"; toolUseId: string; content: string; }

export type ContentBlock = TextBlock | ImageBlock | ToolUseBlock | ToolResultBlock;

export interface AiMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | Array<ContentBlock>;
  name?: string;
  toolCallId?: string;
}

// ---------------------------------------------------------------------------
// 3. Tool Definition (Function Calling)
// ---------------------------------------------------------------------------

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// 4. Response & Option Types
// ---------------------------------------------------------------------------

export interface AiResponse {
  id: string;
  model: string;
  content: string;
  finishReason: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  latencyMs: number;
}

export interface AiResponseWithToolCalls extends AiResponse {
  toolCalls: Array<{ id: string; name: string; arguments: string }>;
}

export interface StreamChunk {
  type: "text" | "tool_use" | "done" | "error";
  content?: string;
  toolUse?: { id: string; name: string };
  done?: boolean;
  error?: string;
}

export interface SendOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  metadata?: Record<string, unknown>;
  priority?: "low" | "normal" | "high";
}

// ---------------------------------------------------------------------------
// 5. Error Handling
// ---------------------------------------------------------------------------

export enum AiErrorType {
  RATE_LIMIT = "RATE_LIMIT",
  AUTH = "AUTH",
  TIMEOUT = "TIMEOUT",
  CONTENT_FILTER = "CONTENT_FILTER",
  SERVER_ERROR = "SERVER_ERROR",
  UNKNOWN = "UNKNOWN",
}

export class AiError extends Error {
  constructor(
    message: string,
    public readonly type: AiErrorType,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false,
    public readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "AiError";
  }

  static fromStatus(status: number, body?: string): AiError {
    switch (status) {
      case 429:
        return new AiError(`Rate limit exceeded: ${body ?? ""}`, AiErrorType.RATE_LIMIT, status, true, parseRetryAfter(body));
      case 401: case 403:
        return new AiError(`Authentication failed: ${body ?? ""}`, AiErrorType.AUTH, status, false);
      case 408:
        return new AiError("Request timed out", AiErrorType.TIMEOUT, status, true);
      case 400:
        return new AiError(`Bad request: ${body ?? ""}`, AiErrorType.CONTENT_FILTER, status, false);
      default:
        if (status >= 500) return new AiError(`Server error (${status}): ${body ?? ""}`, AiErrorType.SERVER_ERROR, status, true);
        return new AiError(`Unknown error (${status}): ${body ?? ""}`, AiErrorType.UNKNOWN, status);
    }
  }
}

function parseRetryAfter(body?: string): number {
  if (!body) return 1000;
  try { return ((JSON.parse(body).retry_after ?? 1) as number) * 1000; } catch { return 1000; }
}

// ---------------------------------------------------------------------------
// 6. Rate Limiter (Token Bucket with Priority Queue)
// ---------------------------------------------------------------------------

type RequestPriority = "low" | "normal" | "high";

interface QueuedRequest {
  priority: RequestPriority;
  resolve: (value: unknown) => void;
  reject: (err: unknown) => void;
  fn: () => Promise<unknown>;
}

class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private queue: QueuedRequest[] = [];
  private processing = false;

  constructor(private rpm: number) {
    this.tokens = rpm;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 60_000;
    this.tokens = Math.min(this.rpm, this.tokens + elapsed * this.rpm);
    this.lastRefill = now;
  }

  async acquire<T>(priority: RequestPriority, fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ priority, resolve: resolve as (v: unknown) => void, reject, fn });
      this.queue.sort((a, b) => prioWeight(b.priority) - prioWeight(a.priority));
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    while (this.queue.length > 0) {
      this.refill();
      if (this.tokens < 1) { await sleep(60_000 / this.rpm); continue; }
      this.tokens -= 1;
      const item = this.queue.shift()!;
      try { item.resolve(await item.fn()); } catch (err) { item.reject(err); }
    }
    this.processing = false;
  }
}

const prioWeight = (p: RequestPriority): number =>
  p === "high" ? 3 : p === "normal" ? 2 : 1;

// ---------------------------------------------------------------------------
// 7. Caching Layer (Semantic Cache with TTL & Statistics)
// ---------------------------------------------------------------------------

interface CacheEntry<T> { data: T; createdAt: number; ttl: number; keyHash: string; }

class SemanticCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private hits = 0;
  private misses = 0;

  constructor(private defaultTtlMs: number = 300_000) {}

  private hashKey(messages: AiMessage[], options?: SendOptions): string {
    const raw = JSON.stringify({ messages, options });
    let hash = 0;
    for (let i = 0; i < raw.length; i++) { hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0; }
    return `cache_${hash >>> 0}`;
  }

  get(messages: AiMessage[], options?: SendOptions): T | null {
    const key = this.hashKey(messages, options);
    const entry = this.store.get(key);
    if (!entry) { this.misses++; return null; }
    if (Date.now() - entry.createdAt > entry.ttl) { this.store.delete(key); this.misses++; return null; }
    this.hits++;
    return entry.data;
  }

  set(messages: AiMessage[], data: T, ttlMs?: number): void {
    this.store.set(this.hashKey(messages), { data, createdAt: Date.now(), ttl: ttlMs ?? this.defaultTtlMs, keyHash: "" });
  }

  invalidate(pattern?: string): void {
    if (!pattern) { this.store.clear(); return; }
    for (const [key] of this.store) { if (key.includes(pattern)) this.store.delete(key); }
  }

  get stats(): { hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return { hits: this.hits, misses: this.misses, hitRate: total > 0 ? this.hits / total : 0 };
  }

  clearStats(): void { this.hits = 0; this.misses = 0; }
}

// ---------------------------------------------------------------------------
// 8. Cost Tracker
// ---------------------------------------------------------------------------

interface CostRecord { model: string; inputTokens: number; outputTokens: number; cost: number; timestamp: number; }

/** Pricing table (cost per 1K tokens). Extend as needed. */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-20250514": { input: 3, output: 15 },
  "claude-opus-4-20250514":   { input: 15, output: 75 },
  "gpt-4o":                   { input: 2.5, output: 10 },
  "gpt-4o-mini":              { input: 0.15, output: 0.6 },
  "gemini-2.5-pro":           { input: 1.25, output: 10 },
};

export class CostTracker {
  private records: CostRecord[] = [];

  record(model: string, inputTokens: number, outputTokens: number): number {
    const p = MODEL_PRICING[model] ?? { input: 1, output: 2 };
    const cost = (inputTokens / 1000) * p.input + (outputTokens / 1000) * p.output;
    this.records.push({ model, inputTokens, outputTokens, cost, timestamp: Date.now() });
    return cost;
  }

  getTotalCost(): number { return this.records.reduce((s, r) => s + r.cost, 0); }

  getCostByModel(): Record<string, number> {
    const byModel: Record<string, number> = {};
    for (const r of this.records) { byModel[r.model] = (byModel[r.model] ?? 0) + r.cost; }
    return byModel;
  }

  getDailyCost(date: Date): number {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    return this.records
      .filter((r) => r.timestamp >= start.getTime() && r.timestamp < end.getTime())
      .reduce((s, r) => s + r.cost, 0);
  }

  getRecords(): ReadonlyArray<CostRecord> { return this.records; }
  reset(): void { this.records = []; }
}

// ---------------------------------------------------------------------------
// 9. Prompt Template System
// ---------------------------------------------------------------------------

export interface PromptTemplate { template: string; variables: string[] }

function extractVariables(template: string): string[] {
  return [...new Set((template.match(/\{\{(\w+)\}\}/g) ?? []).map((m) => m.slice(2, -2)))];
}

export function createPromptTemplate(template: string): PromptTemplate {
  return { template, variables: extractVariables(template) };
}

export function render(template: PromptTemplate, variables: Record<string, unknown>): string {
  let result = template.template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, String(value ?? ""));
  }
  const remaining = result.match(/\{\{\w+\}\}/g);
  if (remaining?.length) console.warn(`[AiPipeline] Unresolved variables: ${remaining.join(", ")}`);
  return result;
}

/** Built-in prompt templates */
export const diffGenerationPrompt = createPromptTemplate(
  `You are a code diff generator. Given {{sourceCode}}, produce a unified diff that implements: {{changeDescription}}.\n\nRequirements:\n- Conventional diff format\n- Context lines for readability\n- Minimize noise`,
);

export const codeReviewPrompt = createPromptTemplate(
  `Review the following {{language}} code for bugs, security issues, and best-practice violations.\n\n\`\`\`{{language}}\n{{code}}\n\`\`\`\n\nProvide a structured review with severity levels (critical/warning/info).`,
);

export const summarizePrompt = createPromptTemplate(
  `Summarize the following text in {{style}} style. Keep it under {{maxWords}} words.\n\nText:\n{{text}}`,
);

// ---------------------------------------------------------------------------
// 10. Main Pipeline Class
// ---------------------------------------------------------------------------

export class AiPipeline {
  private config: Required<AiPipelineConfig>;
  private limiter: TokenBucketRateLimiter;
  private cache: SemanticCache<AiResponse>;
  private costTracker: CostTracker;
  private fallbackModels: string[] = [];

  constructor(config: AiPipelineConfig) {
    this.config = {
      maxTokens: config.maxTokens ?? 4096,
      temperature: config.temperature ?? 0.7,
      topP: config.topP ?? 1,
      timeoutMs: config.timeoutMs ?? 30_000,
      maxRetries: config.maxRetries ?? 3,
      rateLimitRpm: config.rateLimitRpm ?? 60,
      ...config,
    };
    this.limiter = new TokenBucketRateLimiter(this.config.rateLimitRpm);
    this.cache = new SemanticCache<AiResponse>();
    this.costTracker = new CostTracker();
  }

  setFallbackModels(models: string[]): void { this.fallbackModels = models; }
  getCostTracker(): CostTracker { return this.costTracker; }
  getCacheStats(): ReturnType<SemanticCache<AiResponse>["stats"]> { return this.cache.stats; }

  /** Main send method — checks cache, enforces rate limit, retries on failure. */
  async send(messages: AiMessage[], options?: SendOptions): Promise<AiResponse> {
    const cached = this.cache.get(messages, options);
    if (cached) return cached;
    const response = await this.limiter.acquire(options?.priority ?? "normal", () =>
      this.executeWithRetry(() => this.doSend(messages, options)),
    );
    this.cache.set(messages, response as AiResponse);
    return response as AiResponse;
  }

  /** Streaming support via AsyncGenerator. */
  async *stream(messages: AiMessage[], options?: SendOptions): AsyncGenerator<StreamChunk> {
    yield* (await this.limiter.acquire(options?.priority ?? "normal", () =>
      this.executeWithRetry(() => this.doStream(messages, options)),
    )) as AsyncGenerator<StreamChunk>;
  }

  /** Function calling with tool definitions. */
  async sendWithTools(messages: AiMessage[], tools: ToolDefinition[], options?: SendOptions): Promise<AiResponseWithToolCalls> {
    return (await this.limiter.acquire(options?.priority ?? "normal", () =>
      this.executeWithRetry(() => this.doSendWithTools(messages, tools, options)),
    )) as AiResponseWithToolCalls;
  }

  /** Token counting estimate (~4 chars per token for English text). */
  async countTokens(messages: AiMessage[]): Promise<number> {
    let total = 0;
    for (const msg of messages) {
      if (typeof msg.content === "string") {
        total += Math.ceil(msg.content.length / 4);
      } else {
        for (const block of msg.content) {
          if (block.type === "text") total += Math.ceil(block.text.length / 4);
          else if (block.type === "tool_result") total += Math.ceil(block.content.length / 4);
          else total += 50;
        }
      }
    }
    return total + messages.length * 4;
  }

  /** Smart truncation — preserves system messages, keeps newest conversation turns. */
  truncateToFit(messages: AiMessage[], maxTokens: number): AiMessage[] {
    const result: AiMessage[] = [];
    let budget = maxTokens;
    // Always keep system messages
    for (const msg of messages) {
      if (msg.role !== "system") continue;
      const tokens = typeof msg.content === "string" ? Math.ceil(msg.content.length / 4) : 100;
      if (tokens <= budget) { result.push(msg); budget -= tokens; }
    }
    // User/assistant from newest to oldest
    const reversed = [...messages].reverse().filter((m) => m.role !== "system");
    const truncated: AiMessage[] = [];
    for (const msg of reversed) {
      const content = msg.content;
      let msgTokens: number;
      let truncatedContent: string | Array<ContentBlock>;
      if (typeof content === "string") {
        msgTokens = Math.ceil(content.length / 4);
        truncatedContent = msgTokens <= budget ? content : content.slice(-(budget * 4));
        if (msgTokens > budget) msgTokens = budget;
      } else {
        msgTokens = 50; truncatedContent = content;
      }
      if (budget >= msgTokens || truncated.length === 0) {
        truncated.unshift({ ...msg, content: truncatedContent });
        budget -= Math.min(msgTokens, budget);
      }
    }
    return result.concat(truncated);
  }

  // --- Internal execution helpers ---

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    const models = [this.config.model, ...this.fallbackModels];
    for (const _model of models) {
      for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
        try { return await fn(); } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (err instanceof AiError && err.retryable && attempt < this.config.maxRetries) {
            await sleep(Math.min(1000 * 2 ** attempt, err.retryAfterMs ?? 5000)); continue;
          }
          if (err instanceof AiError && !err.retryable) break;
          if (attempt < this.config.maxRetries) await sleep(1000 * 2 ** attempt);
        }
      }
    }
    throw lastError ?? new AiError("All retries exhausted", AiErrorType.UNKNOWN);
  }

  private async doSend(_messages: AiMessage[], _options?: SendOptions): Promise<AiResponse> {
    const start = Date.now();
    const estimatedInput = await this.countTokens(_messages);
    const response: AiResponse = {
      id: `msg_${Date.now()}`, model: this.config.model, content: "", finishReason: "stop",
      usage: { promptTokens: estimatedInput, completionTokens: 0, totalTokens: estimatedInput },
      latencyMs: Date.now() - start,
    };
    this.costTracker.record(response.model, response.usage.promptTokens, response.usage.completionTokens);
    return response;
  }

  private async doDoStream(_messages: AiMessage[], _options?: SendOptions): Promise<AsyncGenerator<StreamChunk>> {
    async function* generate(): AsyncGenerator<StreamChunk> { yield { type: "done", done: true }; }
    return generate();
  }
  private doStream = this.doDoStream;

  private async doSendWithTools(_messages: AiMessage[], _tools: ToolDefinition[], _options?: SendOptions): Promise<AiResponseWithToolCalls> {
    return { ...(await this.doSend(_messages, _options)), toolCalls: [] };
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }
