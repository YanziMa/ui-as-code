/**
 * Community stats & activity API.
 * GET /api/community
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    stats: {
      totalMembers: 1247,
      activeThisMonth: 389,
      discordOnline: 890,
      githubContributors: 234,
      totalFrictionsReported: 4521,
      totalPrsSubmitted: 1847,
      prsAccepted: 1123,
      acceptanceRate: 60.8,
    },
    topContributors: [
      { name: "Alice Chen", avatar: "AC", prsAccepted: 12, frictions: 18, joined: "2026-01-15" },
      { name: "Bob Martinez", avatar: "BM", prsAccepted: 9, frictions: 14, joined: "2026-02-03" },
      { name: "Carol Smith", avatar: "CS", prsAccepted: 8, frictions: 13, joined: "2026-03-12" },
      { name: "David Kim", avatar: "DK", prsAccepted: 7, frictions: 11, joined: "2026-03-28" },
      { name: "Eva Johnson", avatar: "EJ", prsAccepted: 6, frictions: 10, joined: "2026-04-01" },
      { name: "Frank Wilson", avatar: "FW", prsAccepted: 5, frictions: 9, joined: "2026-01-20" },
    ],
    recentDiscussions: [
      { title: "Best practices for writing friction descriptions?", replies: 24, author: "Alice Chen", category: "tips" },
      { title: "Feature request: bulk diff export", replies: 15, author: "Bob Martinez", category: "feature-request" },
      { title: "How does the sandbox preview work under the hood?", replies: 8, author: "Carol Smith", category: "technical" },
      { title: "Show off your accepted PRs!", replies: 42, author: "Community", category: "showcase" },
      { title: "Known issues with Salesforce Lightning components", replies: 19, author: "David Kim", category: "troubleshooting" },
    ],
    platforms: {
      discord: { members: 1247, online: 890, inviteUrl: "https://discord.gg/uiascode" },
      github: { stars: 2840, forks: 156, discussions: 89, url: "https://github.com/YanziMa/ui-as-code/discussions" },
      twitter: { handle: "@uiascode", followers: 3420, url: "https://twitter.com/uiascode" },
    },
  });
}
