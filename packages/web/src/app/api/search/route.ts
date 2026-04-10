import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validateBody } from "@/lib/validation";
import { withHandler, apiError, apiSuccess } from "@/lib/api-middleware";
import { supabase } from "@/lib/supabase";

const SearchSchema = z.object({
  q: z.string().min(1).max(200),
  type: z.enum(["frictions", "prs", "all"]).default("all"),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export async function POST(req: NextRequest) {
  return withHandler(req, async () => {
    const rawBody = await req.json();
    const validation = validateBody(rawBody, SearchSchema);
    if (!validation.success) return validation.error;

    const { q, type, limit } = validation.data;
    const query = `%${q.toLowerCase()}%`;

    const results: Record<string, unknown[]> = {};

    if (type === "frictions" || type === "all") {
      const { data } = await supabase
        .from("frictions")
        .select("*")
        .or(`saas_name.ilike.${query},component_name.ilike.${query},description.ilike.${query}`)
        .limit(limit)
        .order("created_at", { ascending: false });
      results.frictions = data || [];
    }

    if (type === "prs" || type === "all") {
      const { data } = await supabase
        .from("pull_requests")
        .select("*")
        .or(`description.ilike.${query}`)
        .limit(limit)
        .order("created_at", { ascending: false });
      results.prs = data || [];
    }

    return apiSuccess({
      query: q,
      type,
      total: Object.values(results).reduce((sum, arr) => sum + arr.length, 0),
      results,
    });
  }, { rateLimit: { windowMs: 60_000, maxRequests: 30 } });
}
