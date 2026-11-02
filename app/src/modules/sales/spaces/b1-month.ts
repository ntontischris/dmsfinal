// Η εικόνα του μήνα για έναν μηνιαίο Πελάτη στη λίστα: τι δόθηκε, τι έγινε και το επόμενο γύρισμα (prototype `b1-month.ts`).
// Από τις Παροχές της τρέχουσας Περιόδου των ενεργών μηνιαίων Συμφωνιών (sales_client_overview).

import type { ClientProvision } from "../types";

export interface Meter {
  label: string;
  used: number;
  total: number;
}

export interface MonthGlance {
  text: string;
  // Σύντομα κομμάτια για τη στήλη: «γυρίσματα 1/3», «reels 4/9», «επόμενο 21/09».
  chips: readonly string[];
  // Τα ίδια, ως αριθμοί για μπάρα προόδου: πόσα έγιναν από πόσα δόθηκαν ανά Παροχή.
  meters: readonly Meter[];
  // Το επόμενο γύρισμα («21/09»), ή null.
  next: string | null;
  // Δικαιούται γύρισμα αυτόν τον μήνα αλλά δεν έχει κανένα (ούτε έγινε ούτε κλεισμένο).
  hasNoShoot: boolean;
}

const unitOf = (b: ClientProvision): string => b.unit.toLocaleLowerCase("el");

const provisionText = (b: ClientProvision): string => {
  const total = b.given + b.carried;
  if (!b.isShoot) return `${unitOf(b)}: ${b.used} από ${total}`;
  const done = b.used === 1 ? "έγινε 1" : `έγιναν ${b.used}`;
  const reserved = b.reserved > 0 ? `, ${b.reserved} κλεισμένα` : "";
  return `${unitOf(b)}: ${done} από ${total}${reserved}`;
};

const provisionMeter = (b: ClientProvision): Meter => ({ label: unitOf(b), used: b.used, total: b.given + b.carried });

const provisionChip = (b: ClientProvision): string => {
  const meter = provisionMeter(b);
  return `${meter.label} ${meter.used}/${meter.total}`;
};

const DAY_MONTH = new Intl.DateTimeFormat("el-GR", { timeZone: "Europe/Athens", day: "2-digit", month: "2-digit" });

// «21/09» σε ώρα Ελλάδας.
const dayMonthOf = (iso: string): string => DAY_MONTH.format(new Date(iso));

export const monthGlance = (provisions: readonly ClientProvision[], nextFilming: string | null): MonthGlance | null => {
  if (provisions.length === 0) return null;
  const shoots = provisions.filter((b) => b.isShoot);
  const hasNoShoot = shoots.length > 0 && shoots.every((b) => b.used === 0 && b.reserved === 0);
  const next = nextFilming ? dayMonthOf(nextFilming) : null;
  return {
    text: [...provisions.map(provisionText), next && `επόμενο γύρισμα ${next}`].filter(Boolean).join(" · "),
    chips: [...provisions.map(provisionChip), ...(next ? [`επόμενο ${next}`] : [])],
    meters: provisions.map(provisionMeter),
    next,
    hasNoShoot,
  };
};
