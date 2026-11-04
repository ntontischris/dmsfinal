"use client";

import { useState, type ReactNode } from "react";

// Η διάταξη των φίλτρων: στήλη δίπλα στα αποτελέσματα· σε στενή οθόνη κρύβεται πίσω από το «Φίλτρα (N)».
export function FilterFrame({
  toggleLabel,
  head,
  side,
  children,
}: {
  toggleLabel: string;
  head: ReactNode;
  side: ReactNode;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="kit-fp" data-open={isOpen}>
      <div className="kit-fp-head">
        <button
          type="button"
          className="button kit-fp-toggle"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(!isOpen)}
        >
          {toggleLabel}
        </button>
        {head}
      </div>
      <aside className="kit-fp-side" aria-label="Φίλτρα">
        {side}
      </aside>
      <div className="kit-fp-main">{children}</div>
    </div>
  );
}
