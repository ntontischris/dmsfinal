"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

import { SIGN_LABELS, type DeadLinkKind } from "../labels-public";
import type { Language, PublicCompany } from "../types";

import { DeadLink } from "./dead-link";
import { ChangesForm, DeclineForm } from "./public-forms";
import { SignFlow } from "./sign-flow";

// Το κέλυφος της ενεργής πρότασης στη D5: το έγγραφο (children, έρχεται από τον server) και κάτω το πάνελ ενεργειών.
// Αν μια ενέργεια βρει τον Σύνδεσμο νεκρό (έληξε, ακυρώθηκε από νεότερη έκδοση…), το έγγραφο αντικαθίσταται από το μήνυμα.
// Στην εκτύπωση φεύγουν τα κουμπιά.

interface ProposalShellProps {
  token: string;
  language: Language;
  managerName: string | null;
  company: PublicCompany;
  validUntil: string;
  canSign: boolean;
  signatoryName: string | null;
  maskedEmail: string;
  codeChannel: "manual" | "email";
  children: ReactNode;
}

type View = "idle" | "sign" | "changes" | "decline";

function Buttons({
  canSign,
  language,
  onPick,
}: {
  canSign: boolean;
  language: Language;
  onPick: (view: Exclude<View, "idle">) => void;
}) {
  const t = SIGN_LABELS[language];
  return (
    <div className="flex flex-wrap gap-2">
      {canSign && (
        <Button variant="primary" onClick={() => onPick("sign")}>
          {t.sign}
        </Button>
      )}
      <Button onClick={() => onPick("changes")}>{t.requestChanges}</Button>
      {canSign && (
        <Button variant="danger" onClick={() => onPick("decline")}>
          {t.reject}
        </Button>
      )}
      <Button variant="ghost" onClick={() => window.print()}>
        {t.print}
      </Button>
    </div>
  );
}

export function ProposalShell({ children, ...props }: ProposalShellProps) {
  const { token, language, managerName, company, validUntil } = props;
  const t = SIGN_LABELS[language];
  const [view, setView] = useState<View>("idle");
  const [dead, setDead] = useState<DeadLinkKind | null>(null);
  const back = () => setView("idle");

  if (dead)
    return (
      <DeadLink
        kind={dead}
        language={language}
        managerName={managerName}
        company={company}
        date={dead === "expired" ? validUntil : null}
      />
    );

  const form = { token, language, onDead: setDead, onCancel: back };
  return (
    <>
      {children}
      <div
        className="grid gap-4 rounded-md border bg-card p-4 sm:p-6 print:hidden"
      >
        {view === "idle" && (
          <>
            {!props.canSign && props.signatoryName && (
              <p className="m-0 text-sm text-muted-foreground">
                {t.onlySignatory(props.signatoryName)}
              </p>
            )}
            <Buttons
              canSign={props.canSign}
              language={language}
              onPick={setView}
            />
          </>
        )}
        {view === "sign" && (
          <SignFlow
            {...form}
            managerName={managerName}
            maskedEmail={props.maskedEmail}
            codeChannel={props.codeChannel}
          />
        )}
        {view === "changes" && <ChangesForm {...form} />}
        {view === "decline" && <DeclineForm {...form} />}
      </div>
    </>
  );
}
