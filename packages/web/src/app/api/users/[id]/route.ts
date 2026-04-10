/**
 * GET /api/users/:id — Get user by ID or handle
 */

import { NextRequest, NextResponse } from "next/server";

const MOCK_USERS: Record<string, {
  id: string;
  name: string;
  handle: string;
  avatar: string | null;
  role: string;
  location: string;
  bio: string;
  joinedAt: string;
  stats: { submissions: number; accepted: number; acceptanceRate: number; votes: number };
}> = {
  "alex_chen": {
    id: "user_001",
    name: "Alex Chen",
    handle: "@alex_chen",
    avatar: null,
    role: "Top Contributor",
    location: "Shanghai, CN",
    bio: "Frontend engineer passionate about UI/UX.",
    joinedAt: "2026-03-01T00:00:00Z",
    stats: { submissions: 47, accepted: 41, acceptanceRate: 87.3, votes: 1234 },
  },
  "sarah_dev": {
    id: "user_002",
    name: "Sarah Dev",
    handle: "@sarah_dev",
    avatar: null,
    role: "Contributor",
    location: "San Francisco, CA",
    bio: "Full-stack developer. Love clean UI.",
    joinedAt: "2026-03-05T00:00:00Z",
    stats: { submissions: 31, accepted: 24, acceptanceRate: 77.4, votes: 856 },
  },
  "mike_t": {
    id: "user_003",
    name: "Mike T.",
    handle: "@mike_t",
    avatar: null,
    role: "Contributor",
    location: "London, UK",
    bio: "Designer turned developer. Obsessed with details.",
    joinedAt: "2026-03-10T00:00:00Z",
    stats: { submissions: 28, accepted: 22, acceptanceRate: 78.6, votes: 723 },
  },
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Look up by handle (strip @) or ID
  const lookup = id.startsWith("@") ? id.slice(1) : id;
  const user = MOCK_USERS[lookup];

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "User not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, data: user });
}
