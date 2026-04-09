import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const direction = body.direction; // "for" | "against"

  if (direction !== "for" && direction !== "against") {
    return NextResponse.json(
      { error: 'direction must be "for" or "against"' },
      { status: 400 }
    );
  }

  const column = direction === "for" ? "votes_for" : "votes_against";

  const { data: pr, error } = await supabase
    .from("pull_requests")
    .update({ [column]: supabase.raw(`${column} + 1`) })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: `Vote failed: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ data: pr });
}
