/**
 * Feature flags / toggles endpoint.
 * GET /api/features
 */

import { NextResponse } from "next/server";

interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rollout: number; // percentage 0-100
}

const FEATURES: FeatureFlag[] = [
  {
    key: "ai-diff-v2",
    name: "AI Diff Engine v2",
    description: "Improved diff generation with better context understanding",
    enabled: true,
    rollout: 100,
  },
  {
    key: "sandbox-preview",
    name: "Sandbox Preview",
    description: "Real-time iframe preview of generated diffs",
    enabled: true,
    rollout: 80,
  },
  {
    key: "team-workspaces",
    name: "Team Workspaces",
    description: "Shared workspaces for team collaboration",
    enabled: true,
    rollout: 100,
  },
  {
    key: "webhook-delivery",
    name: "Webhook Delivery",
    description: "Webhook notifications for PR events",
    enabled: true,
    rollout: 100,
  },
  {
    key: "analytics-dashboard",
    name: "Analytics Dashboard",
    description: "Advanced analytics with charts and insights",
    enabled: true,
    rollout: 100,
  },
  {
    key: "cli-tool",
    name: "CLI Tool",
    description: "Command-line interface for power users",
    enabled: true,
    rollout: 50,
  },
  {
    key: "oauth-providers",
    name: "OAuth Providers",
    description: "SSO via Google, GitHub, Microsoft",
    enabled: false,
    rollout: 0,
  },
  {
    key: "enterprise-ssaml",
    name: "Enterprise SAML",
    description: "SAML SSO for enterprise customers",
    enabled: false,
    rollout: 0,
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (key) {
    const feature = FEATURES.find((f) => f.key === key);
    if (!feature) {
      return NextResponse.json({ error: "Feature not found" }, { status: 404 });
    }
    return NextResponse.json(feature);
  }

  return NextResponse.json({
    features: FEATURES.map((f) => ({
      key: f.key,
      enabled: f.enabled,
      rollout: f.rollout,
    })),
  });
}
