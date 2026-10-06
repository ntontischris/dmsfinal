"use client";

import { useState } from "react";

import type { CrewResponse } from "@/data/filming";
import { Badge } from "@/screens/shared";

import "./e5.css";

export interface SheetView {
  filmingId: string;
  clientName: string;
  where: string;
  when: string;
  version: number;
  change: string;
  sentAt: string;
  crew: readonly { name: string; skill: string; isMe: boolean }[];
  equipment: readonly string[];
  shotList: readonly string[];
  internalNote: string | null;
  myResponse: CrewResponse;
  myReason: string | null;
  ownerName: string;
}

// Η όψη του μέλους: απαντά «επιβεβαιώνω» ή «δεν μπορώ» (με λόγο). Το «δεν μπορώ» δεν αλλάζει το Γύρισμα.
export function E6Sheet({ sheet }: { sheet: SheetView }) {
  const [response, setResponse] = useState<CrewResponse>(sheet.myResponse);
  const [reason, setReason] = useState(sheet.myReason ?? "");
  const [isAsking, setIsAsking] = useState(false);

  const handleDecline = () => {
    if (!reason.trim()) return;
    setResponse("δεν μπορώ");
    setIsAsking(false);
  };
  const handleConfirm = () => {
    setResponse("επιβεβαιώνω");
    setIsAsking(false);
  };

  return (
    <section className="card">
      <div className="card-title">
        <h2>
          {sheet.clientName} · {sheet.when}
        </h2>
        <Badge tone="strong">Δελτίο έκδοση {sheet.version}</Badge>
      </div>
      <p className="note">
        Έκδοση {sheet.version} ({sheet.sentAt}): {sheet.change}.
      </p>
      <dl className="dl">
        <dt>Πού</dt>
        <dd>{sheet.where}</dd>
        <dt>Πότε</dt>
        <dd>{sheet.when}</dd>
        <dt>Ποιοι</dt>
        <dd>
          <ul className="list">
            {sheet.crew.map((person) => (
              <li key={person.name}>
                {person.name} ({person.skill}){person.isMe && " · εσύ"}
              </li>
            ))}
          </ul>
        </dd>
        <dt>Εξοπλισμός</dt>
        <dd>{sheet.equipment.join(", ") || "—"}</dd>
        <dt>Shot list</dt>
        <dd>
          <ol>
            {sheet.shotList.map((shot) => (
              <li key={shot}>{shot}</li>
            ))}
          </ol>
        </dd>
        {sheet.internalNote && (
          <>
            <dt>Εσωτερική σημείωση</dt>
            <dd>{sheet.internalNote}</dd>
          </>
        )}
      </dl>

      <h3>Η απάντησή σου</h3>
      <p>
        <Badge tone={response === "δεν μπορώ" ? "attention" : undefined}>
          {response}
        </Badge>
        {response === "δεν μπορώ" && reason && ` «${reason}»`}
      </p>
      <div className="btn-row">
        <button
          type="button"
          className="button"
          data-primary="true"
          onClick={handleConfirm}
          disabled={response === "επιβεβαιώνω"}
        >
          Επιβεβαιώνω
        </button>
        <button
          type="button"
          className="button"
          data-danger="true"
          onClick={() => setIsAsking(true)}
        >
          Δεν μπορώ
        </button>
      </div>
      {isAsking && (
        <div className="stack">
          <label className="stack">
            Λόγος (υποχρεωτικός)
            <textarea
              className="input"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <div className="btn-row">
            <button
              type="button"
              className="button"
              data-danger="true"
              disabled={!reason.trim()}
              onClick={handleDecline}
            >
              Στέλνω «δεν μπορώ»
            </button>
            <button
              type="button"
              className="button"
              onClick={() => setIsAsking(false)}
            >
              Άκυρο
            </button>
          </div>
        </div>
      )}
      <p className="note">
        Το «δεν μπορώ» ειδοποιεί τον Υπεύθυνο της Παραγωγής ({sheet.ownerName}),
        που βρίσκει αντικαταστάτη. <strong>Δεν αλλάζει το Γύρισμα</strong>: ο
        πελάτης δεν ενημερώνεται και το Γύρισμα μένει προγραμματισμένο.
        (prototype: δεν αποθηκεύεται)
      </p>
    </section>
  );
}
