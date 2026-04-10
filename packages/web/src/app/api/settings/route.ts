/**
 * GET /api/settings — Fetch user preferences
 * PUT /api/settings — Update user preferences
 */

import { NextRequest, NextResponse } from "next/server";

// In-memory store (replace with DB in production)
const userSettings = new Map<string, Record<string, unknown>>();

const DEFAULT_SETTINGS = {
  displayName: "",
  timezone: "UTC",
  language: "en",
  theme: "system",
  fontSize: "medium",
  compactMode: false,
  emailNotifications: true,
  inAppNotifications: true,
  aiModel: "claude-sonnet",
  temperature: 0.7,
  maxTokens: 4096,
  autoPreview: true,
  webhookUrl: null as string | null,
};

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id") ?? "anonymous";
  const settings = { ...DEFAULT_SETTINGS, ...(userSettings.get(userId) ?? {}) };

  return NextResponse.json({
    ok: true,
    data: settings,
  });
}

export async function PUT(request: NextRequest) {
  const userId = request.headers.get("x-user-id") ?? "anonymous";

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  // Validate allowed keys
  const allowedKeys = new Set(Object.keys(DEFAULT_SETTINGS));
  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (allowedKeys.has(key)) {
      updates[key] = value;
    }
  }

  const current = userSettings.get(userId) ?? {};
  const merged = { ...current, ...updates };
  userSettings.set(userId, merged);

  return NextResponse.json({
    ok: true,
    data: merged,
    message: "Settings updated",
  });
}

export async function DELETE(_request: NextRequest) {
  const userId = _request.headers.get("x-user-id") ?? "anonymous";
  userSettings.delete(userId);

  return NextResponse.json({
    ok: true,
    message: "Settings reset to defaults",
  });
}
