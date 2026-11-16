import { getViewer } from "@/modules/access";

import { canSeeGoogleCalendar } from "./permissions";
import { getGoogleDeletions } from "./queries";
import type { GoogleDeletion } from "./types";

// Για τον οδηγό «Εγκρίνω αιτήματα γυρίσματος»: οι διαγραφές στο Google που περιμένουν απόφαση,
// μόνο για όποιον βλέπει το Google Ημερολόγιο. Χωρίς δικαίωμα ή με αποτυχία ανάγνωσης: καμία.
export async function getDeletionRequests(): Promise<GoogleDeletion[]> {
  if (!canSeeGoogleCalendar(await getViewer())) return [];
  const deletions = await getGoogleDeletions();
  return deletions.ok ? deletions.data : [];
}
