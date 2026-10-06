import { findAgreement } from "@/data/agreements";
import {
  NOW,
  OPEN_STATES,
  PERSON_OF_ROLE,
  personName,
  type Filming,
} from "@/data/filming";
import {
  productionOf,
  shootBalance,
  type ShootBalance,
} from "@/data/filming-access";
import type { RoleId } from "@/data/roles";

export const TODAY = NOW.slice(0, 10);

export interface Reschedule {
  date: string;
  start: string;
}

// Η ζωντανή κατάσταση της σελίδας στη μνήμη: το Γύρισμα και ό,τι έγινε μέσα στη συνεδρία.
export interface Live {
  filming: Filming;
  log: readonly string[];
  reschedule: Reschedule | null;
  sentSnapshot: string | null;
  billable: string | null;
}

export type UpdateLive = (change: (live: Live) => Live) => void;

export const snapshotOf = (filming: Filming): string =>
  JSON.stringify([
    filming.location,
    filming.date,
    filming.start,
    filming.hours,
    filming.crew.map((slot) => slot.personId).sort(),
  ]);

export const initialLive = (filming: Filming): Live => ({
  filming,
  log: [],
  reschedule: null,
  sentSnapshot: filming.sheet.length > 0 ? snapshotOf(filming) : null,
  billable: null,
});

export const withLog = (live: Live, text: string): Live => ({
  ...live,
  log: [...live.log, text],
});

export const withFilming = (live: Live, change: Partial<Filming>): Live => ({
  ...live,
  filming: { ...live.filming, ...change },
});

export interface FilmingTerms {
  cancelHours: number;
  lateCancelBurns: boolean;
  noShowBurns: boolean;
}

const FALLBACK_TERMS: FilmingTerms = {
  cancelHours: 48,
  lateCancelBurns: true,
  noShowBurns: true,
};

export const termsOf = (filming: Filming): FilmingTerms =>
  findAgreement(productionOf(filming)?.agreementId)?.terms.filming ??
  FALLBACK_TERMS;

export const actorOf = (role: RoleId): string => {
  const id = PERSON_OF_ROLE[role];
  return id ? personName(id) : "Πελάτης";
};

export const isOpen = (filming: Filming): boolean =>
  OPEN_STATES.includes(filming.state);

const isConsumed = (filming: Filming, terms: FilmingTerms): boolean => {
  if (filming.state === "έγινε") return true;
  if (filming.state === "δεν έγινε") return terms.noShowBurns;
  return filming.state === "ακυρώθηκε" && !!filming.cancellation?.burns;
};

const count = (filming: Filming, terms: FilmingTerms): number =>
  isConsumed(filming, terms) ? 1 : 0;

// Η Παροχή από τα στατικά δεδομένα, διορθωμένη με τη μετάβαση που έγινε στη συνεδρία.
export const liveBalance = (
  initial: Filming,
  current: Filming,
): ShootBalance | null => {
  const base = shootBalance(initial);
  if (!base) return null;
  const terms = termsOf(initial);
  const used = base.used - count(initial, terms) + count(current, terms);
  const reserved =
    base.reserved - (isOpen(initial) ? 1 : 0) + (isOpen(current) ? 1 : 0);
  return { ...base, used, reserved, left: base.total - used - reserved };
};

const WEEKDAY = new Intl.DateTimeFormat("el-GR", {
  weekday: "long",
  timeZone: "UTC",
});

export const fmtDay = (date: string): string => {
  const [, month, day] = date.split("-");
  return `${WEEKDAY.format(new Date(`${date}T00:00:00Z`))} ${day}/${month}`;
};

export const hoursLabel = (hours: number): string =>
  `${String(hours).replace(".", ",")} ${hours === 1 ? "ώρα" : "ώρες"}`;
