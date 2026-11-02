"use client";

import { useState } from "react";

import { transferClient } from "../actions-clients";
import type { AssignableUser } from "../types";
import { SpacesActionForm, SpacesField } from "./spaces-form";

interface ClientTransferProps {
  clientId: string;
  currentManagerId: string | null;
  assignable: readonly AssignableUser[];
}

// «Μεταβίβαση Πελάτη» της πλαϊνής στήλης (prototype `screens/b2-inspector.tsx`): ανοίγει τη φόρμα επί τόπου,
// με την πραγματική ενέργεια. Ολόκληρος ο Πελάτης περνά στον νέο Υπεύθυνο.
export function ClientTransfer({
  clientId,
  currentManagerId,
  assignable,
}: ClientTransferProps) {
  const [isOpen, setIsOpen] = useState(false);
  const candidates = assignable.filter(
    (user) => user.userId !== currentManagerId,
  );
  return (
    <>
      <button
        type="button"
        className="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        Μεταβίβαση Πελάτη
      </button>
      {isOpen &&
        (candidates.length === 0 ? (
          <p className="muted">
            Δεν υπάρχει άλλος Υπεύθυνος στον οποίο να περάσει ο Πελάτης.
          </p>
        ) : (
          <SpacesActionForm action={transferClient} submitLabel="Μεταβίβαση">
            <input type="hidden" name="clientId" value={clientId} />
            <input type="hidden" name="requestId" value="" />
            <SpacesField label="Νέος Υπεύθυνος">
              <select className="select" name="userId" defaultValue="">
                <option value="" disabled>
                  Διάλεξε Υπεύθυνο
                </option>
                {candidates.map((user) => (
                  <option key={user.userId} value={user.userId}>
                    {user.name}
                  </option>
                ))}
              </select>
            </SpacesField>
            <p className="muted">
              Ολόκληρος ο Πελάτης περνά στον νέο Υπεύθυνο. Οι ανοιχτές Ευκαιρίες
              του προηγούμενου Υπεύθυνου τον ακολουθούν.
            </p>
          </SpacesActionForm>
        ))}
    </>
  );
}
