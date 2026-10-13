import { Panel } from "@/components/ui/panel";

import { rebuildMemory } from "../actions-memory";
import { MEMORY_NOTE } from "../labels";
import { ActionForm } from "./action-form";

// Η μνήμη του Βοηθού (#191): μαθαίνει μόνη της κάθε δημοσίευση και αλλαγή· εδώ ξαναφτιάχνεται ολόκληρη.
export function MemoryPanel() {
  return (
    <Panel label="Μνήμη του Βοηθού">
      <ActionForm action={rebuildMemory} submitLabel="Ξαναφτιάξε τη μνήμη του Βοηθού" pendingLabel="Στην ουρά…">
        <p className="m-0 text-sm text-muted-foreground">{MEMORY_NOTE}</p>
      </ActionForm>
    </Panel>
  );
}
