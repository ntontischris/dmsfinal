import { Badge } from "@/components/ui/badge";

import {
  automationTitle,
  goesToClient,
  hasMissingEnglish,
  recipientText,
  timingText,
} from "../automation-helpers";
import {
  COST_NOTE,
  ESSENTIAL_BADGE,
  INITIAL_NOTE,
  MISSING_EN_BADGE,
} from "../automation-labels";
import type { Automation, EventPage } from "../automation-view-schema";
import { DeleteAutomation, EnabledToggle } from "./automation-controls";
import { AutomationForm } from "./automation-form";

// Μία κάρτα Αυτοματισμού στη σελίδα του Γεγονότος (K1, #173): τίτλος, διακόπτης, σύνοψη και φόρμα επεξεργασίας.
export function AutomationCard({
  page,
  automation,
}: {
  page: EventPage;
  automation: Automation;
}) {
  const title = automationTitle(automation);
  return (
    <section
      aria-label={`${title}: ${automation.bodyEl}`}
      className="grid gap-3 rounded-md border bg-card p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid gap-1">
          <h2 className="m-0 text-base font-semibold">{title}</h2>
          <div className="flex flex-wrap gap-1.5">
            {goesToClient(automation) && automation.isEssential && (
              <Badge tone="strong">{ESSENTIAL_BADGE}</Badge>
            )}
            {hasMissingEnglish(automation) && (
              <Badge tone="attention">{MISSING_EN_BADGE}</Badge>
            )}
          </div>
        </div>
        <EnabledToggle id={automation.id} isEnabled={automation.isEnabled} />
      </div>
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Παραλήπτες</dt>
        <dd className="m-0">{recipientText(automation, page)}</dd>
        <dt className="text-muted-foreground">Πότε</dt>
        <dd className="m-0">{timingText(automation)}</dd>
      </dl>
      {page.event.isCostOnly && (
        <p className="m-0 text-sm text-muted-foreground">{COST_NOTE}</p>
      )}
      <AutomationForm page={page} automation={automation} />
      {automation.isInitial ? (
        <p className="m-0 text-sm text-muted-foreground">{INITIAL_NOTE}</p>
      ) : (
        <DeleteAutomation id={automation.id} />
      )}
    </section>
  );
}
