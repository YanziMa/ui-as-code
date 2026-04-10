"use client";

import { useState, useMemo } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MetricCard {
  label: string;
  value: string | number;
  trend: number;
  icon: string;
}

interface ActivityItem {
  id: number;
  type: "modify" | "pr" | "approve" | "create" | "comment" | "deploy";
  description: string;
  target: string;
  timestamp: string;
  ago: string;
}

interface ProjectCard {
  id: number;
  name: string;
  saas: string;
  lastModified: string;
  status: "active" | "paused" | "completed";
  componentCount: number;
  avatar: string;
}

interface SuggestionItem {
  id: number;
  text: string;
  confidence: number;
  category: "accessibility" | "performance" | "design" | "seo";
}

interface TeamMember {
  id: number;
  name: string;
  role: string;
  avatar: string;
  online: boolean;
  contributions: number;
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const METRICS: MetricCard[] = [
  { label: "Active Projects", value: 12, trend: 12, icon: "\u{1F4D1}" },
  { label: "PRs Submitted", value: 47, trend: 23, icon: "\u{1F4E5}" },
  { label: "Components Modified", value: 238, trend: 8, icon: "\u{1F504}" },
  { label: "Time Saved", value: "42h", trend: 18, icon: "\u23F1" },
];

const ACTIVITY_CHART_DATA = [
  12, 19, 15, 25, 22, 30, 28, 35, 32, 40, 38, 45, 42, 48, 44, 52, 49,
  55, 51, 58, 54, 62, 59, 65, 61, 68, 64, 72, 69, 75,
];

const RECENT_ACTIVITY: ActivityItem[] = [
  { id: 1, type: "modify", description: "Modified Header component", target: "HubSpot", timestamp: "2026-04-10T09:14:00Z", ago: "2m ago" },
  { id: 2, type: "pr", description: "Submitted PR #48 to", target: "Salesforce", timestamp: "2026-04-10T08:45:00Z", ago: "31m ago" },
  { id: 3, type: "approve", description: "Approved change on", target: "Notion", timestamp: "2026-04-10T08:22:00Z", ago: "54m ago" },
  { id: 4, type: "create", description: "Created new Footer variant for", target: "Stripe", timestamp: "2026-10T07:55:00Z", ago: "1h ago" },
  { id: 5, type: "comment", description: "Left review on PR #43 for", target: "Slack", timestamp: "2026-04-10T06:30:00Z", ago: "3h ago" },
  { id: 6, type: "deploy", description: "Deployed v2.4.1 to production for", target: "Linear", timestamp: "2026-04-09T22:10:00Z", ago: "11h ago" },
  { id: 7, type: "modify", description: "Updated color tokens in", target: "Figma Design System", timestamp: "2026-04-09T18:40:00Z", ago: "15h ago" },
  { id: 8, type: "pr", description: "Merged PR #41 into main for", target: "Vercel", timestamp: "2026-04-09T15:20:00Z", ago: "18h ago" },
  { id: 9, type: "create", description: "Added new Button component to", target: "Shopify", timestamp: "2026-04-09T12:05:00Z", ago: "21h ago" },
  { id: 10, type: "comment", description: "Replied to thread on", target: "Discord", timestamp: "2026-04-09T09:30:00Z", ago: "1d ago" },
];

const PROJECTS: ProjectCard[] = [
  { id: 1, name: "Marketing Site Redesign", saas: "HubSpot", lastModified: "2 min ago", status: "active", componentCount: 34, avatar: "H" },
  { id: 2, name: "CRM Dashboard UI", saas: "Salesforce", lastModified: "31 min ago", status: "active", componentCount: 52, avatar: "S" },
  { id: 3, name: "Editor Components", saas: "Notion", lastModified: "54 min ago", status: "active", componentCount: 28, avatar: "N" },
  { id: 4, name: "Payment Flow Overhaul", saas: "Stripe", lastModified: "3 hours ago", status: "paused", componentCount: 41, avatar: "St" },
  { id: 5, name: "Messaging Layout", saas: "Slack", lastModified: "Yesterday", status: "completed", componentCount: 19, avatar: "Sl" },
  { id: 6, name: "Issue Tracker Theme", saas: "Linear", lastModified: "2 days ago", status: "active", componentCount: 64, avatar: "L" },
];

const AI_SUGGESTIONS: SuggestionItem[] = [
  { id: 1, text: "Your navbar could benefit from increased contrast ratio (currently 3.2:1). Consider darkening the background or lightening the text.", confidence: 94, category: "accessibility" },
  { id: 2, text: "Consider adding skip links for keyboard navigation. This is a quick win that improves WCAG compliance significantly.", confidence: 87, category: "accessibility" },
  { id: 3, text: "The hero section on your Marketing project has 3 layout shifts on load. Preload critical images to improve CLS score.", confidence: 79, category: "performance" },
];

const TEAM_MEMBERS: TeamMember[] = [
  { id: 1, name: "Sarah Chen", role: "Lead Designer", avatar: "SC", online: true, contributions: 142 },
  { id: 2, name: "Marcus Webb", role: "Frontend Dev", avatar: "MW", online: true, contributions: 98 },
  { id: 3, name: "Priya Sharma", role: "Accessibility Spec", avatar: "PS", online: false, contributions: 67 },
  { id: 4, name: "James Liu", role: "DevOps", avatar: "JL", online: true, contributions: 53 },
  { id: 5, name: "Emma Torres", role: "Product Manager", avatar: "ET", online: false, contributions: 31 },
];

const USAGE_CURRENT = 847;
const USAGE_LIMIT = 1000;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getActivityIcon(type: ActivityItem["type"]): { symbol: string; bgClass: string } {
  switch (type) {
    case "modify":
      return { symbol: "\u{1F504}", bgClass: "bg-blue-500/15 text-blue-400" };
    case "pr":
      return { symbol: "\u{1F4E5}", bgClass: "bg-purple-500/15 text-purple-400" };
    case "approve":
      return { symbol: "\u2705", bgClass: "bg-green-500/15 text-green-400" };
    case "create":
      return { symbol: "\u2795", bgClass: "bg-cyan-500/15 text-cyan-400" };
    case "comment":
      return { symbol: "\u{1F4AC}", bgClass: "bg-yellow-500/15 text-yellow-400" };
    case "deploy":
      return { symbol: "\u{1F680}", bgClass: "bg-orange-500/15 text-orange-400" };
    default:
      return { symbol: "\u{1F4CB}", bgClass: "bg-zinc-500/15 text-zinc-400" };
  }
}

function getStatusBadge(status: ProjectCard["status"]): { label: string; classes: string } {
  switch (status) {
    case "active":
      return { label: "Active", classes: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" };
    case "paused":
      return { label: "Paused", classes: "bg-amber-500/15 text-amber-400 border border-amber-500/30" };
    case "completed":
      return { label: "Completed", classes: "bg-sky-500/15 text-sky-400 border border-sky-500/30" };
  }
}

function getCategoryBadge(category: SuggestionItem["category"]): { label: string; classes: string } {
  switch (category) {
    case "accessibility":
      return { label: "A11y", classes: "bg-violet-500/15 text-violet-400" };
    case "performance":
      return { label: "Perf", classes: "bg-rose-500/15 text-rose-400" };
    case "design":
      return { label: "Design", classes: "bg-teal-500/15 text-teal-400" };
    case "seo":
      return { label: "SEO", classes: "bg-indigo-500/15 text-indigo-400" };
  }
}

function getAvatarColor(name: string): string {
  const colors = [
    "from-blue-500 to-indigo-600",
    "from-purple-500 to-pink-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-red-600",
    "from-cyan-500 to-blue-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function MetricCard({ metric }: { metric: MetricCard }) {
  const isPositive = metric.trend >= 0;

  return (
    <div
      className="rounded-xl p-5 transition-colors"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
        borderWidth: "1px",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-sm font-medium"
          style={{ color: "var(--color-secondary)" }}
        >
          {metric.label}
        </span>
        <span className="text-lg">{metric.icon}</span>
      </div>
      <div className="flex items-end justify-between">
        <span
          className="text-3xl font-bold tracking-tight"
          style={{ color: "var(--color-text)" }}
        >
          {metric.value}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
            isPositive ? "text-emerald-400" : "text-red-400"
          }`}
          style={{
            backgroundColor: isPositive ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
          }}
        >
          {isPositive ? "+" : ""}
          {metric.trend}%
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={isPositive ? "" : "rotate-180"}>
            <path d="M6 2v8M3 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>
      <p
        className="mt-2 text-xs"
        style={{ color: "var(--color-secondary)" }}
      >
        vs last week
      </p>
    </div>
  );
}

function ActivityChart() {
  const maxVal = Math.max(...ACTIVITY_CHART_DATA);
  const points = ACTIVITY_CHART_DATA.map((val, idx) => {
    const x = (idx / (ACTIVITY_CHART_DATA.length - 1)) * 100;
    const y = 100 - (val / maxVal) * 85 - 5;
    return `${x},${y}`;
  }).join(" ");

  const areaPoints = `0,95 ${points} 100,95`;

  // Bar data (weekly buckets)
  const barBuckets: number[] = [];
  for (let i = 0; i < ACTIVITY_CHART_DATA.length; i += 7) {
    const bucket = ACTIVITY_CHART_DATA.slice(i, i + 7);
    barBuckets.push(Math.round(bucket.reduce((a, b) => a + b, 0) / bucket.length));
  }

  return (
    <div
      className="rounded-xl p-5 transition-colors"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
        borderWidth: "1px",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--color-text)" }}
        >
          Activity Overview
        </h3>
        <div className="flex gap-2">
          <button
            className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
            style={{ backgroundColor: "var(--color-primary)", color: "#fff" }}
          >
            30 Days
          </button>
          <button
            className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80"
            style={{ backgroundColor: "var(--color-border)", color: "var(--color-secondary)" }}
          >
            7 Days
          </button>
          <button
            className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-80"
            style={{ backgroundColor: "var(--color-border)", color: "var(--color-secondary)" }}
          >
            90 Days
          </button>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative h-56 w-full">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          style={{ overflow: "visible" }}
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((yPos) => (
            <line
              key={yPos}
              x1="0"
              y1={yPos}
              x2="100"
              y2={yPos}
              stroke="var(--color-border)"
              strokeWidth="0.3"
              strokeDasharray="2,2"
            />
          ))}

          {/* Area fill */}
          <polygon
            points={areaPoints}
            fill="url(#chartGradient)"
            opacity="0.3"
          />

          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="0.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data point dots */}
          {ACTIVITY_CHART_DATA.map((val, idx) => {
            if (idx % 5 !== 0 && idx !== ACTIVITY_CHART_DATA.length - 1) return null;
            const x = (idx / (ACTIVITY_CHART_DATA.length - 1)) * 100;
            const y = 100 - (val / maxVal) * 85 - 5;
            return (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r="1.2"
                fill="var(--color-primary)"
                stroke="var(--color-surface)"
                strokeWidth="0.4"
              />
            );
          })}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
        </svg>

        {/* X-axis labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
          {["Day 1", "", "", "", "", "", "Day 15", "", "", "", "", "", "Day 30"].map(
            (label, i) => (
              <span
                key={i}
                className="text-[9px]"
                style={{ color: "var(--color-secondary)" }}
              >
                {label}
              </span>
            )
          )}
        </div>
      </div>

      {/* Summary stats below chart */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="text-center">
          <p
            className="text-lg font-bold"
            style={{ color: "var(--color-text)" }}
          >
            {ACTIVITY_CHART_DATA.reduce((a, b) => a + b, 0)}
          </p>
          <p
            className="text-[10px]"
            style={{ color: "var(--color-secondary)" }}
          >
            Total Actions
          </p>
        </div>
        <div className="text-center">
          <p
            className="text-lg font-bold"
            style={{ color: "var(--color-text)" }}
          >
            {Math.round(ACTIVITY_CHART_DATA.reduce((a, b) => a + b, 0) / 30)}
          </p>
          <p
            className="text-[10px]"
            style={{ color: "var(--color-secondary)" }}
          >
            Daily Avg
          </p>
        </div>
        <div className="text-center">
          <p
            className="text-lg font-bold text-emerald-400"
          >
            +28%
          </p>
          <p
            className="text-[10px]"
            style={{ color: "var(--color-secondary)" }}
          >
            vs Prev Month
          </p>
        </div>
      </div>
    </div>
  );
}

function RecentActivityFeed() {
  return (
    <div
      className="rounded-xl p-5 transition-colors"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
        borderWidth: "1px",
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--color-text)" }}
        >
          Recent Activity
        </h3>
        <button
          className="text-xs font-medium transition-colors hover:opacity-80"
          style={{ color: "var(--color-primary)" }}
        >
          View all &rarr;
        </button>
      </div>

      <div className="space-y-1">
        {RECENT_ACTIVITY.map((item) => {
          const iconInfo = getActivityIcon(item.type);

          return (
            <div
              key={item.id}
              className="group flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors"
              style={{ ":hover": { backgroundColor: "var(--color-border)" } as React.CSSProperties }}
            >
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${iconInfo.bgClass}`}
              >
                {iconInfo.symbol}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className="text-sm leading-snug"
                  style={{ color: "var(--color-text)" }}
                >
                  {item.description}{" "}
                  <span
                    className="font-semibold"
                    style={{ color: "var(--color-primary)" }}
                  >
                    {item.target}
                  </span>
                </p>
                <p
                  className="mt-0.5 text-xs"
                  style={{ color: "var(--color-secondary)" }}
                >
                  {item.ago}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: ProjectCard }) {
  const badge = getStatusBadge(project.status);
  const avatarColor = getAvatarColor(project.saas);

  return (
    <div
      className="group cursor-pointer rounded-xl p-4 transition-all"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
        borderWidth: "1px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--color-primary)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--color-border)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${avatarColor} text-sm font-bold text-white`}
        >
          {project.avatar}
        </div>
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.classes}`}
        >
          {badge.label}
        </span>
      </div>

      <h4
        className="mb-1 text-sm font-semibold leading-tight"
        style={{ color: "var(--color-text)" }}
      >
        {project.name}
      </h4>
      <p
        className="mb-3 text-xs"
        style={{ color: "var(--color-secondary)" }}
      >
        {project.saas}
      </p>

      <div
        className="flex items-center justify-between pt-3"
        style={{ borderTopColor: "var(--color-border)", borderTopWidth: "1px" }}
      >
        <span
          className="text-xs"
          style={{ color: "var(--color-secondary)" }}
        >
          {project.componentCount} components
        </span>
        <span
          className="text-xs"
          style={{ color: "var(--color-secondary)" }}
        >
          {project.lastModified}
        </span>
      </div>
    </div>
  );
}

function AISuggestionsPanel() {
  return (
    <div
      className="rounded-xl p-5 transition-colors"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
        borderWidth: "1px",
      }}
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="text-base">&#x1F9E0;</span>
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--color-text)" }}
        >
          AI Suggestions
        </h3>
        <span
          className="ml-auto rounded-full bg-gradient-to-r from-violet-500/20 to-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-300"
        >
          Powered by Claude
        </span>
      </div>

      <div className="space-y-3">
        {AI_SUGGESTIONS.map((suggestion) => {
          const catBadge = getCategoryBadge(suggestion.category);
          const confidenceColor =
            suggestion.confidence >= 90
              ? "text-emerald-400"
              : suggestion.confidence >= 80
              ? "text-sky-400"
              : "text-amber-400";

          return (
            <div
              key={suggestion.id}
              className="rounded-lg p-3 transition-colors"
              style={{ backgroundColor: "var(--color-bg)" }}
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${catBadge.classes}`}
                >
                  {catBadge.label}
                </span>
                <span className={`ml-auto text-xs font-bold ${confidenceColor}`}>
                  {suggestion.confidence}% match
                </span>
              </div>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "var(--color-text)" }}
              >
                {suggestion.text}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  className="rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors"
                  style={{
                    backgroundColor: "var(--color-primary)",
                    color: "#fff",
                  }}
                >
                  Apply Fix
                </button>
                <button
                  className="rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors"
                  style={{
                    backgroundColor: "var(--color-border)",
                    color: "var(--color-secondary)",
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamActivity() {
  const onlineCount = TEAM_MEMBERS.filter((m) => m.online).length;

  return (
    <div
      className="rounded-xl p-5 transition-colors"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
        borderWidth: "1px",
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--color-text)" }}
        >
          Team Activity
        </h3>
        <span
          className="text-xs font-medium"
          style={{ color: "var(--color-secondary)" }}
        >
          {onlineCount}/{TEAM_MEMBERS.length} online
        </span>
      </div>

      <div className="space-y-3">
        {TEAM_MEMBERS.map((member) => {
          const avatarColor = getAvatarColor(member.name);

          return (
            <div key={member.id} className="flex items-center gap-3">
              <div className="relative">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${avatarColor} text-xs font-bold text-white`}
                >
                  {member.avatar}
                </div>
                <span
                  className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 ${
                    member.online
                      ? "border-emerald-500 bg-emerald-400"
                      : "border-zinc-600 bg-zinc-500"
                  }`}
                  style={{ borderColor: "var(--color-surface)" }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="text-sm font-medium leading-tight"
                  style={{ color: "var(--color-text)" }}
                >
                  {member.name}
                </p>
                <p
                  className="text-[10px]"
                  style={{ color: "var(--color-secondary)" }}
                >
                  {member.role}
                </p>
              </div>
              <span
                className="text-xs font-semibold tabular-nums"
                style={{ color: "var(--color-primary)" }}
              >
                +{member.contributions}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UsageMeter() {
  const percentage = Math.round((USAGE_CURRENT / USAGE_LIMIT) * 100);
  const isWarning = percentage > 80;
  const barColor = isWarning ? "var(--color-accent)" : "var(--color-primary)";

  return (
    <div
      className="rounded-xl p-5 transition-colors"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
        borderWidth: "1px",
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--color-text)" }}
        >
          Plan Usage
        </h3>
        <span
          className="rounded-full bg-gradient-to-r from-violet-500/15 to-fuchsia-500/15 px-2.5 py-0.5 text-[10px] font-bold text-violet-300"
        >
          Pro Plan
        </span>
      </div>

      <div className="mb-2 flex items-baseline gap-1">
        <span
          className="text-2xl font-bold tabular-nums"
          style={{ color: "var(--color-text)" }}
        >
          {USAGE_CURRENT.toLocaleString()}
        </span>
        <span
          className="text-sm"
          style={{ color: "var(--color-secondary)" }}
        >
          / {USAGE_LIMIT.toLocaleString()} API calls
        </span>
      </div>

      <p
        className="mb-3 text-xs"
        style={{ color: "var(--color-secondary)" }}
      >
        This month &middot; Resets in 20 days
      </p>

      {/* Progress bar */}
      <div
        className="mb-2 h-2.5 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--color-border)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: barColor,
          }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-semibold ${isWarning ? "text-amber-400" : "text-emerald-400"}`}
        >
          {percentage}% used
        </span>
        {isWarning && (
          <span className="text-xs font-medium text-amber-400">
            &#9888; Approaching limit
          </span>
        )}
        {!isWarning && (
          <span
            className="text-xs"
            style={{ color: "var(--color-secondary)" }}
          >
            {USAGE_LIMIT - USAGE_CURRENT} calls remaining
          </span>
        )}
      </div>

      {/* Mini breakdown */}
      <div
        className="mt-4 grid grid-cols-3 gap-2 rounded-lg p-3"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        <div className="text-center">
          <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>412</p>
          <p className="text-[9px]" style={{ color: "var(--color-secondary)" }}>Generations</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>298</p>
          <p className="text-[9px]" style={{ color: "var(--color-secondary)" }}>Modifications</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>137</p>
          <p className="text-[9px]" style={{ color: "var(--color-secondary)" }}>Analyses</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function DashboardV2Page() {
  const greeting = useMemo(() => getGreeting(), []);

  const quickActions = [
    { label: "New Project", icon: "\u2795", primary: true },
    { label: "Browse Templates", icon: "\u{1F4D6}", primary: false },
    { label: "View Docs", icon: "\u{1F4DA}", primary: false },
    { label: "Settings", icon: "\u2699\uFE0F", primary: false },
  ];

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
    >
      {/* ---- Welcome Header ---- */}
      <header className="border-b px-4 py-6 sm:px-6 lg:px-8" style={{ borderColor: "var(--color-border)" }}>
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: "var(--color-text)" }}>
                {greeting}, Alex
              </h1>
              <p className="mt-1 text-sm" style={{ color: "var(--color-secondary)" }}>
                Here&apos;s what&apos;s happening with your projects today.
              </p>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                    action.primary
                      ? "shadow-lg shadow-primary/20"
                      : ""
                  }`}
                  style={
                    action.primary
                      ? { backgroundColor: "var(--color-primary)", color: "#fff" }
                      : { backgroundColor: "var(--color-surface)", color: "var(--color-text)", border: "1px solid var(--color-border)" }
                  }
                >
                  <span>{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ---- Main Content ---- */}
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Stats Row */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {METRICS.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </section>

        {/* Chart + Activity Feed Row */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="xl:col-span-3">
            <ActivityChart />
          </div>
          <div className="xl:col-span-2">
            <RecentActivityFeed />
          </div>
        </section>

        {/* Projects Grid */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2
              className="text-lg font-bold"
              style={{ color: "var(--color-text)" }}
            >
              Quick Projects
            </h2>
            <button
              className="text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--color-primary)" }}
            >
              View all projects &rarr;
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PROJECTS.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>

        {/* AI Suggestions + Team + Usage Row */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AISuggestionsPanel />
          </div>
          <div className="space-y-6">
            <TeamActivity />
            <UsageMeter />
          </div>
        </section>
      </main>

      {/* ---- Footer ---- */}
      <footer
        className="border-t mt-8 px-4 py-6 text-center sm:px-6"
        style={{ borderColor: "var(--color-border)" }}
      >
        <p className="text-xs" style={{ color: "var(--color-secondary)" }}>
          UI-as-Code Dashboard &middot; Last synced just now &middot; v2.4.1
        </p>
      </footer>
    </div>
  );
}
