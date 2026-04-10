/**
 * Progress bar components.
 */

"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "success" | "warning" | "danger" | "indigo";
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

const VARIANT_STYLES = {
  default: "bg-gray-400 dark:bg-gray-500",
  success: "bg-green-500",
  warning: "bg-yellow-500",
  danger: "bg-red-500",
  indigo: "bg-indigo-500",
};

const SIZE_STYLES = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

export function ProgressBar({
  value,
  max = 100,
  size = "md",
  variant = "indigo",
  showLabel = false,
  animated = true,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{percentage.toFixed(0)}%</span>
        </div>
      )}
      <div
        className={cn(
          "w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden",
          SIZE_STYLES[size],
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            VARIANT_STYLES[variant],
            animated && "animate-pulse-slow",
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface StepProgressProps {
  steps: { label: string; description?: string }[];
  currentStep: number;
  className?: string;
}

export function StepProgress({ steps, currentStep, className }: StepProgressProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, i) => (
          <div key={i} className="flex flex-col items-center flex-1">
            {/* Circle */}
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors",
                i < currentStep
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : i === currentStep
                    ? "border-indigo-600 text-indigo-600"
                    : "border-gray-300 text-gray-400 dark:border-gray-600 dark:text-gray-500",
              )}
            >
              {i < currentStep ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            {/* Label */}
            <p
              className={cn(
                "mt-2 text-xs font-medium text-center hidden sm:block",
                i <= currentStep ? "text-gray-900 dark:text-white" : "text-gray-400",
              )}
            >
              {step.label}
            </p>
          </div>
        ))}
      </div>
      {/* Connector line */}
      <div className="absolute top-4 left-0 right-0 flex -mt-6 px-8">
        {steps.slice(0, -1).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 h-0.5 mx-2",
              i < currentStep ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-700",
            )}
          />
        ))}
      </div>
    </div>
  );
}
