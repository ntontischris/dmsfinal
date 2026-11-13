import { Panel } from "@/spaces/kit/panel";

import { getFirstSteps } from "../first-steps";
import { FirstStepsDismiss } from "./first-steps-dismiss";

// a3 «Πρώτα βήματα»: στην αρχική σελίδα, για όποιον δεν την έχει κλείσει. Ένα κείμενο ανά Ρόλο του Χρήστη,
// γραμμένο από τον Ιδιοκτήτη στη σελίδα του Ρόλου.
export async function SpacesFirstSteps() {
  const steps = await getFirstSteps();
  if (steps.length === 0) return null;
  const hasManyRoles = steps.length > 1;
  return (
    <div data-spaces id="first-steps">
      <Panel label="Πρώτα βήματα">
        {steps.map((step) => (
          <div key={step.role}>
            {hasManyRoles && <h3 className="kit-label">{step.role}</h3>}
            <p style={{ whiteSpace: "pre-line" }}>{step.body}</p>
          </div>
        ))}
        <FirstStepsDismiss />
      </Panel>
    </div>
  );
}
