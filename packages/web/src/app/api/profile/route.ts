/**
 * GET /api/profile — Get user profile data
 * PUT /api/profile — Update user profile
 */

import { NextRequest, NextResponse } from "next/server";

const MOCK_PROFILE = {
  id: "user_001",
  name: "Alex Chen",
  handle: "@alex_chen",
  avatar: null as string | null,
  role: "Top Contributor",
  location: "Shanghai, CN",
  bio: "Frontend engineer passionate about UI/UX. Love making software better for everyone.",
  joinedAt: "2026-03-01T00:00:00Z",
  website: "https://alexchen.dev",
  twitter: "@alexchen_dev",
  github: "alexchen",

  stats: {
    submissions: 47,
    accepted: 41,
    acceptanceRate: 87.3,
    saasProducts: 12,
    badgesEarned: 8,
    totalVotes: 1234,
  },

  badges: [
    { id: "b1", name: "Early Adopter", icon: "star", description: "Among first 100 users", earnedAt: "2026-03-01" },
    { id: "b2", name: "Bug Hunter", icon: "bug", description: "Reported 5 UI issues", earnedAt: "2026-03-10" },
    { id: "b3", name: "Diff Master", icon: "code", description: "10+ accepted diffs", earnedAt: "2026-03-20" },
    { id: "b4", name: "Team Player", icon: "users", description: "Joined a team", earnedAt: "2026-03-25" },
    { id: "b5", name: "Speed Demon", icon: "bolt", description: "First response under 1h", earnedAt: "2026-04-02" },
    { id: "b6", name: "Polyglot", icon: "globe", description: "Contributed to 5+ SaaS products", earnedAt: "2026-04-05" },
    { id: "b7", name: "Streak King", icon: "fire", description: "7-day submission streak", earnedAt: "2026-04-07" },
    { id: "b8", name: "Helpful Soul", icon: "heart", description: "Helped 10+ other users", earnedAt: "2026-04-09" },
  ],

  recentSubmissions: [
    { id: "s_1", saas: "HubSpot", title: "Navbar spacing fix", status: "accepted", createdAt: "2026-04-08T10:30:00Z" },
    { id: "s_2", saas: "Notion", title: "Table column resize", status: "accepted", createdAt: "2026-04-05T14:15:00Z" },
    { id: "s_3", saas: "Figma", title: "Toolbar icon alignment", status: "accepted", createdAt: "2026-04-03T09:00:00Z" },
    { id: "s_4", saas: "Stripe", title: "Checkout button color", status: "rejected", createdAt: "2026-04-06T16:45:00Z" },
    { id: "s_5", saas: "Slack", title: "Sidebar width adjustment", status: "pending", createdAt: "2026-04-09T08:30:00Z" },
    { id: "s_6", saas: "Linear", title: "Issue detail layout", status: "accepted", createdAt: "2026-03-28T13:00:00Z" },
  ],

  saasExpertise: [
    { name: "HubSpot", count: 12, color: "#ff7a59" },
    { name: "Notion", count: 8, color: "#000000" },
    { name: "Figma", count: 7, color: "#a259ff" },
    { name: "Slack", count: 6, color: "#4a154b" },
    { name: "Linear", count: 5, color: "#5e6ad2" },
    { name: "Other", count: 9, color: "#94a3b8" },
  ],
};

export async function GET() {
  return NextResponse.json({ ok: true, data: MOCK_PROFILE });
}

export async function PUT(request: NextRequest) {
  let body: Partial<typeof MOCK_PROFILE>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // Only allow updating certain fields
  const allowedFields = ["name", "bio", "location", "website", "twitter", "github"] as const;
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      (MOCK_PROFILE as Record<string, unknown>)[field] = body[field];
    }
  }

  return NextResponse.json({ ok: true, data: MOCK_PROFILE, message: "Profile updated" });
}
