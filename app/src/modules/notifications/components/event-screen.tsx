import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";

import { catalogHref } from "../automation-helpers";
import {
  BACK_TO_CATALOGUE,
  COST_NOTE,
  KIND_LABELS,
  NO_AUTOMATION_TITLE,
  UNWIRED_NOTE,
  VARIABLES_NOTE,
  VARIABLES_TITLE,
  WIRED_LATER,
} from "../automation-labels";
import type { EventPage, Holidays } from "../automation-view-schema";
import { AutomationCard } from "./automation-card";
import { NewAutomation } from "./automation-controls";
import { HolidayCard } from "./holiday-card";

// Η σελίδα ενός Γεγονότος (K1, #173): Είδος, Μία περίπτωση, Μεταβλητές, κάρτες Αυτοματισμών και, στην «Αργία», οι Αργίες.

function EventHeader({
  page,
  groupLabel,
}: {
  page: EventPage;
  groupLabel: string;
}) {
  const { event } = page;
  return (
    <Panel
      label={`${event.number}. ${event.label}`}
      aside={
        <Link
          className={buttonVariants({ size: "sm" })}
          href={catalogHref({
            group: event.group,
            onlyActive: false,
            onlyWired: false,
          })}
        >
          {BACK_TO_CATALOGUE}
        </Link>
      }
    >
      <div className="grid gap-3">
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Ομάδα</dt>
          <dd className="m-0">{groupLabel}</dd>
          <dt className="text-muted-foreground">Είδος</dt>
          <dd className="m-0">{KIND_LABELS[event.kind]}</dd>
          <dt className="text-muted-foreground">Μία περίπτωση</dt>
          <dd className="m-0">{event.caseOf}</dd>
        </dl>
        {!event.isWired && (
          <p className="m-0 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge tone="attention">{WIRED_LATER}</Badge>
            {UNWIRED_NOTE}
          </p>
        )}
        {event.isCostOnly && (
          <p className="m-0 text-sm text-muted-foreground">{COST_NOTE}</p>
        )}
      </div>
    </Panel>
  );
}

function Variables({ page }: { page: EventPage }) {
  return (
    <Panel label={VARIABLES_TITLE}>
      <div className="grid gap-2">
        <p className="m-0 text-sm text-muted-foreground">{VARIABLES_NOTE}</p>
        <div className="flex flex-wrap gap-1.5">
          {page.event.variables.map((name) => (
            <code
              key={name}
              className="rounded-sm border bg-muted px-1.5 text-xs"
            >{`{${name}}`}</code>
          ))}
        </div>
      </div>
    </Panel>
  );
}

interface EventScreenProps {
  page: EventPage;
  groupLabel: string;
  holidays: Holidays | null;
}

export function EventScreen({ page, groupLabel, holidays }: EventScreenProps) {
  return (
    <div className="grid gap-4">
      <EventHeader page={page} groupLabel={groupLabel} />
      <Variables page={page} />
      {holidays && <HolidayCard holidays={holidays} />}
      {page.automations.length === 0 && (
        <Notice kind="empty" title={NO_AUTOMATION_TITLE}>
          <p className="m-0">Πρόσθεσε τον πρώτο από το κουμπί παρακάτω.</p>
        </Notice>
      )}
      {page.automations.map((automation) => (
        <AutomationCard
          key={automation.id}
          page={page}
          automation={automation}
        />
      ))}
      <NewAutomation page={page} />
    </div>
  );
}
