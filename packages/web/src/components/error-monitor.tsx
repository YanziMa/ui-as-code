"use client";

import { useEffect } from "react";
import { installGlobalHandlers } from "@/lib/error-logger";
import { observeWebVitals, reportMetric } from "@/lib/performance";

/**
 * Installs global error handlers and performance observers.
 * Place once in root layout inside <body>.
 */
export function ErrorMonitor() {
  useEffect(() => {
    // Install error handlers
    installGlobalHandlers();

    // Observe Core Web Vitals
    const cleanup = observeWebVitals((metric) => {
      reportMetric(metric.name, metric.value);
    });

    // Report initial page load timing
    if (performance.timing) {
      // Legacy PerformanceTiming API
      const timing = performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      if (loadTime > 0) reportMetric("pageLoad", loadTime);
    }

    return cleanup;
  }, []);

  return null;
}
