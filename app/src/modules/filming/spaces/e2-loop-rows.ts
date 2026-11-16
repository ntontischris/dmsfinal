"use server";

import { getQueue } from "../queries";
import { loopRowsOf, requestsOf } from "./e2-guide-model";

// Για τη μηχανή των οδηγών (LOADERS στο spaces/flows/loop-rows.ts): οι γραμμές του «Εγκρίνω αιτήματα γυρίσματος».
// null = η ουρά δεν διαβάστηκε.
export async function loadEgkrinoRows(): Promise<ReturnType<typeof loopRowsOf> | null> {
  const queue = await getQueue();
  return queue.ok ? loopRowsOf(requestsOf(queue.data)) : null;
}
