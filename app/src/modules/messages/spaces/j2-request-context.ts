import { listBookingOptions } from "@/modules/filming";

import {
  loadCandidates,
  type CandidatesByProduction,
} from "../deliverable-candidates";
import type { Thread } from "../view-schema";

// Ό,τι χρειάζεται το πλαίσιο κάθε ανοιχτού Αιτήματος της Συνομιλίας (βήμα 2 του «Απαντώ σε Πελάτες»).
export interface RequestContext {
  candidates: CandidatesByProduction;
  // Ο Χρήστης: «Υπεύθυνος = εγώ» στο νέο Παραδοτέο.
  viewerId: string | null;
  // Ο Πελάτης έχει Συμφωνία με ανοιχτή Περίοδο (ίδιος κανόνας με το «Στήνω γύρισμα»)· άγνωστο = ναι, χωρίς προειδοποίηση.
  hasAgreement: boolean;
}

const hasOpenFilmingRequest = (thread: Thread): boolean =>
  thread.messages.some(
    (message) =>
      message.request?.state === "open" &&
      message.request.kind === "filming" &&
      message.request.canHandle === true,
  );

export async function loadRequestContext(
  thread: Thread,
  viewerId: string | null,
): Promise<RequestContext> {
  const [candidates, options] = await Promise.all([
    loadCandidates(thread),
    hasOpenFilmingRequest(thread) ? listBookingOptions(thread.client.id) : null,
  ]);
  return {
    candidates,
    viewerId,
    hasAgreement: options?.ok ? options.data.length > 0 : true,
  };
}
