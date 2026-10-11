import { formatDateTime } from "@/modules/filming";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

// «πριν 5 λεπτά», «πριν 3 ώρες» ή η ημερομηνία. Το «ποτέ» όταν δεν έχει γίνει ακόμα συγχρονισμός.
export function ageLabel(iso: string | null): string {
  if (!iso) return "ποτέ";
  const elapsed = Date.now() - Date.parse(iso);
  if (elapsed < MINUTE_MS) return "μόλις τώρα";
  if (elapsed < HOUR_MS) return `πριν ${Math.floor(elapsed / MINUTE_MS)} λεπτά`;
  if (elapsed < 24 * HOUR_MS) return `πριν ${Math.floor(elapsed / HOUR_MS)} ώρες`;
  return formatDateTime(iso);
}

export const pendingLabel = (count: number): string =>
  count === 1 ? "1 εκκρεμής εγγραφή" : `${count} εκκρεμείς εγγραφές`;
