import { EQUIPMENT, EQUIPMENT_CATEGORIES } from "@/data/equipment";
import { equipmentCapsOf } from "@/data/equipment-access";
import { F1Registry } from "@/screens/f1-registry";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  type ScreenProps,
} from "@/screens/shared";

import "./f.css";

// Μητρώο Εξοπλισμού: Ιδ · Δι (διαχειρίζονται απόθεμα) · Πα (ανάγνωση).
export function F1({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const caps = equipmentCapsOf(role);
  return (
    <div className="f">
      <StateSwitcher role={role} code="F1" state={state} />
      {!caps.canSee ? (
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>
            Τον Εξοπλισμό τον βλέπει η ομάδα που γυρίζει: Ιδιοκτήτης, Διαχείριση
            και Παραγωγή.
          </p>
        </StateNotice>
      ) : state === "error" ? (
        <ErrorNotice what="το μητρώο Εξοπλισμού" />
      ) : (
        <F1Registry
          key={state}
          role={role}
          caps={caps}
          initialItems={state === "empty" ? [] : EQUIPMENT}
          initialCategories={EQUIPMENT_CATEGORIES}
        />
      )}
    </div>
  );
}
