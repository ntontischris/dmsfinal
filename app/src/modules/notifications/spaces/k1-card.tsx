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

// Ένα κουτί Αυτοματισμού (prototype `k1-card.tsx`): διακόπτης πάνω, σήματα, σύνοψη και η φόρμα επεξεργασίας.
// Η «Δοκιμαστική αποστολή σε μένα» του prototype δεν έχει ενέργεια στην εφαρμογή και λείπει. Η κάρτα είναι περιοχή με
// όνομα «τίτλος: κείμενο», όπως στην παλιά οθόνη, ώστε να ξεχωρίζουν δύο Αυτοματισμοί με τον ίδιο τίτλο.
export function AutomationCard({
  page,
  automation,
  isOpen,
}: {
  page: EventPage;
  automation: Automation;
  isOpen: boolean;
}) {
  const title = automationTitle(automation);
  return (
    <div role="region" aria-label={`${title}: ${automation.bodyEl}`}>
      <details className="ml-box" open={isOpen || undefined}>
        <summary>
          <h2 className="ml-box-title">{title}</h2>
          <small>{timingText(automation)}</small>
        </summary>
        <div className="k1-auto">
          <div className="k1-meta">
            <EnabledSwitch
              id={automation.id}
              isEnabled={automation.isEnabled}
            />
            {goesToClient(automation) && automation.isEssential && (
              <span className="ml-tag">απαραίτητο</span>
            )}
            {hasMissingEnglish(automation) && (
              <span className="ml-tag">χωρίς αγγλικό</span>
            )}
          </div>
          <dl className="ml-kv">
            <dt>Παραλήπτες</dt>
            <dd>
              {recipientText(automation, page)}
              {page.event.isCostOnly && (
                <small> · κλειδωμένοι: μόνο όσοι βλέπουν κόστος</small>
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
      </details>
    </div>
  );
}
