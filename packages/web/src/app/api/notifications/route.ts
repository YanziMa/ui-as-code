import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  withHandler,
  apiError,
  apiSuccess,
  checkRateLimit,
  getRateLimitHeaders,
} from "@/lib/api-middleware";

// ========== Types ==========

type NotificationType = "pr_created" | "pr_merged" | "friction_reported";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  link: string;
  read: boolean;
}

// ========== Rate Limit Config ==========

const NOTIFICATIONS_RATE_LIMIT = {
  windowMs: 60_000, // 1 minute
  maxRequests: 60,
};

// ========== GET Handler ==========

export async function GET(req: NextRequest) {
  return withHandler(
    req,
    async () => {
      // Fetch recent PRs and frictions in parallel
      const [prsRes, frictionsRes] = await Promise.allSettled([
        fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/pull-requests`, {
          headers: req.headers,
        }),
        fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/frictions`, {
          headers: req.headers,
        }),
      ]);

      // Parse PRs
      let prs: Record<string, unknown>[] = [];
      if (prsRes.status === "fulfilled") {
        try {
          const json = await prsRes.value.json();
          prs = json.data ?? [];
          // Take only the most recent 10
          prs = prs.slice(0, 10);
        } catch {
          // Ignore parse errors for individual sources
        }
      }

      // Parse Frictions
      let frictions: Record<string, unknown>[] = [];
      if (frictionsRes.status === "fulfilled") {
        try {
          const json = await frictionsRes.value.json();
          frictions = json.data ?? [];
          // Take only the most recent 10
          frictions = frictions.slice(0, 10);
        } catch {
          // Ignore parse errors for individual sources
        }
      }

      // Build notification list
      const notifications: Notification[] = [];

      // Map PRs to notifications
      for (const pr of prs) {
        const status = String(pr.status ?? "open");
        const type: NotificationType =
          status === "merged" ? "pr_merged" : "pr_created";
        const id = String(pr.id ?? "");
        const title =
          type === "pr_merged"
            ? `PR Merged: ${String(pr.description ?? "Untitled").slice(0, 80)}`
            : `New PR: ${String(pr.description ?? "Untitled").slice(0, 80)}`;
        const message =
          type === "pr_merged"
            ? `A pull request was merged.`
            : `A new pull request has been opened.`;

        notifications.push({
          id: `pr-${id}`,
          type,
          title,
          message,
          timestamp: String(pr.created_at ?? pr.updated_at ?? new Date().toISOString()),
          link: `/pr/${id}`,
          read: false,
        });
      }

      // Map Frictions to notifications
      for (const friction of frictions) {
        const id = String(friction.id ?? "");
        const saasName = String(friction.saas_name ?? "Unknown SaaS");
        const componentName = String(friction.component_name ?? "Unknown Component");

        notifications.push({
          id: `friction-${id}`,
          type: "friction_reported",
          title: `Friction Reported: ${componentName} (${saasName})`,
          message: `A new UX friction was reported on "${componentName}" in ${saasName}.`,
          timestamp: String(friction.created_at ?? new Date().toISOString()),
          link: `/frictions/${id}`,
          read: false,
        });
      }

      // Sort by timestamp descending (most recent first)
      notifications.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeB - timeA;
      });

      return apiSuccess(
        notifications,
        200,
        "public, s-maxage=30, stale-while-revalidate=60"
      );
    },
    { rateLimit: NOTIFICATIONS_RATE_LIMIT }
  );
}
