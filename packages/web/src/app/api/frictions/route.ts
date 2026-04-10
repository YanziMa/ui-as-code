import { NextRequest, NextResponse } from "next/server";
import { CreateFrictionSchema, validateBody } from "@/lib/validation";
import { withHandler, apiError, apiSuccess, getAuthUser } from "@/lib/api-middleware";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  return withHandler(req, async () => {
    const rawBody = await req.json();
    const validation = validateBody(rawBody, CreateFrictionSchema);
    if (!validation.success) return validation.error;

    const body = validation.data;

    // Get authenticated user
    const user = await getAuthUser(req);

    const { data: friction, error } = await supabase
      .from("frictions")
      .insert({
        user_id: user?.id || null,
        saas_name: sanitizeInput(body.saas_name),
        component_name: sanitizeInput(body.component_name),
        description: body.description,
        screenshot_url: body.screenshot_url || null,
      })
      .select()
      .single();

    if (error) {
      console.error("[Friction POST]", error);
      return apiError(`Failed to create friction record`, 500);
    }

    return apiSuccess(friction, 201);
  });
}

export async function GET() {
  return withHandler(undefined, async () => {
    const { data: frictions, error } = await supabase
      .from("frictions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[Friction GET]", error);
      return apiError("Failed to fetch frictions", 500);
    }

    return apiSuccess(frictions || [], 200, "public, max-age=15, stale-while-revalidate=30");
  });
}

function sanitizeInput(str: string): string {
  return str.trim().slice(0, 200);
}
