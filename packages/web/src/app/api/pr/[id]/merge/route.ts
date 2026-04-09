import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Check if PR exists and is open
  const { data: pr } = await supabase
    .from("pull_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (!pr) {
    return NextResponse.json({ error: "PR not found" }, { status: 404 });
  }

  if (pr.status !== "open") {
    return NextResponse.json(
      { error: `PR is already ${pr.status}` },
      { status: 400 }
    );
  }

  // Merge: update status and increment affected_users (simulated)
  const { data: updated, error } = await supabase
    .from("pull_requests")
    .update({
      status: "merged",
      affected_users: pr.affected_users + Math.floor(pr.votes_for * 1.5),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: `Merge failed: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: updated, message: "PR merged successfully!" });
}
