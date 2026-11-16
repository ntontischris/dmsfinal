"use server";

import { getQueue } from "../queries";
import { loopRowsOf, requestsOf, type DeletionRequest } from "./e2-guide-model";

// Για τη μηχανή των οδηγών (LOADERS στο spaces/flows/loop-rows.ts): οι γραμμές του «Εγκρίνω αιτήματα γυρίσματος».
// null = η ουρά δεν διαβάστηκε.
// deletions = οι διαγραφές στο Google (τις φέρνει όποιος καλεί, από το module του Google).
export async function loadEgkrinoRows(
  deletions: readonly DeletionRequest[] = [],
): Promise<ReturnType<typeof loopRowsOf> | null> {
  const queue = await getQueue();
  return queue.ok ? loopRowsOf(requestsOf(queue.data, deletions)) : null;
}
