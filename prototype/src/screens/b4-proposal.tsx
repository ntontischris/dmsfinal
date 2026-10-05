"use client";

import { useState } from "react";

import { Badge } from "@/screens/shared";

export type PathState =
  "Σύνταξη" | "Αναμένει Έγκριση" | "Εστάλη" | "Έληξε" | "Υπογράφηκε";
type LinkState = "ενεργός" | "ακυρώθηκε" | "έληξε" | "ανακλήθηκε";
type ApprovalState = "αναμένει" | "εγκρίθηκε" | "απορρίφθηκε";

export interface ProposalView {
  title: string;
  kind: "μηνιαία" | "εφάπαξ";
  path: PathState;
  revision: number;
  validUntil: string;
  deviations: readonly string[];
  approval: ApprovalState | null;
  hasLowMargin: boolean;
  lines: readonly {
    description: string;
    catalog: string | null;
    price: string;
  }[];
  total: string;
  cost: { total: string; margin: string; minMargin: string } | null;
  recipients: readonly {
    name: string;
    isSignatory: boolean;
    link: LinkState;
    opened: boolean;
  }[];
}

interface ProposalPanelProps {
  initial: ProposalView;
  canApprove: boolean;
  canManage: boolean;
  lossReasons: readonly string[];
  onLost: (reason: string) => void;
}

const LINK_TONE: Record<LinkState, "strong" | "attention" | undefined> = {
  ενεργός: "strong",
  ακυρώθηκε: "attention",
  έληξε: "attention",
  ανακλήθηκε: "attention",
};

