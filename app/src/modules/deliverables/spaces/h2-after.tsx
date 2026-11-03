"use client";

import { useState } from "react";

import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";

import { cancelDeliverable } from "../actions-deliverable";
import { setFinalFiles } from "../actions-requests";
import { historyLines } from "../history";
import type { DeliverableDetail } from "../types";
import { H2Form } from "./h2-form";
import { CANCEL_WORDS, fmtDay, type PanelProps } from "./h2-model";

// Τελικά αρχεία, Ακύρωση και Ίχνος του H2 (prototype `screens/h2-after.tsx`).

export function H2FinalFiles({ detail }: PanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  if (detail.state !== "approved") return null;
  const approved = detail.versions.find((v) => v.state === "approved");
  const link = detail.finalFilesUrl ?? approved?.url;
  return (
    <Panel
      label="Τελικά αρχεία"
      aside={
        detail.approvedAt && (
          <span className="muted">εγκρίθηκε {fmtDay(detail.approvedAt)}</span>
        )
      }
    >
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
        {detail.finalFilesUrl
          ? "Η ομάδα όρισε άλλο link από της εγκεκριμένης Έκδοσης."
          : "Προεπιλογή: το link της εγκεκριμένης Έκδοσης."}
      </p>
      {detail.can.edit && !isEditing && (
        <button
          type="button"
          className="button"
          onClick={() => setIsEditing(true)}
        >
          Ορισμός άλλου link
        </button>
      )}
      {isEditing && (
        <H2Form
          action={setFinalFiles}
          submitLabel="Αποθήκευση link"
          hidden={{ deliverableId: detail.id }}
          isPrimary
          onSuccess={() => setIsEditing(false)}
          onClose={() => setIsEditing(false)}
        >
          <label>
            Link Τελικών αρχείων
            <input
              className="input"
              type="url"
              name="url"
              placeholder="https://"
              defaultValue={detail.finalFilesUrl ?? ""}
              autoComplete="off"
            />
          </label>
          <span className="muted">
            Βεβαιώσου ότι ανοίγει σε όποιον έχει τον σύνδεσμο. Κενό: το link της
            εγκεκριμένης Έκδοσης.
          </span>
        </H2Form>
      )}
    </Panel>
  );
}

function Cancelled({ detail }: { detail: DeliverableDetail }) {
  return (
    <Panel label="Ακύρωση">
      <p>
        Ακυρώθηκε. Λόγος: {detail.cancelReason ?? "—"}.
        {detail.cancelOutcome &&
          ` Η Παροχή ${CANCEL_WORDS[detail.cancelOutcome]}.`}
      </p>
    </Panel>
  );
}

export function H2Cancel({ detail }: PanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  if (detail.state === "cancelled") return <Cancelled detail={detail} />;
  if (!detail.can.cancel) return null;
  return (
    <Panel label="Ακύρωση Παραδοτέου">
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
        <H2Form
          action={cancelDeliverable}
          submitLabel="Ακύρωση Παραδοτέου"
          hidden={{ deliverableId: detail.id }}
          isDanger
          onSuccess={() => setIsOpen(false)}
          onClose={() => setIsOpen(false)}
        >
          <label>
            Λόγος ακύρωσης (υποχρεωτικός)
            <input className="input" name="reason" required aria-required />
          </label>
          <label>
            Η Παροχή
            <select className="select" name="outcome" defaultValue="returned">
              <option value="consumed">καταναλώθηκε</option>
              <option value="returned">επιστρέφει στην επόμενη Περίοδο</option>
            </select>
          </label>
        </H2Form>
      )}
      <p className="muted">Δεν ακυρώνεται εγκεκριμένο Παραδοτέο.</p>
    </Panel>
  );
}

// Το Ίχνος όπως το δίνει η βάση (νεότερο πρώτο).
export function H2Trail({ detail }: Pick<PanelProps, "detail">) {
  const lines = historyLines(detail.history);
  return (
    <Panel label="Ίχνος ενεργειών">
      {lines.length === 0 ? (
        <p className="muted">Δεν υπάρχουν ακόμα ενέργειες.</p>
      ) : (
        <RowList>
          {lines.map((line, index) => (
            <ListRow
              key={`${index}-${line.at}`}
              lead={fmtDay(line.at)}
              title={`${line.actor}: ${line.text}`}
            />
          ))}
        </RowList>
      )}
    </Panel>
  );
}
