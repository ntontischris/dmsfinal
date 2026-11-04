"use client";

import { useEffect, useRef, useState } from "react";

import { createOpportunity } from "../actions-opportunities";
import { athensToday } from "../helpers";
import { SpacesActionForm, SpacesField } from "./spaces-form";

interface ClientNewOpportunityProps {
  clientId: string;
  clientName: string;
}

const DAY_MS = 86_400_000;
const addDays = (isoDate: string, days: number): string =>
  new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);

// «Νέα Ευκαιρία» μέσα στη Σελίδα Πελάτη (prototype `screens/b2-new-opportunity.tsx`): η φόρμα ανοίγει εδώ, με τον
// Πελάτη ήδη συμπληρωμένο, και η πραγματική ενέργεια ανοίγει τη νέα Ευκαιρία. Το «Πακέτο που τον ενδιαφέρει» λείπει:
// η Ευκαιρία δεν το κρατά στη βάση. Η Πηγή δεν ρωτιέται: ο Πελάτης υπάρχει, και η βάση παίρνει την Πηγή από την οποία ήρθε.
export function ClientNewOpportunity({
  clientId,
  clientName,
}: ClientNewOpportunityProps) {
  const [isOpen, setIsOpen] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) formRef.current?.querySelector("input")?.focus();
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        className="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        Νέα Ευκαιρία
      </button>
      {isOpen && (
        <div ref={formRef} className="new-lead" style={{ flexBasis: "100%" }}>
          <p className="muted">Πελάτης: {clientName}</p>
          <SpacesActionForm
            action={createOpportunity}
            submitLabel="Άνοιγμα Ευκαιρίας"
          >
            <input type="hidden" name="clientId" value={clientId} />
            <input type="hidden" name="referredBy" value="" />
            <SpacesField label="Τι αφορά * (π.χ. Μηνιαίο πακέτο social)">
              <input className="input" name="title" autoComplete="off" />
            </SpacesField>
            <SpacesField label="Επόμενο βήμα * (π.χ. Κλήση για απάντηση)">
              <input className="input" name="nextStep" autoComplete="off" />
            </SpacesField>
            <SpacesField label="Πότε * (υπενθύμιση)">
              <input
                className="input"
                type="date"
                name="nextStepDue"
                defaultValue={addDays(athensToday(), 3)}
              />
            </SpacesField>
            <p className="muted">
              * υποχρεωτικό: κάθε ανοιχτή Ευκαιρία έχει Επόμενο βήμα με
              ημερομηνία.
            </p>
          </SpacesActionForm>
        </div>
      )}
    </>
  );
}
