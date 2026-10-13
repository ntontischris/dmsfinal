import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";

import { audienceText, MANAGE_PATH } from "../helpers";
import { CONTENT_RULE_NOTE, KIND_LABEL, STATUS_LABEL } from "../labels";
import type { EditableItem, ManageItem } from "../view-schema";
import { AudienceForm } from "./audience-form";
import { ContentForm } from "./content-form";
import { FilePanel } from "./file-panel";
import { ItemActions } from "./item-actions";

// Ο επεξεργαστής ενός στοιχείου (L1), κατά το l1-editor του prototype: περιεχόμενο, Αρχείο, Κοινό, ενέργειες.

interface ItemEditorProps {
  item: EditableItem;
  options: ManageItem;
}

export function ItemEditor({ item, options }: ItemEditorProps) {
  const isDraft = item.status === "draft";
  return (
    <div className="grid gap-6">
      <p className="m-0">
        <Link href={MANAGE_PATH}>← Διαχείριση Γνώσης</Link>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{KIND_LABEL[item.kind]}</Badge>
        <Badge tone={isDraft ? "attention" : "ok"}>
          {STATUS_LABEL[item.status]}
        </Badge>
        <span className="text-sm text-muted-foreground">
          Κοινό: {audienceText(item.audience)}
        </span>
      </div>
      <p className="m-0 text-sm text-muted-foreground">{CONTENT_RULE_NOTE}</p>
      <Panel label="Περιεχόμενο">
        <ContentForm
          item={item}
          sections={options.sections}
        />
      </Panel>
      {item.kind === "file" && (
        <Panel label="Αρχείο">
          <FilePanel item={item} />
        </Panel>
      )}
      <Panel label="Κοινό">
        <AudienceForm
          itemId={item.id}
          audience={item.audience}
          roles={options.roles}
        />
      </Panel>
      <Panel label={isDraft ? "Δημοσίευση" : "Απόσυρση"}>
        <ItemActions item={item} />
      </Panel>
    </div>
  );
}
