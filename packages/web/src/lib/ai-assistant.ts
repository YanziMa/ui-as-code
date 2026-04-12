/**
 * AI Assistant: Streaming chat completion, prompt engineering helpers,
 * token estimation, conversation management, tool-use protocol,
 * response parsing, retry/backoff, and multi-provider abstraction.
 */

// --- Types ---

export type AIProvider = "anthropic" | "openai" | "google" | "local" | "custom";

export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: MessageRole;
  content: string;
  name?: string;
  toolCallId?: string;
  timestamp?: number;
  tokens?: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  result: string;
  isError?: boolean;
}

export interface CompletionOptions {
  /** Max tokens to generate */
  maxTokens?: number;
  /** Temperature (0-2) */
  temperature?: number;
  /** Top-p sampling */
  topP?: number;
  /** Presence penalty (-2 to 2) */
  presencePenalty?: number;
  /** Frequency penalty (-2 to 2) */
  frequencyPenalty?: number;
  /** Stop sequences */
  stopSequences?: string[];
  /** Seed for reproducibility */
  seed?: number;
  /** Stream responses? */
  stream?: boolean;
  /** Tools available for function calling */
  tools?: ToolDefinition[];
  /** Whether to use tool calling */
  toolChoice?: "auto" | "none" | "required" | { type: "tool"; name: string };
  /** Timeout in ms (default: 30000) */
  timeout?: number;
  /** Number of retries on failure */
  retries?: number;
  /** Custom headers */
  headers?: Record<string, string>;
}

export interface CompletionResponse {
  id: string;
  content: string;
  role: "assistant";
  model: string;
  provider: AIProvider;
  finishReason: "stop" | "length" | "tool_use" | "error";
  usage: TokenUsage;
  toolCalls?: ToolCall[];
  latencyMs: number;
  raw?: unknown;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
}

export interface StreamChunk {
  type: "text" | "tool_call_start" | "tool_call_delta" | "done" | "error";
  content?: string;
  toolCallId?: string;
  toolName?: string;
  toolArgs?: string;
  error?: string;
  done?: boolean;
  response?: CompletionResponse;
}

export interface ConversationOptions {
  /** System prompt */
  systemPrompt?: string;
  /** Max messages to retain (trims oldest) */
  maxMessages?: number;
  /** Auto-summarize when exceeding max messages */
  autoSummarize?: boolean;
  /** Summary instructions */
  summarizeInstructions?: string;
  /** Metadata attached to conversation */
  metadata?: Record<string, unknown>;
}

export interface ConversationState {
  id: string;
  messages: ChatMessage[];
  summary?: string;
  totalTokens: number;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, unknown>;
}

// --- Token Estimation ---

/** Rough token count estimation (approximately 4 chars per token). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Estimate token count for a message array. */
export function estimateMessagesTokens(messages: ChatMessage[]): number {
  let total = 0;
  for (const msg of messages) {
    // Overhead per message (~4 tokens for role + formatting)
    total += 4;
    total += estimateTokens(msg.content);
    if (msg.name) total += estimateTokens(msg.name);
  }
  return total;
}

/** Truncate text to fit within a token budget. */
export function truncateToTokens(text: string, maxTokens: number): string {
  const approxChars = maxTokens * 4;
  if (text.length <= approxChars) return text;
  return text.slice(0, approxChars - 3) + "...";
}

// --- Prompt Engineering ---

/** Build a structured system prompt from sections. */
export function buildSystemPrompt(sections: { heading?: string; body: string }[]): string {
  return sections.map((s) => {
    if (s.heading) return `## ${s.heading}\n\n${s.body}`;
    return s.body;
  }).join("\n\n");
}

/** Few-shot example template. */
export interface FewShotExample {
  input: string;
  output: string;
}

/** Build a few-shot prompt. */
export function buildFewShotPrompt(
  instruction: string,
  examples: FewShotExample[],
  query: string,
): ChatMessage[] {
  const messages: ChatMessage[] = [
    { role: "system", content: instruction },
  ];

  for (const ex of examples) {
    messages.push({ role: "user", content: ex.input });
    messages.push({ role: "assistant", content: ex.output });
  }

  messages.push({ role: "user", content: query });
  return messages;
}

/** Chain-of-thought prompting wrapper. */
export function chainOfThoughtPrompt(task: string): string {
  return `${task}\n\nLet's think step by step.`;
}

