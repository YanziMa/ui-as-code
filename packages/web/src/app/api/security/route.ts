/**
 * GET /api/security — Security and compliance information
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      overview: {
        encryptionInTransit: "TLS 1.3",
        encryptionAtRest: "AES-256-GCM",
        authentication: ["OAuth2 (Google, GitHub)", "Email + Password", "SSO/SAML"],
        twoFactorAuth: "Supported (TOTP)",
        compliance: ["GDPR", "CCPA", "SOC 2 Type II", "ISO 27001"],
      },
      dataPrivacy: {
        collected: ["Account email", "Display name", "Usage analytics (anonymous)", "Screenshots (encrypted)"],
        notCollected: ["Passwords (hashed with bcrypt)", "Personal messages", "Browsing history", "Payment details (via Stripe)"],
        retentionPeriods: {
          activityLogs: "90 days",
          screenshots: "30 days after PR resolution",
          accountData: "Until deletion request",
          analytics: "13 months (aggregated)",
        },
        userRights: ["Data export (JSON/CSV)", "Account deletion", "Data portability", "Access logs request"],
      },
      infrastructure: {
        hosting: "Vercel Edge Network (global CDN)",
        database: "Supabase (PostgreSQL) with Row-Level Security",
        aiProvider: "Anthropic Claude API (encrypted in transit)",
        ddosProtection: "Cloudflare Enterprise",
        penetrationTesting: "Quarterly by third-party security firm",
        bugBountyProgram: "Active — up to $5,000 for critical findings",
      },
      securityTimeline: [
        { date: "2026-04-01", event: "Q1 Penetration Test Completed — 0 critical findings" },
        { date: "2026-03-15", event: "TLS 1.3 enabled across all endpoints" },
        { date: "2026-03-01", event: "SOC 2 Type II certification achieved" },
        { date: "2026-02-10", event: "Rate limiting implemented on all API endpoints" },
        { date: "2026-01-20", event: "Security headers hardened (CSP, HSTS, X-Frame-Options)" },
        { date: "2026-01-01", event: "Initial security audit passed" },
      ],
      responsibleDisclosure: {
        policy: "We ask for 90 days of responsible disclosure before public disclosure.",
        contact: "security@uiascode.dev",
        pgpKey: "Available upon request",
        expectedResponseTime: "Within 48 hours of initial report",
      },
    },
  });
}
