// Καθοδηγούμενα σενάρια: ο φανταστικός πελάτης περνά τη ραχοκοκαλιά, βήμα βήμα, ανά ρόλο.
// Το prototype δεν αποθηκεύει: κάθε βήμα δείχνει την Κυψέλη Καφέ τη στιγμή που βρίσκεται σε αυτό το σημείο
// (μια παλιά Περίοδος, η τρέχουσα, η πρόταση που περιμένει υπογραφή), όχι το αποτέλεσμα του προηγούμενου κλικ.

import type { RoleId } from "@/data/roles";
import {
  ACCOUNTANT_SCENARIO,
  CLIENT_SCENARIO,
  PRODUCTION_SCENARIO,
  VISITOR_SCENARIO,
} from "@/data/scenarios-work";
import {
  ADMIN_SCENARIO,
  SALES_SCENARIO,
  SOLO_SCENARIO,
} from "@/data/scenarios-team";

export interface ScenarioStep {
  role: RoleId;
  code: string;
  query?: Readonly<Record<string, string>>;
  title: string;
  see: string; // τι βλέπει
  act?: string; // τι πατά ή δοκιμάζει
  check?: string; // τι να προσέξει ο αναγνώστης
}

export interface Scenario {
  id: string;
  title: string;
  who: string; // από ποια ματιά
  summary: string;
  steps: readonly ScenarioStep[];
}

export const SCENARIOS: readonly Scenario[] = [
  SOLO_SCENARIO,
  VISITOR_SCENARIO,
  SALES_SCENARIO,
  ADMIN_SCENARIO,
  PRODUCTION_SCENARIO,
  CLIENT_SCENARIO,
  ACCOUNTANT_SCENARIO,
];

export const findScenario = (id: string | undefined): Scenario | undefined =>
  SCENARIOS.find((scenario) => scenario.id === id);

// Η διεύθυνση ενός βήματος· κρατά το σενάριο και τον αριθμό βήματος για την μπάρα πάνω από την οθόνη.
export const stepHref = (scenario: Scenario, index: number): string => {
  const step = scenario.steps[index];
  const search = new URLSearchParams({
    ...(step.query ?? {}),
    sc: scenario.id,
    st: String(index + 1),
  }).toString();
  return `/${step.role}/${step.code}?${search}`;
};
