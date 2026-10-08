"use client";

import type { ReactNode } from "react";

import { Field, Input, Select } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import {
  closeLost,
  extendProposal,
  newRevision,
  requestApproval,
  sendProposal,
  withdrawApproval,
} from "../actions-flow";
import { MANUAL_DELIVERY_NOTE } from "../labels";
import type { AgreementDetail, KindInfo } from "../types";

import { NoticeScope, ScopedForm } from "./agreement-actions-parts";
import { DecisionForm } from "./decision-form";
import { OutsideSignForm, type UsedKind } from "./outside-sign-form";
import { MutedNote, plural } from "./terms-section-parts";

export interface LossReasonOption {
  id: string;
  label: string;
}

interface AgreementActionsProps {
  agreement: AgreementDetail;
  lossReasons: readonly LossReasonOption[];
  kinds: readonly KindInfo[];
  today: string; // YYYY-MM-DD, ημέρα Αθήνας
  pendingDays: number | null; // πόσες μέρες περιμένει Έγκριση (μόνο σε path awaiting_approval)
}

const REVISION_SENT_NOTE = (next: number): string =>
  `Θα γίνει αναθεώρηση ${next} και οι Σύνδεσμοι θα ακυρωθούν· αν η αλλαγή προσθέτει ή βαθαίνει Παρέκκλιση θα θέλει νέα Έγκριση.`;

const Block = ({ children }: { children: ReactNode }) => (
  <div className="grid content-start gap-2 rounded-sm border p-3">
    {children}
  </div>
);

const IdField = ({ id }: { id: string }) => (
  <input type="hidden" name="agreementId" value={id} />
);

function SendBlock({ agreement }: { agreement: AgreementDetail }) {
  return (
    <Block>
      <ScopedForm
        action={sendProposal}
        submitLabel="Αποστολή"
        variant="primary"
      >
        <IdField id={agreement.id} />
        {!agreement.emailSenderConnected && (
          <MutedNote>{MANUAL_DELIVERY_NOTE}</MutedNote>
        )}
      </ScopedForm>
    </Block>
  );
}

function RequestApprovalBlock({ agreement }: { agreement: AgreementDetail }) {
  const missing = agreement.deviations.filter(
    (deviation) => deviation.status !== "covered",
  ).length;
  return (
    <Block>
      <ScopedForm action={requestApproval} submitLabel="Αίτημα έγκρισης">
        <IdField id={agreement.id} />
        <MutedNote>
          Έχει {plural(missing, "Παρέκκλιση", "Παρεκκλίσεις")} χωρίς Έγκριση:
          δεν στέλνεται χωρίς Έγκριση από όποιον «Παρεκκλίνει από τον Κατάλογο».
        </MutedNote>
      </ScopedForm>
    </Block>
  );
}

function WithdrawBlock({ agreementId }: { agreementId: string }) {
  return (
    <Block>
      <ScopedForm action={withdrawApproval} submitLabel="Απόσυρση αιτήματος">
        <IdField id={agreementId} />
      </ScopedForm>
    </Block>
  );
}

function RevisionBlock({ agreement }: { agreement: AgreementDetail }) {
  const next = agreement.revision + 1;
  const note =
    agreement.path === "sent"
      ? REVISION_SENT_NOTE(next)
      : `Θα γίνει αναθεώρηση ${next} με νέα Ισχύς· οι παλιοί Σύνδεσμοι ακυρώνονται.`;
  return (
    <Block>
      <ScopedForm action={newRevision} submitLabel="Νέα αναθεώρηση">
        <IdField id={agreement.id} />
        <Field label="Τι αλλάζει (προαιρετικά)">
          <Input name="summary" autoComplete="off" />
        </Field>
        <MutedNote>{note}</MutedNote>
      </ScopedForm>
    </Block>
  );
}

function ExtendBlock({ agreement }: { agreement: AgreementDetail }) {
  return (
    <Block>
      <ScopedForm action={extendProposal} submitLabel="Παράταση">
        <IdField id={agreement.id} />
        <Field label="Μέρες">
          <Input
            name="days"
            inputMode="numeric"
            placeholder={String(agreement.proposalValidityDays)}
            autoComplete="off"
          />
        </Field>
        <MutedNote>
          Κενό = η προεπιλογή. Ίδιες τιμές και Όροι, νέοι Σύνδεσμοι, χωρίς
          Έγκριση.
        </MutedNote>
      </ScopedForm>
    </Block>
  );
}

interface CloseLostBlockProps {
  agreementId: string;
  reasons: readonly LossReasonOption[];
}

