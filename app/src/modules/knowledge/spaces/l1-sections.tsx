"use client";

import { useActionState, useState } from "react";

import { INITIAL_FORM_STATE, type FormState } from "@/lib/form-state";
import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";

import { deleteSection, moveSection, saveSection } from "../actions-sections";
import type { ManageSection } from "../view-schema";
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
        className="button"
        type="submit"
        aria-label={ariaLabel}
        data-danger={isDanger ? "true" : undefined}
        disabled={isPending}
      >
        {label}
      </button>
      {state.error && (
        <span className="part-sub" role="alert">
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
      <label>
        Όνομα
        <input
          className="input"
          name="name"
          defaultValue={section?.name ?? ""}
          maxLength={80}
          required
        />
      </label>
      <label>
        Περιγραφή (μία πρόταση)
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
    <>
      <ListRow
        title={section.name}
        sub={
          <>
            {section.description && (
              <span className="part-sub">{section.description}</span>
            )}
            <span className="part-sub">{section.itemCount} στοιχεία</span>
          </>
        }
        aside={
          <>
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
              className="button"
              type="button"
              aria-pressed={isEditing}
              onClick={() => setIsEditing(!isEditing)}
            >
              Επεξεργασία
            </button>
          </>
        }
      />
      {isEditing && (
        <li className="part-row">
          <span className="part-row-main">
            <SpacesForm
              action={saveSection}
              submitLabel="Αποθήκευση"
              className="l1-form"
            >
              <SectionFields section={section} />
            </SpacesForm>
            <RowAction
              action={deleteSection}
              fields={{ id: section.id }}
              label="Διαγραφή Ενότητας"
              isDanger
            />
          </span>
        </li>
      )}
    </>
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
    <Panel
      label="Ενότητες"
      isFlush
      aside={
        <button
          className="button"
          type="button"
          data-primary="true"
          aria-pressed={isAdding}
          onClick={() => setIsAdding(!isAdding)}
        >
          Νέα Ενότητα
        </button>
      }
    >
      {isAdding && (
        <SpacesForm
          action={saveSection}
          submitLabel="Νέα Ενότητα"
          className="l1-form l1-pad"
          resetOnSuccess
        >
          <SectionFields />
        </SpacesForm>
      )}
      <RowList>
        {sections.map((section, index) => (
          <SectionRow
            key={section.id}
            section={section}
            isFirst={index === 0}
            isLast={index === sections.length - 1}
          />
        ))}
      </RowList>
      <p className="note l1-pad">
        Ένα επίπεδο, χωρίς υποενότητες. Ενότητα με στοιχεία δεν διαγράφεται·
        πρώτα μετακινούνται τα στοιχεία.
      </p>
    </Panel>
  );
}
