"use client";

import { useState } from "react";

import { Avatar } from "@/spaces/kit/parts";

import { logActivity } from "../actions-opportunities";
import type { ListItem } from "../types";
import { ItemRows } from "./lane-rows";
import { SpacesActionForm } from "./spaces-form";

export interface B2ActivityRow {
  id: string;
  when: string;
  kind: string;
  text: string;
  by: string;
}

interface ActivityLogProps {
  rows: readonly B2ActivityRow[];
  canLog: boolean;
  kinds: readonly ListItem[];
  // Οι ανοιχτές Ευκαιρίες του Πελάτη: κάθε Δραστηριότητα γράφεται σε μία από αυτές.
  openOpportunities: readonly { id: string; title: string }[];
}

// Δραστηριότητες Πελάτη (prototype `screens/b2-activity-log.tsx`): καταγραφή κλήσης, email, συνάντησης ή σημείωσης
// με την πραγματική ενέργεια. Στη βάση κάθε Δραστηριότητα ανήκει σε Ευκαιρία, οπότε διαλέγεται μία από τις ανοιχτές.
export function ActivityLog({
  rows,
  canLog,
  kinds,
  openOpportunities,
}: ActivityLogProps) {
  const active = kinds.filter((kind) => !kind.isRetired);
  const [kindId, setKindId] = useState(active[0]?.id ?? "");
  const isLoggable = canLog && openOpportunities.length > 0;
  return (
    <>
      {isLoggable && (
        <SpacesActionForm
          action={logActivity}
          submitLabel="Καταγραφή"
          className="toolbar"
          isPrimary={false}
          resetOnSuccess
        >
          <select
            className="select"
            aria-label="Είδος Δραστηριότητας"
            name="kindId"
            value={kindId}
            onChange={(event) => setKindId(event.target.value)}
          >
            {active.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <input
            id="b2-activity-text"
            className="input grow"
            name="body"
            placeholder="Τι έγινε ή μια σημείωση"
            aria-label="Κείμενο Δραστηριότητας"
            autoComplete="off"
          />
          {openOpportunities.length > 1 ? (
            <select
              className="select"
              name="opportunityId"
              aria-label="Σε ποια Ευκαιρία γράφεται"
              defaultValue={openOpportunities[0]?.id}
            >
              {openOpportunities.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="hidden"
              name="opportunityId"
              value={openOpportunities[0]?.id ?? ""}
            />
          )}
        </SpacesActionForm>
      )}
      {rows.length === 0 ? (
        <p className="muted">Καμία Δραστηριότητα ακόμα.</p>
      ) : (
        <ItemRows
          items={rows.map((activity) => ({
            id: activity.id,
            lead: <Avatar name={activity.by} size={30} />,
            title: activity.text,
            sub: `${activity.when} · ${activity.kind} · ${activity.by}`,
          }))}
        />
      )}
    </>
  );
}
