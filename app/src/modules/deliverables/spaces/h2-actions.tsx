"use client";

import { useState } from "react";

import { Panel } from "@/spaces/kit/panel";

import {
  addVersion,
  approveDeliverableInternally,
  fixDeliverableLink,
  returnVersion,
  sendVersion,
} from "../actions-versions";
import { ButtonForm, H2Form } from "./h2-form";
import { latestOf, type H2Context, type PanelProps } from "./h2-model";

// Οι Ενέργειες του H2 (prototype `screens/h2-actions.tsx`) πάνω στα δικαιώματα που δίνει η βάση (`can`).
// Δεν μεταφέρθηκαν: «Στείλε υπενθύμιση έγκρισης» και «Ενέκρινε στο τηλέφωνο» (δεν υπάρχουν στη βάση).

type Dialog = "new" | "fix" | "return" | null;

const LINK_HINT = "Βεβαιώσου ότι ανοίγει σε όποιον έχει τον σύνδεσμο.";

const destinationOf = (ctx: H2Context): string | null => {
  if (ctx.goesToReview === null) return null;
  return ctx.goesToReview
    ? "Πάει πρώτα σε εσωτερικό έλεγχο· ο πελάτης τη βλέπει αφού περάσει τον έλεγχο."
    : "Πάει κατευθείαν στον πελάτη με email.";
};

const ruleNoteOf = (
  isInternal: boolean,
  internalReview: boolean | null,
): string | null => {
  if (isInternal)
    return "Εσωτερική Παραγωγή: κάθε Έκδοση περνά από έλεγχο και ο Ελεγκτής εγκρίνει.";
  if (internalReview === null) return null;
  return internalReview
    ? "Η Έκδοση μη-Ελεγκτή αναμένει εσωτερικό έλεγχο· του Ελεγκτή πάει κατευθείαν στον πελάτη."
    : "Ο εσωτερικός έλεγχος είναι κλειστός: κάθε Έκδοση πάει κατευθείαν στον πελάτη.";
};

function ReviewButtons({
  detail,
  open,
}: PanelProps & { open: (dialog: Dialog) => void }) {
  const latest = latestOf(detail);
  if (latest?.state !== "in_review") return null;
  const { can } = detail;
  if (!can.send && !can.return && !can.approveInternal)
    return (
      <p className="note">
        Η v{latest.number} αναμένει εσωτερικό έλεγχο. Ο πελάτης τη βλέπει αφού
        περάσει τον έλεγχο.
      </p>
    );
  const hidden = { deliverableId: detail.id };
  return (
    <div className="btn-row">
      {can.approveInternal && (
        <ButtonForm
          action={approveDeliverableInternally}
          label="Εγκρίνω (οριστικό)"
          hidden={hidden}
          isPrimary
        />
      )}
      {can.send && (
        <ButtonForm
          action={sendVersion}
          label="Στέλνω στον πελάτη"
          hidden={hidden}
          isPrimary
        />
      )}
      {can.return && (
        <button type="button" className="button" onClick={() => open("return")}>
          Επιστρέφω
        </button>
      )}
    </div>
  );
}

function Forms({
  detail,
  ctx,
  dialog,
  close,
}: PanelProps & { dialog: Dialog; close: () => void }) {
  const hidden = { deliverableId: detail.id };
  if (dialog === "new") {
    const destination = destinationOf(ctx);
    return (
      <H2Form
        action={addVersion}
        submitLabel="Προσθήκη Έκδοσης"
        hidden={hidden}
        isPrimary
        onSuccess={close}
        onClose={close}
      >
        <label>
          Link Έκδοσης (Google Drive, Vimeo ή YouTube)
          <input
            className="input"
            type="url"
            name="url"
            placeholder="https://"
            required
            autoComplete="off"
          />
        </label>
        <span className="muted">{LINK_HINT}</span>
        <label>
          Τι άλλαξε σε αυτή την Έκδοση (προαιρετικό)
          <textarea className="input" name="note" rows={2} />
        </label>
        {destination && <p className="note">{destination}</p>}
      </H2Form>
    );
  }
  if (dialog === "fix")
    return (
      <H2Form
        action={fixDeliverableLink}
        submitLabel="Διόρθωση link"
        hidden={hidden}
        isPrimary
        onSuccess={close}
        onClose={close}
      >
        <label>
          Σωστό link για την τελευταία Έκδοση
          <input
            className="input"
            type="url"
            name="url"
            placeholder="https://"
            required
            autoComplete="off"
          />
        </label>
        <span className="muted">{LINK_HINT}</span>
      </H2Form>
    );
  if (dialog === "return")
    return (
      <H2Form
        action={returnVersion}
        submitLabel="Επιστρέφω"
        hidden={hidden}
        onSuccess={close}
        onClose={close}
      >
        <label>
          Σημείωση επιστροφής (υποχρεωτική)
          <input className="input" name="note" required aria-required />
        </label>
      </H2Form>
    );
  return null;
}

export function H2Actions(props: PanelProps) {
  const { detail } = props;
  const [dialog, setDialog] = useState<Dialog>(null);
  if (detail.state === "approved" || detail.state === "cancelled") return null;
  const canFix = detail.can.edit && detail.versionCount > 0;
  const ruleNote = ruleNoteOf(detail.client === null, props.ctx.internalReview);
  return (
    <Panel label="Ενέργειες">
      {(detail.can.addVersion || canFix) && (
        <div className="btn-row">
          {detail.can.addVersion && (
            <button
              type="button"
              className="button"
              data-primary
              onClick={() => setDialog("new")}
            >
              Νέα Έκδοση
            </button>
          )}
          {canFix && (
            <button
              type="button"
              className="button"
              onClick={() => setDialog("fix")}
            >
              Διόρθωση link
            </button>
          )}
        </div>
      )}
      <ReviewButtons {...props} open={setDialog} />
      <Forms {...props} dialog={dialog} close={() => setDialog(null)} />
      {ruleNote && <p className="muted">{ruleNote}</p>}
    </Panel>
  );
}
