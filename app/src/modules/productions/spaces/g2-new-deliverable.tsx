"use client";

import { useState, type ReactNode } from "react";

import { Panel } from "@/spaces/kit/panel";

interface DeliverablesPanelProps {
  // Η φόρμα «Νέο Παραδοτέο» του module Παραδοτέα (prototype `h2-new.tsx`)· null = δεν δικαιούσαι νέο Παραδοτέο.
  newForm: ReactNode | null;
  children: ReactNode;
}

// Το πάνελ «Παραδοτέα» με το «Νέο Παραδοτέο» στην κεφαλίδα. Στο prototype οδηγούσε σε άλλη οθόνη (H2 σε κατάσταση
// δημιουργίας)· εδώ η ίδια φόρμα ανοίγει από πάνω, μέσα στο πάνελ.
export function DeliverablesPanel({
  newForm,
  children,
}: DeliverablesPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Panel
      label="Παραδοτέα"
      aside={
        newForm && (
          <button
            type="button"
            className="button"
            aria-expanded={isOpen}
            onClick={() => setIsOpen(!isOpen)}
          >
            Νέο Παραδοτέο
          </button>
        )
      }
      isFlush
    >
      {newForm && isOpen && (
        <div className="g2-pad">{newForm}</div>
      )}
      {children}
    </Panel>
  );
}
