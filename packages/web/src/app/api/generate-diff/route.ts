import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  GenerateDiffSchema,
  validateBody,
} from "@/lib/validation";
import {
  withHandler,
  checkRateLimit,
  apiError,
  apiSuccess,
} from "@/lib/api-middleware";

const AI_PROVIDER = process.env.AI_PROVIDER || "glm";
const AI_MODEL = process.env.AI_MODEL || "glm-5v-turbo";

export async function POST(req: NextRequest) {
  return withHandler(req, async () => {
    const rawBody = await req.json();
    const validation = validateBody(rawBody, GenerateDiffSchema);
    if (!validation.success) return validation.error;

    const body = validation.data;

    // Check AI-specific rate limit (stricter)
    const rateResult = checkRateLimit(req, {
      windowMs: 60_000,
      maxRequests: 5,
    });
    if (!rateResult.allowed) {
      return apiError(
        `AI rate limit exceeded. Try again in ${Math.ceil((rateResult.resetAt - Date.now()) / 1000)}s.`,
        429
      );
    }

    try {
      let diff: string;

      if (AI_PROVIDER === "claude") {
        diff = await callClaude(body);
      } else {
        diff = await callOpenAICompatible(body);
      }

      if (!diff || diff.trim().length === 0) {
        return apiError("No valid diff generated. Try rephrasing your request.", 422);
      }

      return apiSuccess({ diff, success: true });
    } catch (err) {
      console.error("[GenerateDiff]", err);
      return apiError(
        `AI generation failed: ${(err as Error).message}`,
        502
      );
    }
  }, { rateLimit: { windowMs: 60_000, maxRequests: 10 } });
}

// ========== OpenAI-compatible (GLM / DeepSeek / GPT) ==========
async function callOpenAICompatible(
  input: z.infer<typeof GenerateDiffSchema>
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("AI_API_KEY not configured");

  const baseUrl =
    AI_PROVIDER === "glm"
      ? "https://open.bigmodel.cn/api/paas/v4"
      : AI_PROVIDER === "deepseek"
        ? "https://api.deepseek.com/v1"
        : "https://api.openai.com/v1";

  const content = buildMultimodalContent(input);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000); // 60s timeout

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 4096,
        messages: [
          {
            role: "system",
            content:
              "You are a UI modification expert. Given a user's description, generate a unified diff for the provided React component.\n\nRules:\n- Only output unified diff format (--- a/file +++ b/file @@ ... @@)\n- Do NOT modify import statements\n- Do NOT make cross-file changes\n- Keep the component's existing API (props) unchanged\n- Only modify what the user requested, nothing else",
          },
          { role: "user", content },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`AI API (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    return extractDiff(text);
  } finally {
    clearTimeout(timeout);
  }
}

function buildMultimodalContent(
  input: z.infer<typeof GenerateDiffSchema>
): string | Array<{ type: "text" | "image_url"; text?: string; image_url?: { url: string } }> {
  const parts: Array<{
    type: "text" | "image_url";
    text?: string;
    image_url?: { url: string };
  }> = [];

  let textPrompt = `<component-code>\n${input.component_code}\n</component-code>\n`;

  if (input.component_types) {
    textPrompt += `<types>\n${input.component_types}\n</types>\n`;
  }
  if (input.design_tokens) {
    textPrompt += `<design-tokens>\n${JSON.stringify(input.design_tokens, null, 2)}\n</design-tokens>\n`;
  }
  textPrompt += `<request>\n${input.description}\n</request>`;

  parts.push({ type: "text", text: textPrompt });

  if (input.screenshot_base64) {
    parts.push({
      type: "image_url",
      image_url: { url: input.screenshot_base64 },
    });
  }

  return parts.length === 1 ? textPrompt : parts;
}

// ========== Claude (fallback) ==========
async function callClaude(
  input: z.infer<typeof GenerateDiffSchema>
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("CLAUDE_API_KEY not configured");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 4096,
        system:
          "You are a UI modification expert. Given a user's description, generate a unified diff for the provided React component.\n\nRules:\n- Only output unified diff format (--- a/file +++ b/file @@ ... @@)\n- Do NOT modify import statements\n- Do NOT make cross-file changes\n- Keep the component's existing API (props) unchanged\n- Only modify what the user requested, nothing else",
        messages: [{ role: "user", content: buildTextPrompt(input) }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Claude API: ${errorText}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    return extractDiff(text);
  } finally {
    clearTimeout(timeout);
  }
}

function buildTextPrompt(
  input: z.infer<typeof GenerateDiffSchema>
): string {
  let prompt = `<component-code>\n${input.component_code}\n</component-code>\n`;

  if (input.component_types) {
    prompt += `<types>\n${input.component_types}\n</types>\n`;
  }
  if (input.design_tokens) {
    prompt += `<design-tokens>\n${JSON.stringify(input.design_tokens, null, 2)}\n</design-tokens>\n`;
  }
  prompt += `<request>\n${input.description}\n</request>`;

  return prompt;
}

// ========== Utils ==========
function getApiKey(): string | undefined {
  return (
    process.env.AI_API_KEY ||
    process.env.CLAUDE_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.GLM_API_KEY
  );
}

function extractDiff(text: string): string {
  const codeBlockMatch = text.match(/```diff\n([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  const diffMatch = text.match(
    /(?:---\s+a\/[^\n]+\n\+\+\+\s+b\/[^\n]+\n@@[\s\S]*?)(?:```|$)/
  );
  if (diffMatch) {
    return diffMatch[0].replace(/```$/, "").trim();
  }

  const lines = text.split("\n");
  const diffLines: string[] = [];
  let inDiff = false;

  for (const line of lines) {
    if (line.startsWith("---") || line.startsWith("+++") || line.startsWith("@@")) {
      inDiff = true;
    }
    if (inDiff) {
      diffLines.push(line);
    }
  }

  return diffLines.join("\n");
}
