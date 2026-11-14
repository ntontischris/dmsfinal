"use client";

import { useState } from "react";

import { requestSigningCode, signProposal } from "../actions-public";
import { SIGN_LABELS, type DeadLinkKind } from "../labels-public";
import type { PublicProposal } from "../types";
import { SpacesDeadLink } from "./d5-dead-link";
import { SpacesProposalDocument } from "./d5-document";
import { D5ChangesForm, D5DeclineForm } from "./d5-forms";
import { D5SignFlow } from "./d5-sign";

// Η ενεργή πρόταση (prototype `screens/d5-document.tsx` + `d5-actions.tsx`): το έγγραφο και στο υποσέλιδο οι επιλογές.
// Υπογραφή και απόρριψη μόνο ο Υπογράφων, «Θέλω αλλαγές» όλοι. Αν μια ενέργεια βρει τον Σύνδεσμο νεκρό (έληξε,
// νεότερη έκδοση…), το έγγραφο αντικαθίσταται από το μήνυμα. Στην εκτύπωση φεύγουν τα κουμπιά.

type ActiveProposal = Extract<PublicProposal, { status: "active" }>;
type View = "idle" | "sign" | "changes" | "decline";

interface ChoicesProps {
  proposal: ActiveProposal;
  onPick: (view: Exclude<View, "idle">) => void;
}

function Choices({ proposal, onPick }: ChoicesProps) {
  const t = SIGN_LABELS[proposal.language];
  return (
    <div className="stack">
      {!proposal.canSign && proposal.signatoryName && (
        <p className="note">{t.onlySignatory(proposal.signatoryName)}</p>
      )}
      <div className="btn-row">
        {proposal.canSign && (
          <button
            type="button"
            className="button"
            data-primary="true"
            onClick={() => onPick("sign")}
          >
            {t.sign}
          </button>
        )}
        <button
          type="button"
          className="button"
          onClick={() => onPick("changes")}
        >
          {t.requestChanges}
        </button>
        {proposal.canSign && (
          <button
            type="button"
            className="button"
            data-danger="true"
            onClick={() => onPick("decline")}
          >
            {t.reject}
          </button>
        )}
        <button type="button" className="button" onClick={() => window.print()}>
          {t.print}
        </button>
      </div>
    </div>
  );
}

export function D5ActiveProposal({
  proposal,
  token,
}: {
  proposal: ActiveProposal;
  token: string;
}) {
  const [view, setView] = useState<View>("idle");
  const [dead, setDead] = useState<DeadLinkKind | null>(null);
  const { language, managerName, company } = proposal;

  if (dead)
    return (
      <SpacesDeadLink
        kind={dead}
        language={language}
        managerName={managerName}
        company={company}
        date={dead === "expired" ? proposal.validUntil : null}
      />
    );

  const form = {
    token,
    language,
    onDead: setDead,
    onCancel: () => setView("idle"),
  };
  return (
    <SpacesProposalDocument
      document={proposal.document}
      language={language}
      footer={
        <div className="d5-actions">
          {view === "idle" && <Choices proposal={proposal} onPick={setView} />}
          {view === "sign" && (
            <D5SignFlow
              requestCode={(name, accepted) =>
                requestSigningCode({ token, name, accepted })
              }
              sign={(code) => signProposal({ token, code })}
              language={language}
              onDead={setDead}
              onCancel={form.onCancel}
              managerName={managerName}
              maskedEmail={proposal.maskedEmail}
              codeChannel={proposal.codeChannel}
            />
          )}
          {view === "changes" && <D5ChangesForm {...form} />}
          {view === "decline" && <D5DeclineForm {...form} />}
        </div>
      }
    />
  );
}
