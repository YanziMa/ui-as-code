import { NextResponse } from "next/server";
import { withHandler, apiSuccess } from "@/lib/api-middleware";
import { supabase } from "@/lib/supabase";

/**
 * Public stats endpoint for landing page counters and dashboard overview.
 * Returns aggregated numbers (no sensitive data).
 */
export async function GET() {
  return withHandler(undefined, async () => {
    const [fricRes, prRes] = await Promise.all([
      supabase.from("frictions").select("id, created_at, saas_name"),
      supabase.from("pull_requests").select("id, status, votes_for, votes_against, created_at"),
    ]);

    const frictions = fricRes.data || [];
    const prs = prRes.data || [];

    // Compute aggregations
    const totalFrictions = frictions.length;
    const totalPRs = prs.length;
    const mergedPRs = prs.filter((pr) => pr.status === "merged").length;
    const openPRs = prs.filter((pr) => pr.status === "open").length;
    const totalVotesFor = prs.reduce((sum, pr) => sum + (pr.votes_for || 0), 0);
    const totalVotesAgainst = prs.reduce((sum, pr) => sum + (pr.votes_against || 0), 0);
    const uniqueSaaS = [...new Set(frictions.map((f) => f.saas_name).filter(Boolean))].length;

    // Frictions in the last 7 days
    const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
    const recentFrictions = frictions.filter((f) => f.created_at >= weekAgo).length;

    // PRs in the last 7 days
    const recentPRs = prs.filter((p) => p.created_at >= weekAgo).length;

    return apiSuccess(
      {
        frictions: {
          total: totalFrictions,
          recent_7d: recentFrictions,
        },
        pull_requests: {
          total: totalPRs,
          open: openPRs,
          merged: mergedPRs,
          recent_7d: recentPRs,
        },
        votes: {
          for: totalVotesFor,
          against: totalVotesAgainst,
          total: totalVotesFor + totalVotesAgainst,
        },
        saas_sites: uniqueSaaS,
      },
      200,
      "public, max-age=60, stale-while-revalidate=120"
    );
  });
}
