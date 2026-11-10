// PROTOTYPE — throwaway, three simpler proposal pages via ?variant=.
// Καθαρές συναρτήσεις: η σελίδα απαντά «τι κάνω εδώ τώρα;» με προτάσεις στα ελληνικά αντί για πίνακες και τύπους.
// Οι προεπιλογές γίνονται μία γραμμή («Όροι: τυπικοί»), τα προβλήματα γίνονται προειδοποιήσεις.

import {
  describeDeviation,
  endOfTerm,
  formatMoney,
  formatNumber,
} from "../helpers";
import type {
  AgreementDetail,
  AgreementKind,
  CatalogueOption,
  KindInfo,
  PeriodRow,
  Recipient,
  UnusedProvisions,
} from "../types";

export type ProtoVariant = "a" | "b" | "c";
export const PROTO_ORDER: readonly (ProtoVariant | null)[] = [
  null,
  "a",
  "b",
  "c",
];

// Στην παραγωγή το ?variant= αγνοείται: η σελίδα μένει όπως είναι.
export const isProtoEnabled = (): boolean =>
  process.env.VERCEL_ENV !== "production";

export const parseVariant = (value: string | undefined): ProtoVariant | null =>
  value === "a" || value === "b" || value === "c" ? value : null;

export interface VariantInfo {
  label: string;
  thinks: string;
  changes: readonly string[];
}

export const NOW_LABEL = "Τώρα — όπως είναι";

export const VARIANTS: Readonly<Record<ProtoVariant, VariantInfo>> = {
  a: {
    label: "Α — Τρία βήματα",
    thinks:
      "Το 95% των προτάσεων είναι «Πακέτο Χ, από τότε, για 6 μήνες, στον τάδε». Άρα η σελίδα σε πάει από το ένα στο άλλο: τι πουλάμε, πότε και σε ποιον, έλεγχος και αποστολή. Σε κάθε βήμα ένα κύριο κουμπί· ό,τι άλλο υπάρχει, είναι κλειστό κάτω από «Αλλαγή …».",
    changes: [
      "Βήμα 1: κάρτες Πακέτων με μία γραμμή («2 Γυρίσματα · 4 Reels · 650 €/μήνα»)· ο πίνακας γραμμών στο «Αλλαγή γραμμών»",
      "Βήμα 2: Έναρξη, Διάρκεια, Υπογράφων σε μία φόρμα και μία πρόταση για τη Λήξη και τον σπασμένο μήνα",
      "Όροι, έκπτωση, όριο αλλαγών, Περίοδοι: μία γραμμή-σύνοψη ο καθένας, ανοίγουν μόνο αν τα θες",
      "Κόστος και Παρεκκλίσεις φαίνονται μόνο ως «⚠» όταν κάτι δεν πάει καλά",
      "Βήμα 3: η πρόταση όπως θα τη δει ο πελάτης και η «Αποστολή»",
    ],
  },
  b: {
    label: "Β — Μία ήρεμη σελίδα",
    thinks:
      "Όλα σε μία σελίδα, αλλά ήσυχα: πρώτα μια κάρτα που λέει την πρόταση σε απλές προτάσεις και το ένα κουμπί που μετράει. Μετά τρεις σύντομες ενότητες. Ό,τι προχωρημένο (όροι, έκπτωση, όρια, Περίοδοι, κόστος) είναι συρτάρι «Αλλαγή …» με τη σύνοψή του.",
    changes: [
      "Κάρτα-σύνοψη στην κορυφή: τι, πότε, ποιος υπογράφει, όροι — και η «Αποστολή» δίπλα",
      "Τρεις ενότητες: Τι πουλάμε · Πότε και σε ποιον · Πριν την αποστολή",
      "Δέκα συρτάρια «Αλλαγή …», το καθένα με μία γραμμή που λέει τι έχει μέσα",
      "Τα 7 κουμπιά «Αποθήκευση …» μένουν, αλλά μόνο μέσα στο συρτάρι που ανοίγεις",
    ],
  },
  c: {
    label: "Γ — Σαν το έγγραφο",
    thinks:
      "Ο πελάτης θα δει ένα έγγραφο· γιατί να γράφουμε σε φόρμες; Γράφεις την πρόταση όπως θα τη διαβάσει, με «αλλαγή» δίπλα σε κάθε κομμάτι. Στο πλάι μια λεπτή στήλη λέει μόνο τι θέλει προσοχή ή έγκριση, και έχει την «Αποστολή».",
    changes: [
      "Η σελίδα είναι το χαρτί: Τι περιλαμβάνει · Τιμή · Διάρκεια · Όροι · Υπογραφή",
      "Κάθε κομμάτι έχει «αλλαγή» που ανοίγει τη σωστή φόρμα εκεί που είσαι",
      "Πλαϊνή στήλη: μόνο προειδοποιήσεις, Έγκριση, Αποστολή",
      "Κόστος, Περίοδοι, εξερχόμενα και ιστορικό στο κάτω μέρος της στήλης, κλειστά",
    ],
  },
};

