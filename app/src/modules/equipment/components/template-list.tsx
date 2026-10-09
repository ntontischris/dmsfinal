import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/cn";

import { deleteTemplate } from "../actions-templates";
import { statusTone } from "../helpers";
import { STATUS_LABELS } from "../labels";
import type {
  EquipmentItemRow,
  EquipmentTemplate,
  TemplateItem,
} from "../types";

import { ActionForm } from "./action-form";
import { MutedNote } from "./equipment-fields";
import { TemplateForm } from "./template-form";

interface TemplateListProps {
  templates: readonly EquipmentTemplate[];
  items: readonly EquipmentItemRow[];
  canEditTemplates: boolean;
}

// F3: τα Πρότυπα, με τα αντικείμενά τους. Όποιος δεσμεύει εξοπλισμό ή διαχειρίζεται απόθεμα τα φτιάχνει και τα αλλάζει.
export function TemplateList({
  templates,
  items,
  canEditTemplates,
}: TemplateListProps) {
  return (
    <div className="grid gap-4">
      {canEditTemplates && <NewTemplateDetails items={items} />}
      {templates.length === 0 ? (
        <Notice kind="empty" title="Κανένα Πρότυπο εξοπλισμού">
          <p className="m-0">
            {canEditTemplates
              ? "Φτιάξε το πρώτο με «Νέο Πρότυπο»."
              : "Δεν έχει φτιαχτεί ακόμα Πρότυπο."}
          </p>
        </Notice>
      ) : (
        templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            items={items}
            canEdit={canEditTemplates}
          />
        ))
      )}
    </div>
  );
}

function NewTemplateDetails({ items }: { items: readonly EquipmentItemRow[] }) {
  return (
    <details className="group">
      <summary
        className={cn(
          buttonVariants({ variant: "primary" }),
          "cursor-pointer list-none",
        )}
      >
        Νέο Πρότυπο
      </summary>
      <div className="mt-3 w-full max-w-xl">
        <Panel label="Στοιχεία νέου Προτύπου">
          <TemplateForm items={items} />
        </Panel>
      </div>
    </details>
  );
}

function TemplateCard({
  template,
  items,
  canEdit,
}: {
  template: EquipmentTemplate;
  items: readonly EquipmentItemRow[];
  canEdit: boolean;
}) {
  return (
    <Panel label={template.name}>
      <div className="grid gap-4">
        {template.note && <MutedNote>{template.note}</MutedNote>}
        <TemplateItems items={template.items} />
        {canEdit && <TemplateEditors template={template} items={items} />}
      </div>
    </Panel>
  );
}

function TemplateItems({ items }: { items: readonly TemplateItem[] }) {
  return (
    <ul className="m-0 grid list-none gap-2 p-0 text-sm">
      {items.map((item) => (
        <li key={item.id} className="flex flex-wrap items-center gap-2">
          <span>{item.name}</span>
          {item.status !== "available" && (
            <Badge tone={statusTone(item.status)}>
              {STATUS_LABELS[item.status]}
            </Badge>
          )}
        </li>
      ))}
    </ul>
  );
}

function TemplateEditors({
  template,
  items,
}: {
  template: EquipmentTemplate;
  items: readonly EquipmentItemRow[];
}) {
  return (
    <div className="grid gap-4">
      <details>
        <summary className="cursor-pointer text-sm font-medium">Αλλαγή</summary>
        <div className="mt-3">
          <TemplateForm items={items} template={template} />
        </div>
      </details>
      <ActionForm
        action={deleteTemplate}
        submitLabel="Διαγραφή"
        variant="danger"
        size="sm"
      >
        <input type="hidden" name="templateId" value={template.id} />
      </ActionForm>
    </div>
  );
}
