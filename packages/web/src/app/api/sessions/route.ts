/**
 * GET /api/sessions — List active user sessions
 * DELETE /api/sessions — Revoke a session
 */

import { NextRequest, NextResponse } from "next/server";

interface Session {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastActive: string;
  current: boolean;
}

const mockSessions: Session[] = [
  {
    id: "sess_1",
    device: "Desktop",
    browser: "Chrome 131",
    os: "Windows 11",
    ip: "203.0.113.42",
    location: "Shanghai, CN",
    lastActive: "Now",
    current: true,
  },
  {
    id: "sess_2",
    device: "iPhone 16 Pro",
    browser: "Safari 18",
    os: "iOS 18.2",
    ip: "198.51.100.17",
    location: "Shanghai, CN",
    lastActive: "2 hours ago",
    current: false,
  },
  {
    id: "sess_3",
    device: "MacBook Pro",
    browser: "Arc 1.4",
    os: "macOS 15.1",
    ip: "192.0.2.88",
    location: "Beijing, CN",
    lastActive: "3 days ago",
    current: false,
  },
];

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      sessions: mockSessions,
      total: mockSessions.length,
      hasMultipleDevices: mockSessions.length > 1,
    },
  });
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get("id");

  if (!sessionId) {
    return NextResponse.json(
      { ok: false, error: "Session ID required" },
      { status: 400 },
    );
  }

  const idx = mockSessions.findIndex((s) => s.id === sessionId);
  if (idx === -1) {
    return NextResponse.json(
      { ok: false, error: "Session not found" },
      { status: 404 },
    );
  }

  if (mockSessions[idx].current) {
    return NextResponse.json(
      { ok: false, error: "Cannot revoke current session" },
      { status: 400 },
    );
  }

  mockSessions.splice(idx, 1);

  return NextResponse.json({
    ok: true,
    message: "Session revoked successfully",
  });
}
