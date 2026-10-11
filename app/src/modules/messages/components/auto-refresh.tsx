"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Μ2: η Συνομιλία ανανεώνεται κάθε 20″ όσο η σελίδα είναι ανοιχτή και ορατή, και μόλις ξαναγίνει ορατή. Όχι Realtime.
export const REFRESH_INTERVAL_MS = 20_000;

export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(refreshIfVisible, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [router]);
  return null;
}
