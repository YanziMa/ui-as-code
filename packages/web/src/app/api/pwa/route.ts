/**
 * PWA manifest and service worker registration info.
 * GET /api/pwa
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    pwa: {
      enabled: true,
      name: "UI-as-Code",
      shortName: "UIaC",
      description: "Modify SaaS UIs through natural language",
      startUrl: "/",
      display: "standalone",
      themeColor: "#6366f1",
      backgroundColor: "#ffffff",
      icons: [
        { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    },
    serviceWorker: {
      registered: true,
      scope: "/",
      updateInterval: 86400, // check daily
      cacheStrategy: "cache-first-static, network-first-api",
      cachedRoutes: ["/", "/dashboard", "/frictions", "/prs", "/settings"],
      cachedAssets: ["/icon.svg", "/manifest.json"],
    },
    offlineSupport: {
      available: true,
      offlinePage: "/offline",
      fallbackComponents: ["navigation", "user-avatar"],
    },
  });
}
