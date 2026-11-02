"use client";

import { useState } from "react";

import { requestAccess } from "../actions-clients";
import type { ListItem } from "../types";
import { SpacesActionForm } from "./spaces-form";

interface AccessRequestProps {
  clientId: string;
  ownerName: string | null;
  sources: readonly ListItem[];
  topicPrompt?: string;
}

// Αίτημα πρόσβασης σε Πελάτη άλλου πωλητή (prototype `screens/access-request.tsx`), με την πραγματική ενέργεια.
// Η Πηγή μπαίνει γιατί το αίτημα γίνεται Ευκαιρία αν εγκριθεί.
export function AccessRequest({
  clientId,
  ownerName,
  sources,
  topicPrompt = "Τι αφορά η Ευκαιρία;",
}: AccessRequestProps) {
  const [isOpen, setIsOpen] = useState(false);
  const active = sources.filter((source) => !source.isRetired);
  if (!isOpen)
    return (
      <button
        type="button"
        className="button"
        data-primary="true"
        onClick={() => setIsOpen(true)}
      >
        Αίτημα πρόσβασης
      </button>
    );
  return (
    <>
      <SpacesActionForm action={requestAccess} submitLabel="Αποστολή αιτήματος">
        <input type="hidden" name="clientId" value={clientId} />
        <input
          className="input"
          name="topic"
          placeholder={topicPrompt}
          aria-label={topicPrompt.replace(/;$/, "")}
          autoComplete="off"
        />
        <textarea
          className="input"
          name="comment"
          rows={2}
          placeholder="Σχόλιο προς τη Διαχείριση"
          aria-label="Σχόλιο"
        />
        <select
          className="select"
          name="sourceId"
          aria-label="Πηγή"
          defaultValue=""
        >
          <option value="" disabled>
            Διάλεξε Πηγή
          </option>
          {active.map((source) => (
            <option key={source.id} value={source.id}>
              {source.label}
            </option>
          ))}
        </select>
      </SpacesActionForm>
      <div className="btn-row">
        <button
          type="button"
          className="button"
          onClick={() => setIsOpen(false)}
        >
          Άκυρο
        </button>
      </div>
      {ownerName && (
        <span className="muted">
          Ο/Η {ownerName} ενημερώνεται μόνο μετά την απόφαση της Διαχείρισης.
        </span>
      )}
    </>
  );
}
