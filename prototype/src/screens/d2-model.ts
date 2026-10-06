// Τοπικά βοηθητικά της Σελίδας Συμφωνίας (D2): ημερομηνίες, νέα πρόταση, γραμμές από τον Κατάλογο, Έγκριση.

import {
  DEFAULT_TERMS,
  PROPOSAL_VALIDITY_DAYS,
  deviationsOf,
  type AgreementKind,
  type AgreementLine,
  type AgreementRecord,
  type Recipient,
} from "@/data/agreements";
import {
  CATALOGUE,
  isPackage,
  provisionsText,
  type CatalogueItem,
  type Provision,
} from "@/data/catalogue";
import type { Opportunity } from "@/data/opportunities";
import type { RoleId } from "@/data/roles";
import {
  SALES_USER_ID,
  TODAY,
  memberName,
  type SalesClient,
} from "@/data/sales";

const MS_PER_DAY = 86_400_000;
const toIso = (date: Date): string => date.toISOString().slice(0, 10);

export const addDays = (iso: string, days: number): string =>
  toIso(new Date(Date.parse(iso) + days * MS_PER_DAY));

export const daysBetween = (fromIso: string, toIsoDate: string): number =>
  Math.round((Date.parse(toIsoDate) - Date.parse(fromIso)) / MS_PER_DAY);

const monthStart = (iso: string, offset: number): Date => {
  const [year, month] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 1));
};

// Τελευταία μέρα της Διάρκειας: έναρξη 1/10 και 6 μήνες → 31/3.
export const endOfDuration = (startIso: string, months: number): string =>
  toIso(new Date(monthStart(startIso, months).getTime() - MS_PER_DAY));

export const MONTH_NAMES = [
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
] as const;

export const monthLabel = (iso: string): string => {
  const [year, month] = iso.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
};

// Ποιος «είμαι» σε κάθε ρόλο του prototype, για αναθεωρήσεις, Εγκρίσεις και Λύση.
const ACTOR_BY_ROLE: Partial<Record<RoleId, string>> = {
  owner: "giorgos",
  admin: "dimitris",
  sales: SALES_USER_ID,
};
export const actorName = (role: RoleId): string =>
  memberName(ACTOR_BY_ROLE[role] ?? null);

export interface Contact {
  name: string;
  email: string;
}

export const contactsOf = (client: SalesClient): readonly Contact[] =>
  [client.contact, ...client.users]
    .map(({ name, email }) => ({ name, email }))
    .filter(
      (contact, index, all) =>
        all.findIndex((other) => other.email === contact.email) === index,
    );

export const recipientOf = (contact: Contact, isSignatory: boolean): Recipient => ({
  ...contact,
  isSignatory,
  link: "ενεργός",
  opened: false,
});

interface BlankOptions {
  opportunity: Opportunity;
  client: SalesClient;
  kind: AgreementKind;
  actor: string;
}

// Νέα πρόταση: άδειες γραμμές, Όροι από τις προεπιλογές, Υπογράφων η επαφή του Πελάτη.
export const blankAgreement = ({
  opportunity,
  client,
  kind,
  actor,
}: BlankOptions): AgreementRecord => {
  const terms = DEFAULT_TERMS[kind];
  // Έναρξη κενή = «με την υπογραφή»· ο συντάκτης μπορεί να βάλει μελλοντική ημερομηνία.
  return {
    id: "new",
    clientId: client.id,
    opportunityId: opportunity.id,
    ownerId: opportunity.ownerId ?? client.ownerId ?? SALES_USER_ID,
    title: opportunity.title,
    kind,
    state: "πρόταση",
    path: "Σύνταξη",
    language: "el",
    lines: [],
    terms,
    start: null,
    end: null,
    validUntil: addDays(TODAY, PROPOSAL_VALIDITY_DAYS),
    recipients: [recipientOf(client.contact, true)],
    revisions: [{ number: 1, when: TODAY, by: actor, summary: "Νέα πρόταση." }],
    periods: [],
  };
};

