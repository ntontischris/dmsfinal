"use client";

import {
  deleteItem,
  publishItem,
  saveAudience,
  saveItem,
  unpublishItem,
} from "../actions-items";
import { publishBlockers } from "../helpers";
import { PUBLIC_AUDIENCE_LABEL } from "../labels";
import type { EditableItem, ManageItem, RoleOption } from "../view-schema";
import { SpacesForm } from "./k-form";
import { BodyField, FileField } from "./l1-editor-fields";

// Οι φόρμες του επεξεργαστή (prototype `l1-editor.tsx`) πάνω στις πραγματικές ενέργειες: περιεχόμενο, Κοινό, δημοσίευση.

export function ContentForm({
  item,
  options,
}: {
  item: EditableItem;
  options: ManageItem;
}) {
  return (
    <SpacesForm
      action={saveItem}
      submitLabel={
        item.status === "published"
          ? "Αποθήκευση (ισχύει αμέσως)"
          : "Αποθήκευση"
      }
      className="l1-form"
    >
      <input type="hidden" name="id" value={item.id} />
      <label>
        Ενότητα
        <select
          className="input"
          name="sectionId"
          defaultValue={item.sectionId}
        >
          {options.sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Τίτλος
        <input
          className="input"
          name="title"
          defaultValue={item.title}
          maxLength={160}
          required
        />
      </label>
      <label>
        Περίληψη (1–2 γραμμές, απαραίτητη για δημοσίευση)
        <textarea
          className="input"
          name="summary"
          rows={2}
          maxLength={400}
          defaultValue={item.summary}
        />
      </label>
      {item.kind === "article" ? (
        <BodyField item={item} />
      ) : (
        <>
          <input type="hidden" name="body" value="" />
          <FileField item={item} />
        </>
      )}
    </SpacesForm>
  );
}

function RoleChecks({
  roles,
  checked,
}: {
  roles: readonly RoleOption[];
  checked: ReadonlySet<string>;
}) {
  return roles.map((role) => (
    <label key={role.id}>
      <input
        type="checkbox"
        name="roles"
        value={role.id}
        defaultChecked={checked.has(role.id)}
      />{" "}
      {role.kind === "client" ? `${role.name} (πελάτη)` : role.name}
    </label>
  ));
}

// Το Κοινό: οι πραγματικοί Ρόλοι (ομάδας και πελάτη) και το «δημόσιο».
export function AudienceForm({
  item,
  roles,
}: {
  item: EditableItem;
  roles: readonly RoleOption[];
}) {
  const checked = new Set(item.audience.roles.map((role) => role.id));
  return (
    <SpacesForm
      action={saveAudience}
      submitLabel="Αποθήκευση Κοινού"
      className="l1-form"
      tone="plain"
    >
      <input type="hidden" name="id" value={item.id} />
      <fieldset className="l1-checks">
        <legend>Κοινό</legend>
        <RoleChecks
          roles={roles.filter((role) => role.kind === "team")}
          checked={checked}
        />
        <RoleChecks
          roles={roles.filter((role) => role.kind === "client")}
          checked={checked}
        />
        <label>
          <input
            type="checkbox"
            name="isPublic"
            defaultChecked={item.audience.isPublic}
          />{" "}
          {PUBLIC_AUDIENCE_LABEL}
        </label>
      </fieldset>
    </SpacesForm>
  );
}

function IdField({ id }: { id: string }) {
  return <input type="hidden" name="id" value={id} />;
}

export function PublishedActions({ item }: { item: EditableItem }) {
  return (
    <>
      <SpacesForm
        action={unpublishItem}
        submitLabel="Απόσυρση"
        pendingLabel="Απόσυρση…"
        tone="plain"
      >
        <IdField id={item.id} />
      </SpacesForm>
      <p className="note">Γυρίζει σε πρόχειρο· ο Βοηθός το ξεχνά αμέσως.</p>
    </>
  );
}

export function DraftActions({ item }: { item: EditableItem }) {
  const blockers = publishBlockers({ ...item, hasFile: item.file !== null });
  return (
    <>
      <SpacesForm
        action={publishItem}
        submitLabel="Δημοσίευση"
        pendingLabel="Δημοσίευση…"
        isDisabled={blockers.length > 0}
      >
        <IdField id={item.id} />
        {blockers.length > 0 && (
          <ul className="l1-blockers" aria-label="Τι λείπει για τη δημοσίευση">
            {blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        )}
      </SpacesForm>
      <SpacesForm
        action={deleteItem}
        submitLabel="Διαγραφή"
        pendingLabel="Διαγραφή…"
        tone="danger"
      >
        <IdField id={item.id} />
      </SpacesForm>
      <p className="note">
        Δημοσιευμένο στοιχείο πρώτα αποσύρεται. Η διαγραφή είναι οριστική· οι
        Συζητήσεις που το είχαν πηγή το δείχνουν ως «δεν υπάρχει πια».
      </p>
    </>
  );
}
