import { dateLabel, monthLabel } from "../format";
import { findDataset } from "./datasets";
import type { ExportHistoryItem } from "./view-schema";

// Το «Τι» μιας γραμμής του Ιστορικού εξαγωγών, από ό,τι έγραψε η βάση στο Ίχνος (είδος, θέμα, φίλτρα, μορφή).

const FORMAT_LABELS: Record<string, string> = {
  xlsx: "Excel",
  csv: "CSV",
  zip: ".zip",
};

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value ? value : undefined;

const periodOf = (filters: Record<string, unknown>): string | undefined => {
  const from = text(filters.from);
  const to = text(filters.to);
  return from && to ? `${dateLabel(from)} – ${dateLabel(to)}` : undefined;
};

const subjectOf = (
  item: ExportHistoryItem,
  reportTitle: (id: string) => string | undefined,
): string => {
  const subject = item.subject ?? "";
  if (item.kind === "accountant_pack") {
    const month = text(item.filters.month);
    return month ? `Πακέτο λογιστή · ${monthLabel(month)}` : "Πακέτο λογιστή";
  }
  if (item.kind === "report")
    return `Αναφορά «${reportTitle(subject) ?? subject}»`;
  return findDataset(subject)?.title ?? subject;
};

export const historyWhat = (
  item: ExportHistoryItem,
  reportTitle: (id: string) => string | undefined,
): string =>
  [
    subjectOf(item, reportTitle),
    item.kind === "accountant_pack" ? undefined : periodOf(item.filters),
    item.format ? (FORMAT_LABELS[item.format] ?? item.format) : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

const AT = new Intl.DateTimeFormat("el-GR", {
  timeZone: "Europe/Athens",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// Η στιγμή σε ώρα Ελλάδας, π.χ. «02/09/2026, 10:14».
export const historyAt = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : AT.format(date);
};