/** Extract thinking/reasoning from a response (supports <thinking> tags). */
export function extractThinking(response: string): { thinking: string; answer: string } {
  const thinkMatch = response.match(/<thinking>([\s\S]*?)<\/thinking>/);
  if (thinkMatch) {
    return {
      thinking: thinkMatch[1]!.trim(),
      answer: response.replace(/<thinking>[\s\S]*?<\/thinking>/, "").trim(),
    };
  }
  return { thinking: "", answer: response };
}

// --- Conversation Manager ---

let conversationCounter = 0;

export class ConversationManager {
  private conversations: Map<string, ConversationState> = new Map();
  private options: ConversationOptions;

  constructor(options: ConversationOptions = {}) {
    this.options = {
      maxMessages: 50,
      autoSummarize: true,
      summarizeInstructions: "Summarize the conversation so far, preserving key decisions and context.",
      ...options,
    };
  }

  /** Create a new conversation. */
  create(initialMessages?: ChatMessage[]): ConversationState {
    const id = `conv-${Date.now()}-${++conversationCounter}`;
    const state: ConversationState = {
      id,
      messages: initialMessages ?? [],
      totalTokens: estimateMessagesTokens(initialMessages ?? []),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: { ...this.options.metadata },
    };

    if (this.options.systemPrompt) {
      state.messages.unshift({
        role: "system",
        content: this.options.systemPrompt,
        timestamp: Date.now(),
      });
      state.totalTokens = estimateMessagesTokens(state.messages);
    }

    this.conversations.set(id, state);
    return state;
  }

  /** Get a conversation by ID. */
  get(id: string): ConversationState | undefined {
    return this.conversations.get(id);
  }

  /** Add a message to a conversation. */
  addMessage(id: string, message: ChatMessage): ConversationState | null {
    const conv = this.conversations.get(id);
    if (!conv) return null;

    const msg = { ...message, timestamp: Date.now() };
    conv.messages.push(msg);
    conv.totalTokens = estimateMessagesTokens(conv.messages);
    conv.updatedAt = Date.now();

    // Trim if needed
    if (conv.messages.length > (this.options.maxMessages ?? 50)) {
      if (this.options.autoSummarize) {
        this.summarize(id);
      } else {
        // Remove oldest non-system messages
        conv.messages = conv.messages.filter(
          (m) => m.role === "system" || conv.messages.indexOf(m) >= conv.messages.length - (this.options.maxMessages ?? 50),
        );
        conv.totalTokens = estimateMessagesTokens(conv.messages);
      }
    }

    return conv;
  }

  /** Get all conversations. */
  getAll(): ConversationState[] {
    return Array.from(this.conversations.values());
  }

  /** Delete a conversation. */
  delete(id: string): boolean {
    return this.conversations.delete(id);
  }

  /** Summarize an old conversation to save tokens. */
  summarize(id: string): void {
    const conv = this.conversations.get(id);
    if (!conv || conv.messages.length < 4) return;

    // Keep system message, summarize rest
    const systemMsg = conv.messages.find((m) => m.role === "system");
    const userMsgs = conv.messages.filter((m) => m.role !== "system");

    const textToSummarize = userMsgs
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    // Simple extractive summary (in production, would call LLM)
    const summary = `[Summarized ${userMsgs.length} messages]\n${textToSummarize.slice(0, 500)}...`;

    conv.messages = [
      ...(systemMsg ? [systemMsg] : []),
      {
        role: "user",
        content: "[Previous conversation summarized]",
        timestamp: conv.createdAt,
      },
      {
        role: "assistant",
        content: summary,
        timestamp: Date.now(),
      },
    ];
    conv.summary = summary;
    conv.totalTokens = estimateMessagesTokens(conv.messages);
    conv.updatedAt = Date.now();
  }

  /** Export conversation state for persistence. */
  exportState(): ConversationState[] {
    return this.getAll();
  }

  /** Import previously exported conversations. */
  importState(states: ConversationState[]): void {
    for (const state of states) {
      this.conversations.set(state.id, state);
    }
  }

  /** Clear all conversations. */
  clear(): void {
    this.conversations.clear();
  }
}

// --- Response Parsing ---

