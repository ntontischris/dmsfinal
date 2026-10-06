"use client";

import { useState } from "react";

import { LinkForm, ReasonForm } from "@/screens/h2-forms";
import { latestOf, type PanelProps } from "@/screens/h2-model";
import {
  addVersion,
  approveVersion,
  fixLink,
  returnVersion,
  sendVersion,
} from "@/screens/h2-reducers";

type Dialog = "new" | "fix" | "return" | null;

function ReviewButtons({
  ctx,
  live,
  update,
  open,
}: PanelProps & { open: (dialog: Dialog) => void }) {
  const latest = latestOf(live);
  if (latest?.state !== "αναμένει εσωτερικό έλεγχο") return null;
  if (!ctx.caps.canReview)
    return (
      <p className="note">
        Η v{latest.number} αναμένει εσωτερικό έλεγχο: ειδοποιήθηκαν όσοι
        Ελέγχουν Παραδοτέα. Ο πελάτης δεν τη βλέπει.
      </p>
    );
  return (
    <div className="btn-row">
      {ctx.isInternalProduction ? (
        <button
          type="button"
          className="button"
          data-primary
          onClick={() => update((l) => approveVersion(l, ctx, latest.number))}
        >
          Εγκρίνω (οριστικό)
        </button>
      ) : (
        <button
          type="button"
          className="button"
          data-primary
          onClick={() => update((l) => sendVersion(l, ctx, latest.number))}
        >
          Στέλνω στον πελάτη
        </button>
      )}
      <button type="button" className="button" onClick={() => open("return")}>
        Επιστρέφω
      </button>
    </div>
  );
}

function Forms({
  ctx,
  live,
  update,
  dialog,
  close,
}: PanelProps & { dialog: Dialog; close: () => void }) {
  const latest = latestOf(live);
  if (dialog === "new")
    return (
      <LinkForm
        label="Link Έκδοσης (Google Drive, Vimeo ή YouTube)"
        confirmLabel="Προσθήκη Έκδοσης"
        onSubmit={(link, host) => {
          update((l) => addVersion(l, ctx, link, host));
          close();
        }}
        onClose={close}
      />
    );
  if (dialog === "fix")
    return (
      <LinkForm
        label="Σωστό link για την τελευταία Έκδοση"
        confirmLabel="Διόρθωση link"
        onSubmit={(link, host) => {
          update((l) => fixLink(l, ctx, link, host));
          close();
        }}
        onClose={close}
      />
    );
  if (dialog === "return" && latest)
    return (
      <ReasonForm
        label="Σημείωση επιστροφής (υποχρεωτική)"
        confirmLabel="Επιστρέφω"
        onConfirm={(note) => {
          update((l) => returnVersion(l, ctx, latest.number, note));
          close();
        }}
        onClose={close}
      />
    );
  return null;
}

export function H2Actions(props: PanelProps) {
  const { ctx, live } = props;
  const [dialog, setDialog] = useState<Dialog>(null);
  const isClosed = live.state === "εγκρίθηκε" || live.state === "ακυρώθηκε";
  if (!ctx.caps.canWork || isClosed) return null;
  return (
    <section className="card">
      <div className="card-title">
        <h2>Ενέργειες</h2>
      </div>
      <div className="btn-row">
        <button
          type="button"
          className="button"
          data-primary
          onClick={() => setDialog("new")}
        >
          Νέα Έκδοση
        </button>
        {latestOf(live) && (
          <button
            type="button"
            className="button"
            onClick={() => setDialog("fix")}
          >
            Διόρθωση link
          </button>
        )}
      </div>
      <ReviewButtons {...props} open={setDialog} />
      <Forms {...props} dialog={dialog} close={() => setDialog(null)} />
      {live.state === "αναμένει πελάτη" && (
        <p className="note">
          Δεν υπάρχει έγκριση για λογαριασμό του πελάτη. Αν ο πελάτης ενέκρινε
          τηλεφωνικά, ζήτησέ του να πατήσει το κουμπί στο email, ή παράδωσε την
          Παραγωγή χειροκίνητα με σχόλιο.
        </p>
      )}
      <p className="muted">
        {ctx.isInternalProduction
          ? "Εσωτερική Παραγωγή: κάθε Έκδοση περνά από έλεγχο και ο Ελεγκτής εγκρίνει."
          : ctx.internalReview
            ? "Η Έκδοση μη-Ελεγκτή αναμένει εσωτερικό έλεγχο· του Ελεγκτή πάει κατευθείαν στον πελάτη."
            : "Ο εσωτερικός έλεγχος είναι κλειστός: κάθε Έκδοση πάει κατευθείαν στον πελάτη."}{" "}
        (prototype: δεν αποθηκεύεται)
      </p>
    </section>
  );
}
