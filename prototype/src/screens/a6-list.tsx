"use client";

import Link from "next/link";
import { useState } from "react";

import { memberName } from "@/data/calendar";
import type { BlockedTime } from "@/data/filming";
import type { RoleId } from "@/data/roles";
import { A6Form } from "@/screens/a6-form";
import { isUpcomingBlocked, sharedWith, whenLabel } from "@/screens/a6-model";
import { Badge, StateNotice, screenHref } from "@/screens/shared";

import "./a6.css";

type Mode = "none" | "new" | { editId: string };

interface A6ListProps {
  role: RoleId;
  me: string;
  tab: "upcoming" | "past";
  seesAll: boolean;
  canPickPerson: boolean;
  initialItems: readonly BlockedTime[];
  initialMode: Mode;
  editableIds: readonly string[];
  convertibleIds: readonly string[];
  canConvertAny: boolean;
}

const deleteText = (item: BlockedTime): string => {
  const others = sharedWith(item);
  if (others.length > 0)
    return `Αφαιρείται μόνο για ${memberName(item.personId)}· το γεγονός μένει στο Google για τους υπόλοιπους (${others.join(", ")}). Αν είναι ο τελευταίος, σβήνει και από το Google.`;
  return item.source === "Google"
    ? "Είναι ο τελευταίος: σβήνει και από το Google."
    : "Σβήνει και από το Εταιρικό ημερολόγιο Google.";
};

function DeleteConfirm({
  item,
  onConfirm,
  onCancel,
}: {
  item: BlockedTime;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="a6-confirm" role="alertdialog">
      <span>
        Να διαγραφεί ο «{item.label}»; {deleteText(item)}
      </span>
      <span className="a6-actions">
        <button
          className="button"
          data-danger="true"
          type="button"
          onClick={onConfirm}
        >
          Διαγραφή
        </button>
        <button className="button" type="button" onClick={onCancel}>
          Άκυρο
        </button>
      </span>
    </div>
  );
}

interface RowProps {
  role: RoleId;
  item: BlockedTime;
  seesAll: boolean;
  past: boolean;
  canEdit: boolean;
  canConvert: boolean;
  isDeleting: boolean;
  onEdit: () => void;
  onAskDelete: () => void;
  onDelete: () => void;
  onCancelDelete: () => void;
}

function Actions(props: RowProps) {
  const { role, item, canEdit, canConvert } = props;
  if (props.past) return <span className="muted">μόνο ανάγνωση</span>;
  if (props.isDeleting)
    return (
      <DeleteConfirm
        item={item}
        onConfirm={props.onDelete}
        onCancel={props.onCancelDelete}
      />
    );
  return (
    <span className="a6-actions">
      {canEdit && (
        <button className="button" type="button" onClick={props.onEdit}>
          Επεξεργασία
        </button>
      )}
      {canEdit && (
        <button
          className="button"
          data-danger="true"
          type="button"
          onClick={props.onAskDelete}
        >
          Διαγραφή
        </button>
      )}
      {canConvert && (
        <Link
          className="button"
          href={screenHref(role, "E4", { from: "blocked", blocked: item.id })}
        >
          Μετατροπή σε Γύρισμα
        </Link>
      )}
    </span>
  );
}

function Row(props: RowProps) {
  const { item, seesAll } = props;
  return (
    <tr>
      {seesAll && <td data-label="Άτομο">{memberName(item.personId)}</td>}
      <td data-label="Πότε">{whenLabel(item)}</td>
      <td data-label="Τίτλος">{item.label}</td>
      <td data-label="Προέλευση">
        <span>
          <Badge>{item.source}</Badge>
          {item.source === "Google" && (
            <span className="muted"> από {memberName(item.createdBy)}</span>
          )}
        </span>
      </td>
      <td data-label="Ενέργειες" className="a6-cell-actions">
        <Actions {...props} />
      </td>
    </tr>
  );
}

export function A6List(props: A6ListProps) {
  const { role, me, tab, seesAll, editableIds, convertibleIds } = props;
  const [items, setItems] = useState(props.initialItems);
  const [mode, setMode] = useState<Mode>(props.initialMode);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const past = tab === "past";
  const editing =
    typeof mode === "object"
      ? (items.find((i) => i.id === mode.editId) ?? null)
      : null;
  const shown = items.filter((item) => isUpcomingBlocked(item) !== past);
  const isEditable = (item: BlockedTime) =>
    editableIds.includes(item.id) || item.id.startsWith("bt-new-");

  const openForm = (next: Mode) => {
    setMessage(null);
    setMode(next);
  };
  const handleSave = (saved: BlockedTime) => {
    setItems((prev) =>
      prev.some((i) => i.id === saved.id)
        ? prev.map((i) => (i.id === saved.id ? saved : i))
        : [...prev, saved],
    );
    setMessage(
      "Γράφτηκε και στο Εταιρικό ημερολόγιο Google. (prototype: δεν αποθηκεύεται)",
    );
    setMode("none");
  };
  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDeletingId(null);
    setMessage(
      "Διαγράφηκε και από το Εταιρικό ημερολόγιο Google. (prototype: δεν αποθηκεύεται)",
    );
  };

  return (
    <div className="stack" style={{ alignItems: "stretch" }}>
      {message && (
        <p className="note" role="status">
          {message}
        </p>
      )}
      {!past && mode === "none" && (
        <div className="toolbar">
          <button
            className="button"
            type="button"
            data-primary="true"
            onClick={() => openForm("new")}
          >
            Πρόσθεσε Κλεισμένο χρόνο
          </button>
        </div>
      )}
      {mode !== "none" && (
        <A6Form
          key={editing?.id ?? "new"}
          role={role}
          me={me}
          canPickPerson={props.canPickPerson}
          editing={editing}
          newId={`bt-new-${items.length}`}
          onSave={handleSave}
          onCancel={() => setMode("none")}
        />
      )}
      {!past && (
        <p className="note">
          {props.canConvertAny
            ? "Η μετατροπή σβήνει τον Κλεισμένο χρόνο για όλα τα άτομά του· το ίδιο γεγονός του Google γίνεται το Γύρισμα."
            : "Για να γίνει Γύρισμα, ζήτα το από τη Διαχείριση."}
        </p>
      )}
      {shown.length === 0 ? (
        <StateNotice
          kind="empty"
          title={past ? "Δεν υπάρχουν περασμένα" : "Δεν έχεις Κλεισμένο χρόνο"}
        >
          {!past && (
            <p>
              <button
                className="button"
                type="button"
                onClick={() => openForm("new")}
              >
                Πρόσθεσε
              </button>
            </p>
          )}
        </StateNotice>
      ) : (
        <table className="rtable">
          <thead>
            <tr>
              {seesAll && <th>Άτομο</th>}
              <th>Πότε</th>
              <th>Τίτλος</th>
              <th>Προέλευση</th>
              <th>Ενέργειες</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((item) => (
              <Row
                key={item.id}
                role={role}
                item={item}
                seesAll={seesAll}
                past={past}
                canEdit={isEditable(item)}
                canConvert={convertibleIds.includes(item.id)}
                isDeleting={deletingId === item.id}
                onEdit={() => openForm({ editId: item.id })}
                onAskDelete={() => setDeletingId(item.id)}
                onDelete={() => handleDelete(item.id)}
                onCancelDelete={() => setDeletingId(null)}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
