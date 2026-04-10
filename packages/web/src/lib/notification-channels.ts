/**
 * Multi-Channel Notification System: Unified notification dispatch across
 * email, push (browser/FCM), SMS, webhook, in-app, and Slack/Discord.
 * Supports templating, rate limiting per user/channel, delivery tracking,
 * retry with backoff, preference management, and analytics.
 */

// --- Types ---

export type ChannelType = "email" | "push" | "sms" | "webhook" | "inapp" | "slack" | "discord" | "custom";

export type NotificationPriority = "low" | "normal" | "high" | "critical";

export interface NotificationPayload {
  id?: string;
  userId: string;
  channels: ChannelType[];
  subject: string;
  body: string;
  htmlBody?: string;
  data?: Record<string, unknown>;
  priority?: NotificationPriority;
  tags?: string[];
  expireAt?: Date;
  replyTo?: string;
  fromName?: string;
  /** For push: target device tokens */
  tokens?: string[];
  /** For SMS: phone number */
  toPhone?: string;
  /** For email: recipient address */
  toEmail?: string;
  /** For webhook: URL */
  webhookUrl?: string;
  /** For slack/discord: channel/webhook */
  targetChannel?: string;
  /** Custom metadata */
  meta?: Record<string, unknown>;
}

export interface DeliveryResult {
  success: boolean;
  channel: ChannelType;
  messageId?: string;
  providerResponse?: unknown;
  error?: string;
  retryable: boolean;
  timestamp: number;
  latencyMs: number;
}

export interface SendResult {
  notificationId: string;
  results: DeliveryResult[];
  succeeded: ChannelType[];
  failed: ChannelType[];
  partial: boolean; // Some channels succeeded
}

export interface ChannelConfig {
  enabled: boolean;
  rateLimitPerMinute?: number;
  rateLimitPerHour?: number;
  rateLimitPerDay?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  /** Provider-specific config */
  provider?: Record<string, unknown>;
}

export interface UserPreferences {
  userId: string;
  channels: Partial<Record<ChannelType, {
    enabled: boolean;
    quietHoursStart?: string; // HH:mm
    quietHoursEnd?: string;
    muted?: boolean;
  }>>;
  globalMuted?: boolean;
  globalQuietStart?: string;
  globalQuietEnd?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  subjectTemplate: string;
  bodyTemplate: string;
  htmlTemplate?: string;
  variables: string[];     // Required variable names
  defaultChannels?: ChannelType[];
  defaultPriority?: NotificationPriority;
}

export interface NotificationStats {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  byChannel: Record<ChannelType, { sent: number; delivered: number; failed: number }>;
  avgLatencyMs: number;
  lastSentAt: number | null;
}

// --- Rate Limiter per Channel/User ---

class ChannelRateLimiter {
  private buckets = new Map<string, { count: number; resetAt: number }>();

  check(userId: string, channel: ChannelType, limits: Pick<ChannelConfig, "rateLimitPerMinute" | "rateLimitPerHour" | "rateLimitPerDay">): {
    allowed: boolean;
    reason?: string;
    retryAfterMs?: number;
  } {
    const now = Date.now();
    const key = `${userId}:${channel}`;

    // Per-minute
    if (limits.rateLimitPerMinute) {
      const minuteKey = `${key}:min:${Math.floor(now / 60000)}`;
      let bucket = this.buckets.get(minuteKey);
      if (!bucket || now > bucket.resetAt) {
        bucket = { count: 0, resetAt: now + 60000 };
        this.buckets.set(minuteKey, bucket);
      }
      if (bucket.count >= limits.rateLimitPerMinute) {
        return { allowed: false, reason: "Rate limit per minute exceeded", retryAfterMs: bucket.resetAt - now };
      }
      bucket.count++;
    }

    // Per-hour
    if (limits.rateLimitPerHour) {
      const hourKey = `${key}:hour:${Math.floor(now / 3600000)}`;
      let bucket = this.buckets.get(hourKey);
      if (!bucket || now > bucket.resetAt) {
        bucket = { count: 0, resetAt: now + 3600000 };
        this.buckets.set(hourKey, bucket);
      }
      if (bucket.count >= limits.rateLimitPerHour) {
        return { allowed: false, reason: "Rate limit per hour exceeded", retryAfterMs: bucket.resetAt - now };
      }
      bucket.count++;
    }

    // Per-day
    if (limits.rateLimitPerDay) {
      const dayKey = `${key}:day:${Math.floor(now / 86400000)}`;
      let bucket = this.buckets.get(dayKey);
      if (!bucket || now > bucket.resetAt) {
        bucket = { count: 0, resetAt: now + 86400000 };
        this.buckets.set(dayKey, bucket);
      }
      if (bucket.count >= limits.rateLimitPerDay) {
        return { allowed: false, reason: "Rate limit per day exceeded", retryAfterMs: bucket.resetAt - now };
      }
      bucket.count++;
    }

    return { allowed: true };
  }

