"use client";

import { useState } from "react";

import { Panel } from "@/spaces/kit/panel";

import { answerDeliverable } from "../actions-client";
import { roundsLabel } from "./h3-adapter";
import { H34Form } from "./h4-form";

interface DecisionProps {
  deliverableId: string;
  roundsUsed: number;
  roundsLimit: number | null;
  // Από τη βάση: οι γύροι έφτασαν το Όριο αλλαγών.
  isOverLimit: boolean;
}

// Η απάντηση του πελάτη (prototype `screens/h4-decision.tsx`) πάνω στο answerDeliverable: η έγκριση στέλνει
// confirmFinal=1 μόνο από το «Επιβεβαιώνω», η ζήτηση αλλαγών θέλει σημείωση (όπως ο έλεγχος του server).
export function H4Decision({
  deliverableId,
  roundsUsed,
  roundsLimit,
  isOverLimit,
}: DecisionProps) {
  const [mode, setMode] = useState<"none" | "approve" | "changes">("none");
  const [note, setNote] = useState("");
  const [isAcked, setIsAcked] = useState(false);
  const canRequest = note.trim().length > 0 && (!isOverLimit || isAcked);

  return (
    <Panel
      label="Η απάντησή σου"
      aside={
        <span className="muted">{roundsLabel(roundsUsed, roundsLimit)}</span>
      }
    >
      {/* Δύο ισότιμες επιλογές· η πατημένη φαίνεται με ✓ και χρώμα. Τίποτα δεν στέλνεται πριν το επιβεβαιώσεις. */}
      <div className="btn-row" role="group" aria-label="Η απάντησή σου">
        <button
          type="button"
          className="button h34-choice"
          aria-pressed={mode === "approve"}
          onClick={() => setMode("approve")}
        >
          {mode === "approve" && <span aria-hidden="true">✓ </span>}Έγκριση
        </button>
        <button
          type="button"
          className="button h34-choice"
          aria-pressed={mode === "changes"}
          onClick={() => setMode("changes")}
        >
          {mode === "changes" && <span aria-hidden="true">✓ </span>}Ζητώ αλλαγές
        </button>
      </div>
      {mode === "none" && (
        <p className="muted">
          Διάλεξε ένα από τα δύο. Θα σε ρωτήσουμε ξανά πριν σταλεί.
        </p>
      )}
      {mode === "approve" && (
        <H34Form
          action={answerDeliverable}
          hidden={{ deliverableId, decision: "approve", note: "" }}
          submitLabel="Επιβεβαιώνω την έγκριση"
          submitField={{ name: "confirmFinal", value: "1" }}
          isPrimary
          onClose={() => setMode("none")}
        >
          <p className="h34-warn">Η έγκριση είναι οριστική.</p>
        </H34Form>
      )}
      {mode === "changes" && (
        <H34Form
          action={answerDeliverable}
          hidden={{ deliverableId, decision: "changes" }}
          submitLabel="Στέλνω το αίτημα αλλαγών"
          isPrimary
          isDisabled={!canRequest}
          onClose={() => setMode("none")}
        >
          {isOverLimit && (
            <p className="h34-warn">
              Αυτός ο γύρος είναι πέρα από το Όριο αλλαγών της Συμφωνίας σου και
              μπορεί να χρεωθεί.
            </p>
          )}
          <label>
            Τι θέλεις να αλλάξει;
            <input
              className="input"
              name="note"
              value={note}
              maxLength={2000}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          {!isOverLimit && (
            <span
              className="muted h34-hint"
              data-hidden={canRequest}
              aria-hidden={canRequest}
            >
              Γράψε τι θέλεις να αλλάξει για να σταλεί το αίτημα.
            </span>
          )}
          {isOverLimit && (
            <label className="h34-check">
              <input
                type="checkbox"
                checked={isAcked}
                onChange={(event) => setIsAcked(event.target.checked)}
              />
              Το καταλαβαίνω και θέλω να συνεχίσω
            </label>
          )}
        </H34Form>
      )}
    </Panel>
  );
}
