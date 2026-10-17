import type { ExportSheet } from "@/lib/export/sheet";

import { changeLines, eventName, lineText, plainValue } from "./changes";
import { ACTION_LABELS, AUDIT_TITLE } from "./labels";
import type { AuditItem } from "./schema";

// Το φύλλο της εξαγωγής του Ίχνους (Υ5): οι ίδιες γραμμές και η ίδια απόκρυψη με την οθόνη. Το αρχείο (.xlsx / .csv)
// το γράφει ο browser με τον writer των Αναφορών.

export const AUDIT_SHEET_HEADERS = [
  "Πότε",
  "Ποιος",
  "Περιοχή",
  "Στοιχείο",
  "Κωδικός στοιχείου",
  "Ενέργεια",
  "Αλλαγές",
  "Πριν",
  "Μετά",
] as const;

const ATHENS = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Athens",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

// «2026-10-17 12:05:09» σε ώρα Ελλάδας (ταξινομείται σωστά και ως κείμενο).
export const athensStamp = (iso: string): string => {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? iso : ATHENS.format(new Date(time));
};

const json = (value: unknown): string | null =>
  value === null || value === undefined
    ? null
    : JSON.stringify(plainValue(value));

export const subjectText = (item: AuditItem): string =>
  item.subject ? `${item.entityLabel} «${item.subject}»` : item.entityLabel;

export const actionText = (item: AuditItem): string => {
  const event = eventName(item);
  return event
    ? `${ACTION_LABELS[item.action]} (${event})`
    : ACTION_LABELS[item.action];
};

const rowOf = (item: AuditItem): (string | null)[] => [
  athensStamp(item.at),
  item.actorName,
  item.areaLabel,
  subjectText(item),
  item.entityId,
  actionText(item),
  changeLines(item).map(lineText).join("; ") || null,
  json(item.before),
  json(item.after),
];

export const auditSheet = (rows: readonly AuditItem[]): ExportSheet => ({
  name: AUDIT_TITLE,
  columns: AUDIT_SHEET_HEADERS.map((header) => ({
    header,
    type: "text" as const,
  })),
  rows: rows.map(rowOf),
});