// ───────────── Ημερομηνίες σε λέξεις ─────────────

const MONTHS_GENITIVE: readonly string[] = [
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
];
const MONTHS_NOMINATIVE: readonly string[] = [
  "Ιανουάριος",
  "Φεβρουάριος",
  "Μάρτιος",
  "Απρίλιος",
  "Μάιος",
  "Ιούνιος",
  "Ιούλιος",
  "Αύγουστος",
  "Σεπτέμβριος",
  "Οκτώβριος",
  "Νοέμβριος",
  "Δεκέμβριος",
];

const partsOf = (iso: string) => {
  const [year = 0, month = 1, day = 1] = iso
    .slice(0, 10)
    .split("-")
    .map(Number);
  return { year, month, day };
};

// «2027-05-09» → «9 Μαΐου 2027»
export const longDate = (iso: string): string => {
  const { year, month, day } = partsOf(iso);
  return `${day} ${MONTHS_GENITIVE[month - 1] ?? ""} ${year}`;
};

const monthName = (iso: string): string =>
  MONTHS_NOMINATIVE[partsOf(iso).month - 1] ?? "";

const count = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;

// ───────────── Τι πουλάμε ─────────────

type Provisions = readonly { kindId: string; quantity: number }[];

// Οι Παροχές ως «2 Γυρίσματα · 4 Reels», με τη σειρά των ειδών.
export const provisionsLine = (
  provisions: Provisions,
  kinds: readonly KindInfo[],
): string => {
  const totals = new Map<string, number>();
  provisions.forEach((p) =>
    totals.set(p.kindId, (totals.get(p.kindId) ?? 0) + p.quantity),
  );
  return [...kinds]
    .sort((a, b) => a.sort - b.sort)
    .filter((kind) => (totals.get(kind.id) ?? 0) > 0)
    .map((kind) => {
      const n = totals.get(kind.id) ?? 0;
      return `${formatNumber(n)} ${n === 1 ? kind.label : kind.unit}`;
    })
    .join(" · ");
};

const priceText = (price: number, kind: AgreementKind): string =>
  `${formatMoney(price)}${kind === "monthly" ? "/μήνα" : ""}`;

const joinParts = (parts: readonly (string | null)[]): string =>
  parts
    .filter((part): part is string => part !== null && part !== "")
    .join(" · ");

// Η Συμφωνία σε μία γραμμή: «2 Γυρίσματα · 4 Reels · 650,00 €/μήνα».
export const offerLine = (
  a: Pick<AgreementDetail, "lines" | "totals" | "kind">,
  kinds: readonly KindInfo[],
): string => {
  const provisions = a.lines.flatMap((line) =>
    line.provisions.map((p) => ({
      kindId: p.kindId,
      quantity: p.quantity * line.quantity,
    })),
  );
  return joinParts([
    provisionsLine(provisions, kinds),
    a.totals === null || a.lines.length === 0
      ? null
      : priceText(a.totals.price, a.kind),
  ]);
};