function CloseLostBlock({ agreementId, reasons }: CloseLostBlockProps) {
  return (
    <Block>
      <ScopedForm
        action={closeLost}
        submitLabel="Κλείσιμο ως χαμένη"
        variant="danger"
      >
        <IdField id={agreementId} />
        <Field label="Λόγος απώλειας">
          <Select name="lossReasonId" defaultValue="" required>
            <option value="">Διάλεξε Λόγο…</option>
            {reasons.map((reason) => (
              <option key={reason.id} value={reason.id}>
                {reason.label}
              </option>
            ))}
          </Select>
        </Field>
        <MutedNote>Η Ευκαιρία κλείνει επίσης ως χαμένη.</MutedNote>
      </ScopedForm>
    </Block>
  );
}

// Τα είδη Παροχής που υπάρχουν στις γραμμές, με τη μονάδα τους (για τα «έχουν ήδη καταναλωθεί»).
const usedKinds = (
  agreement: AgreementDetail,
  kinds: readonly KindInfo[],
): UsedKind[] => {
  const ids = new Set(
    agreement.lines.flatMap((line) =>
      line.provisions.map((provision) => provision.kindId),
    ),
  );
  return kinds
    .filter((kind) => ids.has(kind.id))
    .map((kind) => ({ id: kind.id, unit: kind.unit }));
};

const signatoryName = (agreement: AgreementDetail): string =>
  agreement.recipients.find((recipient) => recipient.isSignatory)?.name ?? "";

interface Entry {
  key: string;
  node: ReactNode;
}

const isEntry = (value: Entry | false): value is Entry => value !== false;

function entriesOf(props: AgreementActionsProps): Entry[] {
  const { agreement, lossReasons, kinds, today } = props;
  const { can } = agreement;
  const list: (Entry | false)[] = [
    can.send && { key: "send", node: <SendBlock agreement={agreement} /> },
    can.requestApproval && {
      key: "request",
      node: <RequestApprovalBlock agreement={agreement} />,
    },
    can.withdrawApproval && {
      key: "withdraw",
      node: <WithdrawBlock agreementId={agreement.id} />,
    },
    can.decide && {
      key: "decide",
      node: (
        <Block>
          <DecisionForm agreementId={agreement.id} />
        </Block>
      ),
    },
    can.newRevision && {
      key: "revision",
      node: <RevisionBlock agreement={agreement} />,
    },
    can.extend && {
      key: "extend",
      node: <ExtendBlock agreement={agreement} />,
    },
    can.closeLost && {
      key: "lost",
      node: <CloseLostBlock agreementId={agreement.id} reasons={lossReasons} />,
    },
    can.signOutside && {
      key: "outside",
      node: (
        <Block>
          <OutsideSignForm
            agreementId={agreement.id}
            defaultSignedBy={signatoryName(agreement)}
            today={today}
            isMonthly={agreement.kind === "monthly"}
            kinds={usedKinds(agreement, kinds)}
          />
        </Block>
      ),
    },
  ];
  return list.filter(isEntry);
}

// Μία γραμμή για ό,τι δεν έχει ενέργειες: περιμένει Έγκριση από άλλον, είναι χαμένη ή είναι υπογεγραμμένη.
function statusNote(props: AgreementActionsProps): string | null {
  const { agreement, pendingDays } = props;
  if (agreement.path === "lost")
    return "Η πρόταση έχει κλείσει ως χαμένη· δεν υπάρχουν ενέργειες.";
  if (agreement.state !== "proposal")
    return "Η Συμφωνία έχει υπογραφεί και δεν αλλάζει.";
  if (agreement.path === "awaiting_approval" && !agreement.can.decide)
    return pendingDays === null || pendingDays === 0
      ? "Αναμένει Έγκριση από σήμερα."
      : `Αναμένει Έγκριση από ${plural(pendingDays, "μέρα", "μέρες")}.`;
  return null;
}

// Οι ενέργειες ροής: μόνο όσες επιτρέπει το `can` της βάσης. Κάθε μία είναι δική της φόρμα· το μήνυμα μένει στη θέση του
// και όταν η ενέργεια αλλάζει την κατάσταση και το κουμπί της φεύγει.
export function AgreementActions(props: AgreementActionsProps) {
  const entries = entriesOf(props);
  const note = statusNote(props);
  if (entries.length === 0 && note === null) return null;
  return (
    <Panel label="Ενέργειες">
      <NoticeScope>
        {entries.length > 0 && (
          <div className="grid items-start gap-3 md:grid-cols-2">
            {entries.map((entry) => (
              <div key={entry.key} className="contents">
                {entry.node}
              </div>
            ))}
          </div>
        )}
        {note && <MutedNote>{note}</MutedNote>}
      </NoticeScope>
    </Panel>
  );
}
