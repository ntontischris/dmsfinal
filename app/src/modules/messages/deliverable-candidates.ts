import {
  getDeliverableCandidates,
  type DeliverableCandidates,
} from "@/modules/deliverables";

import type { Thread, ThreadMessage } from "./view-schema";

export type CandidatesByProduction = ReadonlyMap<
  string,
  DeliverableCandidates | null
>;

const needsDeliverableForm = (message: ThreadMessage): boolean =>
  message.request?.state === "open" &&
  message.request.kind === "deliverable" &&
  message.request.canHandle === true &&
  message.productionId !== null;

// Τα υποψήφια Παραδοτέου (είδη, υπεύθυνοι, Γυρίσματα) ανά Παραγωγή, μόνο για τα ανοιχτά Αιτήματα νέου Παραδοτέου που χειρίζεται ο θεατής.
export async function loadCandidates(
  thread: Thread,
): Promise<CandidatesByProduction> {
  const ids = new Set(
    thread.messages
      .filter(needsDeliverableForm)
      .flatMap((message) =>
        message.productionId ? [message.productionId] : [],
      ),
  );
  const entries = await Promise.all(
    [...ids].map(async (id) => {
      const result = await getDeliverableCandidates(id);
      return [id, result.ok ? result.data : null] as const;
    }),
  );
  return new Map(entries);
}
