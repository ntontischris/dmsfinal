"use client";

import { useState } from "react";

import type { AgreementRecord } from "@/data/agreements";
import type { AgreementCaps } from "@/data/agreements-access";
import { TODAY } from "@/data/sales";
import { dissolve, type Change } from "@/screens/d2-transitions";
import { NumberInput } from "@/screens/d2-ui";
import { fmtDate } from "@/screens/shared";

interface SignedProps {
  draft: AgreementRecord;
  caps: AgreementCaps;
  actor: string;
  act: (change: Change, notice: string) => void;
  notify: (notice: string) => void;
  hasNoContinuation: boolean;
  onNoContinuation: (value: boolean) => void;
}

function DissolveForm({
  draft,
  actor,
  act,
  onCancel,
}: Pick<SignedProps, "draft" | "actor" | "act"> & { onCancel: () => void }) {
  const [when, setWhen] = useState(TODAY);
  const [reason, setReason] = useState("");
  const [fee, setFee] = useState(draft.terms.dissolution.fee);
  const confirm = () =>
    act(
      dissolve({ when, reason: reason.trim(), by: actor, fee }),
      `Η Συμφωνία λύθηκε στις ${fmtDate(when)}.${fee > 0 ? " Γεννήθηκε Τιμολογητέο λύσης." : ""}`,
    );
  return (
    <fieldset className="d2-form">
      <legend>Λύση</legend>
      <label className="stack">
        <span className="muted">Ημερομηνία</span>
        <input
          className="input"
          type="date"
          value={when}
          onChange={(e) => setWhen(e.target.value || TODAY)}
        />
      </label>
      <label className="stack">
        <span className="muted">Λόγος (υποχρεωτικός)</span>
        <input
          className="input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <span className="stack">
        <span className="muted">Ρήτρα (από τους Όρους, αλλάζει)</span>
        <NumberInput
          label="Ποσό ρήτρας"
          value={fee}
          step={50}
          onChange={setFee}
          suffix="€"
        />
      </span>
      <p className="note">
        Δεν γεννιούνται νέες Περίοδοι ή Τιμολογητέα· όσα έχουν γεννηθεί μένουν.
      </p>
      <span className="btn-row">
        <button
          type="button"
          className="button"
          data-danger="true"
          disabled={!reason.trim()}
          onClick={confirm}
        >
          Λύση
        </button>
        <button type="button" className="button" onClick={onCancel}>
          Άκυρο
        </button>
      </span>
    </fieldset>
  );
}

function RenewalActions({
  draft,
  notify,
  hasNoContinuation,
  onNoContinuation,
}: SignedProps) {
  const isAutomatic = draft.terms.renewal === "αυτόματη συνέχιση";
  return (
    <>
      <button
        type="button"
        className="button"
        onClick={() =>
          notify(
            "Άνοιξε νέα Ευκαιρία «ανανέωση» με πρόταση στις τρέχουσες τιμές του Καταλόγου.",
          )
        }
      >
        Ανανέωση
      </button>
      {isAutomatic && (
        <label className="d2-ask">
          <span>
            <input
              type="checkbox"
              checked={hasNoContinuation}
              onChange={(e) => onNoContinuation(e.target.checked)}
            />{" "}
            Χωρίς συνέχιση
          </span>
          <span className="muted">
            {hasNoContinuation
              ? "Στη λήξη η Συμφωνία τελειώνει."
              : "Στη λήξη η ίδια Συμφωνία συνεχίζει για άλλη μία Διάρκεια, ίδιοι Όροι και τιμές."}
          </span>
        </label>
      )}
    </>
  );
}

// Υπογεγραμμένη ή ενεργή: PDF για όλους, Λύση και Ανανέωση για όσους έχουν το Δικαίωμα.
export function SignedActions(props: SignedProps) {
  const { draft, caps, notify } = props;
  const [isDissolving, setIsDissolving] = useState(false);
  const isLive = draft.state === "υπογεγραμμένη" || draft.state === "ενεργή";
  const pdf = (
    <button
      type="button"
      className="button"
      onClick={() => notify(`Κατέβηκε το PDF «${draft.title}».`)}
    >
      Κατέβασμα PDF
    </button>
  );
  if (!isLive) return pdf;
  return (
    <>
      {pdf}
      {caps.canCompose && draft.kind === "μηνιαία" && (
        <RenewalActions {...props} />
      )}
      {caps.canDissolve &&
        (isDissolving ? (
          <DissolveForm
            draft={draft}
            actor={props.actor}
            act={props.act}
            onCancel={() => setIsDissolving(false)}
          />
        ) : (
          <button
            type="button"
            className="button"
            data-danger="true"
            onClick={() => setIsDissolving(true)}
          >
            Λύση
          </button>
        ))}
    </>
  );
}
