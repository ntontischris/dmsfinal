// PROTOTYPE — throwaway. Η Σελίδα Πελάτη σε απλές φράσεις: η «ενημέρωση» της C και η γραμμή χρόνου της D.
import type { ClientPageCtx } from "../b2-context";

export interface ClientFacts {
  name: string;
  stage: string;
  activeAgreement: string | null;
  money: string | null;
  overdueCount: number;
  next: { step: string; due: string; isLate: boolean } | null;
  filming: string | null;
  agreementEnd: string | null;
  attention: string | null;
  lastContact: string | null;
}

export const factsOf = (ctx: ClientPageCtx): ClientFacts => ({
  name: ctx.client.name,
  stage: ctx.d.stage,
  activeAgreement: ctx.d.activeAgreement,
  money: ctx.d.money,
  overdueCount: ctx.data.overdueInvoices?.length ?? 0,
  next: ctx.d.next,
  filming: ctx.d.filming?.text ?? null,
  agreementEnd: ctx.d.agreementEnd?.text ?? null,
  attention: ctx.d.attention?.text ?? null,
  lastContact: ctx.data.activities?.[0]?.when ?? null,
});

const overdueText = (count: number): string =>
  count === 1 ? "1 Τιμολόγιο ληξιπρόθεσμο" : `${count} Τιμολόγια ληξιπρόθεσμα`;

// Μία παράγραφος, όπως θα τη έλεγε κάποιος στο τηλέφωνο.
export function briefingOf(facts: ClientFacts): string {
  const parts = [
    `${facts.name}: ${facts.stage.toLowerCase()}${facts.activeAgreement ? `, με ${facts.activeAgreement}` : ""}.`,
    facts.overdueCount > 0
      ? `Έχει ${overdueText(facts.overdueCount)}${facts.money ? ` (${facts.money})` : ""}.`
      : facts.money
        ? `${facts.money}.`
        : "Δεν χρωστά τίποτα.",
    facts.next
      ? `Επόμενο: ${facts.next.step}, ${facts.next.due}${facts.next.isLate ? " — έχει περάσει" : ""}.`
      : "Δεν έχει κανονιστεί Επόμενο βήμα.",
    facts.filming ? `Γύρισμα ${facts.filming}.` : null,
    facts.agreementEnd ? `Η Συμφωνία ${facts.agreementEnd}.` : null,
    facts.lastContact ? `Τελευταία επαφή ${facts.lastContact}.` : null,
  ];
  return parts.filter((part): part is string => part !== null).join(" ");
}

export interface TimeItem {
  key: string;
  tag: string;
  title: string;
  isUrgent?: boolean;
}

export interface Timeline {
  coming: TimeItem[];
  now: TimeItem[];
  done: TimeItem[];
}

const comingOf = (facts: ClientFacts): TimeItem[] =>
  [
    facts.next && !facts.next.isLate
      ? { key: "next", tag: facts.next.due, title: facts.next.step }
      : null,
    facts.filming
      ? { key: "filming", tag: "Γύρισμα", title: facts.filming }
      : null,
    facts.agreementEnd
      ? { key: "end", tag: "Συμφωνία", title: facts.agreementEnd }
      : null,
  ].filter((item): item is TimeItem => item !== null);

const urgent = (key: string, tag: string, title: string): TimeItem => ({
  key,
  tag,
  title,
  isUrgent: true,
});

const nowOf = (facts: ClientFacts): TimeItem[] =>
  [
    facts.attention ? urgent("attention", "Προσοχή", facts.attention) : null,
    facts.overdueCount > 0
      ? urgent("overdue", "Χρωστά", overdueText(facts.overdueCount))
      : null,
    facts.next?.isLate
      ? urgent("late", "Πέρασε", `${facts.next.step}, ${facts.next.due}`)
      : null,
  ].filter((item): item is TimeItem => item !== null);

export function timelineOf(
  facts: ClientFacts,
  done: readonly TimeItem[],
): Timeline {
  return { coming: comingOf(facts), now: nowOf(facts), done: [...done] };
}
