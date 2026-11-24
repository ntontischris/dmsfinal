"use client";

import { useState, type ReactNode } from "react";

import { G2Box } from "./g2-box";

interface DeliverablesPanelProps {
  // Η φόρμα «Νέο Παραδοτέο» του module Παραδοτέα (prototype `h2-new.tsx`)· null = δεν δικαιούσαι νέο Παραδοτέο.
  newForm: ReactNode | null;
  hint: string;
  children: ReactNode;
}

// Το πάνελ «Παραδοτέα» με το «Νέο Παραδοτέο» στην κεφαλίδα. Στο prototype οδηγούσε σε άλλη οθόνη (H2 σε κατάσταση
// δημιουργίας)· εδώ η ίδια φόρμα ανοίγει από πάνω, μέσα στο πάνελ.
export function DeliverablesPanel({
  newForm,
  hint,
  children,
}: DeliverablesPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <G2Box title="Παραδοτέα" hint={hint}>
      {newForm && (
        <div className="ml-quick g2-actions">
          <button
            type="button"
            data-primary="true"
            aria-expanded={isOpen}
            onClick={() => setIsOpen(!isOpen)}
          >
            Νέο Παραδοτέο
          </button>
        </div>
      )}
      {newForm && isOpen && <div className="g2-pad">{newForm}</div>}
      {children}
    </G2Box>
  );
}
