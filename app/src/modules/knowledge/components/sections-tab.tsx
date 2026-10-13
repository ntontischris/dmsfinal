"use client";

import { Field, Input } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import { deleteSection, moveSection, saveSection } from "../actions-sections";
import type { ManageSection } from "../view-schema";
import { ActionForm } from "./action-form";

// L1 Ενότητες: νέα, μετονομασία και περιγραφή, σειρά με πάνω/κάτω, διαγραφή (μόνο χωρίς στοιχεία). Ένα επίπεδο.

function SectionFields({ section }: { section?: ManageSection }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={section?.id ?? ""} />
      <Field label="Όνομα">
        <Input
          name="name"
          defaultValue={section?.name ?? ""}
          maxLength={80}
          required
        />
      </Field>
      <Field label="Περιγραφή (μία πρόταση)">
        <Input
          name="description"
          defaultValue={section?.description ?? ""}
          maxLength={240}
        />
      </Field>
    </div>
  );
}

function MoveButton({
  id,
  direction,
}: {
  id: string;
  direction: "up" | "down";
}) {
  return (
    <ActionForm
      action={moveSection}
      submitLabel={direction === "up" ? "↑ Πάνω" : "↓ Κάτω"}
      pendingLabel="…"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="direction" value={direction} />
    </ActionForm>
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
  return (
    <li className="grid gap-3 border-b py-4 last:border-b-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <strong className="text-base">{section.name}</strong>
        <span className="text-sm text-muted-foreground">
          {section.itemCount} στοιχεία
        </span>
      </div>
      <ActionForm action={saveSection} submitLabel="Αποθήκευση" onlyWhenChanged>
        <SectionFields section={section} />
      </ActionForm>
      <div className="flex flex-wrap items-start gap-2">
        {!isFirst && <MoveButton id={section.id} direction="up" />}
        {!isLast && <MoveButton id={section.id} direction="down" />}
        <ActionForm
          action={deleteSection}
          submitLabel="Διαγραφή"
          pendingLabel="Διαγραφή…"
          submitVariant="danger"
        >
          <input type="hidden" name="id" value={section.id} />
        </ActionForm>
      </div>
    </li>
  );
}

export function SectionsTab({
  sections,
}: {
  sections: readonly ManageSection[];
}) {
  return (
    <div className="grid gap-6">
      <Panel label="Νέα Ενότητα">
        <ActionForm
          action={saveSection}
          submitLabel="Νέα Ενότητα"
          resetOnSuccess
        >
          <SectionFields />
        </ActionForm>
      </Panel>
      {sections.length > 0 && (
        <Panel label="Ενότητες" aside={`${sections.length}`}>
          <ul className="m-0 list-none p-0">
            {sections.map((section, index) => (
              <SectionRow
                key={section.id}
                section={section}
                isFirst={index === 0}
                isLast={index === sections.length - 1}
              />
            ))}
          </ul>
          <p className="mb-0 text-sm text-muted-foreground">
            Ένα επίπεδο, χωρίς υποενότητες. Ενότητα με στοιχεία δεν διαγράφεται·
            πρώτα μετακινούνται τα στοιχεία.
          </p>
        </Panel>
      )}
    </div>
  );
}
