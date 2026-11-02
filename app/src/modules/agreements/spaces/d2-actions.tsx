"use client";

import { useState, type ReactNode } from "react";

import { Badge } from "@/spaces/screens/shared";

import {
  closeLost,
  extendProposal,
  requestApproval,
  sendProposal,
  withdrawApproval,
} from "../actions-flow";
import { MANUAL_DELIVERY_NOTE } from "../labels";
import type { AgreementDetail } from "../types";
import { ApprovalActions, RevisionButton } from "./d2-actions-review";
import { pathHint, type LossReason } from "./d2-model";
import { OutsideSignatureForm, type UsedKind } from "./d2-outside";
import { D2Form, D2Scope, IdField, NumberInput, plural } from "./d2-ui";

// Οι ενέργειες στην κορυφή της σελίδας (prototype `screens/d2-action-bar.tsx` + `d2-actions.tsx`). Φαίνονται μόνο όσες
// επιτρέπει το `can` της βάσης· κάθε κουμπί καλεί το πραγματικό action.

interface ActionsProps {
  agreement: AgreementDetail;
  lossReasons: readonly LossReason[];
  usedKinds: readonly UsedKind[];
  today: string;
  pendingDays: number | null;
  preview: ReactNode | null; // «Όπως θα τη δει ο πελάτης»: μόνο για όποιον «Βλέπει ποσά»
}

function SendActions({ agreement }: { agreement: AgreementDetail }) {
  const { can } = agreement;
  const missing = agreement.deviations.filter(
    (d) => d.status !== "covered",
  ).length;
  return (
    <>
      {can.requestApproval && (
        <D2Form
          action={requestApproval}
          submitLabel="Αίτημα έγκρισης"
          isPrimary
          className="btn-row"
        >
          <IdField id={agreement.id} />
        </D2Form>
      )}
      {can.send && (
        <D2Form
          action={sendProposal}
          submitLabel="Αποστολή"
          isPrimary={!can.requestApproval}
          className="btn-row"
        >
          <IdField id={agreement.id} />
        </D2Form>
      )}
      {can.requestApproval && (
        <span className="muted">
          Έχει {plural(missing, "Παρέκκλιση", "Παρεκκλίσεις")} χωρίς Έγκριση:
          δεν στέλνεται χωρίς Έγκριση.
        </span>
      )}
      {can.send && !agreement.emailSenderConnected && (
        <span className="muted">{MANUAL_DELIVERY_NOTE}</span>
      )}
    </>
  );
}

function ExpiredActions({
  agreement,
  lossReasons,
}: Pick<ActionsProps, "agreement" | "lossReasons">) {
  const { can } = agreement;
  return (
    <>
      {can.extend && (
        <D2Form
          action={extendProposal}
          submitLabel="Παράταση"
          isPrimary
          className="btn-row"
        >
          <IdField id={agreement.id} />
          <NumberInput
            name="days"
            label="Μέρες Παράτασης"
            placeholder={String(agreement.proposalValidityDays)}
            suffix="μέρες"
          />
        </D2Form>
      )}
      {can.closeLost && (
        <D2Form
          action={closeLost}
          submitLabel="Κλείσιμο ως χαμένη"
          isDanger
          className="btn-row"
        >
          <IdField id={agreement.id} />
          <select
            className="select"
            name="lossReasonId"
            aria-label="Λόγος απώλειας"
            defaultValue=""
            required
          >
            <option value="">Λόγος απώλειας…</option>
            {lossReasons.map((reason) => (
              <option key={reason.id} value={reason.id}>
                {reason.label}
              </option>
            ))}
          </select>
        </D2Form>
      )}
      {can.extend && (
        <span className="muted">
          Η Παράταση δίνει νέο σύνδεσμο με τις ίδιες τιμές, χωρίς Έγκριση. Κενό
          = η προεπιλογή.
        </span>
      )}
    </>
  );
}

function PendingBadge({ days }: { days: number | null }) {
  return (
    <Badge tone="attention">
      {days === null || days === 0
        ? "Αναμένει Έγκριση από σήμερα"
        : `Αναμένει Έγκριση · ${plural(days, "μέρα", "μέρες")}`}
    </Badge>
  );
}

function FlowActions(props: ActionsProps) {
  const { agreement, usedKinds, today, pendingDays } = props;
  const { can } = agreement;
  return (
    <>
      <SendActions agreement={agreement} />
      {agreement.path === "awaiting_approval" &&
        (can.decide ? (
          <ApprovalActions agreementId={agreement.id} />
        ) : (
          <PendingBadge days={pendingDays} />
        ))}
      {can.withdrawApproval && (
        <D2Form
          action={withdrawApproval}
          submitLabel="Απόσυρση αιτήματος"
          className="btn-row"
        >
          <IdField id={agreement.id} />
        </D2Form>
      )}
      {can.newRevision && <RevisionButton agreement={agreement} />}
      <ExpiredActions agreement={agreement} lossReasons={props.lossReasons} />
      {can.signOutside && (
        <OutsideSignatureForm
          agreement={agreement}
          kinds={usedKinds}
          today={today}
        />
      )}
    </>
  );
}

export function ActionBar(props: ActionsProps) {
  const { agreement, preview } = props;
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const hint = pathHint(agreement);
  const isProposal = agreement.state === "proposal";
  return (
    <>
      <section className="card d2-actions" aria-label="Ενέργειες">
        {hint && <p className="muted">{hint}</p>}
        <D2Scope>
          <div className="btn-row">
            {isProposal && <FlowActions {...props} />}
            {preview && (
              <button
                type="button"
                className="button"
                aria-expanded={isPreviewOpen}
                onClick={() => setIsPreviewOpen(!isPreviewOpen)}
              >
                {isPreviewOpen
                  ? "Κλείσιμο προεπισκόπησης"
                  : "Όπως θα τη δει ο πελάτης"}
              </button>
            )}
          </div>
        </D2Scope>
      </section>
      {isPreviewOpen && preview && (
        <section
          className="card d2-preview"
          aria-label="Όπως θα τη δει ο πελάτης"
        >
          {preview}
        </section>
      )}
    </>
  );
}
