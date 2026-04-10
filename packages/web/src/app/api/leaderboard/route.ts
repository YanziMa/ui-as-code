/**
 * Contributor leaderboard API.
 * GET /api/leaderboard
 */

import { NextResponse } from "next/server";

interface LeaderboardEntry {
  rank: number;
  user: {
    name: string;
    avatar: string;
    href: string;
  };
  stats: {
    frictionsSubmitted: number;
    prsCreated: number;
    prsAccepted: number;
    acceptanceRate: number;
    totalVotesReceived: number;
  };
  badges: string[];
}

const LEADERBOARD: LeaderboardEntry[] = [
  {
    rank: 1,
    user: { name: "Alice Chen", avatar: "AC", href: "/profile/alice" },
    stats: { frictionsSubmitted: 89, prsCreated: 67, prsAccepted: 52, acceptanceRate: 77.6, totalVotesReceived: 412 },
    badges: ["🏆 Top Contributor", "🎯 Sharpshooter", "⭐ Pioneer"],
  },
  {
    rank: 2,
    user: { name: "Bob Martinez", avatar: "BM", href: "/profile/bob" },
    stats: { frictionsSubmitted: 76, prsCreated: 58, prsAccepted: 41, acceptanceRate: 70.7, totalVotesReceived: 356 },
    badges: ["🔥 Hot Streak", "💡 Innovator"],
  },
  {
    rank: 3,
    user: { name: "Carol Smith", avatar: "CS", href: "/profile/carol" },
    stats: { frictionsSubmitted: 71, prsCreated: 54, prsAccepted: 38, acceptanceRate: 70.4, totalVotesReceived: 321 },
    badges: ["🌟 Rising Star", "🤝 Collaborator"],
  },
  {
    rank: 4,
    user: { name: "David Kim", avatar: "DK", href: "/profile/david" },
    stats: { frictionsSubmitted: 64, prsCreated: 49, prsAccepted: 35, acceptanceRate: 71.4, totalVotesReceived: 298 },
    badges: ["📊 Data Driven"],
  },
  {
    rank: 5,
    user: { name: "Eva Johnson", avatar: "EJ", href: "/profile/eva" },
    stats: { frictionsSubmitted: 58, prsCreated: 44, prsAccepted: 32, acceptanceRate: 72.7, totalVotesReceived: 276 },
    badges: ["🎨 Design Eye"],
  },
  {
    rank: 6,
    user: { name: "Frank Wilson", avatar: "FW", href: "/profile/frank" },
    stats: { frictionsSubmitted: 52, prsCreated: 39, prsAccepted: 28, acceptanceRate: 71.8, totalVotesReceived: 245 },
    badges: [],
  },
  {
    rank: 7,
    user: { name: "Grace Lee", avatar: "GL", href: "/profile/grace" },
    stats: { frictionsSubmitted: 47, prsCreated: 35, prsAccepted: 25, acceptanceRate: 71.4, totalVotesReceived: 212 },
    badges: ["🚀 Fast Learner"],
  },
  {
    rank: 8,
    user: { name: "Henry Zhang", avatar: "HZ", href: "/profile/henry" },
    stats: { frictionsSubmitted: 43, prsCreated: 32, prsAccepted: 22, acceptanceRate: 68.8, totalVotesReceived: 189 },
    badges: [],
  },
  {
    rank: 9,
    user: { name: "Iris Wang", avatar: "IW", href: "/profile/iris" },
    stats: { frictionsSubmitted: 38, prsCreated: 28, prsAccepted: 20, acceptanceRate: 71.4, totalVotesReceived: 167 },
    badges: ["🔍 Detail Oriented"],
  },
  {
    rank: 10,
    user: { name: "Jack Brown", avatar: "JB", href: "/profile/jack" },
    stats: { frictionsSubmitted: 34, prsCreated: 25, prsAccepted: 18, acceptanceRate: 72.0, totalVotesReceived: 145 },
    badges: [],
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "all"; // all | month | week
  const sortBy = searchParams.get("sort") || "accepted"; // accepted | submitted | votes

  let sorted = [...LEADERBOARD];
  switch (sortBy) {
    case "submitted":
      sorted.sort((a, b) => b.stats.frictionsSubmitted - a.stats.frictionsSubmitted);
      break;
    case "votes":
      sorted.sort((a, b) => b.stats.totalVotesReceived - a.stats.totalVotesReceived);
      break;
    default:
      sorted.sort((a, b) => b.stats.prsAccepted - a.stats.prsAccepted);
  }

  return NextResponse.json({
    leaderboard: sorted.map((entry, i) => ({ ...entry, rank: i + 1 })),
    period,
    sortBy,
    totalContributors: 1247,
    updatedAt: new Date().toISOString(),
  });
}
