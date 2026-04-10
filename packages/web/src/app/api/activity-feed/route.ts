/**
 * Activity feed API endpoint.
 * GET /api/activity-feed
 */

import { NextResponse } from "next/server";

interface ActivityItem {
  id: string;
  type: "friction_created" | "diff_generated" | "pr_created" | "pr_accepted" | "pr_rejected" | "vote_cast" | "user_joined";
  actor: string;
  description: string;
  target?: string;
  timestamp: string;
}

const ACTIVITIES: ActivityItem[] = [
  { id: "1", type: "pr_accepted", actor: "Alice Chen", description: "PR accepted for HubSpot ContactForm", target: "#45", timestamp: "2026-04-10T08:30:00Z" },
  { id: "2", type: "diff_generated", actor: "AI Engine", description: "Generated diff for Notion SidebarNav", target: "#127", timestamp: "2026-04-10T08:15:00Z" },
  { id: "3", type: "vote_cast", actor: "Bob Martinez", description: "Voted FOR Stripe chart improvements", target: "#44", timestamp: "2026-04-10T07:45:00Z" },
  { id: "4", type: "friction_created", actor: "Carol Smith", description: "Reported friction on Figma Toolbar", target: "#128", timestamp: "2026-04-10T07:20:00Z" },
  { id: "5", type: "pr_created", actor: "David Kim", description: "Submitted PR for Linear IssueCard avatars", target: "#46", timestamp: "2026-04-10T06:50:00Z" },
  { id: "6", type: "integration_connected", actor: "Eva Johnson", description: "Connected Slack integration", timestamp: "2026-04-09T22:10:00Z" } as unknown as ActivityItem,
  { id: "7", type: "pr_rejected", actor: "Vendor Team", description: "PR rejected - conflicts with redesign", target: "#42", timestamp: "2026-04-09T18:30:00Z" },
  { id: "8", type: "settings_changed", actor: "Frank Wilson", description: "Updated notification preferences", timestamp: "2026-04-09T16:00:00Z" } as unknown as ActivityItem,
  { id: "9", type: "user_joined", actor: "Grace Lee", description: "Joined workspace as Member", timestamp: "2026-04-09T14:20:00Z" },
  { id: "10", type: "diff_generated", actor: "AI Engine", description: "Generated diff for Stripe Dashboard charts", target: "#125", timestamp: "2026-04-09T11:30:00Z" },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "20");
  const type = searchParams.get("type");

  let filtered = [...ACTIVITIES];
  if (type) filtered = filtered.filter((a) => a.type === type);

  return NextResponse.json({
    activities: filtered.slice(0, limit),
    total: filtered.length,
  });
}