export function ProposalPanel({
  initial,
  canApprove,
  canManage,
  lossReasons,
  onLost,
}: ProposalPanelProps) {
  const [view, setView] = useState(initial);
  const [comment, setComment] = useState("");
  const [closing, setClosing] = useState(false);

  const patch = (next: Partial<ProposalView>) =>
    setView((current) => ({ ...current, ...next }));
  const hasDeviation = view.deviations.length > 0;
  const mayEdit = canManage && view.path !== "Υπογράφηκε";
  const canSend = !hasDeviation || view.approval === "εγκρίθηκε" || canApprove;
  const linkAll = (link: LinkState) =>
    view.recipients.map((r) => ({ ...r, link }));

  const revise = () =>
    patch({
      path: "Σύνταξη",
      revision: view.revision + 1,
      recipients: linkAll("ακυρώθηκε"),
      approval: null,
    });
  const revoke = (name: string) =>
    patch({
      recipients: view.recipients.map((r) =>
        r.name === name ? { ...r, link: "ανακλήθηκε" } : r,
      ),
    });

  return (
    <section className="card">
      <div className="card-title">
        <h2>Πρόταση (Συμφωνία πριν την υπογραφή)</h2>
        <span className="btn-row">
          <Badge>{view.kind}</Badge>
          <Badge tone="strong">
            {view.path === "Υπογράφηκε"
              ? "υπογεγραμμένη"
              : `πρόταση · ${view.path}`}
          </Badge>
          <Badge>Αναθεώρηση {view.revision}</Badge>
          {view.cost && view.hasLowMargin && (
            <Badge tone="attention">Χαμηλό περιθώριο</Badge>
          )}
        </span>
      </div>
      <p>
        <strong>{view.title}</strong> · Ισχύς πρότασης έως {view.validUntil}
      </p>
      <div className="scroll">
        <table className="rtable">
          <thead>
            <tr>
              <th>Γραμμή</th>
              <th className="num">Τιμή Καταλόγου</th>
              <th className="num">
                Τιμή πρότασης{view.kind === "μηνιαία" && " / μήνα"}
              </th>
            </tr>
          </thead>
          <tbody>
            {view.lines.map((line) => (
              <tr key={line.description}>
                <td data-label="Γραμμή">{line.description}</td>
                <td className="num" data-label="Τιμή Καταλόγου">
                  {line.catalog ?? "Ελεύθερη γραμμή"}
                </td>
                <td className="num" data-label="Τιμή πρότασης">
                  {line.price}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Σύνολο: <strong>{view.total}</strong>
        {view.kind === "μηνιαία" && " / μήνα"} (χωρίς ΦΠΑ)
      </p>
      {view.cost && (
        <p className="note">
          Μόνο για όσους βλέπουν κόστος: εκτιμώμενο κόστος {view.cost.total},
          περιθώριο {view.cost.margin}, Ελάχιστο περιθώριο εταιρείας{" "}
          {view.cost.minMargin}. Το χαμηλό περιθώριο ειδοποιεί, δεν μπλοκάρει
          την αποστολή.
        </p>
      )}

      <h3>Παρέκκλιση και Έγκριση πρότασης</h3>
      {!hasDeviation ? (
        <p className="muted">
          Καμία Παρέκκλιση από τον Κατάλογο. Δεν χρειάζεται Έγκριση.
        </p>
      ) : (
        <>
          <ul className="list">
            {view.deviations.map((deviation) => (
              <li key={deviation}>{deviation}</li>
            ))}
          </ul>
          <p>
            Έγκριση:{" "}
            <Badge
              tone={view.approval === "εγκρίθηκε" ? "strong" : "attention"}
            >
              {view.approval ?? "δεν έχει ζητηθεί"}
            </Badge>
          </p>
        </>
      )}
      {mayEdit && view.path === "Σύνταξη" && (
        <div className="btn-row">
          {hasDeviation && !canApprove && view.approval !== "εγκρίθηκε" && (
            <button
              type="button"
              className="button"
              data-primary="true"
              onClick={() =>
                patch({ path: "Αναμένει Έγκριση", approval: "αναμένει" })
              }
            >
              Αίτημα έγκρισης
            </button>
          )}
          <button
            type="button"
            className="button"
            data-primary="true"
            disabled={!canSend}
            onClick={() =>
              patch({ path: "Εστάλη", recipients: linkAll("ενεργός") })
            }
          >
            Αποστολή σε κάθε παραλήπτη
          </button>
          {!canSend && (
            <span className="muted">
              Η πρόταση έχει Παρέκκλιση και δεν στέλνεται χωρίς Έγκριση.
            </span>
          )}
        </div>
      )}
      {view.path === "Αναμένει Έγκριση" &&
        (canApprove ? (
          <div className="toolbar">
            <input
              className="input grow"
              placeholder="Σχόλιο Εγκριτή"
              aria-label="Σχόλιο Εγκριτή"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            <button
              type="button"
              className="button"
              data-primary="true"
              onClick={() => patch({ path: "Σύνταξη", approval: "εγκρίθηκε" })}
            >
              Έγκριση
            </button>
            <button
              type="button"
              className="button"
              data-danger="true"
              onClick={() =>
                patch({ path: "Σύνταξη", approval: "απορρίφθηκε" })
              }
            >
              Απόρριψη
            </button>
          </div>
        ) : (
          <p className="muted">
            Αναμένει Έγκριση από όσους έχουν το Δικαίωμα «Παρεκκλίνει από τον
            Κατάλογο». Δεν στέλνεται ακόμα.
          </p>
        ))}

      <h3>Υπογράφων και Σύνδεσμοι πρότασης</h3>
      <ul className="list">
        {view.recipients.map((recipient) => (
          <li key={recipient.name} className="row">
            <span>
              {recipient.name}{" "}
              {recipient.isSignatory ? (
                <Badge tone="strong">Υπογράφων</Badge>
              ) : (
                <Badge>Παραλήπτης</Badge>
              )}
            </span>
            <span className="btn-row">
              {recipient.opened && (
                <span className="muted">άνοιξε τον Σύνδεσμο</span>
              )}
              <Badge tone={LINK_TONE[recipient.link]}>
                Σύνδεσμος: {recipient.link}
              </Badge>
              {mayEdit && recipient.link === "ενεργός" && (
                <button
                  type="button"
                  className="button"
                  onClick={() => revoke(recipient.name)}
                >
                  Ανάκληση
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
      <p className="note">
        Υπογράφει μόνο ο Υπογράφων. Οι άλλοι παραλήπτες μπορούν μόνο να ζητήσουν
        «Θέλω αλλαγές».
      </p>

      {mayEdit && view.path === "Εστάλη" && (
        <button type="button" className="button" onClick={revise}>
          Νέα αναθεώρηση (ακυρώνει τους παλιούς συνδέσμους)
        </button>
      )}
      {mayEdit && view.path === "Έληξε" && (
        <div className="toolbar">
          <button
            type="button"
            className="button"
            data-primary="true"
            onClick={() =>
              patch({
                path: "Εστάλη",
                validUntil: "04/10/2026",
                recipients: linkAll("ενεργός"),
              })
            }
          >
            Παράταση (νέος Σύνδεσμος, ίδιες τιμές)
          </button>
          {closing ? (
            <select
              className="select"
              aria-label="Λόγος απώλειας"
              defaultValue=""
              onChange={(event) => onLost(event.target.value)}
            >
              <option value="" disabled>
                Λόγος απώλειας (υποχρεωτικός)
              </option>
              {lossReasons.map((reason) => (
                <option key={reason}>{reason}</option>
              ))}
            </select>
          ) : (
            <button
              type="button"
              className="button"
              onClick={() => setClosing(true)}
            >
              Κλείσιμο ως χαμένη
            </button>
          )}
          <span className="muted">
            Η λήξη δεν χάνει την Ευκαιρία: μένει ανοιχτή μέχρι να αποφασίσεις.
          </span>
        </div>
      )}
      {view.path === "Υπογράφηκε" && (
        <p className="note">
          Υπογράφηκε. Οι όροι έχουν παγώσει και συνεχίζει η Συμφωνία.
        </p>
      )}
    </section>
  );
}
