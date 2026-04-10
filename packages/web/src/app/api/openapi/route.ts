import { NextResponse } from "next/server";
import spec from "../../../../openapi.json";

export async function GET() {
  return NextResponse.json(spec, {
    headers: {
      "Content-Type": "application/vnd.oai.openapi+json;version=3.1",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