  /** Clean up expired buckets */
  cleanup(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (now > bucket.resetAt) this.buckets.delete(key);
    }
  }
}

// --- Template Engine ---

class TemplateEngine {
  private templates = new Map<string, NotificationTemplate>();

  register(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
  }

  render(templateId: string, variables: Record<string, string>): {
    subject: string;
    body: string;
    htmlBody?: string;
  } | null {
    const tmpl = this.templates.get(templateId);
    if (!tmpl) return null;

    return {
      subject: this.interpolate(tmpl.subjectTemplate, variables),
      body: this.interpolate(tmpl.bodyTemplate, variables),
      htmlBody: tmpl.htmlTemplate ? this.interpolate(tmpl.htmlTemplate, variables) : undefined,
    };
  }

  private interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  }
}

// --- Channel Providers ---

interface ChannelProvider {
  send(payload: NotificationPayload): Promise<DeliveryResult>;
  validate(payload: NotificationPayload): { valid: boolean; errors: string[] };
}

/** Email channel provider (placeholder — integrate with your email service) */
class EmailProvider implements ChannelProvider {
  constructor(private config: ChannelConfig["provider"] = {}) {}

  async send(payload: NotificationPayload): Promise<DeliveryResult> {
    const start = performance.now();
    try {
      // Placeholder: In production, call your email API (SendGrid, SES, Resend, etc.)
      console.log(`[Email] To: ${payload.toEmail ?? payload.userId} Subject: ${payload.subject}`);
      return {
        success: true,
        channel: "email",
        messageId: `email_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        providerResponse: { accepted: [payload.toEmail] },
        retryable: false,
        timestamp: Date.now(),
        latencyMs: Math.round((performance.now() - start)),
      };
    } catch (err) {
      return {
        success: false,
        channel: "email",
        error: err instanceof Error ? err.message : String(err),
        retryable: true,
        timestamp: Date.now(),
        latencyMs: Math.round((performance.now() - start)),
      };
    }
  }

  validate(payload: NotificationPayload): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!payload.toEmail && !payload.data?.email) errors.push("Missing recipient email");
    if (!payload.subject) errors.push("Missing subject");
    return { valid: errors.length === 0, errors };
  }
}

/** Push notification provider (browser/FCM placeholder) */
class PushProvider implements ChannelProvider {
  constructor(private _config: ChannelConfig["provider"] = {}) {}

  async send(payload: NotificationPayload): Promise<DeliveryResult> {
    const start = performance.now();
    try {
      console.log(`[Push] To: ${payload.tokens?.length ?? 1} device(s) Title: ${payload.subject}`);
      return {
        success: true,
        channel: "push",
        messageId: `push_${Date.now()}`,
        providerResponse: { successCount: payload.tokens?.length ?? 1 },
        retryable: false,
        timestamp: Date.now(),
        latencyMs: Math.round((performance.now() - start)),
      };
    } catch (err) {
      return {
        success: false,
        channel: "push",
        error: err instanceof Error ? err.message : String(err),
        retryable: true,
        timestamp: Date.now(),
        latencyMs: Math.round((performance.now() - start)),
      };
    }
  }

  validate(_payload: NotificationPayload): { valid: boolean; errors: string[] } {
    return { valid: true, errors: [] };
  }
}

/** SMS provider (placeholder — Twilio, Vonage, etc.) */
class SmsProvider implements ChannelProvider {
  constructor(private _config: ChannelConfig["provider"] = {}) {}

  async send(payload: NotificationPayload): Promise<DeliveryResult> {
    const start = performance.now();
    try {
      console.log(`[SMS] To: ${payload.toPhone} Body: ${payload.body.slice(0, 50)}...`);
      return {
        success: true,
        channel: "sms",
        messageId: `sms_${Date.now()}`,
        providerResponse: { sid: `SM_${Date.now()}` },
        retryable: false,
        timestamp: Date.now(),
        latencyMs: Math.round((performance.now() - start)),
      };
    } catch (err) {
      return {
        success: false,
        channel: "sms",
        error: err instanceof Error ? err.message : String(err),
        retryable: true,
        timestamp: Date.now(),
        latencyMs: Math.round((performance.now() - start)),
      };
    }
  }

  validate(payload: NotificationPayload): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!payload.toPhone && !payload.data?.phone) errors.push("Missing phone number");
    if (!payload.body) errors.push("Missing message body");
    return { valid: errors.length === 0, errors: };
  }
}

/** Webhook provider */
class WebhookProvider implements ChannelProvider {
  constructor(private _config: ChannelConfig["provider"] = {}) {}

  async send(payload: NotificationPayload): Promise<DeliveryResult> {
    const start = performance.now();
    try {
      const url = payload.webhookUrl ?? (this._config?.url as string) ?? "";
      if (!url) throw new Error("No webhook URL configured");

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: payload.id,
          subject: payload.subject,
          body: payload.body,
          data: payload.data,
          priority: payload.priority,
          timestamp: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(this._config?.timeoutMs as number ?? 10000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        success: true,
        channel: "webhook",
        messageId: `wh_${Date.now()}`,
        providerResponse: { status: response.status },
        retryable: false,
        timestamp: Date.now(),
        latencyMs: Math.round((performance.now() - start)),
      };
    } catch (err) {
      return {
        success: false,
        channel: "webhook",
        error: err instanceof Error ? err.message : String(err),
        retryable: !(err instanceof DOMException && err.name === "AbortError"),
        timestamp: Date.now(),
        latencyMs: Math.round((performance.now() - start)),
      };
    }
  }

  validate(payload: NotificationPayload): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!payload.webhookUrl && !this._config?.url) errors.push("Missing webhook URL");
    return { valid: errors.length === 0, errors: };
  }
}

/** Slack incoming webhook provider */
class SlackProvider implements ChannelProvider {
  constructor(private _config: ChannelConfig["provider"] = {}) {}

  async send(payload: NotificationPayload): Promise<DeliveryResult> {
    const start = performance.now();
    try {
      const url = this._config?.webhookUrl as string || "";
      if (!url) throw new Error("No Slack webhook URL");

      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `*${payload.subject}*\n${payload.body}`,
          ...(payload.data ? { attachments: [{ ...payload.data }] } : {}),
        }),
      });

      return {
        success: true,
        channel: "slack",
        messageId: `slack_${Date.now()}`,
        retryable: false,
        timestamp: Date.now(),
        latencyMs: Math.round((performance.now() - start)),
      };
    } catch (err) {
      return {
        success: false,
        channel: "slack",
        error: err instanceof Error ? err.message : String(err),
        retryable: true,
        timestamp: Date.now(),
        latencyMs: Math.round((performance.now() - start)),
      };
    }
  }

  validate(_payload: NotificationPayload): { valid: boolean; errors: string[] } {
    if (!this._config?.webhookUrl) return { valid: false, errors: ["Missing Slack webhook URL"] };
    return { valid: true, errors: [] };
  }
}

/** Discord webhook provider */
class DiscordProvider implements ChannelProvider {
  constructor(private _config: ChannelConfig["provider"] = {}) {}

  async send(payload: NotificationPayload): Promise<DeliveryResult> {
    const start = performance.now();
    try {
      const url = this._config?.webhookUrl as string || "";
      if (!url) throw new Error("No Discord webhook URL");

      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: payload.fromName ?? "Notifications",
          embeds: [{
            title: payload.subject,
            description: payload.body.slice(0, 2048),
            color: payload.priority === "critical" ? 0xff0000 : payload.priority === "high" ? 0xffa500 : 0x3498db,
            timestamp: new Date().toISOString(),
          }],
        }),
      });

      return {
        success: true,
        channel: "discord",
        messageId: `discord_${Date.now()}`,
        retryable: false,
        timestamp: Date.now(),
        latencyMs: Math.round((performance.now() - start)),
      };
    } catch (err) {
      return {
        success: false,
        channel: "discord",
        error: err instanceof Error ? err.message : String(err),
        retryable: true,
        timestamp: Date.now(),
        latencyMs: Math.round((performance.now() - start)),
      };
    }
  }

  validate(_payload: NotificationPayload): { valid: boolean; errors: string[] } {
    if (!this._config?.webhookUrl) return { valid: false, errors: ["Missing Discord webhook URL"] };
    return { valid: true, errors: [] };
  }
}

// --- Main Notification Manager ---

/**
 * Unified multi-channel notification dispatcher.
 *
 * ```ts
 * const notifier = createNotificationManager({
 *   channels: { email: { enabled: true }, slack: { enabled: true, provider: { webhookUrl: "..." } } },
 * });
 *
 * await notifier.send({ userId: "user1", channels: ["email", "slack"], subject: "Hello", body: "World!" });
 * ```
 */
export class NotificationManager {
  private channelConfigs: Map<ChannelType, ChannelConfig> = new Map();
  private providers: Map<ChannelType, ChannelProvider> = new Map();
  private userPrefs = new Map<string, UserPreferences>();
  private templates = new TemplateEngine();
  private rateLimiter = new ChannelRateLimiter();
  private stats: NotificationStats = this.createFreshStats();
  private history: Array<{ result: SendResult; timestamp: number }> = [];
  private maxHistorySize = 1000;

  constructor(config?: {
    channels?: Partial<Record<ChannelType, ChannelConfig>>;
    templates?: NotificationTemplate[];
    defaults?: Partial<ChannelConfig>;
  }) {
    // Register default providers
    this.registerProvider("email", new EmailProvider());
    this.registerProvider("push", new PushProvider());
    this.registerProvider("sms", new SmsProvider());
    this.registerProvider("webhook", new WebhookProvider());
    this.registerProvider("slack", new SlackProvider());
    this.registerProvider("discord", new DiscordProvider());

    // Apply configuration
    if (config?.channels) {
      for (const [channel, cfg] of Object.entries(config.channels)) {
        this.configureChannel(channel as ChannelType, cfg);
      }
    }

    // Register templates
    if (config?.templates) {
      for (const tmpl of config.templates) {
        this.templates.register(tmpl);
      }
    }
  }

  // --- Configuration ---

  /** Configure a specific channel */
  configureChannel(channel: ChannelType, config: Partial<ChannelConfig>): void {
    const existing = this.channelConfigs.get(channel) ?? { enabled: false };
    this.channelConfigs.set(channel, { ...existing, ...config });

    // Update provider config
    const provider = this.providers.get(channel);
    if (provider && config.provider) {
      // Recreate provider with new config (simplified)
      switch (channel) {
        case "email": this.providers.set(channel, new EmailProvider(config.provider)); break;
        case "webhook": this.providers.set(channel, new WebhookProvider(config.provider)); break;
        case "slack": this.providers.set(channel, new SlackProvider(config.provider)); break;
        case "discord": this.providers.set(channel, new DiscordProvider(config.provider)); break;
      }
    }
  }

  /** Register a custom channel provider */
  registerProvider(channel: ChannelType, provider: ChannelProvider): void {
    this.providers.set(channel, provider);
    if (!this.channelConfigs.has(channel)) {
      this.channelConfigs.set(channel, { enabled: true });
    }
  }

  /** Register a notification template */
  registerTemplate(template: NotificationTemplate): void {
    this.templates.register(template);
  }

  /** Set user notification preferences */
  setUserPreferences(prefs: UserPreferences): void {
    this.userPrefs.set(prefs.userId, prefs);
  }

  // --- Sending ---

  /**
   * Send a notification through one or more channels.
   * Handles rate limiting, preferences, quiet hours, and retries.
   */
  async send(payload: NotificationPayload): Promise<SendResult> {
    const notificationId = payload.id ?? `notif_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const results: DeliveryResult[] = [];
    const succeeded: ChannelType[] = [];
    const failed: ChannelType[] = [];

    // Get user preferences
    const prefs = this.userPrefs.get(payload.userId);

    // Filter channels based on preferences and availability
    const activeChannels = payload.channels.filter((ch) => {
      const chCfg = this.channelConfigs.get(ch);
      if (!chCfg?.enabled) return false;

      // Check user-level mute
      if (prefs?.globalMuted) return false;
      const chPref = prefs?.channels?.[ch];
      if (chPref?.muted || chPref?.enabled === false) return false;

      // Quiet hours check
      if (prefs?.globalQuietStart && prefs.globalQuietEnd) {
        if (isInQuietHours(prefs.globalQuietStart, prefs.globalQuietEnd)) return false;
      }
      if (chPref?.quietHoursStart && chPref.quietHoursEnd) {
        if (isInQuietHours(chPref.quietHoursStart, chPref.quietHoursEnd)) return false;
      }

      // Rate limit check
      const rateCheck = this.rateLimiter.check(payload.userId, ch, chCfg);
      if (!rateCheck.allowed) {
        results.push({
          success: false, channel: ch,
          error: rateCheck.reason, retryable: true,
          timestamp: Date.now(), latencyMs: 0,
        });
        failed.push(ch);
        return false;
      }

      return true;
    });

    // Validate each channel's requirements
    for (const ch of activeChannels) {
      const provider = this.providers.get(ch);
      if (!provider) continue;

      const validation = provider.validate(payload);
      if (!validation.valid) {
        results.push({
          success: false, channel: ch,
          error: `Validation failed: ${validation.errors.join(", ")}`,
          retryable: false, timestamp: Date.now(), latencyMs: 0,
        });
        failed.push(ch);
        continue;
      }

      // Send with retry logic
      const chCfg = this.channelConfigs.get(ch)!;
      const maxRetries = chCfg.maxRetries ?? 2;
      let result: DeliveryResult | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        result = await provider.send(payload);

        if (result.success || !result.retryable) break;

        if (attempt < maxRetries) {
          const delay = (chCfg.retryDelayMs ?? 1000) * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, delay));
        }
      }

      results.push(result!);

      if (result!.success) {
        succeeded.push(ch);
      } else {
        failed.push(ch);
      }
    }

