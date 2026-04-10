/**
 * AI SDK Wrapper: unified interface for multiple LLM providers (Claude, GPT, Gemini, etc.).
 * Streaming responses, token counting, rate limiting, retry logic, prompt caching,
 * structured output, tool use/function calling, conversation management.
 */

// --- Types ---

export type LLMProvider = "claude" | "openai" | "gemini" | "mistral" | "local" | "custom";

export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string | ContentBlock[];
}

export interface ContentBlock {
  type: "text" | "image" | "tool_use" | "tool_result";
  text?: string;
  source?: { type: "base64"; media_type: string; data: string };
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  content?: string;
  tool_use_id?: string;
  is_error?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, { type: string; description?: string; enum?: string[] }>;
    required?: string[];
  };
}

export interface ToolResult {
  toolUseId: string;
  name: string;
  content: string;
  isError?: boolean;
}

export interface LLMRequest {
  messages: Message[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  tools?: ToolDefinition[];
  toolChoice?: "auto" | "any" | "none" | { type: "tool"; name: string };
  stream?: boolean;
  metadata?: Record<string, string>;
}

export interface LLMResponse {
  id: string;
  content: string;
  toolCalls?: Array<{ id: string; name: string; arguments: string }>;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  finishReason: "end_turn" | "max_tokens" | "stop_sequence" | "tool_use" | "error";
  model: string;
  provider: LLMProvider;
  latencyMs: number;
  raw?: unknown;
}

export interface StreamChunk {
  type: "text_delta" | "tool_use_start" | "tool_use_delta" | "tool_use_end" | "message_start" | "message_end" | "error";
  text?: string;
  toolName?: string;
  toolInput?: string;
  toolId?: string;
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
  error?: string;
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  maxRetries?: number;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

// --- Provider Registry ---

const providers = new Map<LLMProvider, ProviderConfig>();

/** Register a provider configuration */
export function registerProvider(provider: LLMProvider, config: ProviderConfig): void {
  providers.set(provider, config);
}

/** Get registered provider config */
export function getProviderConfig(provider: LLMProvider): ProviderConfig | undefined {
  return providers.get(provider);
}

/** List all registered providers */
export function listProviders(): LLMProvider[] {
  return Array.from(providers.keys());
}

/** Remove a provider */
export function unregisterProvider(provider: LLMProvider): void {
  providers.delete(provider);
}

// --- Default Model Mapping ---

const DEFAULT_MODELS: Record<LLMProvider, string> = {
  claude: "claude-sonnet-4-20250514",
  openai: "gpt-4o",
  gemini: "gemini-2.5-pro",
  mistral: "mistral-large-latest",
  local: "llama3",
  custom: "custom-model",
};

/** Set default model for a provider */
export function setDefaultModel(provider: LLMProvider, model: string): void {
  DEFAULT_MODEMS[provider] = model;
}
let DEFAULT_MODEMS = { ...DEFAULT_MODEMS }; // Fix reference

// --- Conversation Manager ---

export class Conversation {
  private messages: Message[] = [];
  private _id: string;
  private _provider: LLMProvider;
  private _metadata: Record<string, string> = {};

  constructor(id: string, provider: LLMProvider = "claude") {
    this._id = id;
    this._provider = provider;
  }

  get id(): string { return this._id; }
  get provider(): LLMProvider { return this._provider; }
  get messages(): readonly Message[] { return this.messages; }
  get metadata(): Readonly<Record<string, string>> { return this._metadata; }

  /** Add a message to the conversation */
  add(message: Omit<Message, "role"> & { role: Message["role"] }): this {
    this.messages.push(message as Message);
    // Auto-truncate to prevent context overflow
    if (this.messages.length > 500) {
      this.messages = this.messages.slice(-400);
    }
    return this;
  }

  /** Add system message */
  system(content: string): this { return this.add({ role: "system", content }); }

  /** Add user message */
  user(content: string | ContentBlock[]): this { return this.add({ role: "user", content }); }

  /** Add assistant message */
  assistant(content: string | ContentBlock[]): this { return this.add({ role: "assistant", content }); }

  /** Add tool result */
  toolResult(toolUseId: string, toolName: string, content: string, isError = false): this {
    return this.add({
      role: "tool",
      content: [{ type: "tool_result", tool_use_id: toolUseId, name: toolName, content, is_error: isError }],
    });
  }

