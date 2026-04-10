/**
 * AI rules configuration endpoint.
 * GET /api/ai/rules — list AI generation rules
 */

import { NextResponse } from "next/server";

interface AIRule {
  id: string;
  category: "safety" | "quality" | "format" | "scope";
  name: string;
  description: string;
  enabled: boolean;
  severity: "error" | "warning" | "info";
}

const RULES: AIRule[] = [
  { id: "r1", category: "safety", name: "No malicious code", description: "Never generate code that could be used for XSS, injection, or other security attacks", enabled: true, severity: "error" },
  { id: "r2", category: "safety", name: "No data exfiltration", description: "Generated code must not send data to external servers", enabled: true, severity: "error" },
  { id: "r3", category: "safety", name: "No credential exposure", description: "Never include API keys, passwords, or secrets in generated diffs", enabled: true, severity: "error" },
  { id: "r4", category: "quality", name: "Maintain TypeScript types", description: "Preserve existing type annotations and interfaces", enabled: true, severity: "warning" },
  { id: "r5", category: "quality", name: "Preserve accessibility", description: "Do not remove ARIA labels, alt text, or semantic HTML", enabled: true, severity: "warning" },
  { id: "r6", category: "quality", name: "Keep component API stable", description: "Do not change prop names or required props unless explicitly requested", enabled: true, severity: "warning" },
  { id: "r7", category: "format", name: "Unified diff output only", description: "Output must be in unified diff format with proper headers", enabled: true, severity: "error" },
  { id: "r8", category: "format", name: "No import modifications", description: "Do not add, remove, or modify import statements", enabled: true, severity: "error" },
  { id: "r9", category: "format", name: "Single file changes", description: "Diffs should modify only the target component file", enabled: true, severity: "warning" },
  { id: "r10", category: "scope", name: "UI-only modifications", description: "Changes must be limited to visual/structural UI adjustments", enabled: true, severity: "warning" },
  { id: "r11", category: "scope", name: "No business logic changes", description: "Do not modify form validation, API calls, or state management logic", enabled: true, severity: "warning" },
  { id: "r12", category: "quality", name: "Responsive by default", description: "Generated CSS should work across viewport sizes", enabled: true, severity: "info" },
];

export async function GET() {
  return NextResponse.json({
    rules: RULES,
    categories: ["safety", "quality", "format", "scope"],
    totalRules: RULES.length,
    enabledRules: RULES.filter((r) => r.enabled).length,
  });
}
