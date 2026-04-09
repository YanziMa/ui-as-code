import { NextRequest, NextResponse } from "next/server";
import type { ApiResponse, PullRequest } from "@/types";

// In-memory store for MVP; will be replaced with Supabase
const pullRequests: PullRequest[] = [];

export async function POST(req: NextRequest) {
  const body = await req.json();

  const pr: PullRequest = {
    id: crypto.randomUUID(),
    diff_id: body.diff_id,
    user_id: "anonymous", // TODO: get from auth
    description: body.description,
    affected_users: 1,
    status: "open",
    votes_for: 0,
    votes_against: 0,
    created_at: new Date().toISOString(),
  };

  pullRequests.push(pr);

  const response: ApiResponse<PullRequest> = { data: pr };
  return NextResponse.json(response, { status: 201 });
}

export async function GET() {
  const response: ApiResponse<PullRequest[]> = { data: pullRequests };
  return NextResponse.json(response);
}
