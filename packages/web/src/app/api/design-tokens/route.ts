/**
 * Design tokens / theme configuration API.
 * GET /api/design-tokens
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    colors: {
      primary: { 50: "#eef2ff", 100: "#e0e7ff", 200: "#c7d2fe", 300: "#a5b4fc", 400: "#818cf8", 500: "#6366f1", 600: "#4f46e5", 700: "#4338ca", 800: "#3730a3", 900: "#312e81", 950: "#1e1b4b" },
      success: { 50: "#f0fdf4", 500: "#22c55e", 700: "#15803d" },
      warning: { 50: "#fffbeb", 500: "#f59e0b", 700: "#b45309" },
      error: { 50: "#fef2f2", 500: "#ef4444", 700: "#b91c1c" },
      info: { 50: "#eff6ff", 500: "#3b82f6", 700: "#1d4ed8" },
    },
    typography: {
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"], mono: ["JetBrains Mono", "Fira Code", "monospace"] },
      fontSize: { xs: "0.75rem", sm: "0.875rem", base: "1rem", lg: "1.125rem", xl: "1.25rem", "2xl": "1.5rem", "3xl": "1.875rem", "4xl": "2.25rem" },
      fontWeight: { normal: "400", medium: "500", semibold: "600", bold: "700" },
      lineHeight: { tight: "1.25", normal: "1.5", relaxed: "1.75" },
    },
    spacing: { 0: "0px", 1: "4px", 2: "8px", 3: "12px", 4: "16px", 5: "20px", 6: "24px", 8: "32px", 10: "40px", 12: "48px", 16: "64px" },
    borderRadius: { none: "0px", sm: "4px", md: "8px", lg: "12px", xl: "16px", full: "9999px" },
    shadows: { sm: "0 1px 2px rgba(0,0,0,0.05)", md: "0 4px 6px -1px rgba(0,0,0,0.1)", lg: "0 10px 15px -3px rgba(0,0,0,0.1)", xl: "0 20px 25px -5px rgba(0,0,0,0.1)" },
    breakpoints: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px", "2xl": "1536px" },
    animation: { fast: "150ms", normal: "250ms", slow: "400ms" },
    zIndex: { dropdown: "10", sticky: "20", overlay: "40", modal: "50", tooltip: "60" },
  });
}
