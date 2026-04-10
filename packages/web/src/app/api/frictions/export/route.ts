import { NextResponse } from "next/server";
import { withHandler, apiError } from "@/lib/api-middleware";
import { supabase } from "@/lib/supabase";

export async function GET() {
  return withHandler(undefined, async () => {
    const { data: frictions, error } = await supabase
      .from("frictions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[FrictionExport]", error);
      return apiError("Failed to export frictions", 500);
    }

    const rows = frictions || [];
    if (rows.length === 0) {
      return new NextResponse("id,saas_name,component_name,description,screenshot_url,created_at\n", {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="frictions.csv"',
        },
      });
    }

    const headers = ["id", "saas_name", "component_name", "description", "screenshot_url", "created_at"];
    const csvRows = rows.map((r) =>
      headers.map((h) => {
        const val = r[h as keyof typeof r];
        // Escape CSV fields containing commas or quotes
        const str = val == null ? "" : String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(",")
    );

    const csv = [headers.join(","), ...csvRows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="frictions-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "private, max-age=0",
      },
    });
  });
}
