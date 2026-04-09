import { NextRequest, NextResponse } from "next/server";
import type { CreateFrictionInput, ApiResponse, Friction } from "@/types";

// In-memory store for MVP; will be replaced with Supabase
const frictions: Friction[] = [];

export async function POST(req: NextRequest) {
  const body: CreateFrictionInput = await req.json();

  const friction: Friction = {
    id: crypto.randomUUID(),
    user_id: "anonymous", // TODO: get from auth
    saas_name: body.saas_name,
    component_name: body.component_name,
    description: body.description,
    screenshot_url: body.screenshot_url,
    created_at: new Date().toISOString(),
  };

  frictions.push(friction);

  const response: ApiResponse<Friction> = { data: friction };
  return NextResponse.json(response, { status: 201 });
}

export async function GET() {
  const response: ApiResponse<Friction[]> = { data: frictions };
  return NextResponse.json(response);
}
