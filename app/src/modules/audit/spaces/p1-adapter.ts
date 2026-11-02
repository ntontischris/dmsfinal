// P1 (νέα εμφάνιση): οι πραγματικές γραμμές του Ίχνους (audit_trail) στη μορφή των γραμμών του prototype
// (`screens/p1-table.tsx`). Καθαρές συναρτήσεις· τα κρυφά ποσά και κόστος έρχονται ήδη κρυμμένα από τη βάση.

import { changeLines } from "../changes";
import {
  ACTION_LABELS,
  FILTER_LABELS,
  HIDDEN_LABELS,
  MORE_CHANGES,
  PERIOD_LABELS,
  SYSTEM_ACTOR,
} from "../labels";
import { pageHref } from "../links";
import type { AuditItem, AuditOptions, AuditPage } from "../schema";
import { actionText } from "../sheet";
import {
  NO_FILTERS,
  activeKeys,
  auditHref,
  withoutFilter,
  type AuditFilters,
} from "../url";

const MAX_LINES = 3;
const HIDDEN_TEXTS: readonly string[] = Object.values(HIDDEN_LABELS);

export interface P1Value {
  text: string;
  isHidden: boolean;
}

export interface P1Change {
  key: string;
  before: P1Value | null;
  after: P1Value | null;
}

export interface P1Row {
  id: number;
  at: string;
  when: string;
  href: string | undefined;
  title: string;
  actor: string;
  area: string;
  action: string;
  changes: readonly P1Change[];
  more: string | null;
}

export interface P1Chip {
  key: string;
  text: string;
  label: string;
  href: string;
}

const AT = new Intl.DateTimeFormat("el-GR", {
  timeZone: "Europe/Athens",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const p1When = (iso: string): string => {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? iso : AT.format(new Date(time));
};

const valueOf = (text: string | undefined): P1Value | null =>
  text === undefined ? null : { text, isHidden: HIDDEN_TEXTS.includes(text) };

export const p1RowOf = (item: AuditItem): P1Row => {
  const lines = changeLines(item);
  return {
    id: item.id,
    at: item.at,
    when: p1When(item.at),
    href: pageHref(item) ?? undefined,
    title: item.subject
      ? `${item.entityLabel} «${item.subject}»`
      : item.entityLabel,
    actor: item.actorName,
    area: item.areaLabel,
    action: actionText(item),
    changes: lines.slice(0, MAX_LINES).map((line) => ({
      key: line.key,
      before: valueOf(line.before),
      after: valueOf(line.after),
    })),
    more:
      lines.length > MAX_LINES ? MORE_CHANGES(lines.length - MAX_LINES) : null,
  };
};

// Η τιμή ενός chip: ονόματα από τις επιλογές της βάσης, το στοιχείο με το όνομά του όταν είναι ένα συγκεκριμένο.
const chipValue = (
  key: ReturnType<typeof activeKeys>[number],
  filters: AuditFilters,
  options: AuditOptions,
  subject: AuditPage["subject"],
): string => {
  if (key === "who")
    return filters.who === "system"
      ? SYSTEM_ACTOR
      : (options.actors.find((a) => a.id === filters.who)?.name ??
          filters.who ??
          "");
  if (key === "area")
    return (
      options.areas.find((a) => a.code === filters.area)?.label ??
      filters.area ??
      ""
    );
  if (key === "action")
    return filters.action ? ACTION_LABELS[filters.action] : "";
  if (key === "period") return PERIOD_LABELS[filters.period];
  const label =
    subject?.label ??
    options.entities.find((e) => e.code === filters.entity)?.label ??
    filters.entity;
  return subject?.name ? `${label} «${subject.name}»` : (label ?? "");
};

export const p1ChipsOf = (
  filters: AuditFilters,
  options: AuditOptions,
  subject: AuditPage["subject"],
): readonly P1Chip[] =>
  activeKeys(filters).map((key) => ({
    key,
    label: FILTER_LABELS[key],
    text: `${FILTER_LABELS[key]}: ${chipValue(key, filters, options, subject)}`,
    href: auditHref(withoutFilter(filters, key)),
  }));

export const P1_CLEAR_HREF = auditHref(NO_FILTERS);
