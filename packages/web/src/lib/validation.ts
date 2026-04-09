import { z } from "zod";
import { NextResponse } from "next/server";

// ========== Generate Diff ==========
export const GenerateDiffSchema = z.object({
  component_code: z
    .string()
    .min(1, "Component code is required")
    .max(100_000, "Component code too large (max 100KB)"),
  description: z
    .string()
    .min(3, "Description must be at least 3 characters")
    .max(2000, "Description too long (max 2000 chars)"),
  component_types: z.string().max(50_000).optional(),
  design_tokens: z.record(z.string(), z.unknown()).optional(),
  screenshot_base64: z
    .string()
    .max(10 * 1024 * 1024, "Screenshot too large (max 10MB)")
    .optional(),
  saas_name: z.string().max(100).optional(),
  component_name: z.string().max(200).optional(),
});

// ========== Friction ==========
export const CreateFrictionSchema = z.object({
  saas_name: z
    .string()
    .min(1, "SaaS name is required")
    .max(100, "SaaS name too long"),
  component_name: z
    .string()
    .min(1, "Component name is required")
    .max(200, "Component name too long"),
  description: z
    .string()
    .min(3, "Description must be at least 3 characters")
    .max(5000, "Description too long"),
  screenshot_url: z.string().url("Invalid URL").max(2048).optional(),
});

// ========== Pull Request ==========
export const CreatePRSchema = z.object({
  friction_id: z.string().uuid().optional(),
  saas_name: z.string().max(100).optional(),
  component_name: z.string().max(200).optional(),
  description: z
    .string()
    .min(3, "Description must be at least 3 characters")
    .max(2000, "Description too long"),
  diff_result: z.string().max(100_000).optional(),
});

// ========== Vote ==========
export const VoteSchema = z.object({
  vote_type: z.enum(["for", "against"], {
    message: "vote_type must be 'for' or 'against'",
  }),
});

// ========== Validate helper ==========
export function validateBody<T>(
  body: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: NextResponse } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const fieldErrors = result.error.issues
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("; ");
    return {
      success: false,
      error: NextResponse.json(
        { error: `Validation failed: ${fieldErrors}` },
        { status: 422 }
      ),
    };
  }
  return { success: true, data: result.data };
}

// Re-export types
export type GenerateDiffInput = z.infer<typeof GenerateDiffSchema>;
export type CreateFrictionInput = z.infer<typeof CreateFrictionSchema>;
export type CreatePRInput = z.infer<typeof CreatePRSchema>;
export type VoteInput = z.infer<typeof VoteSchema>;
