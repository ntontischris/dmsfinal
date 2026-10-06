"use client";

import { useState } from "react";

import { LinkForm, ReasonForm } from "@/screens/h2-forms";
import { whoLabel, type PanelProps } from "@/screens/h2-model";
import { cancelDeliverable, setFinalFiles } from "@/screens/h2-reducers";
import { fmtDate } from "@/screens/shared";

export function H2FinalFiles({ ctx, live, update }: PanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const approved = live.versions.find((v) => v.state === "εγκρίθηκε");
  if (live.state !== "εγκρίθηκε") return null;
  const link = live.finalFiles ?? approved?.link;
  return (
    <section className="card">
      <div className="card-title">
        <h2>Τελικά αρχεία</h2>
        {live.approvedAt && (
          <span className="muted">εγκρίθηκε {fmtDate(live.approvedAt)}</span>
        )}
      </div>
      {link ? (
        <p>
          <a href={link} target="_blank" rel="noreferrer noopener">
            {link}
          </a>
        </p>
      ) : (
        <p className="muted">Δεν υπάρχει link.</p>
      )}
      <p className="muted">
        {live.finalFiles
          ? "Η ομάδα όρισε άλλο link από της εγκεκριμένης Έκδοσης."
          : "Προεπιλογή: το link της εγκεκριμένης Έκδοσης."}
      </p>
      {ctx.caps.canWork && !isEditing && (
        <button
          type="button"
          className="button"
          onClick={() => setIsEditing(true)}
        >
          Ορισμός άλλου link
        </button>
      )}
      {isEditing && (
        <LinkForm
          label="Link Τελικών αρχείων"
          confirmLabel="Αποθήκευση link"
          onSubmit={(next) => {
            update((l) => setFinalFiles(l, ctx, next));
            setIsEditing(false);
          }}
          onClose={() => setIsEditing(false)}
        />
      )}
    </section>
  );
}

export function H2Cancel({ ctx, live, update }: PanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [provision, setProvision] = useState<"καταναλώθηκε" | "επιστρέφει">(
    "καταναλώθηκε",
  );
  if (live.state === "ακυρώθηκε" && live.cancellation)
    return (
      <section className="card">
        <h2>Ακύρωση</h2>
        <p>
          Ακυρώθηκε. Λόγος: {live.cancellation.reason}. Η Παροχή{" "}
          {live.cancellation.provision}.
        </p>
      </section>
    );
  if (!ctx.caps.canWork || live.state === "εγκρίθηκε") return null;
  return (
    <section className="card">
      <h2>Ακύρωση Παραδοτέου</h2>
      {!isOpen ? (
        <button
          type="button"
          className="button"
          data-danger
          onClick={() => setIsOpen(true)}
        >
          Ακύρωση Παραδοτέου
        </button>
      ) : (
        <ReasonForm
          label="Λόγος ακύρωσης (υποχρεωτικός)"
          confirmLabel="Ακύρωση Παραδοτέου"
          isDanger
          extra={
            <label>
              Η Παροχή
              <select
                className="select"
                value={provision}
                onChange={(event) =>
                  setProvision(
                    event.target.value === "επιστρέφει"
                      ? "επιστρέφει"
                      : "καταναλώθηκε",
                  )
                }
              >
                <option value="καταναλώθηκε">καταναλώθηκε</option>
                <option value="επιστρέφει">
                  επιστρέφει στην επόμενη Περίοδο
                </option>
              </select>
            </label>
          }
          onConfirm={(reason) => {
            update((l) => cancelDeliverable(l, ctx, reason, provision));
            setIsOpen(false);
          }}
          onClose={() => setIsOpen(false)}
        />
      )}
      <p className="muted">Δεν ακυρώνεται εγκεκριμένο Παραδοτέο.</p>
    </section>
  );
}

export function H2Trail({ live }: Pick<PanelProps, "live">) {
  return (
    <section className="card">
      <div className="card-title">
        <h2>Ίχνος ενεργειών</h2>
      </div>
      {live.log.length === 0 ? (
        <p className="muted">Δεν υπάρχουν ακόμα ενέργειες.</p>
      ) : (
        <ul className="list">
          {live.log.map((line, index) => (
            <li key={`${index}-${line.what}`}>
              <span className="muted">{fmtDate(line.when)}</span>{" "}
              <strong>{whoLabel(line.who)}</strong>: {line.what}
              {line.notify && (
                <div className="muted">Ειδοποιείται: {line.notify}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