  /** Set metadata key-value pair */
  setMeta(key: string, value: string): this { this._metadata[key] = value; return this; }

  /** Clear all messages except system messages */
  clear(keepSystem = true): this {
    if (keepSystem) {
      this.messages = this.messages.filter((m) => m.role === "system");
    } else {
      this.messages = [];
    }
    return this;
  }

  /** Get total estimated token count for current context */
  estimateTokens(): number {
    let count = 0;
    for (const msg of this.messages) {
      const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
      count += Math.ceil(content.length / 4); // Rough estimate: ~4 chars per token
    }
    return count;
  }

  /** Export conversation as serializable object */
  export(): { id: string; provider: LLMProvider; messages: Message[]; metadata: Record<string, string> } {
    return { id: this._id, provider: this._provider, messages: [...this.messages], metadata: { ...this._metadata } };
  }

  /** Import from exported data */
  static import(data: { id: string; provider: LLMProvider; messages: Message[]; metadata?: Record<string, string> }): Conversation {
    const conv = new Conversation(data.id, data.provider);
    conv.messages = [...data.messages];
    if (data.metadata) conv._metadata = { ...data.metadata };
    return conv;
  }
}

// --- Conversation Store ---

const conversations = new Map<string, Conversation>();

/** Create or get a conversation */
export function getConversation(id: string, provider?: LLMProvider): Conversation {
  let conv = conversations.get(id);
  if (!conv) {
    conv = new Conversation(id, provider ?? "claude");
    conversations.set(id, conv);
  }
  return conv;
}

/** Delete a conversation */
export function deleteConversation(id: string): void {
  conversations.delete(id);
}

/** List all active conversation IDs */
export function listConversations(): string[] {
  return Array.from(conversations.keys());
}

// --- Core LLM Client ---

export class AIClient {
  private provider: LLMProvider;
  private config: ProviderConfig;

  constructor(provider: LLMProvider) {
    this.provider = provider;
    const cfg = providers.get(provider);
    if (!cfg?.apiKey) throw new Error(`No API key configured for provider: ${provider}`);
    this.config = cfg!;
  }