export const optionLine = (
  option: CatalogueOption,
  kinds: readonly KindInfo[],
  kind: AgreementKind,
): string =>
  joinParts([
    provisionsLine(option.provisions, kinds),
    option.price === null ? null : priceText(option.price, kind),
  ]);

// Τα Πακέτα του Καταλόγου που ταιριάζουν στο είδος της Συμφωνίας.
export const packagesFor = (
  options: readonly CatalogueOption[],
  kind: AgreementKind,
): CatalogueOption[] =>
  options
    .filter(
      (o) => o.kind === "package" && (o.billing === null || o.billing === kind),
    )
    .sort(
      (a, b) =>
        (a.price ?? 0) - (b.price ?? 0) || a.name.localeCompare(b.name, "el"),
    );

export const offerName = (a: Pick<AgreementDetail, "lines">): string =>
  a.lines.length === 0
    ? "Τίποτα ακόμα"
    : a.lines
        .map((l) =>
          l.quantity > 1 ? `${l.quantity}× ${l.description}` : l.description,
        )
        .join(" + ");

// ───────────── Πότε ─────────────

const partialClause = (periods: readonly PeriodRow[]): string | null => {
  const partial = periods.filter((p) => p.isPartial && p.amount !== null);
  if (partial.length === 0) return null;
  return partial
    .map(
      (p) =>
        `ο ${monthName(p.starts)} χρεώνεται αναλογικά ${formatMoney(p.amount ?? 0)}`,
    )
    .join(" και ");
};

// «6 μήνες, ως 9 Μαΐου 2027· ο Νοέμβριος χρεώνεται αναλογικά 455,00 €»
export const scheduleSentence = (
  a: Pick<
    AgreementDetail,
    "kind" | "startOn" | "endOn" | "durationMonths" | "periods"
  >,
): string => {
  if (a.kind === "one_off")
    return a.startOn === null
      ? "Εφάπαξ: ξεκινά με την υπογραφή και κλείνει όταν παραδοθεί η Παραγωγή."
      : `Εφάπαξ: ξεκινά ${longDate(a.startOn)} και κλείνει όταν παραδοθεί η Παραγωγή.`;
  if (a.durationMonths === null) return "Δεν ορίστηκε ακόμα η Διάρκεια.";
  const months = count(a.durationMonths, "μήνας", "μήνες");
  if (a.startOn === null)
    return `${months} από την υπογραφή· η Λήξη ορίζεται τη μέρα που θα υπογραφεί.`;
  const end = a.endOn ?? endOfTerm(a.startOn, a.durationMonths);
  const head = `${months}, από ${longDate(a.startOn)} ως ${longDate(end)}`;
  const partial = partialClause(a.periods);
  return partial === null ? `${head}.` : `${head}· ${partial}.`;
};

// ───────────── Σε ποιον ─────────────

export const signatoryOf = (
  recipients: readonly Recipient[],
): Recipient | null => recipients.find((r) => r.isSignatory) ?? null;

export const peopleLine = (recipients: readonly Recipient[]): string => {
  const signatory = signatoryOf(recipients);
  const others = recipients.length - (signatory === null ? 0 : 1);
  const head =
    signatory === null
      ? "Δεν ορίστηκε Υπογράφων"
      : `Υπογράφει ${signatory.name}`;
  return others === 0
    ? head
    : `${head} · +${count(others, "παραλήπτης", "παραλήπτες")}`;
};

// ───────────── Όροι ως μία γραμμή ─────────────

const UNUSED_SHORT: Readonly<Record<UnusedProvisions, string>> = {
  lost: "χάνονται στο τέλος κάθε Περιόδου",
  next_period: "περνούν στην επόμενη Περίοδο",
  accumulate: "μαζεύονται ως τη λήξη",
};

const days = (n: number) => count(n, "μέρα", "μέρες");
const hours = (n: number) => count(n, "ώρα", "ώρες");
const yesNo = (v: boolean) => (v ? "καίει Παροχή" : "δεν καίει Παροχή");

