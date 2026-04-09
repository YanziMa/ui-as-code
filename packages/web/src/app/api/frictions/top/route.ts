import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { supabase } from "@/lib/supabase";

// Returns top frictions grouped by component_name + saas_name, sorted by frequency
export async function GET() {
  const { data: raw, error } = await supabase
    .from("frictions")
    .select("saas_name, component_name, description, created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Group by (saas_name, component_name) and count
  const grouped = new Map<string, {
    count: number;
    saas_name: string;
    component_name: string;
    sample_description: string;
    latest_at: string;
  }>();

  for (const row of raw || []) {
    const key = `${row.saas_name}::${row.component_name}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.count++;
      if (row.created_at > existing.latest_at) {
        existing.latest_at = row.created_at;
        existing.sample_description = row.description;
      }
    } else {
      grouped.set(key, {
        count: 1,
        saas_name: row.saas_name,
        component_name: row.component_name,
        sample_description: row.description,
        latest_at: row.created_at,
      });
    }
  }

  const result = Array.from(grouped.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const response: ApiResponse<typeof result> = { data: result };
  return NextResponse.json(response);
}
