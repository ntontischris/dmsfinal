"use client";

import { useState } from "react";

import { Avatar } from "@/spaces/kit/parts";

import {
  deleteActivity,
  editActivity,
  logActivity,
} from "../actions-opportunities";
import { athensLocal } from "../helpers";
import type { ListItem } from "../types";
import { activityTimeBounds, type B2ActivityRow } from "./activity-rows";
import { RowForm, useDoneNotes } from "./b5-forms";
import { ItemRows } from "./lane-rows";
import { SpacesActionForm } from "./spaces-form";

export type { B2ActivityRow } from "./activity-rows";

interface ActivityLogProps {
  rows: readonly B2ActivityRow[];
  canLog: boolean;
  kinds: readonly ListItem[];
  // Οι ανοιχτές Ευκαιρίες στις οποίες μπορεί να γραφτεί η Δραστηριότητα.
  openOpportunities: readonly { id: string; title: string }[];
  // Σελίδα Πελάτη (B2): η Δραστηριότητα γράφεται και κατευθείαν στον Πελάτη, χωρίς Ευκαιρία.
  clientId?: string;
}

function KindSelect({
  kinds,
  defaultValue,
}: {
  kinds: readonly ListItem[];
  defaultValue: string;
}) {
  return (
    <select
      className="select"
      aria-label="Είδος Δραστηριότητας"
      name="kindId"
      defaultValue={defaultValue}
    >
      {kinds.map((item) => (
        <option key={item.id} value={item.id}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

// «Πότε έγινε»: ώρα Αθήνας, από έναν χρόνο πίσω έως τώρα (η βάση ελέγχει το ίδιο).
function WhenField({ defaultValue }: { defaultValue: string }) {
  const { min, max } = activityTimeBounds();
  return (
    <input
      className="input"
      type="datetime-local"
      name="occurredAt"
      aria-label="Πότε έγινε"
      title="Πότε έγινε"
      required
      defaultValue={defaultValue}
      max={max}
      min={min}
      suppressHydrationWarning
    />
  );
}

function TargetField({
  clientId,
  openOpportunities,
}: Pick<ActivityLogProps, "clientId" | "openOpportunities">) {
  if (clientId === undefined)
    return (
      <input
        type="hidden"
        name="opportunityId"
        value={openOpportunities[0]?.id ?? ""}
      />
    );
  return (
    <>
      <input type="hidden" name="clientId" value={clientId} />
      <select
        className="select"
        name="opportunityId"
        aria-label="Σε ποια Ευκαιρία γράφεται"
        defaultValue=""
      >
        <option value="">Χωρίς Ευκαιρία (στον Πελάτη)</option>
        {openOpportunities.map((o) => (
          <option key={o.id} value={o.id}>
            {o.title}
          </option>
        ))}
      </select>
    </>
  );
}

function EditRow({
  row,
  kinds,
  onDone,
}: {
  row: B2ActivityRow;
  kinds: readonly ListItem[];
  onDone: (text: string) => void;
}) {
  // Ένα είδος που αποσύρθηκε μένει επιλέξιμο μόνο για τη γραμμή που το έχει ήδη.
  const selectable = kinds.filter(
    (kind) => !kind.isRetired || kind.id === row.kindId,
  );
  return (
    <RowForm
      action={editActivity}
      submitLabel="Αποθήκευση"
      isPrimary
      className="toolbar"
      onDone={onDone}
    >
      <input type="hidden" name="activityId" value={row.id} />
      <KindSelect kinds={selectable} defaultValue={row.kindId ?? ""} />
      <input
        className="input grow"
        name="body"
        aria-label="Κείμενο Δραστηριότητας"
        defaultValue={row.body}
        autoComplete="off"
      />
      <WhenField defaultValue={row.occurredLocal} />
    </RowForm>
  );
}

function RowActions({
  row,
  isEditing,
  onToggleEdit,
  onDone,
}: {
  row: B2ActivityRow;
  isEditing: boolean;
  onToggleEdit: () => void;
  onDone: (text: string) => void;
}) {
  return (
    <>
      <button
        type="button"
        className="button"
        aria-expanded={isEditing}
        aria-label={`Διόρθωση: ${row.text}`}
        onClick={onToggleEdit}
      >
        Διόρθωση
      </button>
      <RowForm
        action={deleteActivity}
        submitLabel="Διαγραφή"
        ariaLabel={`Διαγραφή: ${row.text}`}
        isDanger
        className="o2-inline"
        onDone={onDone}
      >
        <input type="hidden" name="activityId" value={row.id} />
      </RowForm>
    </>
  );
}

// Δραστηριότητες (prototype `screens/b2-activity-log.tsx`): καταγραφή κλήσης, email, συνάντησης ή σημείωσης, με ώρα,
// σε Ευκαιρία ή κατευθείαν στον Πελάτη. Όποιος τη γράφει τη διορθώνει ή τη σβήνει μέσα σε 24 ώρες· ο Ιδιοκτήτης πάντα.
export function ActivityLog({
  rows,
  canLog,
  kinds,
  openOpportunities,
  clientId,
}: ActivityLogProps) {
  const active = kinds.filter((kind) => !kind.isRetired);
  const [editingId, setEditingId] = useState<string | null>(null);
  const notes = useDoneNotes();
  const isLoggable =
    canLog && (clientId !== undefined || openOpportunities.length > 0);
  const onDone = (text: string) => {
    setEditingId(null);
    notes.add("row", text);
  };
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
          <KindSelect kinds={active} defaultValue={active[0]?.id ?? ""} />
          <input
            id="b2-activity-text"
            className="input grow"
            name="body"
            placeholder="Τι έγινε ή μια σημείωση"
            aria-label="Κείμενο Δραστηριότητας"
            autoComplete="off"
          />
          <WhenField defaultValue={athensLocal()} />
          <TargetField
            clientId={clientId}
            openOpportunities={openOpportunities}
          />
        </SpacesActionForm>
      )}
      {notes.view}
      {rows.length === 0 ? (
        <p className="muted">Καμία Δραστηριότητα ακόμα.</p>
      ) : (
        <ItemRows
          items={rows.map((activity) => ({
            id: activity.id,
            lead: <Avatar name={activity.by} size={30} />,
            title: activity.text,
            sub:
              editingId === activity.id ? (
                <EditRow row={activity} kinds={kinds} onDone={onDone} />
              ) : (
                `${activity.when} · ${activity.kind} · ${activity.by}`
              ),
            aside: activity.canChange ? (
              <RowActions
                row={activity}
                isEditing={editingId === activity.id}
                onToggleEdit={() =>
                  setEditingId(editingId === activity.id ? null : activity.id)
                }
                onDone={onDone}
              />
            ) : undefined,
          }))}
        />
      )}
    </>
  );
}
