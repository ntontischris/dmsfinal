"use client";

import { useState } from "react";

import type { AgreementKind, AgreementRecord } from "@/data/agreements";
import type { AgreementCaps } from "@/data/agreements-access";
import type { D2Context } from "@/screens/d2-header";
import { D2Workbench } from "@/screens/d2-workbench";

interface NewProps {
  blanks: Readonly<Record<AgreementKind, AgreementRecord>>;
  caps: AgreementCaps;
  context: D2Context;
}

const KIND_TEXT: Readonly<Record<AgreementKind, string>> = {
  μηνιαία: "Πακέτο κάθε μήνα, με Περιόδους, Διάρκεια και Ανανέωση.",
  εφάπαξ: "Μία δουλειά, πληρωμή σε δόσεις με ορόσημα.",
};

// Νέα πρόταση: πρώτα το είδος, γιατί από αυτό βγαίνουν οι Όροι και οι γραμμές που ταιριάζουν.
export function D2New({ blanks, caps, context }: NewProps) {
  const [kind, setKind] = useState<AgreementKind | null>(null);
  if (kind)
    return <D2Workbench initial={blanks[kind]} caps={caps} context={context} />;
  return (
    <section className="card">
      <h1>Νέα πρόταση για {context.clientName}</h1>
      {context.opportunity && (
        <p className="muted">Ευκαιρία: {context.opportunity.title}</p>
      )}
      <h2>Τι είδους Συμφωνία;</h2>
      <div className="grid2">
        {(Object.keys(KIND_TEXT) as AgreementKind[]).map((option) => (
          <button
            key={option}
            type="button"
            className="button d2-kind"
            onClick={() => setKind(option)}
          >
            <strong>{option}</strong>
            <span className="muted">{KIND_TEXT[option]}</span>
          </button>
        ))}
      </div>
      <p className="note">
        Το είδος δεν αλλάζει αργότερα. Οι Όροι αντιγράφονται από τις προεπιλογές
        και αλλάζουν ελεύθερα όσο είναι πρόταση.
      </p>
    </section>
  );
}
