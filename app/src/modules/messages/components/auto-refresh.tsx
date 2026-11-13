"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { createBrowserSupabase } from "@/lib/supabase/browser";

import { REFRESH_INTERVAL_MS, refreshModeOf } from "./refresh-mode";

interface AutoRefreshProps {
  // Το θέμα Realtime της Συνομιλίας (chatTopicOf). Η βάση αποφασίζει αν ο Χρήστης το ακούει (RLS).
  topic: string;
}

// e3: η Συνομιλία ανανεώνεται μόλις αλλάξει κάτι (Supabase Realtime, ιδιωτικό κανάλι) και μόλις η σελίδα ξαναγίνει ορατή.
// Το σήμα δεν έχει περιεχόμενο: η οθόνη ξαναδιαβάζει από τη βάση. Αν το κανάλι δεν ανοίξει, ανανέωση κάθε 20″.
export function AutoRefresh({ topic }: AutoRefreshProps) {
  const router = useRouter();
  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    let timer: ReturnType<typeof setInterval> | undefined;
    const setPolling = (isPolling: boolean) => {
      if (isPolling && timer === undefined)
        timer = setInterval(refreshIfVisible, REFRESH_INTERVAL_MS);
      if (!isPolling && timer !== undefined) {
        clearInterval(timer);
        timer = undefined;
      }
    };

    // Μέχρι να ανοίξει το κανάλι, η παλιά ανανέωση κρατά τη Συνομιλία φρέσκια.
    setPolling(true);
    const supabase = createBrowserSupabase();
    const channel = supabase
      ?.channel(topic, { config: { private: true } })
      .on("broadcast", { event: "changed" }, refreshIfVisible)
      .subscribe((status) => setPolling(refreshModeOf(status) === "poll"));
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      setPolling(false);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      if (supabase && channel) void supabase.removeChannel(channel);
    };
  }, [router, topic]);
  return null;
}
