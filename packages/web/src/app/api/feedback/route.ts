/**
 * POST /api/feedback — Submit user feedback
 * GET /api/feedback — List user's feedback history
 */

import { NextRequest, NextResponse } from "next/server";

interface FeedbackEntry {
  id: string;
  type: "bug" | "feature" | "general" | "ux";
  subject: string;
  description: string;
  rating?: number;
  status: "open" | "in_progress" | "resolved" | "closed";
  createdAt: string;
  response?: string;
}

const mockFeedback: FeedbackEntry[] = [
  {
    id: "fb_1",
    type: "feature",
    subject: "Dark mode for the sandbox preview",
    description: "It would be great to preview diffs in dark mode, especially for SaaS products that use dark themes.",
    status: "in_progress",
    createdAt: "2026-04-08T10:30:00Z",
    response: "Great suggestion! We're working on theme detection for the sandbox.",
  },
  {
    id: "fb_2",
    type: "bug",
    subject: "Extension crashes on Firefox Nightly",
    description: "When I try to use Alt+Click inspector on Firefox Nightly build, the extension panel fails to load.",
    status: "open",
    createdAt: "2026-04-07T14:15:00Z",
  },
  {
    id: "fb_3",
    type: "general",
    subject: "Love this product!",
    description: "UI-as-Code has completely changed how I report UI issues. The AI-generated diffs are incredibly accurate.",
    rating: 5,
    status: "resolved",
    createdAt: "2026-04-05T09:00:00Z",
    response: "Thank you so much! We're glad you're enjoying it!",
  },
];

export async function POST(request: NextRequest) {
  let body: Partial<FeedbackEntry>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { type, subject, description, rating } = body;

  if (!type || !subject || !description) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields: type, subject, description" },
      { status: 400 },
    );
  }

  const validTypes = ["bug", "feature", "general", "ux"];
  if (!validTypes.includes(type as string)) {
    return NextResponse.json(
      { ok: false, error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
      { status: 400 },
    );
  }

  if (rating !== undefined && (typeof rating !== "number" || rating < 1 || rating > 5)) {
    return NextResponse.json(
      { ok: false, error: "Rating must be between 1 and 5" },
      { status: 400 },
    );
  }

  const newFeedback: FeedbackEntry = {
    id: `fb_${Date.now()}`,
    type: type as FeedbackEntry["type"],
    subject: subject as string,
    description: description as string,
    rating: rating as number | undefined,
    status: "open",
    createdAt: new Date().toISOString(),
  };

  mockFeedback.unshift(newFeedback);

  return NextResponse.json({
    ok: true,
    data: newFeedback,
    message: "Feedback submitted successfully. Thank you!",
  }, { status: 201 });
}

export async function GET() {
  const searchParams = typeof window !== "undefined" ? null : null;

  // Return all feedback for now
  return NextResponse.json({
    ok: true,
    data: {
      items: mockFeedback,
      total: mockFeedback.length,
      summary: {
        open: mockFeedback.filter((f) => f.status === "open").length,
        inProgress: mockFeedback.filter((f) => f.status === "in_progress").length,
        resolved: mockFeedback.filter((f) => f.status === "resolved").length,
        avgRating: mockFeedback
          .filter((f) => f.rating !== undefined)
          .reduce((sum, f) => sum + (f.rating ?? 0), 0) /
          Math.max(mockFeedback.filter((f) => f.rating !== undefined).length, 1),
      },
    },
  });
}
