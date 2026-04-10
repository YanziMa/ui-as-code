"use client";

import { useEffect, useState, useCallback } from "react";

export type NotificationType = "pr_created" | "pr_merged" | "friction_reported";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  link: string;
  read: boolean;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function formatNotificationAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "just now";

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 45) return "just now";
  if (seconds < 90) return "a minute ago";
  if (minutes < 45) return String(minutes) + " minutes ago";
  if (minutes < 90) return "an hour ago";
  if (hours < 22) return String(hours) + " hours ago";
  if (hours < 36) return "a day ago";
  if (days < 7) return String(days) + " days ago";

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export { formatNotificationAgo };

const POLL_INTERVAL_MS = 30_000;

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) {
        throw new Error("Failed to fetch notifications: " + res.status);
      }
      const json = await res.json();
      setNotifications(json.data ?? []);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error fetching notifications";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [fetchNotifications]);

  return { notifications, loading, error, refresh: fetchNotifications };
}
