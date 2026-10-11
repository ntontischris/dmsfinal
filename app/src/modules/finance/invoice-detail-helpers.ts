import { formatMoney } from "./billables-helpers";
import {
  FIELD_LABELS,
  TRAIL_ACTION_LABELS,
} from "./invoice-corrections-labels";
import type {
  ChangeField,
  TrailChange,
  TrailEntry,
} from "./invoice-detail-schema";
import { formatReceiptDate } from "./money";

// Καθαρές συναρτήσεις του Ίχνους: πώς γράφεται μία αλλαγή «παλιό → νέο» και μία γραμμή του Ίχνους.

const DATE_FIELDS: readonly ChangeField[] = ["issueDate", "dueDate"];
const MONEY_FIELDS: readonly ChangeField[] = ["net", "vat", "total"];
const EMPTY_VALUE = "—";

export const valueText = (
  field: ChangeField,
  value: TrailChange["from"],
): string => {
  if (value === null || value === "") return EMPTY_VALUE;
  if (DATE_FIELDS.includes(field)) return formatReceiptDate(String(value));
  if (MONEY_FIELDS.includes(field)) return formatMoney(Number(value));
  return String(value);
};

export const changeText = (change: TrailChange): string =>
  `${FIELD_LABELS[change.field]}: ${valueText(change.field, change.from)} → ${valueText(change.field, change.to)}`;

export const trailText = (entry: TrailEntry): string => {
  const parts = [TRAIL_ACTION_LABELS[entry.action]];
  if (entry.changes.length > 0)
    parts.push(entry.changes.map(changeText).join(", "));
  if (entry.reason) parts.push(`Λόγος: ${entry.reason}`);
  return parts.join(" · ");
};

export const correctHref = (invoiceId: string): string =>
  `/app/finance/invoices/new?invoice=${encodeURIComponent(invoiceId)}`;
