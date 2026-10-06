import { CREW_TEMPLATES } from "@/data/filming";
import { filmingCapsOf } from "@/data/filming-access";
import { E7Templates } from "@/screens/e7-templates";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  type ScreenProps,
} from "@/screens/shared";

import "./e5.css";

// Πρότυπα συνεργείου: Ιδ · Δι · Πα (όποιος διαχειρίζεται Συνεργείο).
export function E7({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const caps = filmingCapsOf(role);
  return (
    <div className="e">
      <StateSwitcher role={role} code="E7" state={state} />
      <h1>Πρότυπα συνεργείου</h1>
      {!caps.canManageCrew ? (
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>Πρότυπα συνεργείου φτιάχνει όποιος διαχειρίζεται Συνεργείο.</p>
        </StateNotice>
      ) : state === "error" ? (
        <ErrorNotice what="τα Πρότυπα συνεργείου" />
      ) : (
        <E7Templates
          key={state}
          initial={state === "empty" ? [] : CREW_TEMPLATES}
        />
      )}
    </div>
  );
}