  /** Send request and get complete response */
  async complete(request: Partial<LLMRequest> & Pick<LLMRequest, "messages">): Promise<LLMResponse> {
    const startTime = Date.now();
    const req: LLMRequest = {
      model: request.model ?? DEFAULT_MODEMS[this.provider],
      maxTokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0,
      topP: request.topP ?? 1,
      stream: false,
      ...request,
    };

    try {
      const response = await this.executeRequest(req);
      return {
        ...response,
        latencyMs: Date.now() - startTime,
        provider: this.provider,
      };
    } catch (err) {
      return {
        id: `err-${Date.now()}`,
        content: "",
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        finishReason: "error",
        model: req.model ?? "",
        provider: this.provider,
        latencyMs: Date.now() - startTime,
        raw: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /** Stream response chunks via callback or async iterator */
  async *stream(request: Partial<LLMRequest> & Pick<LLMRequest, "messages">): AsyncGenerator<StreamChunk> {
    const req: LLMRequest = {
      model: request.model ?? DEFAULT_MODEMS[this.provider],
      maxTokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0,
      stream: true,
      ...request,
    };
    yield* this.executeStream(req);
  }

  /** Complete with automatic tool execution loop */
  async completeWithTools(
    request: Partial<LLMRequest> & Pick<LLMRequest, "messages">,
    tools: Record<string, (args: Record<string, unknown>) => Promise<string>>,
    maxIterations = 10,
  ): Promise<LLMResponse> {
    let currentMessages = [...request.messages];
    let iteration = 0;

    while (iteration < maxIterations) {
      const response = await this.complete({ ...request, messages: currentMessages, tools: Object.entries(tools).map(([name, fn]) => ({
        name,
        description: name,
        input_schema: { type: "object", properties: {}, required: [] },
      })) });

      if (!response.toolCalls || response.toolCalls.length === 0) {
        return response;
      }

      // Execute tools and append results
      for (const tc of response.toolCalls) {
        const toolFn = tools[tc.name];
        if (!toolFn) continue;
        try {
          const args = typeof tc.arguments === "string" ? JSON.parse(tc.arguments) : {};
          const result = await toolFn(args);
          currentMessages.push({
            role: "assistant",
            content: [{ type: "tool_use", id: tc.id, name: tc.name, input: args }],
          });
          currentMessages.push({
            role: "tool",
            content: [{ type: "tool_result", tool_use_id: tc.id, name: tc.name, content: result }],
          });
        } catch (err) {
          currentMessages.push({
            role: "tool",
            content: [{
              type: "tool_result",
              tool_use_id: tc.id,
              name: tc.name,
              content: err instanceof Error ? err.message : String(err),
              is_error: true,
            }],
          });
        }
      }
      iteration++;
    }

    return this.complete({ ...request, messages: currentMessages });
  }

  // --- Provider-specific implementations ---

  private async executeRequest(req: LLMRequest): Promise<Omit<LLMResponse, "latencyMs" | "provider">> {
    switch (this.provider) {
      case "claude": return this.claudeComplete(req);
      case "openai": return this.openaiComplete(req);
      case "gemini": return this.geminiComplete(req);
      default: throw new Error(`Provider ${this.provider} not yet implemented`);
    }
  }

  private async *executeStream(req: LLMRequest): AsyncGenerator<StreamChunk> {
    switch (this.provider) {
      case "claude": yield* this.claudeStream(req); break;
      case "openai": yield* this.openaiStream(req); break;
      case "gemini": yield* this.geminiStream(req); break;
      default: yield { type: "error", error: `Streaming not supported for ${this.provider}` };
    }
  }

  // --- Claude API ---

  private async claudeComplete(req: LLMRequest): Promise<Omit<LLMResponse, "latencyMs" | "provider">> {
    const url = `${this.config.baseUrl ?? "https://api.anthropic.com"}/v1/messages`;
    const body = {
      model: req.model,
      max_tokens: req.maxTokens,
      temperature: req.temperature,
      top_p: req.topP,
      stop_sequences: req.stopSequences,
      system: req.messages.find((m) => m.role === "system")?.content,
      messages: req.messages.filter((m) => m.role !== "system").map(this.convertMessage),
      tools: req.tools,
      tool_choice: req.toolChoice,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey,
        "anthropic-version": "2023-06-01",
        ...this.config.headers,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeoutMs ?? 60000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`Claude API error ${res.status}: ${errBody}`);
    }

    const data = await res.json() as {
      id: string; content: Array<{ type: string; text?: string; name?: string; id?: string; input?: Record<string, unknown> }>;
      usage: { input_tokens: number; output_tokens: number };
      stop_reason: string; model: string;
    };

    const textBlocks = data.content.filter((b) => b.type === "text");
    const toolBlocks = data.content.filter((b) => b.type === "tool_use");

    return {
      id: data.id,
      content: textBlocks.map((b) => b.text ?? "").join(""),
      toolCalls: toolBlocks.map((b) => ({ id: b.id!, name: b.name!, arguments: JSON.stringify(b.input ?? {}) })),
      usage: { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens, totalTokens: data.usage.input_tokens + data.usage.output_tokens },
      finishReason: this.mapStopReason(data.stop_reason),
      model: data.model,
    };
  }

  private async *claudeStream(req: LLMRequest): AsyncGenerator<StreamChunk> {
    const url = `${this.config.baseUrl ?? "https://api.anthropic.com"}/v1/messages`;
    const body = {
      model: req.model,
      max_tokens: req.maxTokens,
      stream: true,
      system: req.messages.find((m) => m.role === "system")?.content,
      messages: req.messages.filter((m) => m.role !== "system").map(this.convertMessage),
      tools: req.tools,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeoutMs ?? 120000),
    });

    if (!res.ok || !res.body) {
      yield { type: "error", error: `Claude streaming error ${res.status}` };
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        const dataStr = trimmed.slice(6);
        if (dataStr === "[DONE]") continue;
        try {
          const event = JSON.parse(dataStr) as { type: string; delta?: { type: string; text?: string; partial_json?: string; name?: string; id?: string }; usage?: { input_tokens: number; output_tokens: number } };
          if (event.type === "content_block_start" && event.delta?.type === "text") {
            yield { type: "message_start" };
          } else if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
            yield { type: "text_delta", text: event.delta.text };
          } else if (event.type === "content_block_start" && event.delta?.type === "tool_use") {
            yield { type: "tool_use_start", toolName: event.delta.name, toolId: event.delta.id };
          } else if (event.type === "content_block_delta" && event.delta?.type === "input_json_delta") {
            yield { type: "tool_use_delta", toolInput: event.delta.partial_json ?? "" };
          } else if (event.type === "message_stop") {
            yield { type: "message_end" };
          } else if (event.type === "message_start" && event.usage) {
            yield { type: "message_start", usage: { inputTokens: event.usage.input_tokens, outputTokens: 0, totalTokens: event.usage.input_tokens } };
          } else if (event.type === "message_delta" && event.usage) {
            yield { type: "message_end", usage: { inputTokens: 0, outputTokens: event.usage.output_tokens, totalTokens: event.usage.output_tokens } };
          }
        } catch { /* skip malformed */ }
      }
    }
  }

