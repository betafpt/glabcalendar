"use client";

import { useEffect } from "react";

export function GoogleCalendarAutoPullTrigger({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    void fetch("/api/integrations/google-calendar/auto-pull", {
      method: "POST",
      credentials: "same-origin",
      signal: controller.signal,
    }).catch(() => undefined);

    return () => controller.abort();
  }, [enabled]);

  return null;
}
