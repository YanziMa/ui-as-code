"use client";

import { useEffect } from "react";
import { installGlobalHandlers } from "@/lib/error-logger";

/**
 * Installs global error handlers (window.onerror, unhandledrejection).
 * Place once in root layout inside <body>.
 */
export function ErrorMonitor() {
  useEffect(() => {
    installGlobalHandlers();
  }, []);

  return null;
}
