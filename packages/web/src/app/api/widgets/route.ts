/**
 * Widget embed code generator API.
 * GET /api/widgets?type=badge|feed|status|button&config=...
 */

import { NextResponse } from "next/server";

const WIDGET_TEMPLATES: Record<string, (params: Record<string, string>) => string> = {
  badge: (p) => `<div data-uac-widget="badge" data-user="${p.user || "me"}" data-theme="${p.theme || "light"}" data-size="${p.size || "md"}" data-show-avatar="${p.avatar !== "false"}" data-show-stats="${p.stats !== "false"}"></div>`,
  feed: (p) => `<div data-uac-widget="feed" data-max-items="${p.maxItems || "10"}" data-show-time="${p.time !== "false"}" data-compact="${p.compact === "true"}"></div>`,
  status: (p) => `<div data-uac-widget="status" data-saas="${p.saas || "hubspot"}" data-style="${p.style || "badge"}"></div>`,
  button: (p) => `<button data-uac-widget="submit" data-style="${p.style || "primary"}" data-size="${p.size || "md"}" data-text="${encodeURIComponent(p.text || "Report UI Issue")}" data-saas="${p.saas || ""}">${p.text || "Report UI Issue"}</button>`,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "badge";

  if (!WIDGET_TEMPLATES[type]) {
    return NextResponse.json(
      { error: `Unknown widget type: ${type}. Available: ${Object.keys(WIDGET_TEMPLATES).join(", ")}` },
      { status: 400 },
    );
  }

  // Collect all config params
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (key !== "type") params[key] = value;
  });

  const html = WIDGET_TEMPLATES[type](params);
  const fullCode = `<!-- UI-as-Code ${type} Widget -->
<script src="https://ui-as-code-web.vercel.app/embed.js" async></script>
${html}`;

  return NextResponse.json({
    type,
    html,
    fullCode,
    scriptUrl: "https://ui-as-code-web.vercel.app/embed.js",
  });
}
