import { NextRequest } from "next/server";
import { VoteSchema, validateBody } from "@/lib/validation";
import { withHandler, apiError, apiSuccess, getAuthUser } from "@/lib/api-middleware";
import { supabase } from "@/lib/supabase";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withHandler(req, async () => {
    const { id } = await params;

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) {
      return apiError("Invalid PR ID format", 400);
    }

    const rawBody = await req.json();
    const validation = validateBody(rawBody, VoteSchema);
    if (!validation.success) return validation.error;

    const user = await getAuthUser(req);

    // Check PR exists and is open
    const { data: existingPr } = await supabase
      .from("pull_requests")
      .select("status, votes_for, votes_against")
      .eq("id", id)
      .single();

    if (!existingPr) {
      return apiError("PR not found", 404);
    }
    if (existingPr.status !== "open") {
      return apiError("Can only vote on open PRs", 409);
    }

    // Increment vote count
    const column =
      validation.data.vote_type === "for" ? "votes_for" : "votes_against";
    const newValue = (existingPr[column] || 0) + 1;

    const { data: pr, error } = await supabase
      .from("pull_requests")
      .update({ [column]: newValue })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Vote POST]", error);
      return apiError("Failed to record vote", 500);
    }

    return apiSuccess(pr);
  });
}