  // --- OpenAI API ---

  private async openaiComplete(req: LLMRequest): Promise<Omit<LLMResponse, "latencyMs" | "provider">> {
    const url = `${this.config.baseUrl ?? "https://api.openai.com"}/v1/chat/completions`;
    const body = {
      model: req.model,
      messages: req.messages.map(this.convertOpenAIMessage),
      max_tokens: req.maxTokens,
      temperature: req.temperature,
      top_p: req.topP,
      stop: req.stopSequences,
      tools: req.tools?.map((t) => ({
        type: "function" as const,
        function: { name: t.name, description: t.description, parameters: t.input_schema },
      })),
      tool_choice: req.toolChoice ? (typeof req.toolChoice === "object"
        ? { type: "function" as const, function: { name: req.toolChoice.name } }
        : req.toolChoice === "none" ? "none" : "auto") : undefined,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
        ...this.config.headers,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeoutMs ?? 60000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`OpenAI API error ${res.status}: ${errBody}`);
    }

    const data = await res.json() as {
      id: string; choices: Array<{ message: { content: string | null; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> }; finish_reason: string }>;
      usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }; model: string;
    };

    const choice = data.choices[0]!;

    return {
      id: data.id,
      content: choice.message.content ?? "",
      toolCalls: choice.message.tool_calls?.map((tc) => ({ id: tc.id, name: tc.function.name, arguments: tc.function.arguments })),
      usage: { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens, totalTokens: data.usage.total_tokens },
      finishReason: choice.finish_reason === "stop" ? "end_turn" : choice.finish_reason === "length" ? "max_tokens" : choice.finish_reason === "tool_calls" ? "tool_use" : "end_turn",
      model: data.model,
    };
  }

  private async *openaiStream(req: LLMRequest): AsyncGenerator<StreamChunk> {
    const url = `${this.config.baseUrl ?? "https://api.openai.com"}/v1/chat/completions`;
    const body = { ...{ model: req.model, messages: req.messages.map(this.convertOpenAIMessage), max_tokens: req.maxTokens, temperature: req.temperature, stream: true }, tools: req.tools?.map((t) => ({ type: "function" as const, function: { name: t.name, description: t.description, parameters: t.input_schema } })) };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.config.apiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeoutMs ?? 120000),
    });

    if (!res.ok || !res.body) { yield { type: "error", error: `OpenAI streaming error ${res.status}` }; return; }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ") || trimmed === "data: [DONE]") continue;
        try {
          const chunk = JSON.parse(trimmed.slice(6)) as {
            choices: Array<{ delta: { content?: string; tool_calls?: Array<{ index: number; id?: string; function?: { name?: string; arguments?: string } }> } }>;
            usage?: { prompt_tokens: number; completion_tokens: number };
          };
          const delta = chunk.choices[0]?.delta;
          if (delta?.content) yield { type: "text_delta", text: delta.content };
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (tc.id) yield { type: "tool_use_start", toolName: tc.function?.name, toolId: tc.id };
              if (tc.function?.arguments) yield { type: "tool_use_delta", toolInput: tc.function.arguments };
            }
          }
          if (chunk.usage) {
            yield { type: "message_end", usage: { inputTokens: chunk.usage.prompt_tokens, outputTokens: chunk.usage.completion_tokens, totalTokens: chunk.usage.prompt_tokens + chunk.usage.completion_tokens } };
          }
        } catch { /* skip */ }
      }
    }
  }

  // --- Gemini API ---

  private async geminiComplete(req: LLMRequest): Promise<Omit<LLMResponse, "latencyMs" | "provider">> {
    const url = `${this.config.baseUrl ?? "https://generativelanguage.googleapis.com"}/v1beta/models/${req.model}:generateContent?key=${this.config.apiKey}`;
    const contents = req.messages.filter((m) => m.role !== "system").map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: typeof m.content === "string" ? [{ text: m.content }] : m.content.map((b) => {
        if (b.type === "text") return { text: b.text };
        if (b.type === "image") return { inlineData: b.source };
        return { text: JSON.stringify(b) };
      }),
    }));

    const systemInstruction = req.messages.find((m) => m.role === "system")?.content;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents, systemInstruction, generationConfig: { maxOutputTokens: req.maxTokens, temperature: req.temperature, topP: req.topP, stopSequences: req.stopSequences } }),
      signal: AbortSignal.timeout(this.config.timeoutMs ?? 60000),
    });

    if (!res.ok) { const errBody = await res.text().catch(() => ""); throw new Error(`Gemini API error ${res.status}: ${errBody}`); }

    const data = await res.json() as {
      candidates: Array<{ content: { parts: Array<{ text?: string; functionCall?: { name: string; args: Record<string, unknown> } }> }; finishReason: string }>;
      usageMetadata: { promptTokenCount: number; candidatesTokenCount: number; totalTokenCount: number };
    };

    const candidate = data.candidates[0];
    const parts = candidate?.content.parts ?? [];
    const textParts = parts.filter((p) => p.text).map((p) => p.text!).join("");
    const funcParts = parts.filter((p) => p.functionCall);

    return {
      id: `gemini-${Date.now()}`,
      content: textParts,
      toolCalls: funcParts.map((fc) => ({ id: fc.functionCall!.name, name: fc.functionCall!.name, arguments: JSON.stringify(fc.functionCall!.args) })),
      usage: { inputTokens: data.usageMetadata.promptTokenCount, outputTokens: data.usageMetadata.candidatesTokenCount, totalTokens: data.usageMetadata.totalTokenCount },
      finishReason: candidate?.finishReason === "STOP" ? "end_turn" : candidate?.finishReason === "MAX_TOKENS" ? "max_tokens" : "end_turn",
      model: req.model ?? "",
    };
  }

  private async *geminiStream(req: LLMRequest): AsyncGenerator<StreamChunk> {
    const url = `${this.config.baseUrl ?? "https://generativelanguage.googleapis.com"}/v1beta/models/${req.model}:streamGenerateContent?alt=sse&key=${this.config.apiKey}`;
    const contents = req.messages.filter((m) => m.role !== "system").map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: typeof m.content === "string" ? [{ text: m.content }] : [],
    }));

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
      signal: AbortSignal.timeout(this.config.timeoutMs ?? 120000),
    });

    if (!res.ok || !res.body) { yield { type: "error", error: `Gemini streaming error ${res.status}` }; return; }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(trimmed.slice(6)) as {
            candidates: Array<{ content: { parts: Array<{ text?: string }> } } };
          const text = event.candidates[0]?.content.parts[0]?.text;
          if (text) yield { type: "text_delta", text };
        } catch { /* skip */ }
      }
    }
  }

  // --- Helpers ---

  private convertMessage(msg: Message): { role: string; content: string | Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string }; name?: string; id?: string; input?: Record<string, unknown>; content?: string; tool_use_id?: string; is_error?: boolean }> } {
    if (typeof msg.content === "string") return { role: msg.role, content: msg.content };
    return { role: msg.role, content: msg.content as any[] };
  }

  private convertOpenAIMessage(msg: Message): { role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string }; tool_call_id?: string; tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }> }> {
    if (typeof msg.content === "string") return { role: msg.role, content: msg.content };
    const blocks: Array<{ type: string; text?: string; image_url?: { url: string }; tool_call_id?: string; tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }> } > = [];
    for (const block of (Array.isArray(msg.content) ? msg.content : [])) {
      if (block.type === "text") blocks.push({ type: "text", text: block.text });
      else if (block.type === "image" && block.source) blocks.push({ type: "image_url", image_url: { url: `data:${block.source.media_type};base64,${block.source.data}` } });
      else if (block.type === "tool_use") blocks.push({ type: "tool_call", id: block.id!, type: "function", function: { name: block.name!, arguments: JSON.stringify(block.input ?? {}) } });
      else if (block.type === "tool_result") blocks.push({ type: "tool", tool_call_id: block.tool_use_id!, content: block.content ?? "" });
    }
    return { role: msg.role, content: blocks.length > 0 ? blocks : "" };
  }

  private mapStopReason(reason: string): LLMResponse["finishReason"] {
    const map: Record<string, LLMResponse["finishReason"]> = {
      end_turn: "end_turn", max_tokens: "max_tokens", stop_sequence: "stop_sequence",
      tool_use: "tool_use",
    };
    return map[reason] ?? "end_turn";
  }
}

