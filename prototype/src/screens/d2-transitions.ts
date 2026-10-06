// Οι μεταβάσεις της Συμφωνίας στο prototype: καθαρές συναρτήσεις πάνω στο τοπικό αντίγραφο.
// Πηγή: 02-sales.md (πορεία πρότασης) και 01-backbone.md (υπογραφή, Λύση).

import {
  currentRevision,
  endOfTerm,
  provisionsOf,
  type AgreementPeriod,
  type AgreementRecord,
  type Recipient,
  type Revision,
} from "@/data/agreements";
import type { ProvisionKindId } from "@/data/catalogue";
import type { LinkState } from "@/data/opportunities";
import { TODAY } from "@/data/sales";
import {
  addDays,
  endOfDuration,
  monthLabel,
  revisionNumber,
} from "@/screens/d2-model";

export type Change = (draft: AgreementRecord) => AgreementRecord;

const withLinks = (
  recipients: readonly Recipient[],
  from: LinkState | "όλοι",
  to: LinkState,
): readonly Recipient[] =>
  recipients.map((r) =>
    from === "όλοι" || r.link === from
      ? { ...r, link: to, opened: to === "ενεργός" ? false : r.opened }
      : r,
  );

const withLastRevision = (
  draft: AgreementRecord,
  approval: Revision["approval"],
): readonly Revision[] =>
  draft.revisions.map((revision, index) =>
    index === draft.revisions.length - 1 ? { ...revision, approval } : revision,
  );

export const send: Change = (d) => ({
  ...d,
  path: "Εστάλη",
  recipients: withLinks(d.recipients, "όλοι", "ενεργός"),
});

export const requestApproval: Change = (d) => ({
  ...d,
  path: "Αναμένει Έγκριση",
  revisions: withLastRevision(d, { state: "αναμένει" }),
});

// Η Έγκριση στέλνει κατευθείαν· η απόρριψη γυρίζει στη Σύνταξη με το σχόλιο.
export const decide =
  (isApproved: boolean, by: string, comment: string): Change =>
  (d) => {
    const revisions = withLastRevision(d, {
      state: isApproved ? "εγκρίθηκε" : "απορρίφθηκε",
      by,
      when: TODAY,
      comment: comment || undefined,
    });
    return isApproved
      ? send({ ...d, revisions })
      : { ...d, revisions, path: "Σύνταξη" };
  };

export const newRevision =
  (by: string): Change =>
  (d) => ({
    ...d,
    path: "Σύνταξη",
    recipients: withLinks(d.recipients, "ενεργός", "ακυρώθηκε"),
    // Το αίτημα Έγκρισης που περίμενε αποσύρεται μαζί με την παλιά αναθεώρηση.
    revisions: [
      ...withLastRevision(
        d,
        currentRevision(d)?.approval?.state === "αναμένει"
          ? undefined
          : currentRevision(d)?.approval,
      ),
      {
        number: revisionNumber(d) + 1,
        when: TODAY,
        by,
        summary: "Νέα αναθεώρηση σε σύνταξη.",
      },
    ],
  });

export const extend =
  (days: number): Change =>
  (d) => ({
    ...d,
    path: "Εστάλη",
    validUntil: addDays(TODAY, days),
    recipients: withLinks(d.recipients, "όλοι", "ενεργός"),
  });

export const closeLost: Change = (d) => ({
  ...d,
  path: "Χάθηκε",
  recipients: withLinks(d.recipients, "ενεργός", "ακυρώθηκε"),
});

export interface OutsideSignature {
  file: string;
  when: string;
  start: string;
  used: Readonly<Partial<Record<ProvisionKindId, number>>>;
}

// Παλιά έναρξη: ανοίγει μόνο η τρέχουσα Περίοδος (ημερολογιακός μήνας, ίσως σπασμένη στην αρχή),
// με όσες Παροχές έχουν ήδη χρησιμοποιηθεί. Η πρώτη σπασμένη δίνει ολόκληρες Παροχές.
const currentPeriod = (
  d: AgreementRecord,
  used: OutsideSignature["used"],
  start: string,
): AgreementPeriod => {
  const monthStart = `${TODAY.slice(0, 7)}-01`;
  const starts = start > monthStart ? start : monthStart;
  return {
    label: monthLabel(monthStart),
    starts,
    ends: endOfDuration(monthStart, 1),
    state: "τρέχουσα",
    provisions: provisionsOf(d).map((p) => ({
      kindId: p.kindId,
      given: p.quantity,
      carried: 0,
      used: used[p.kindId] ?? 0,
    })),
  };
};

export const signOutside =
  ({ file, when, start, used }: OutsideSignature): Change =>
  (d) => {
    const signatory = d.recipients.find((r) => r.isSignatory);
    const isMonthly = d.kind === "μηνιαία";
    const hasStarted = start <= TODAY;
    return {
      ...d,
      state: hasStarted ? "ενεργή" : "υπογεγραμμένη",
      path: "Υπογράφηκε",
      start,
      end: isMonthly ? endOfTerm(start, d.terms.durationMonths ?? 6) : null,
      recipients: withLinks(d.recipients, "όλοι", "έληξε"),
      periods: isMonthly && hasStarted ? [currentPeriod(d, used, start)] : [],
      signature: {
        by: signatory?.name ?? "—",
        when,
        method: "εκτός συστήματος",
        file,
      },
    };
  };

export interface DissolveInput {
  when: string;
  reason: string;
  by: string;
  fee: number;
}

export const dissolve =
  (input: DissolveInput): Change =>
  (d) => ({ ...d, state: "λύθηκε", end: input.when, dissolution: input });
