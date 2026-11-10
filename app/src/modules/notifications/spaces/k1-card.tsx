import { Panel } from "@/spaces/kit/panel";
import { Badge } from "@/spaces/screens/shared";

import {
  automationTitle,
  goesToClient,
  hasMissingEnglish,
  recipientText,
  timingText,
} from "../automation-helpers";
import type { Automation, EventPage } from "../automation-view-schema";
import { DeleteAutomation, EnabledSwitch } from "./k1-controls";
import { K1AutomationForm } from "./k1-form";

import "./k1.css";

// Μία κάρτα Αυτοματισμού (prototype `k1-card.tsx`): διακόπτης στην κεφαλίδα, σήματα, σύνοψη και η φόρμα επεξεργασίας.
// Η «Δοκιμαστική αποστολή σε μένα» του prototype δεν έχει ενέργεια στην εφαρμογή και λείπει. Η κάρτα είναι περιοχή με
// όνομα «τίτλος: κείμενο», όπως στην παλιά οθόνη, ώστε να ξεχωρίζουν δύο Αυτοματισμοί με τον ίδιο τίτλο.
export function AutomationCard({
  page,
  automation,
}: {
  page: EventPage;
  automation: Automation;
}) {
  const title = automationTitle(automation);
  return (
    <div role="region" aria-label={`${title}: ${automation.bodyEl}`}>
      <Panel
        label={title}
        aside={
          <EnabledSwitch id={automation.id} isEnabled={automation.isEnabled} />
        }
      >
        <div className="k1-auto">
          <div className="k1-meta" style={{ marginBottom: "var(--space-2)" }}>
            {goesToClient(automation) && automation.isEssential && (
              <Badge tone="strong">απαραίτητο</Badge>
            )}
            {hasMissingEnglish(automation) && (
              <Badge tone="attention">χωρίς αγγλικό</Badge>
            )}
          </div>
          <dl className="dl">
            <dt>Παραλήπτες</dt>
            <dd>
              {recipientText(automation, page)}
              {page.event.isCostOnly && (
                <span className="muted">
                  {" "}
                  · κλειδωμένοι: μόνο όσοι βλέπουν κόστος
                </span>
              )}
            </dd>
            <dt>Πότε</dt>
            <dd>{timingText(automation)}</dd>
          </dl>
          <K1AutomationForm page={page} automation={automation} />
          {automation.isInitial ? (
            <p className="note">
              Οι αρχικοί Αυτοματισμοί δεν διαγράφονται, μόνο σβήνουν.
            </p>
          ) : (
            <DeleteAutomation id={automation.id} />
          )}
        </div>
      </Panel>
    </div>
  );
}
