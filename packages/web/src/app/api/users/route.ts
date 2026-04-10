/**
 * Users API endpoint.
 * GET /api/users — list users (admin)
 * POST /api/users — create user
 */

import { NextResponse } from "next/server";

const MOCK_USERS = [
  { id: "1", name: "Alice Chen", email: "alice@example.com", plan: "pro", role: "admin", joinedAt: "2026-01-15", status: "active", lastActive: "2026-04-10T08:30:00Z" },
  { id: "2", name: "Bob Martinez", email: "bob@company.com", plan: "enterprise", role: "member", joinedAt: "2026-02-03", status: "active", lastActive: "2026-04-09T16:45:00Z" },
  { id: "3", name: "Carol Smith", email: "carol@gmail.com", plan: "free", role: "member", joinedAt: "2026-03-12", status: "active", lastActive: "2026-04-10T02:15:00Z" },
  { id: "4", name: "David Kim", email: "david.kim@startup.io", plan: "pro", role: "member", joinedAt: "2026-03-28", status: "suspended", lastActive: "2026-04-05T11:20:00Z" },
  { id: "5", name: "Eva Johnson", email: "eva@design.co", plan: "free", role: "member", joinedAt: "2026-04-01", status: "active", lastActive: "2026-04-10T07:00:00Z" },
  { id: "6", name: "Frank Wilson", email: "frank.w@corp.com", plan: "enterprise", role: "admin", joinedAt: "2026-01-20", status: "active", lastActive: "2026-04-10T09:10:00Z" },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const search = searchParams.get("search")?.toLowerCase();

  let filtered = [...MOCK_USERS];
  if (search) {
    filtered = filtered.filter(
      (u) => u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search),
    );
  }

  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  return NextResponse.json({
    users: paginated,
    pagination: {
      page,
      limit,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limit),
    },
  });
}
