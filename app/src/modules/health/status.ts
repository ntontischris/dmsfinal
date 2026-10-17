import type { Tone } from "@/components/ui/badge";

import type { HealthJob, HealthView } from "./schemas";

// Η αντιστοίχιση της κατάστασης σε ό,τι δείχνει η P2 (#215), ως καθαρές συναρτήσεις. Το «θέλουν προσοχή» το μετρά η βάση.

export interface Verdict {
  label: string;
  tone: Tone | undefined;
}

const ATTENTION: Verdict = { label: "θέλει προσοχή", tone: "attention" };
const FINE: Verdict = { label: "εντάξει", tone: "ok" };

export const bannerTitle = (attention: number): string =>
  attention === 0
    ? "Όλα δουλεύουν"
    : attention === 1
      ? "1 θέλει προσοχή"
      : `${attention} θέλουν προσοχή`;

export function jobVerdict(job: HealthJob): Verdict {
  if (job.state === "late") return { label: "άργησε", tone: "attention" };
  if (job.state === "never")
    return { label: "δεν έχει τρέξει ακόμα", tone: undefined };
  if (job.lastErrorAt) return { label: "σφάλμα στο τελευταίο", tone: "strong" };
  return { label: "έτρεξε", tone: "ok" };
}

export const sectionVerdict = (isRed: boolean): Verdict =>
  isRed ? ATTENTION : FINE;

export const jobsAreRed = (view: HealthView): boolean =>
  view.jobs.some((job) => job.state === "late");

export const eventsAreRed = (view: HealthView): boolean =>
  view.events.stuckTotal > 0 || view.events.waiting > 0;

// Το Google: κόκκινο με τον κανόνα της βάσης (30′, Γεγονός 52)· ο σύντομος λόγος έρχεται από τη βάση.
export function googleVerdict(view: HealthView): Verdict & { reason: string } {
  const { google } = view;
  const reason = google.reason ?? "";
  if (google.stopped) return { ...ATTENTION, reason };
  if (!google.connected)
    return { label: "δεν έχει στηθεί", tone: undefined, reason: "" };
  if (reason) return { label: "προσοχή", tone: "strong", reason };
  return { ...FINE, reason: "" };
}

// Το μερίδιο της δαπάνης στο πλαφόν, 0–1. Πλαφόν 0 = το AI είναι κλειστό.
export const aiShare = (ai: HealthView["ai"]): number =>
  ai.capMicros > 0 ? Math.min(1, ai.spentMicros / ai.capMicros) : 0;

// Καινούργιο σύστημα: τίποτα δεν έχει τρέξει και τίποτα δεν απέτυχε.
export const isFreshSystem = (view: HealthView): boolean =>
  view.jobs.every((job) => job.state === "never") &&
  view.sends.total === 0 &&
  view.events.stuckTotal === 0;