// Μηνιαία → μηνιαία Πακέτα και Υπηρεσίες· εφάπαξ → εφάπαξ Πακέτα και Υπηρεσίες. Χωρίς αρχειοθετημένα.
export const compatibleItems = (
  kind: AgreementKind,
): readonly CatalogueItem[] =>
  CATALOGUE.filter(
    (item) =>
      !item.isArchived &&
      (!isPackage(item) ||
        item.billing === (kind === "μηνιαία" ? "μηνιαίο" : "εφάπαξ")),
  );

const lineId = (): string => `l-${Math.random().toString(36).slice(2, 8)}`;

export const lineFromItem = (item: CatalogueItem): AgreementLine => ({
  id: lineId(),
  itemId: item.id,
  description:
    isPackage(item) && item.provisions.length > 0
      ? `${item.name}: ${provisionsText(item.provisions)}`
      : item.name,
  quantity: 1,
  unitPrice: item.price,
  catalogPrice: item.price,
  provisions: item.provisions,
  catalogProvisions: item.provisions,
  hours: item.hours,
  directCost: item.directCost,
});

export const freeLine = (
  description: string,
  price: number,
): AgreementLine => ({
  id: lineId(),
  itemId: null,
  description,
  quantity: 1,
  unitPrice: price,
  catalogPrice: null,
  provisions: [],
  catalogProvisions: null,
  hours: { shoot: 0, edit: 0 },
  directCost: 0,
});

const scaleProvisions = (
  provisions: readonly Provision[],
  factor: number,
): readonly Provision[] =>
  provisions.map((p) => ({ ...p, quantity: Math.round(p.quantity * factor) }));

// Παροχές, ώρες και κόστος της γραμμής είναι για όλη την ποσότητα: αλλάζουν αναλογικά.
export const withQuantity = (
  line: AgreementLine,
  quantity: number,
): AgreementLine => {
  const factor = quantity / line.quantity;
  return {
    ...line,
    quantity,
    provisions: scaleProvisions(line.provisions, factor),
    catalogProvisions: line.catalogProvisions
      ? scaleProvisions(line.catalogProvisions, factor)
      : null,
    hours: { shoot: line.hours.shoot * factor, edit: line.hours.edit * factor },
    directCost: line.directCost * factor,
  };
};

// Οι Παρεκκλίσεις μίας γραμμής: η ίδια πρόταση με μόνο αυτή τη γραμμή και προεπιλεγμένους Όρους.
export const lineDeviationsOf = (
  agreement: AgreementRecord,
  line: AgreementLine,
): readonly string[] =>
  deviationsOf({
    ...agreement,
    lines: [line],
    terms: DEFAULT_TERMS[agreement.kind],
  });

// Η Έγκριση δένεται με την αναθεώρηση: χρειάζεται νέα μόνο αν εμφανιστεί Παρέκκλιση που δεν είχε εγκριθεί.
export const needsApproval = (
  agreement: AgreementRecord,
  approved: readonly string[],
  canDeviate: boolean,
): boolean =>
  !canDeviate &&
  deviationsOf(agreement).some((deviation) => !approved.includes(deviation));

export const revisionNumber = (agreement: AgreementRecord): number =>
  agreement.revisions.at(-1)?.number ?? 1;

export interface ScheduledPeriod {
  starts: string;
  ends: string;
}

// Οι Περίοδοι είναι πάντα ημερολογιακοί μήνες: πρώτη και τελευταία μπορεί να είναι σπασμένες.
export const periodSchedule = (
  start: string,
  end: string,
): readonly ScheduledPeriod[] => {
  const periods: ScheduledPeriod[] = [];
  let starts = start;
  while (starts <= end) {
    const monthEnd = endOfDuration(starts, 1);
    const ends = monthEnd < end ? monthEnd : end;
    periods.push({ starts, ends });
    starts = addDays(ends, 1);
  }
  return periods;
};
