"use client";

import { useState } from "react";

interface DecisionProps {
  roundsUsed: number;
  roundsLimit: number;
  hasClientComments: boolean;
  onApprove: () => void;
  onRequestChanges: (note: string) => void;
}

export function H4Decision({
  roundsUsed,
  roundsLimit,
  hasClientComments,
  onApprove,
  onRequestChanges,
}: DecisionProps) {
  const [mode, setMode] = useState<"none" | "approve" | "changes">("none");
  const [note, setNote] = useState("");
  const [isAcked, setIsAcked] = useState(false);
  const isCharged = roundsUsed >= roundsLimit;
  const canRequest =
    (note.trim().length > 0 || hasClientComments) && (!isCharged || isAcked);

  return (
    <section className="card">
      <div className="card-title">
        <h2>Η απάντησή σου</h2>
        <span className="muted">
          γύροι αλλαγών: {roundsUsed} από {roundsLimit}
        </span>
      </div>
      <div className="btn-row">
        <button
          type="button"
          className="button"
          data-primary="true"
          onClick={() => setMode("approve")}
        >
          Έγκριση
        </button>
        <button
          type="button"
          className="button"
          onClick={() => setMode("changes")}
        >
          Ζητώ αλλαγές
        </button>
      </div>
      {mode === "approve" && (
        <div className="h34-form">
          <p className="h34-warn">Η έγκριση είναι οριστική.</p>
          <div className="btn-row">
            <button
              type="button"
              className="button"
              data-primary="true"
              onClick={onApprove}
            >
              Επιβεβαιώνω την έγκριση
            </button>
            <button
              type="button"
              className="button"
              onClick={() => setMode("none")}
            >
              Άκυρο
            </button>
          </div>
        </div>
      )}
      {mode === "changes" && (
        <div className="h34-form">
          {isCharged && (
            <p className="h34-warn">
              Αυτός ο γύρος είναι πέρα από το Όριο αλλαγών της Συμφωνίας σου και
              μπορεί να χρεωθεί.
            </p>
          )}
          <label>
            Τι θέλεις να αλλάξει;
            <input
              className="input"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          {!canRequest && !isCharged && (
            <span className="muted">
              Γράψε τι θέλεις να αλλάξει ή πρόσθεσε πρώτα σχόλια στην Έκδοση.
            </span>
          )}
          {isCharged && (
            <label className="h34-check">
              <input
                type="checkbox"
                checked={isAcked}
                onChange={(event) => setIsAcked(event.target.checked)}
              />
              Το καταλαβαίνω και θέλω να συνεχίσω
            </label>
          )}
          <div className="btn-row">
            <button
              type="button"
              className="button"
              data-primary="true"
              disabled={!canRequest}
              onClick={() => onRequestChanges(note.trim())}
            >
              Στέλνω το αίτημα αλλαγών
            </button>
            <button
              type="button"
              className="button"
              onClick={() => setMode("none")}
            >
              Άκυρο
            </button>
          </div>
        </div>
      )}
      <span className="muted">(prototype: δεν αποθηκεύεται)</span>
    </section>
  );
}
