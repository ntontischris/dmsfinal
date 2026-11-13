"use client";

import { Fragment, useState } from "react";

import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";
import { Badge } from "@/spaces/screens/shared";

import { decideRoundCharge } from "../actions-deliverable";
import type { DeliverableRoundCharge } from "../types";
import { ButtonForm, H2Form } from "./h2-form";
import { fmtDay, type PanelProps } from "./h2-model";

import "./h1.css";

// Γύροι αλλαγών πέρα από το όριο της Συμφωνίας: η ομάδα αποφασίζει αν χρεώνεται (γίνεται Χρέωση) ή όχι.
// Η δουλειά δεν σταματά· η απόφαση γράφεται με όνομα και ημέρα.

function RoundChoices({ charge }: { charge: DeliverableRoundCharge }) {
  const [isAsking, setIsAsking] = useState(false);
  return (
    <div className="stack">
      <div className="btn-row">
        <ButtonForm
          action={decideRoundCharge}
          label="Χρεώνεται"
          hidden={{ roundChargeId: charge.id, decision: "charged", reason: "" }}
          isPrimary
        />
        <button
          type="button"
          className="button"
          onClick={() => setIsAsking(true)}
        >
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
    <Panel label="Γύροι πέρα από το όριο">
      <RowList>
        {detail.roundCharges.map((charge) => (
          <Fragment key={charge.id}>
            <ListRow
              title={`Γύρος ${charge.round} από όριο ${charge.roundsLimit}`}
              sub={`v${charge.version} · ${fmtDay(charge.createdAt)}`}
              aside={
                charge.decision === null ? (
                  <Badge tone="attention">θέλει απόφαση</Badge>
                ) : (
                  <Badge tone={charge.decision === "charged" ? "strong" : "ok"}>
                    {charge.decision === "charged"
                      ? "χρεώνεται"
                      : "χωρίς χρέωση"}
                  </Badge>
                )
              }
            />
            <li className="sx-extra">
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
            </li>
          </Fragment>
        ))}
      </RowList>
    </Panel>
  );
}
