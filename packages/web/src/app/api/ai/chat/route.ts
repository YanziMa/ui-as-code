/**
 * AI Chat / assistant endpoint.
 * POST /api/ai/chat
 */

import { NextRequest, NextResponse } from "next/server";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
}

// Predefined responses for demo (in production, calls Claude API)
const RESPONSES: Record<string, string> = {
  default: "I can help you with that! Based on your description, I'd suggest focusing on the specific component you want to change. Try using Alt+Click to select the element first, then describe what you'd like to modify in natural language.",
  diff: "To generate a diff for your change request, I'll need the current component code. The browser extension captures this automatically when you use Alt+Click to select a component. Once selected, describe the change and I'll generate a unified diff for review.",
  pr: "After reviewing and accepting the diff in our sandbox preview, you can submit it as a PR. The PR will go through community voting before being presented to the SaaS vendor for consideration.",
  pricing: "We offer a Free tier with 50 diff generations/month, and a Pro tier at $19/month with unlimited generations, team features, and API access. Enterprise plans are available with custom pricing.",
  extension: "The UI-as-Code browser extension is available on the Chrome Web Store. Install it, then navigate to any React-based SaaS application. Hold Alt and hover over elements to inspect them, then click to start describing changes.",
};

function getResponse(query: string): string {
  const q = query.toLowerCase();
  if (q.includes("diff") || q.includes("generate") || q.includes("change")) return RESPONSES.diff;
  if (q.includes("pr") || q.includes("pull request") || q.includes("submit")) return RESPONSES.pr;
  if (q.includes("price") || q.includes("cost") || q.includes("plan") || q.includes("free")) return RESPONSES.pricing;
  if (q.includes("extension") || q.includes("chrome") || q.includes("install") || q.includes("browser")) return RESPONSES.extension;
  return RESPONSES.default;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body.message || "";

    if (!message || typeof message !== "string" || message.length > 5000) {
      return NextResponse.json({ error: "Message is required (max 5000 chars)" }, { status: 400 });
    }

    // Simulate AI processing delay
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 700));

    const response = getResponse(message);

    const messages: ChatMessage[] = [
      { role: "user", content: message, timestamp: new Date().toISOString() },
      { role: "assistant", content: response, timestamp: new Date().toISOString() },
    ];

    return NextResponse.json({ messages, model: "claude-sonnet-4" });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
