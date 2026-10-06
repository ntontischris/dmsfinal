import { personName, NOW } from "@/data/filming";
import { provisionKind } from "@/data/catalogue";
import {
  deadlineOf,
  detailOf,
  latestVersion,
  productionOf,
  roundsOf,
} from "@/data/deliverables-access";
import type { DeliverableSummary } from "@/data/productions";
import { clientNameOfProduction } from "@/data/productions-access";
import { fmtDate } from "@/screens/shared";

export const whoLabel = (who: string): string =>
  personName(who) === "—" ? who : personName(who);

const shortDate = (iso: string): string => {
  const [, month, day] = iso.slice(0, 10).split("-");
  return `${day}/${month}`;
};

export const shorten = (text: string, max = 60): string =>
  text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;

export const productionLabel = (d: DeliverableSummary): string => {
  const production = productionOf(d);
  return production
    ? `${clientNameOfProduction(production)} — ${production.title}`
    : "—";
};

export const deadlineLabel = (d: DeliverableSummary): string => {
  const info = deadlineOf(d);
  if (info.date) return fmtDate(info.date);
  return info.filming
    ? `μετά το Γύρισμα της ${shortDate(info.filming.date)}`
    : "—";
};

export const kindLabel = (d: DeliverableSummary): string =>
  provisionKind(d.kindId).name;

export const hasBrokenLink = (d: DeliverableSummary): boolean =>
  !!latestVersion(detailOf(d))?.comments.some((c) => c.isBrokenLink);

export const isOverLimit = (d: DeliverableSummary): boolean => {
  const rounds = roundsOf(d);
  return rounds.used > rounds.limit;
};

// Τι περιμένει ο Ανατεθειμένος.
export const waitingOn = (d: DeliverableSummary): string => {
  const detail = detailOf(d);
  const latest = latestVersion(detail);
  if (!latest) return "καμία Έκδοση ακόμα";
  if (latest.state === "επιστράφηκε από έλεγχο") {
    const note = latest.review?.note;
    return `v${latest.number} επιστράφηκε από έλεγχο${note ? `: «${shorten(note)}»` : ""}`;
  }
  if (latest.state === "χρειάζεται αλλαγές") {
    return `v${latest.number}: ο πελάτης ζήτησε αλλαγές`;
  }
  return `v${latest.number}: ${latest.state}`;
};

const MS_HOUR = 3_600_000;

// Πόση ώρα περιμένει στον έλεγχο: ώρες αν μέσα στη μέρα, αλλιώς μέρες.
export const reviewWaitLabel = (addedAt: string): string => {
  const hasTime = addedAt.length > 10;
  const hours = Math.max(
    0,
    Math.floor(
      (Date.parse(NOW) - Date.parse(hasTime ? addedAt : `${addedAt}T09:00`)) /
        MS_HOUR,
    ),
  );
  return hours < 24 ? `${hours} ώρες` : `${Math.floor(hours / 24)} μέρες`;
};
