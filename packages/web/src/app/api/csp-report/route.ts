/**
 * CSP Violation Report endpoint.
 * POST /api/csp-report
 *
 * Receives Content-Security-Policy violation reports from browsers.
 * In production, these would be logged and alerted on.
 */

import { NextRequest, NextResponse } from "next/server";

interface CSPReport {
  "csp-report"?: {
    "document-uri"?: string;
    "referrer"?: string;
    "blocked-uri"?: string;
    "violated-directive"?: string;
    "original-policy"?: string;
    "source-file"?: string;
    "line-number"?: number;
    "column-number"?: number;
    "status-code"?: number;
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: CSPReport = await req.json().catch(() => ({}));

    // Log the violation (in production, send to logging service)
    const report = body["csp-report"];
    console.warn(
      "[CSP Violation]",
      report?.["violated-directive"],
      "blocked:",
      report?.["blocked-uri"],
      "from:",
      report?.["document-uri"],
    );

    // Return success even if we don't process further
    // This prevents browsers from retrying the report
    return NextResponse.json(
      { status: "reported", timestamp: new Date().toISOString() },
      { status: 204 },
    );
  } catch {
    // Always respond successfully to CSP reports
    return new NextResponse(null, { status: 204 });
  }
}
