"use client";

// PROTOTYPE — throwaway. C1: ένα κουμπί «Σημείωση / Υπενθύμιση» με δύο επιλογές· οι φόρμες είναι οι ίδιες της σελίδας.
import { useState } from "react";

import type { ListItem } from "../../types";
import { ActivityLog, type B2ActivityRow } from "../b2-activity-log";
import { AddForm } from "../b2-reminders";

type Mode = "closed" | "pick" | "note" | "reminder";

interface NoteOrReminderProps {
  clientId: string;
  canLog: boolean;
  rows: readonly B2ActivityRow[];
  kinds: readonly ListItem[];
  openOpportunities: readonly { id: string; title: string }[];
}

export function NoteOrReminder(props: NoteOrReminderProps) {
  const [mode, setMode] = useState<Mode>("closed");
  return (
    <>
      <button
        type="button"
        aria-expanded={mode !== "closed"}
        onClick={() => setMode(mode === "closed" ? "pick" : "closed")}
      >
        Σημείωση / Υπενθύμιση
      </button>
      {mode === "pick" && (
        <span className="ml-quick pc-pick" data-align="start">
          {props.canLog && (
            <button type="button" onClick={() => setMode("note")}>
              Σημείωση (Δραστηριότητα)
            </button>
          )}
          <button type="button" onClick={() => setMode("reminder")}>
            Υπενθύμισέ με
          </button>
        </span>
      )}
      {mode === "note" && (
        <div className="b2-note-form">
          <ActivityLog
            clientId={props.clientId}
            rows={props.rows}
            canLog
            isLines
            kinds={props.kinds}
            openOpportunities={props.openOpportunities}
          />
        </div>
      )}
      {mode === "reminder" && (
        <div className="b2-note-form">
          <AddForm
            clientId={props.clientId}
            onClose={() => setMode("closed")}
          />
        </div>
      )}
    </>
  );
}
