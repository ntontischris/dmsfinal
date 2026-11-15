// Οι οδηγοί πάνω στο E3: «Τι δεν μπήκε» από τα προεπιλεγμένα Πρότυπα (βήμα Συνεργείου), η προειδοποίηση για ώρα που
// πέρασε και η γραμμή της πρότασης ωρών. Καθαρές συναρτήσεις.

import { CREW_STEP, FLOWS } from "@/spaces/flows/flow-registry";

import { formatDateTime } from "../helpers-time";
import type { FilmingCard } from "../types";
import { pickTemplate } from "../default-templates";
import { isPastStart } from "./e2-adapter";

export interface GuidePlace {
  job: string;
  step: number;
}

// Το βήμα «Ποιοι πάνε και με τι;» όποιου οδηγού το έχει (Στήνω γύρισμα, Εγκρίνω αιτήματα).
export const isCrewStepOf = (place: GuidePlace | null): boolean => {
  if (place === null) return false;
  const flow = FLOWS.find((item) => item.id === place.job);
  return flow?.steps[place.step - 1]?.question === CREW_STEP.question;
};

export interface Missing {
  name: string;
  reason: string;
}

export interface TemplateGap {
  crewTemplate: string | null;
  equipmentTemplate: string | null;
  crew: Missing[];
  items: Missing[];
  // Μέλη του Γυρίσματος με ρεπό ή άδεια εκείνη την ώρα (μόνο προειδοποίηση).
  blocked: string[];
}

interface GapInput {
  card: Pick<FilmingCard, "crew" | "equipment" | "kind">;
  crewTemplates: readonly {
    name: string;
    members: readonly { id: string; name: string }[];
  }[];
  equipmentTemplates: readonly {
    name: string;
    items?: readonly { id: string; name: string; status: string }[];
  }[];
  // Όσοι μπορούν να μπουν σε Συνεργείο (ενεργοί Χρήστες ομάδας).
  candidateIds: readonly string[];
  statusLabels: Readonly<Record<string, string>>;
}

const missingCrewOf = ({ card, crewTemplates, candidateIds }: GapInput) => {
  const template = pickTemplate(crewTemplates, card.kind?.label ?? "");
  const inside = new Set(card.crew.map((member) => member.userId));
  const crew = (template?.members ?? [])
    .filter((member) => !inside.has(member.id))
    .map((member) => ({
      name: member.name,
      reason: candidateIds.includes(member.id)
        ? "έχει άλλο Γύρισμα αυτή την ώρα"
        : "δεν είναι πια ενεργό μέλος της ομάδας",
    }));
  return { name: template?.name ?? null, crew };
};

const missingItemsOf = ({
  card,
  equipmentTemplates,
  statusLabels,
}: GapInput) => {
  const template = pickTemplate(equipmentTemplates, card.kind?.label ?? "");
  const inside = new Set(card.equipment.map((line) => line.itemId));
  const items = (template?.items ?? [])
    .filter((item) => !inside.has(item.id))
    .map((item) => ({
      name: item.name,
      reason:
        item.status === "available"
          ? "είναι δεσμευμένο σε άλλο Γύρισμα αυτή την ώρα"
          : `δεν είναι διαθέσιμο (${statusLabels[item.status] ?? item.status})`,
    }));
  return { name: template?.name ?? null, items };
};

// Ποια μέλη και αντικείμενα των προεπιλεγμένων Προτύπων δεν είναι στο Γύρισμα, και γιατί.
export const templateGapOf = (input: GapInput): TemplateGap => {
  const crew = missingCrewOf(input);
  const items = missingItemsOf(input);
  return {
    crewTemplate: crew.name,
    equipmentTemplate: items.name,
    crew: crew.crew,
    items: items.items,
    blocked: input.card.crew
      .filter((member) => member.isBlocked)
      .map((member) => member.name),
  };
};

type RequestCard = Pick<
  FilmingCard,
  "state" | "startsAt" | "signals" | "cancelRequest"
>;

// Η ώρα του αιτήματος πέρασε: η Έγκριση δεν έχει νόημα (null = όλα καλά).
export const pastWarningOf = (
  card: RequestCard,
  nowMs: number,
): string | null => {
  if (card.state === "pending" && isPastStart(card.startsAt, nowMs))
    return `Η ώρα του αιτήματος (${formatDateTime(card.startsAt)}) έχει ήδη περάσει· η Έγκριση δεν έχει νόημα. Πρότεινε στον Πελάτη άλλη ώρα ή απόρριψε.`;
  const pending = card.signals.pendingReschedule;
  if (pending && isPastStart(pending.startsAt, nowMs))
    return `Η νέα ώρα που ζητήθηκε (${formatDateTime(pending.startsAt)}) έχει ήδη περάσει· η Έγκριση δεν έχει νόημα. Πρότεινε στον Πελάτη άλλη ώρα ή απόρριψε.`;
  return null;
};

// Το Γύρισμα περιμένει απάντηση της ομάδας (κράτηση, μετάθεση ή ακύρωση).
export const hasOpenRequest = (card: RequestCard): boolean =>
  card.state === "pending" ||
  card.signals.pendingReschedule !== null ||
  card.cancelRequest !== null;

// «Στάλθηκαν 3 ώρες στις 15/11 10:00· ελεύθερες ακόμα: 2.»
export const offerLineOf = (offer: {
  offered: number;
  times: readonly string[];
  offeredAt: string;
}): string => {
  const sent = `Στάλθηκ${offer.offered === 1 ? "ε 1 ώρα" : `αν ${offer.offered} ώρες`} στον Πελάτη στις ${formatDateTime(offer.offeredAt)}`;
  if (offer.times.length === 0)
    return `${sent}· καμία δεν είναι πια ελεύθερη. Ανακάλεσε την πρόταση και στείλε νέες ώρες.`;
  return offer.times.length === offer.offered
    ? `${sent}· περιμένουμε να διαλέξει.`
    : `${sent}· ελεύθερες ακόμα: ${offer.times.length}.`;
};
