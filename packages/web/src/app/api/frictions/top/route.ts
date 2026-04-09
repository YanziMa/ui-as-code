import { NextResponse } from "next/server";
import type { ApiResponse, Friction } from "@ui-as-code/shared";

// Returns top frictions grouped by component_name, sorted by frequency
export async function GET() {
  // TODO: replace with Supabase query
  const response: ApiResponse<{ component_name: string; count: number; sample: Friction }[]> = {
    data: [],
  };
  return NextResponse.json(response);
}
