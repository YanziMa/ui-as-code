/**
 * Announcements API.
 * GET /api/announcements — list announcements
 */

import { NextResponse } from "next/server";

interface Announcement {
  id: string;
  title: string;
  body: string;
  type: "info" | "warning" | "maintenance" | "feature";
  priority: "low" | "medium" | "high";
  publishedAt: string;
  expiresAt?: string;
  author: string;
}

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "1",
    title: "New: Teams & Collaboration Features",
    body: "We're excited to announce team workspaces, shared frictions, and collaborative PR review. Upgrade to Pro or invite teammates to get started.",
    type: "feature",
    priority: "high",
    publishedAt: "2026-04-08T10:00:00Z",
    author: "Product Team",
  },
  {
    id: "2",
    title: "Scheduled Maintenance: April 12",
    body: "We will perform scheduled maintenance on April 12, 2026 from 2:00 AM - 4:00 AM UTC. The service may be unavailable during this window.",
    type: "maintenance",
    priority: "medium",
    publishedAt: "2026-04-07T14:00:00Z",
    expiresAt: "2026-04-13T00:00:00Z",
    author: "Operations",
  },
  {
    id: "3",
    title: "AI Diff Engine v2 Now Available",
    body: "Our improved AI model produces more accurate diffs with better context understanding. Enable it in Settings > AI Configuration.",
    type: "feature",
    priority: "high",
    publishedAt: "2026-04-05T09:00:00Z",
    author: "Engineering",
  },
  {
    id: "4",
    title: "Rate Limit Changes for Free Tier",
    body: "Effective May 1, the free tier rate limit will change from 100 to 50 diff generations per month. Existing Pro users are unaffected.",
    type: "info",
    priority: "medium",
    publishedAt: "2026-04-01T08:00:00Z",
    author: "Product Team",
  },
  {
    id: "5",
    title: "Welcome to UI-as-Code!",
    body: "Thanks for joining! Check out the Getting Started guide to learn how to use Alt+Click to select components and generate UI changes with natural language.",
    type: "info",
    priority: "low",
    publishedAt: "2026-03-18T00:00:00Z",
    author: "Team",
  },
];

export async function GET() {
  const now = new Date();
  const visible = ANNOUNCEMENTS.filter(
    (a) => !a.expiresAt || new Date(a.expiresAt) > now,
  );

  return NextResponse.json({ announcements: visible });
}
