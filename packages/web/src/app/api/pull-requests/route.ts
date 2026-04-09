import { NextRequest, NextResponse } from "next/server";
import { CreatePRSchema, validateBody } from "@/lib/validation";
import { withHandler, apiError, apiSuccess, getAuthUser } from "@/lib/api-middleware";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  return withHandler(req, async () => {
    const rawBody = await req.json();
    const validation = validateBody(rawBody, CreatePRSchema);
    if (!validation.success) return validation.error;

    const body = validation.data;
    const user = await getAuthUser(req);

    // Auto-create friction if no friction_id provided
    let frictionId = body.friction_id;
    if (!frictionId) {
      const { data: newFriction } = await supabase
        .from("frictions")
        .insert({
          user_id: user?.id || null,
          saas_name: (body.saas_name || "unknown").slice(0, 100),
          component_name: (body.component_name || "unknown").slice(0, 200),
          description: body.description,
        })
        .select("id")
        .single();

      if (!newFriction) {
        return apiError("Failed to create associated friction record", 500);
      }
      frictionId = newFriction.id;
    }

    // Create PR
    const { data: pr, error } = await supabase
      .from("pull_requests")
      .insert({
        diff_id: frictionId,
        user_id: user?.id || null,
        description: body.description,
        affected_users: 1,
        status: "open",
        votes_for: 0,
        votes_against: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("[PR POST]", error);
      return apiError(`Failed to create PR`, 500);
    }

    return apiSuccess(pr, 201);
  });
}

export async function GET() {
  return withHandler(undefined, async () => {
    const { data: prs, error } = await supabase
      .from("pull_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[PR GET]", error);
      return apiError("Failed to fetch PRs", 500);
    }

    return apiSuccess(prs || []);
  });
}
