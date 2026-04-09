import { NextRequest, NextResponse } from "next/server";
import type { CreateFrictionInput, ApiResponse, Friction } from "@/types";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body: CreateFrictionInput = await req.json();

  const { data: friction, error } = await supabase
    .from("frictions")
    .insert({
      user_id: null, // TODO: get from auth session
      saas_name: body.saas_name,
      component_name: body.component_name,
      description: body.description,
      screenshot_url: body.screenshot_url || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: `Failed to create friction: ${error.message}` },
      { status: 500 }
    );
  }

  const response: ApiResponse<Friction> = { data: friction };
  return NextResponse.json(response, { status: 201 });
}

export async function GET() {
  const { data: frictions, error } = await supabase
    .from("frictions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: `Failed to fetch frictions: ${error.message}` },
      { status: 500 }
    );
  }

  const response: ApiResponse<Friction[]> = { data: frictions || [] };
  return NextResponse.json(response);
}
