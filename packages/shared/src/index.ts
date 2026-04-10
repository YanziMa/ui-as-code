// ========== User ==========
export interface User {
  id: string;
  email: string;
  created_at: string;
  plan_tier: "free" | "pro" | "team";
}

// ========== Component ==========
export interface ComponentInfo {
  name: string;
  filePath: string;
  jsx: string;
  types?: string;
  designTokens?: DesignTokens;
  boundingRect: BoundingRect;
}

export interface DesignTokens {
  colors?: Record<string, string>;
  fontSizes?: Record<string, string>;
  spacing?: Record<string, string>;
}

export interface BoundingRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ========== Friction ==========
export interface Friction {
  id: string;
  user_id: string;
  saas_name: string;
  component_name: string;
  description: string;
  screenshot_url?: string;
  created_at: string;
}

export interface CreateFrictionInput {
  saas_name: string;
  component_name: string;
  description: string;
  screenshot_url?: string;
}

export interface TopFrictionItem {
  saas_name: string;
  component_name: string;
  count: number;
  rank: number;
}

// ========== Diff ==========
export type DiffStatus = "generating" | "success" | "failed";

export interface DiffResult {
  id: string;
  friction_id: string;
  component_code: string;
  prompt: string;
  diff_result?: string;
  status: DiffStatus;
  created_at: string;
}

export interface GenerateDiffInput {
  component_code: string;
  component_types?: string;
  design_tokens?: DesignTokens;
  description: string;
  screenshot_base64?: string;
  saas_name?: string;
  component_name?: string;
}

export interface GenerateDiffOutput {
  diff: string;
  success: boolean;
  explanation?: string;
  model_used?: string;
  tokens_used?: number;
  error?: string;
}

// ========== Pull Request ==========
export type PRStatus = "open" | "merged" | "closed";

export interface PullRequest {
  id: string;
  diff_id: string;
  user_id: string;
  description: string;
  affected_users: number;
  status: PRStatus;
  votes_for: number;
  votes_against: number;
  created_at: string;
}

export type VoteType = "for" | "against";

export interface VoteInput {
  vote_type: VoteType;
}

export interface VoteOutput {
  success: boolean;
  votes_for: number;
  votes_against: number;
}

// ========== Search ==========
export type SearchResultType = "friction" | "pr" | "all";

export interface SearchInput {
  q: string;
  type?: SearchResultType;
}

export interface SearchOutput {
  results: Array<Friction | PullRequest>;
  total: number;
  query: string;
}

// ========== Webhook ==========
export type WebhookEvent =
  | "pr:created"
  | "pr:merged"
  | "pr:closed"
  | "friction:created"
  | "vote:cast";

export interface WebhookPayload<T extends WebhookEvent = WebhookEvent> {
  event: T;
  data: Record<string, unknown>;
}

export interface WebhookResponse {
  received: boolean;
  event: string;
  processed_at: string;
}

// ========== Stats ==========
export interface PlatformStats {
  total_frictions: number;
  total_prs: number;
  total_votes: number;
  unique_saas_sites: number;
  merged_prs?: number;
  open_prs?: number;
}

// ========== Health ==========
export interface HealthCheckResponse {
  status: "ok" | "error";
  version: string;
  uptime: number;
  database: {
    connected: boolean;
    latency_ms: number;
  };
  endpoints: string[];
  environment: {
    node_env: string;
    ai_provider: string;
  };
}

// ========== API ==========
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface ApiError {
  success: false;
  error: string;
  code: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

// ========== Rate Limit ==========
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset_ms: number;
}

// ========== Extension Messages ==========
export type MessageType =
  | "INSPECTOR_TOGGLE"
  | "COMPONENT_SELECTED"
  | "GENERATE_DIFF"
  | "DIFF_RESULT"
  | "ADOPT_DIFF"
  | "REJECT_DIFF"
  | "SCREENSHOT_CAPTURED"
  | "ERROR_OCCURRED"
  | "STATUS_UPDATE";

export interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
  timestamp?: string;
}

// ========== Constants ==========
export const REDIRECT_SLUGS: Record<string, string> = {
  d: "https://ui-as-code-web.vercel.app/dashboard",
  p: "https://ui-as-code-web.vercel.app/pr",
  pr: "https://ui-as-code-web.vercel.app/pr",
  api: "https://ui-as-code-web.vercel.app/api-docs",
  docs: "https://ui-as-code-web.vercel.app/api-docs",
  status: "https://ui-as-code-web.vercel.app/status",
  changelog: "https://ui-as-code-web.vercel.app/changelog",
  privacy: "https://ui-as-code-web.vercel.app/privacy",
  terms: "https://ui-as-code-web.vercel.app/terms",
  guide: "https://github.com/YanziMa/ui-as-code#readme",
};

export const AI_RULES = [
  "Only output unified diff format",
  "Do not modify import statements",
  "Do not make cross-file changes",
  "Keep the original component API unchanged",
  "Use Tailwind CSS v4 classes for styling",
  "Preserve existing className patterns",
  "Wrap code blocks in proper JSX syntax",
  "Maintain accessibility attributes (aria-*, role)",
  "Keep event handlers intact unless explicitly requested",
  "Output clean, minimal diffs with no unnecessary whitespace changes",
] as const;

export const SUPPORTED_SAAS = [
  "HubSpot",
  "Notion",
  "Linear",
  "Jira",
  "Salesforce",
  "Figma",
  "Slack",
  "Discord",
  "GitHub",
  "GitLab",
  "Asana",
  "Monday.com",
  "Airtable",
  "Miro",
  "Webflow",
] as const;