type TermsInput = Pick<AgreementDetail, "terms" | "baseline" | "kind">;

interface TermRule {
  label: string;
  isMonthlyOnly: boolean;
  value: (t: AgreementDetail["terms"]) => string;
  base: (b: NonNullable<AgreementDetail["baseline"]>) => string;
}

const TERM_RULES: readonly TermRule[] = [
  {
    label: "Πληρωμή",
    isMonthlyOnly: false,
    value: (t) => days(t.paymentDays),
    base: (b) => days(b.paymentDays),
  },
  {
    label: "Αχρησιμοποίητες Παροχές",
    isMonthlyOnly: true,
    value: (t) => UNUSED_SHORT[t.unusedProvisions],
    base: (b) => UNUSED_SHORT[b.unusedProvisions],
  },
  {
    label: "Χάρη",
    isMonthlyOnly: true,
    value: (t) => days(t.graceDays),
    base: (b) => days(b.graceDays),
  },
  {
    label: "Ειδοποίηση λύσης",
    isMonthlyOnly: true,
    value: (t) => days(t.dissolutionNoticeDays),
    base: (b) => days(b.dissolutionNoticeDays),
  },
  {
    label: "Κράτηση γυρίσματος",
    isMonthlyOnly: false,
    value: (t) => hours(t.filmingNoticeHours),
    base: (b) => hours(b.filmingNoticeHours),
  },
  {
    label: "Ακύρωση γυρίσματος",
    isMonthlyOnly: false,
    value: (t) => hours(t.filmingCancelHours),
    base: (b) => hours(b.filmingCancelHours),
  },
  {
    label: "Αργή ακύρωση",
    isMonthlyOnly: false,
    value: (t) => yesNo(t.lateCancelBurns),
    base: (b) => yesNo(b.lateCancelBurns),
  },
  {
    label: "«Δεν έγινε»",
    isMonthlyOnly: false,
    value: (t) => yesNo(t.noShowBurns),
    base: (b) => yesNo(b.noShowBurns),
  },
];

const rulesFor = (kind: AgreementKind) =>
  TERM_RULES.filter((r) => kind === "monthly" || !r.isMonthlyOnly);

// Οι όροι που διαφέρουν από την προεπιλογή: «Πληρωμή 30 μέρες (τυπικά 15 μέρες)».
export const termChanges = (a: TermsInput): string[] => {
  const { baseline } = a;
  if (baseline === null) return [];
  return rulesFor(a.kind)
    .filter((r) => r.value(a.terms) !== r.base(baseline))
    .map((r) => `${r.label} ${r.value(a.terms)} (τυπικά ${r.base(baseline)})`);
};

export const termsLine = (a: TermsInput): string => {
  const changes = termChanges(a);
  if (changes.length === 0)
    return a.baseline === null ? "όπως ορίστηκαν" : "τυπικοί";
  return `${count(changes.length, "αλλαγή", "αλλαγές")}: ${changes.join(" · ")}`;
};

// Οι όροι ως κείμενο εγγράφου (Γ): μία πρόταση ο καθένας.
export const termsProse = (a: TermsInput): string[] => {
  const t = a.terms;
  const monthly = [
    `Οι αχρησιμοποίητες Παροχές ${UNUSED_SHORT[t.unusedProvisions]}.`,
    `Περίοδος χάριτος ${days(t.graceDays)}· λύση με ειδοποίηση ${days(t.dissolutionNoticeDays)} πριν.`,
    t.renewal === "auto"
      ? "Στη λήξη συνεχίζει αυτόματα για άλλη μία Διάρκεια."
      : "Στη λήξη μιλάμε για ανανέωση.",
  ];
  return [
    `Πληρωμή σε ${days(t.paymentDays)} από το Τιμολόγιο.`,
    ...(a.kind === "monthly" ? monthly : []),
    `Γυρίσματα: κράτηση ${hours(t.filmingNoticeHours)} πριν, ακύρωση έως ${hours(t.filmingCancelHours)} πριν· η αργή ακύρωση ${yesNo(t.lateCancelBurns)}, το «δεν έγινε» ${yesNo(t.noShowBurns)}.`,
  ];
};

