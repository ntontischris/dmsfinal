"use client";

import { useActionState, useState } from "react";

import { INITIAL_FORM_STATE, type FormState } from "@/lib/form-state";

import { deleteSection, moveSection, saveSection } from "../actions-sections";
import type { ManageSection } from "../view-schema";
import { KBox } from "./k-box";
import { SpacesForm } from "./k-form";

type Action = (state: FormState, form: FormData) => Promise<FormState>;

// Ένα κουμπί-ενέργεια της γραμμής (↑, ↓, Διαγραφή). Το λάθος της βάσης φαίνεται δίπλα, δεν χάνεται.
function RowAction({
  action,
  fields,
  label,
  ariaLabel,
  isDanger = false,
}: {
  action: Action;
  fields: Readonly<Record<string, string>>;
  label: string;
  ariaLabel?: string;
  isDanger?: boolean;
}) {
  const [state, dispatch, isPending] = useActionState(
    action,
    INITIAL_FORM_STATE,
  );
  return (
    <form action={dispatch}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button
        type="submit"
        aria-label={ariaLabel}
        data-danger={isDanger || undefined}
        disabled={isPending}
      >
        {label}
      </button>
      {state.error && (
        <span className="k-note" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}

function SectionFields({ section }: { section?: ManageSection }) {
  return (
    <>
      <input type="hidden" name="id" value={section?.id ?? ""} />
      <label className="ml-field">
        <span>Όνομα</span>
        <input
          className="input"
          name="name"
          defaultValue={section?.name ?? ""}
          maxLength={80}
          required
        />
      </label>
      <label className="ml-field">
        <span>Περιγραφή (μία πρόταση)</span>
        <input
          className="input"
          name="description"
          defaultValue={section?.description ?? ""}
          maxLength={240}
        />
      </label>
    </>
  );
}

function SectionRow({
  section,
  isFirst,
  isLast,
}: {
  section: ManageSection;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  return (
    <li className="ml-line k-section-line">
      <span className="ml-thumb" aria-hidden="true">
        {section.name.slice(0, 1)}
      </span>
      <div className="ml-main">
        <strong>{section.name}</strong>
        {section.description && <small>{section.description}</small>}
        <small>{section.itemCount} στοιχεία</small>
      </div>
      <span className="ml-quick">
        {!isFirst && (
          <RowAction
            action={moveSection}
            fields={{ id: section.id, direction: "up" }}
            label="↑"
            ariaLabel="Πάνω"
          />
        )}
        {!isLast && (
          <RowAction
            action={moveSection}
            fields={{ id: section.id, direction: "down" }}
            label="↓"
            ariaLabel="Κάτω"
          />
        )}
        <button
          type="button"
          aria-pressed={isEditing}
          onClick={() => setIsEditing(!isEditing)}
        >
          Επεξεργασία
        </button>
      </span>
      {isEditing && (
        <div className="k-section-edit">
          <SpacesForm
            action={saveSection}
            submitLabel="Αποθήκευση"
            className="ml-fields"
          >
            <SectionFields section={section} />
          </SpacesForm>
          <div className="ml-quick">
            <RowAction
              action={deleteSection}
              fields={{ id: section.id }}
              label="Διαγραφή Ενότητας"
              isDanger
            />
          </div>
        </div>
      )}
    </li>
  );
}

// Η καρτέλα «Ενότητες» του prototype: νέα, μετονομασία και περιγραφή, σειρά με ↑/↓, διαγραφή (μόνο χωρίς στοιχεία).
export function SectionsTab({
  sections,
  isOpenAtStart = false,
}: {
  sections: readonly ManageSection[];
  isOpenAtStart?: boolean;
}) {
  const [isAdding, setIsAdding] = useState(isOpenAtStart);
  return (
    <KBox title="Ενότητες" hint={`${sections.length} Ενότητες`} isOpen>
      <div className="ml-quick">
        <button
          type="button"
          data-primary
          aria-pressed={isAdding}
          onClick={() => setIsAdding(!isAdding)}
        >
          Νέα Ενότητα
        </button>
      </div>
      {isAdding && (
        <SpacesForm
          action={saveSection}
          submitLabel="Νέα Ενότητα"
          className="ml-fields"
          resetOnSuccess
        >
          <SectionFields />
        </SpacesForm>
      )}
      <ul className="ml-list">
        {sections.map((section, index) => (
          <SectionRow
            key={section.id}
            section={section}
            isFirst={index === 0}
            isLast={index === sections.length - 1}
          />
        ))}
      </ul>
      <p className="k-note">
        Ένα επίπεδο, χωρίς υποενότητες. Ενότητα με στοιχεία δεν διαγράφεται·
        πρώτα μετακινούνται τα στοιχεία.
      </p>
    </KBox>
  );
}
