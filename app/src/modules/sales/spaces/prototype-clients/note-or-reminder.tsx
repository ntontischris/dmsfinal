"use client";

// PROTOTYPE — throwaway. C1: ένα κουμπί «Σημείωση / Υπενθύμιση» με δύο επιλογές· οι φόρμες είναι οι ίδιες της σελίδας.
import { useState } from "react";

import type { ListItem } from "@/modules/sales/types";
import { ActivityLog, type B2ActivityRow } from "../b2-activity-log";
import { AddForm } from "../b2-reminders";

type Mode = "closed" | "note" | "reminder";

interface NoteOrReminderProps {
  clientId: string;
  canLog: boolean;
  canRemind: boolean;
  rows: readonly B2ActivityRow[];
  kinds: readonly ListItem[];
  openOpportunities: readonly { id: string; title: string }[];
}

export function NoteOrReminder(props: NoteOrReminderProps) {
  const [mode, setMode] = useState<Mode>("closed");
  const initial: Mode = props.canLog ? "note" : "reminder";
  return (
    <>
      <button
        type="button"
        aria-expanded={mode !== "closed"}
        onClick={() => setMode(mode === "closed" ? initial : "closed")}
      >
        Σημείωση / Υπενθύμιση
      </button>
      {mode !== "closed" && (
        <div className="b2-note-form pc-quick-form">
          {props.canLog && props.canRemind && (
            <div
              className="ml-quick pc-pick"
              data-align="start"
              role="tablist"
              aria-label="Τύπος καταχώρισης"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "note"}
                data-primary={mode === "note" ? "true" : undefined}
                onClick={() => setMode("note")}
              >
                Σημείωση
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "reminder"}
                data-primary={mode === "reminder" ? "true" : undefined}
                onClick={() => setMode("reminder")}
              >
                Υπενθύμιση
              </button>
            </div>
          )}
          {mode === "note" && (
            <ActivityLog
              clientId={props.clientId}
              rows={props.rows}
              canLog
              isLines
              hideHistory
              kinds={props.kinds}
              openOpportunities={props.openOpportunities}
            />
          )}
          {mode === "reminder" && (
            <AddForm
              clientId={props.clientId}
              onClose={() => setMode("closed")}
            />
          )}
        </div>
      )}
    </>
  );
}
