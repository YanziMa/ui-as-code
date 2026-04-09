import { NextRequest, NextResponse } from "next/server";
import type { GenerateDiffInput, GenerateDiffOutput } from "@/types";

export async function POST(req: NextRequest) {
  const body: GenerateDiffInput = await req.json();

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "CLAUDE_API_KEY not configured" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: `You are a UI modification expert. Given a user's description, generate a unified diff for the provided React component.

Rules:
- Only output unified diff format (--- a/file +++ b/file @@ ... @@)
- Do NOT modify import statements
- Do NOT make cross-file changes
- Keep the component's existing API (props) unchanged
- Only modify what the user requested, nothing else`,
        messages: [
          {
            role: "user",
            content: buildPrompt(body),
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Claude API error: ${error}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    // Extract diff from response
    const diff = extractDiff(text);

    const result: GenerateDiffOutput = {
      diff,
      success: diff.length > 0,
      error: diff.length === 0 ? "No valid diff generated" : undefined,
    };

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: `Internal error: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}

function buildPrompt(input: GenerateDiffInput): string {
  let prompt = `<component-code>\n${input.component_code}\n</component-code>\n`;

  if (input.component_types) {
    prompt += `<types>\n${input.component_types}\n</types>\n`;
  }

  if (input.design_tokens) {
    prompt += `<design-tokens>\n${JSON.stringify(input.design_tokens, null, 2)}\n</design-tokens>\n`;
  }

  prompt += `<request>\n${input.description}\n</request>\n`;

  return prompt;
}

function extractDiff(text: string): string {
  // Try to find unified diff in the response
  const diffMatch = text.match(
    /(?:---\s+a\/[^\n]+\n\+\+\+\s+b\/[^\n]+\n@@[\s\S]*?)(?:```|$)/
  );
  if (diffMatch) {
    return diffMatch[0].replace(/```$/, "").trim();
  }

  // Fallback: look for any diff-like content
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
