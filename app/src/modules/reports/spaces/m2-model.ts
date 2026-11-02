import { monthLabel } from "../format";
import { exportHref, type ExportQuery } from "../export/url";

// M2 (νέα εμφάνιση): καθαρές συναρτήσεις της οθόνης, από το prototype (`screens/m2-model.ts`). Ό,τι εκεί υπολόγιζε
// πάνω στα mock (πλήθη γραμμών, ορατά σύνολα) εδώ το δίνει η βάση (export_datasets).

export const m2Href = (
  query: ExportQuery,
  change: Partial<ExportQuery>,
): string => exportHref({ ...query, ...change });

const MONTHS_GENITIVE = [
  "Ιανουαρίου",
  "Φεβρουαρίου",
  "Μαρτίου",
  "Απριλίου",
  "Μαΐου",
  "Ιουνίου",
  "Ιουλίου",
  "Αυγούστου",
  "Σεπτεμβρίου",
  "Οκτωβρίου",
  "Νοεμβρίου",
  "Δεκεμβρίου",
] as const;

// «Λήψη πακέτου Αυγούστου 2026»: ο μήνας στη γενική, για να φαίνεται για ποιον μήνα είναι.
export const packButtonLabel = (month: string): string => {
  const [year, m] = month.split("-").map(Number);
  return `Λήψη πακέτου ${MONTHS_GENITIVE[m - 1]} ${year}`;
};

// Ο τρέχων μήνας δεν έχει κλείσει: «Νοέμβριος 2026 (ως σήμερα)».
export const packMonthLabel = (month: string, current: string): string =>
  month === current ? `${monthLabel(month)} (ως σήμερα)` : monthLabel(month);

const ATHENS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Athens",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// Η στιγμή του Ιστορικού σε ώρα Ελλάδας, χωρισμένη σε ημερομηνία (έντονη) και ώρα 24ώρου, όπως στο prototype.
export const historyWhen = (iso: string): { date: string; time: string } => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { date: iso, time: "" };
  const parts = ATHENS.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${part("day")}/${part("month")}/${part("year")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
};
