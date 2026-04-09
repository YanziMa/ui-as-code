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
}

export interface GenerateDiffOutput {
  diff: string;
  success: boolean;
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

// ========== API ==========
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// ========== Extension Messages ==========
export type MessageType =
  | "INSPECTOR_TOGGLE"
  | "COMPONENT_SELECTED"
  | "GENERATE_DIFF"
  | "DIFF_RESULT"
  | "ADOPT_DIFF"
  | "REJECT_DIFF";

export interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
}
