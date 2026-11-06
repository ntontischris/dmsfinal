"use client";

import { useState } from "react";

import type { ListItem } from "../types";
import { ActivityLog, type B2ActivityRow } from "./b2-activity-log";

// «Πρόσθεσε σημείωση»: η φόρμα των Δραστηριοτήτων (η ίδια ActivityLog) ανοίγει επί τόπου, με τις 3 τελευταίες γραμμές.
export function NoteToggle({
  clientId,
  rows,
  kinds,
  openOpportunities,
}: {
  clientId: string;
  rows: readonly B2ActivityRow[];
  kinds: readonly ListItem[];
  openOpportunities: readonly { id: string; title: string }[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        Πρόσθεσε σημείωση
      </button>
      {isOpen && (
        <div className="b2-note-form">
          <ActivityLog
            clientId={clientId}
            rows={rows}
            canLog
            kinds={kinds}
            openOpportunities={openOpportunities}
          />
        </div>
      )}
    </>
  );
}
