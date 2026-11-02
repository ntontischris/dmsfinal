"use client";

import { useState, type ReactNode } from "react";

import { Panel } from "@/spaces/kit/panel";

interface DeliverablesPanelProps {
  // Η πραγματική φόρμα του module Παραδοτέα, έτοιμη από τον server· null = δεν δικαιούσαι νέο Παραδοτέο.
  newForm: ReactNode | null;
  children: ReactNode;
}

// Το πάνελ «Παραδοτέα» με το «Νέο Παραδοτέο» στην κεφαλίδα. Στο prototype οδηγούσε σε άλλη οθόνη· εδώ ανοίγει από πάνω
// η φόρμα του module Παραδοτέα (στοιχείο Tailwind, άρα με data-tw).
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
        <div className="g2-pad">
          <div className="g2-form" data-tw>
            {newForm}
          </div>
        </div>
      )}
      {children}
    </Panel>
  );
}
