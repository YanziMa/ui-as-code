import { NextRequest } from "next/server";
import { withHandler, apiError, apiSuccess } from "@/lib/api-middleware";
import { supabase } from "@/lib/supabase";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withHandler(_req, async () => {
    const { id } = await params;

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) {
      return apiError("Invalid PR ID format", 400);
    }

    // Check if PR exists and is open
    const { data: pr } = await supabase
      .from("pull_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (!pr) {
      return apiError("PR not found", 404);
    }

    if (pr.status !== "open") {
      return apiError(`PR is already ${pr.status}`, 409);
    }

    // Merge: update status and boost affected_users based on votes
    const boost = Math.floor(pr.votes_for * 1.5);
    const { data: updated, error } = await supabase
      .from("pull_requests")
      .update({
        status: "merged",
        affected_users: pr.affected_users + boost,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Merge POST]", error);
      return apiError("Failed to merge PR", 500);
    }

    return apiSuccess({
      ...updated,
      message: "PR merged successfully!",
    });
  });
}
