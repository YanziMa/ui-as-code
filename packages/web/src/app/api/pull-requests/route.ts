import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, PullRequest } from "@/types";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // First create friction record if not exists
  let frictionId = body.friction_id;
  if (!frictionId) {
    const { data: newFriction } = await supabase
      .from("frictions")
      .insert({
        user_id: null,
        saas_name: body.saas_name || "unknown",
        component_name: body.component_name || "unknown",
        description: body.description,
      })
      .select("id")
      .single();
    frictionId = newFriction?.id;
  }

  // Then create PR
  const { data: pr, error } = await supabase
    .from("pull_requests")
    .insert({
      diff_id: frictionId,
      user_id: null, // TODO: get from auth session
      description: body.description,
      affected_users: 1,
      status: "open",
      votes_for: 0,
      votes_against: 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: `Failed to create PR: ${error.message}` },
      { status: 500 }
    );
  }

  const response: ApiResponse<PullRequest> = { data: pr };
  return NextResponse.json(response, { status: 201 });
}

export async function GET() {
  const { data: prs, error } = await supabase
    .from("pull_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: `Failed to fetch PRs: ${error.message}` },
      { status: 500 }
    );
  }

  const response: ApiResponse<PullRequest[]> = { data: prs || [] };
  return NextResponse.json(response);
}
