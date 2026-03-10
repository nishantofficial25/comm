"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).gtag) return;

    (window as any).gtag("event", "page_view", {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname]);

  // Track engagement time (fires when user leaves/switches tab)
  useEffect(() => {
    const startTime = Date.now();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        const engagementMs = Date.now() - startTime;

        (window as any).gtag?.("event", "user_engagement", {
          engagement_time_msec: engagementMs,
          page_path: pathname,
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [pathname]);

  return null;
}