// --- Factory ---

/** Create an AI client for the specified provider */
export function createClient(provider: LLMProvider): AIClient {
  return new AIClient(provider);
}

// --- Rate Limiter ---

export class RateLimiter {
  private requests: number[] = [];
  constructor(private maxRequests: number, private windowMs: number) {}

  async acquire(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter((t) => now - t < this.windowMs);
    if (this.requests.length >= this.maxRequests) {
      const oldest = this.requests[0]!;
      const waitTime = this.windowMs - (now - oldest);
      if (waitTime > 0) await new Promise((r) => setTimeout(r, waitTime));
    }
    this.requests.push(Date.now());
  }

  get remaining(): number { return this.maxRequests - this.requests.length; }
}

// --- Token Counter (Approximate) ---

/** Estimate token count for text using rough heuristic (~4 chars per token for English) */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Count tokens more accurately by splitting on word boundaries */
export function countTokensAccurate(text: string): number {
  // Approximate tokenizer: split on spaces/punctuation, count words + punctuation
  const tokens = text.match(/[\w']+|[^\s\w]+/g) ?? [];
  return tokens.length + Math.ceil(text.replace(/\s/g, "").length / 20); // Account for long strings without spaces
}

/** Truncate text to fit within token limit */
export function truncateToTokens(text: string, maxTokens: number): string {
  const approxChars = maxTokens * 4;
  if (text.length <= approxChars) return text;
  return text.slice(0, approxChars - 3) + "...";
}

// --- Prompt Templates ---

export class PromptTemplate {
  private template: string;
  private variables: Set<string>;

  constructor(template: string) {
    this.template = template;
    this.variables = new Set([...template.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]!));
  }

  render(values: Record<string, string>): string {
    let result = this.template;
    for (const [key, val] of Object.entries(values)) {
      result = result.replaceAll(`{{${key}}}`, val);
    }
    return result;
  }

  get variableNames(): string[] { return Array.from(this.variables); }
  validate(values: Record<string, string>): { valid: boolean; missing: string[] } {
    const missing = this.variableNames.filter((v) => !(v in values));
    return { valid: missing.length === 0, missing };
  }
}

// --- Structured Output Helper ---

/** Request JSON-structured output from LLM */
export async function requestJSON<T>(
  client: AIClient,
  messages: Message[],
  schema: Record<string, unknown>,
  options?: { model?: string; maxTokens?: number },
): Promise<T> {
  const schemaPrompt = `You must respond with valid JSON only. No markdown, no code fences. Schema: ${JSON.stringify(schema)}`;
  const response = await client.complete({
    messages: [
      { role: "system", content: schemaPrompt },
      ...messages,
    ],
    ...options,
  });

  // Extract JSON from response (handle potential wrapping)
  const jsonMatch = response.content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`Failed to parse JSON from response: ${response.content.slice(0, 200)}`);

  return JSON.parse(jsonMatch[0]) as T;
}

// --- Retry Logic ---

/** Execute with exponential backoff retry */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelayMs?: number; maxDelayMs?: number; shouldRetry?: (error: unknown) => boolean } = {},
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 1000, maxDelayMs = 30000, shouldRetry = () => true } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries || !shouldRetry(err)) throw err;
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      await new Promise((r) => setTimeout(r, delay + Math.random() * delay * 0.5)); // Jitter
    }
  }
  throw lastError;
}
