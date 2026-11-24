"use client";

import { useState } from "react";

import { Badge } from "@/spaces/screens/shared";

import { decideRoundCharge } from "../actions-deliverable";
import type { DeliverableRoundCharge } from "../types";
import { H2Box } from "./h2-box";
import { ButtonForm, H2Form } from "./h2-form";
import { fmtDay, type PanelProps } from "./h2-model";

// Γύροι αλλαγών πέρα από το όριο της Συμφωνίας: η ομάδα αποφασίζει αν χρεώνεται (γίνεται Χρέωση) ή όχι.
// Η δουλειά δεν σταματά· η απόφαση γράφεται με όνομα και ημέρα.

function RoundChoices({ charge }: { charge: DeliverableRoundCharge }) {
  const [isAsking, setIsAsking] = useState(false);
  return (
    <div className="stack">
      <div className="ml-quick h2-actions">
        <ButtonForm
          action={decideRoundCharge}
          label="Χρεώνεται"
          hidden={{ roundChargeId: charge.id, decision: "charged", reason: "" }}
          isPrimary
        />
        <button type="button" onClick={() => setIsAsking(true)}>
          Χωρίς χρέωση
        </button>
      </div>
      {isAsking && (
        <H2Form
          action={decideRoundCharge}
          submitLabel="Χωρίς χρέωση"
          hidden={{ roundChargeId: charge.id, decision: "free" }}
          onSuccess={() => setIsAsking(false)}
          onClose={() => setIsAsking(false)}
        >
          <label>
            Λόγος (υποχρεωτικός)
            <input className="input" name="reason" required aria-required />
          </label>
        </H2Form>
      )}
    </div>
  );
}

function RoundDecided({ charge }: { charge: DeliverableRoundCharge }) {
  const word = charge.decision === "charged" ? "Χρεώνεται" : "Χωρίς χρέωση";
  return (
    <p className="note">
      {word}
      {charge.reason ? `: ${charge.reason}` : ""} ({charge.decidedByName ?? "—"}
      {charge.decidedAt ? `, ${fmtDay(charge.decidedAt)}` : ""}).
    </p>
  );
}

export function H2RoundCharges({ detail, ctx }: PanelProps) {
  if (detail.roundCharges.length === 0) return null;
  return (
    <H2Box
      title="Γύροι πέρα από το όριο"
      hint={`${detail.roundCharges.length} γύροι`}
      isOpen={detail.roundCharges.some((charge) => charge.decision === null)}
    >
      <ul className="ml-list">
        {detail.roundCharges.map((charge) => (
          <li
            key={charge.id}
            className="ml-line"
            data-urgent={charge.decision === null ? "" : undefined}
          >
            <span className="ml-main">
              <strong>{`Γύρος ${charge.round} από όριο ${charge.roundsLimit}`}</strong>
              <small>{`v${charge.version} · ${fmtDay(charge.createdAt)}`}</small>
              {charge.decision !== null ? (
                <RoundDecided charge={charge} />
              ) : detail.can.decideRoundCharge ? (
                <RoundChoices charge={charge} />
              ) : (
                <p className="note">
                  {ctx.canSeeAmounts
                    ? "Η απόφαση γίνεται όσο η Παραγωγή είναι ανοιχτή."
                    : "Η χρέωση αποφασίζεται από όποιον βλέπει ποσά."}
                </p>
              )}
            </span>
            <span className="ml-quick">
              {charge.decision === null ? (
                <Badge tone="attention">θέλει απόφαση</Badge>
              ) : (
                <Badge tone={charge.decision === "charged" ? "strong" : "ok"}>
                  {charge.decision === "charged" ? "χρεώνεται" : "χωρίς χρέωση"}
                </Badge>
              )}
            </span>
          </li>
        ))}
      </ul>
    </H2Box>
  );
}
