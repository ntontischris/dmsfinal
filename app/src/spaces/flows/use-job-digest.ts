"use client";

import { useEffect, useState } from "react";

import type { JobDigest } from "./digests";
import { loadJobDigests } from "./flow-digests";

type Loaded = { job: string; digest: JobDigest | null };

// Ο κανόνας ουράς της δουλειάς στο βήμα 1 ενός οδηγού που γυρνά: πόσα μένουν και ποιο περιμένει πιο πολύ.
// undefined = διαβάζεται (ή δεν χρειάζεται)· null = δεν διαβάστηκε.
export function useJobDigest(
  job: string,
  isOn: boolean,
): JobDigest | null | undefined {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  useEffect(() => {
    if (!isOn) return;
    let isLive = true;
    loadJobDigests()
      .then((result) => {
        const digest = result.jobs.find((item) => item.job === job) ?? null;
        if (isLive) setLoaded({ job, digest });
      })
      .catch((error: unknown) => {
        console.error("flows.digest", error);
        if (isLive) setLoaded({ job, digest: null });
      });
    return () => {
      isLive = false;
    };
  }, [job, isOn]);
  return isOn && loaded?.job === job ? loaded.digest : undefined;
}