export const moneyLine = (
  a: Pick<AgreementDetail, "moneyTerms">,
): string | null => {
  const m = a.moneyTerms;
  if (m === null) return null;
  const discount =
    m.discountPercent > 0 && m.discountMonths > 0
      ? `έκπτωση ${formatNumber(m.discountPercent)}% τους πρώτους ${count(m.discountMonths, "μήνα", "μήνες")}`
      : "χωρίς έκπτωση";
  const fee =
    m.dissolutionFee > 0
      ? `ρήτρα λύσης ${formatMoney(m.dissolutionFee)}`
      : "χωρίς ρήτρα λύσης";
  return `${discount} · ${fee}`;
};

export const limitsLine = (
  a: Pick<AgreementDetail, "revisionLimits">,
): string | null => {
  const limits = a.revisionLimits;
  if (limits.length === 0) return null;
  const isStandard = limits.every(
    (l) => l.baseRounds === null || l.baseRounds === l.rounds,
  );
  const text = limits
    .map((l) => `${l.label} ${count(l.rounds, "γύρος", "γύροι")}`)
    .join(" · ");
  return isStandard ? `τυπικό (${text})` : text;
};

export const periodsLine = (
  a: Pick<AgreementDetail, "kind" | "periods">,
): string | null => {
  if (a.kind !== "monthly" || a.periods.length === 0) return null;
  const partial = a.periods.filter((p) => p.isPartial).length;
  const head = count(a.periods.length, "Περίοδος", "Περίοδοι");
  return partial === 0 ? head : `${head} · ${partial} σπασμένη`;
};

// ───────────── Τι θέλει προσοχή ─────────────

export interface Warning {
  key: string;
  text: string;
  isBlocking: boolean; // δεν στέλνεται χωρίς αυτό
}

type WarnInput = Pick<
  AgreementDetail,
  | "state"
  | "path"
  | "lines"
  | "cost"
  | "deviations"
  | "needsApproval"
  | "recipients"
  | "kind"
  | "milestones"
  | "milestonesTotal"
  | "can"
>;

export const warningsOf = (a: WarnInput): Warning[] => {
  if (a.state !== "proposal") return [];
  const open = a.deviations.filter((d) => d.status !== "covered");
  const list: (Warning | null)[] = [
    a.lines.length === 0
      ? {
          key: "lines",
          text: "Δεν διάλεξες ακόμα τι πουλάμε.",
          isBlocking: true,
        }
      : null,
    a.cost?.isLowMargin === true
      ? {
          key: "margin",
          text: "⚠ χαμηλό περιθώριο: η τιμή είναι κάτω από την ελάχιστη του Εύρους. Ειδοποιεί, δεν μπλοκάρει.",
          isBlocking: false,
        }
      : null,
    a.needsApproval && open.length > 0
      ? {
          key: "approval",
          text: `⚠ θέλει έγκριση: ${open.map((d) => describeDeviation(d, a.can.seeAmounts)).join(" · ")}`,
          isBlocking: true,
        }
      : null,
    signatoryOf(a.recipients) === null
      ? { key: "signatory", text: "Λείπει ο Υπογράφων.", isBlocking: true }
      : null,
    a.kind === "one_off" && a.milestones.length > 0 && a.milestonesTotal !== 100
      ? {
          key: "milestones",
          text: `⚠ οι δόσεις κάνουν ${formatNumber(a.milestonesTotal)}%, όχι 100%.`,
          isBlocking: false,
        }
      : null,
  ];
  return list.filter((w): w is Warning => w !== null);
};

// Το βήμα όπου ανοίγει η Α: το πρώτο που λείπει.
export const firstOpenStep = (
  a: Pick<AgreementDetail, "lines" | "recipients" | "can">,
): number => {
  if (!a.can.edit) return 2;
  if (a.lines.length === 0) return 0;
  if (signatoryOf(a.recipients) === null) return 1;
  return 2;
};