    // Update stats
    this.stats.totalSent += results.length;
    this.stats.totalDelivered += succeeded.length;
    this.stats.totalFailed += failed.length;
    this.stats.lastSentAt = Date.now();

    for (const r of results) {
      if (!(r.channel in this.stats.byChannel)) {
        this.stats.byChannel[r.channel] = { sent: 0, delivered: 0, failed: 0 };
      }
      this.stats.byChannel[r.channel]!.sent++;
      if (r.success) this.stats.byChannel[r.channel]!.delivered++;
      else this.stats.byChannel[r.channel]!.failed++;
    }

    const sendResult: SendResult = {
      notificationId,
      results,
      succeeded,
      failed,
      partial: succeeded.length > 0 && failed.length > 0,
    };

    // Store in history
    this.history.push({ result: sendResult, timestamp: Date.now() });
    if (this.history.length > this.maxHistorySize) this.history.shift();

    return sendResult;
  }

  /**
   * Send using a registered template.
   */
  async sendFromTemplate(
    templateId: string,
    userId: string,
    variables: Record<string, string>,
    overrides?: Partial<NotificationPayload>,
  ): Promise<SendResult> {
    const rendered = this.templates.render(templateId, variables);
    if (!rendered) throw new Error(`Template not found: ${templateId}`);

    const tmpl = this.templates["templates"].get(templateId); // Access internal map

    return this.send({
      userId,
      channels: tmpl?.defaultChannels ?? ["inapp"],
      subject: rendered.subject,
      body: rendered.body,
      htmlBody: rendered.htmlBody,
      priority: tmpl?.defaultPriority ?? "normal",
      ...overrides,
    });
  }

  // --- Query & Analytics ---

  getStats(): NotificationStats {
    return { ...this.stats };
  }

  getRecentHistory(count = 20): Array<{ result: SendResult; timestamp: number }> {
    return this.history.slice(-count);
  }

  getUserPreferences(userId: string): UserPreferences | undefined {
    return this.userPrefs.get(userId);
  }

  // --- Utilities ---

  private createFreshStats(): NotificationStats {
    return {
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
      byChannel: {} as Record<ChannelType, { sent: number; delivered: number; failed: number }>,
      avgLatencyMs: 0,
      lastSentAt: null,
    };
  }
}

// --- Utility Functions ---

function isInQuietHours(start: string, end: string): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh! * 60 + sm!;
  const endMin = eh! * 60 + em!;

  if (startMin <= endMin) {
    return currentMinutes >= startMin && currentMinutes < endMin;
  }
  // Wraps midnight (e.g., 22:00 → 06:00)
  return currentMinutes >= startMin || currentMinutes < endMin;
}

// --- Factory Functions ---

/** Create a pre-configured notification manager */
export function createNotificationManager(config?: ConstructorParameters<typeof NotificationManager>[0]): NotificationManager {
  return new NotificationManager(config);
}

/** Create a manager optimized for SaaS product notifications */
export function createSaaSNotifier(options?: {
  productName?: string;
  supportEmail?: string;
  slackWebhookUrl?: string;
}): NotificationManager {
  return new NotificationManager({
    channels: {
      email: { enabled: true, rateLimitPerHour: 20 },
      push: { enabled: true, rateLimitPerMinute: 5 },
      inapp: { enabled: true, rateLimitPerMinute: 10 },
      ...(options?.slackWebhookUrl ? {
        slack: { enabled: true, provider: { webhookUrl: options.slackWebhookUrl } },
      } : {}),
    },
  });
}