/** Parse JSON from an LLM response (handles markdown code blocks, trailing commas). */
export function parseJSONFromResponse<T>(response: string): T | null {
  // Try direct parse first
  try {
    return JSON.parse(response) as T;
  } catch {}

  // Try extracting from markdown code block
  const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]!.trim()) as T;
    } catch {}
  }

  // Try finding JSON object/array
  const jsonMatch = response.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    try {
      // Fix common issues: trailing commas, unquoted keys
      const fixed = jsonMatch[1]!
        .replace(/,\s*([}\]])/g, "$1")
        .replace(/(\w+)\s*:/g, '"$1":');
      return JSON.parse(fixed) as T;
    } catch {}
  }

  return null;
}

/** Extract code blocks from a response. */
export interface CodeBlock {
  language: string;
  code: string;
}

export function extractCodeBlocks(response: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const regex = /```(\w*)\s*\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(response)) !== null) {
    blocks.push({
      language: match[1] ?? "",
      code: match[2]!.trim(),
    });
  }

  return blocks;
}

/** Check if a response indicates a refusal or safety filter trigger. */
export function isRefusal(response: string): boolean {
  const lower = response.toLowerCase();
  const refusalPatterns = [
    "i can't", "i cannot", "i'm not able", "i am not able",
    "i'm unable", "i am unable", "as an ai", "as an language model",
    "that's not something", "not appropriate", "against my policy",
    "i'm not going to", "i will not",
  ];
  return refusalPatterns.some((p) => lower.includes(p));
}

// --- Retry / Backoff ---

/** Exponential backoff with jitter. */
export function calculateBackoff(attempt: number, baseMs = 1000, maxMs = 30000): number {
  const exponential = baseMs * Math.pow(2, attempt);
  const jitter = exponential * (0.5 + Math.random() * 0.5);
  return Math.min(jitter, maxMs);
}

/** Execute a function with retry and exponential backoff. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; baseMs?: number; maxMs?: number; shouldRetry?: (error: Error) => boolean } = {},
): Promise<T> {
  const { retries = 3, baseMs = 1000, maxMs = 30000, shouldRetry } = options;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (attempt < retries && (shouldRetry?.(lastError) ?? true)) {
        const delay = calculateBackoff(attempt, baseMs, maxMs);
        await sleep(delay);
      }
    }
  }

  throw lastError!;
}

// --- Rate Limiting ---

/** Token bucket rate limiter for API calls. */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per ms

  constructor(tokensPerSecond: number, burstSize = tokensPerSecond) {
    this.maxTokens = burstSize;
    this.tokens = burstSize;
    this.refillRate = tokensPerSecond / 1000;
    this.lastRefill = Date.now();
  }

  async acquire(tokens = 1): Promise<void> {
    this.refill();

    while (this.tokens < tokens) {
      const waitMs = ((tokens - this.tokens) / this.refillRate);
      await sleep(waitMs);
      this.refill();
    }

    this.tokens -= tokens;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  get availableTokens(): number {
    this.refill();
    return this.tokens;
  }
}

// --- Content Moderation ---

export interface ModerationResult {
  flagged: boolean;
  categories: ModerationCategory[];
  score: number;
}

export interface ModerationCategory {
  category: string;
  flagged: boolean;
  score: number;
}

/** Simple client-side content moderation (keyword-based, not a replacement for server-side). */
export function moderateContent(text: string): ModerationResult {
  const categories: ModerationCategory[] = [];

  // Basic keyword detection (extend as needed)
  const checks: { category: string; patterns: RegExp[] }[] = [
    { category: "profanity", patterns: [/\bfuck\b/, /\bshit\b/, /\bdamn\b/] },
    { category: "pii", patterns: [/\b\d{3}-\d{2}-\d{4}\b/, /\b\d{16}\b/] }, // SSN, credit card
    { category: "hate_speech", patterns: [] }, // Would need ML in production
  ];

  let maxScore = 0;
  let anyFlagged = false;

  for (const check of checks) {
    let score = 0;
    for (const pattern of check.patterns) {
      if (pattern.test(text)) score++;
    }
    const flagged = score > 0;
    if (flagged) anyFlagged = true;
    maxScore = Math.max(maxScore, score);
    categories.push({ category: check.category, flagged, score: Math.min(score / 5, 1) });
  }

  return {
    flagged: anyFlagged,
    categories,
    score: Math.min(maxScore / 5, 1),
  };
}

// --- Helpers ---

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Generate a unique ID for completions. */
export function generateCompletionId(): string {
  return `cmpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
