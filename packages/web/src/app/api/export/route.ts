/**
 * Data export endpoint.
 * GET /api/export?type=frictions|prs|users&format=csv|json
 */

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "frictions";
  const format = searchParams.get("format") || "csv";

  // Mock data based on export type
  const dataMap: Record<string, { headers: string[]; rows: string[][] }> = {
    frictions: {
      headers: ["ID", "SaaS", "Component", "Description", "Status", "Created"],
      rows: [
        ["f001", "HubSpot", "ContactForm", "Submit button too small", "resolved", "2026-04-01"],
        ["f002", "Notion", "SidebarNav", "Can't collapse nested items", "open", "2026-04-03"],
        ["f003", "Linear", "IssueCard", "Missing assignee avatar", "open", "2026-04-05"],
        ["f004", "Stripe", "Dashboard", "Chart colors hard to read", "in_progress", "2026-04-07"],
        ["f005", "Figma", "Toolbar", "Export button hidden", "resolved", "2026-04-08"],
      ],
    },
    prs: {
      headers: ["ID", "Title", "SaaS", "Votes For", "Votes Against", "Status", "Created"],
      rows: [
        ["pr001", "Larger submit buttons", "HubSpot", "24", "3", "accepted", "2026-04-02"],
        ["pr002", "Collapsible sidebar nav", "Notion", "18", "1", "under_review", "2026-04-04"],
        ["pr003", "Add avatars to issue cards", "Linear", "31", "0", "accepted", "2026-04-06"],
        ["pr004", "Improve chart contrast", "Stripe", "15", "8", "rejected", "2026-04-08"],
        ["pr005", "Prominent export button", "Figma", "9", "0", "pending", "2026-04-09"],
      ],
    },
    users: {
      headers: ["ID", "Name", "Email", "Plan", "Joined", "Status"],
      rows: [
        ["u001", "Alice Chen", "alice@example.com", "Pro", "2026-01-15", "active"],
        ["u002", "Bob Martinez", "bob@company.com", "Enterprise", "2026-02-03", "active"],
        ["u003", "Carol Smith", "carol@gmail.com", "Free", "2026-03-12", "active"],
      ],
    },
  };

  const dataset = dataMap[type] || dataMap.frictions;

  if (format === "json") {
    const jsonRows = dataset.rows.map((row) =>
      Object.fromEntries(dataset.headers.map((h, i) => [h.toLowerCase(), row[i]])),
    );
    return new NextResponse(JSON.stringify(jsonRows, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${type}-export.json"`,
      },
    });
  }

  // CSV format (default)
  const csv = [dataset.headers.join(","), ...dataset.rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${type}-export.csv"`,
    },
  });
}
