import { EQUIPMENT_TEMPLATES } from "@/data/equipment";
import { equipmentCapsOf } from "@/data/equipment-access";
import { F3Templates } from "@/screens/f3-templates";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  type ScreenProps,
} from "@/screens/shared";

import "./e5.css";
import "./f.css";

// Πρότυπα εξοπλισμού: Ιδ · Δι · Πα (όποιος δεσμεύει εξοπλισμό). Κοινά για όλη την ομάδα.
export function F3({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const caps = equipmentCapsOf(role);
  return (
    <div className="e">
      <StateSwitcher role={role} code="F3" state={state} />
      {!caps.canManageTemplates ? (
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>
            Πρότυπα εξοπλισμού φτιάχνει όποιος δεσμεύει εξοπλισμό: Ιδιοκτήτης,
            Διαχείριση και Παραγωγή.
          </p>
        </StateNotice>
      ) : state === "error" ? (
        <ErrorNotice what="τα Πρότυπα εξοπλισμού" />
      ) : (
        <F3Templates
          key={state}
          initial={state === "empty" ? [] : EQUIPMENT_TEMPLATES}
        />
      )}
    </div>
  );
}
