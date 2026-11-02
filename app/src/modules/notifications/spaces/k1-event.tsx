import Link from "next/link";

import { can, getViewer } from "@/modules/access";
import { Panel } from "@/spaces/kit/panel";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { EVENT_CODE_PATTERN } from "../automation-helpers";
import {
  AUTOMATIONS_PATH,
  KIND_LABELS,
  WIRED_LATER,
} from "../automation-labels";
import type { Catalog, EventPage } from "../automation-view-schema";
import {
  getAutomationEvent,
  getCatalog,
  getHolidays,
} from "../queries-automations";
import { AutomationCard } from "./k1-card";
import { NewAutomation } from "./k1-controls";
import { HolidayList } from "./k1-holidays";
import { groupTitle, k1Href } from "./k1-model";
import { K1Denied, K1Frame } from "./k1-screen";

import "./k1.css";

const HOLIDAY_EVENT = "holiday.greeting";

const athensYear = (): number =>
  Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Athens",
      year: "numeric",
    }).format(new Date()),
  );

function Variables({ page }: { page: EventPage }) {
  return (
    <Panel label="Μεταβλητές">
      <p className="muted">
        Γράφονται σε άγκιστρα και είναι ίδιες στα ελληνικά και στα αγγλικά
        κείμενα. Μια άγνωστη μεταβλητή δεν αποθηκεύεται. Τα ποσά δεν φτάνουν σε
        όσους δεν βλέπουν ποσά.
      </p>
      <div className="k1-vars">
        {page.event.variables.map((v) => (
          <code key={v}>{`{${v}}`}</code>
        ))}
      </div>
    </Panel>
  );
}

function EventHeader({
  page,
  catalog,
}: {
  page: EventPage;
  catalog: Catalog | null;
}) {
  const { event } = page;
  const group = catalog?.groups.find((g) => g.code === event.group);
  return (
    <Panel
      label={`${event.number}. ${event.label}`}
      aside={
        <Link className="button" href={k1Href(event.group, undefined)}>
          Πίσω στον κατάλογο
        </Link>
      }
    >
      <dl className="dl">
        <dt>Ομάδα</dt>
        <dd>{group ? groupTitle(group) : event.group}</dd>
        <dt>Είδος</dt>
        <dd>{KIND_LABELS[event.kind]}</dd>
        <dt>Μία περίπτωση</dt>
        <dd>{event.caseOf}</dd>
      </dl>
      {event.isCostOnly && (
        <p className="note">
          Γεγονός κόστους: οι παραλήπτες είναι κλειδωμένοι, μόνο όσοι βλέπουν
          κόστος και κερδοφορία.
        </p>
      )}
      {!event.isWired && (
        <p className="note">
          <Badge tone="waiting">{WIRED_LATER}</Badge> Αυτό το Γεγονός συνδέεται
          αργότερα: οι Αυτοματισμοί του αποθηκεύονται, αλλά δεν στέλνουν ακόμα
          τίποτα.
        </p>
      )}
    </Panel>
  );
}

function EventBody({
  page,
  catalog,
  holidays,
}: {
  page: EventPage;
  catalog: Catalog | null;
  holidays: Awaited<ReturnType<typeof getHolidays>> | null;
}) {
  return (
    <>
      <EventHeader page={page} catalog={catalog} />
      <Variables page={page} />
      {holidays?.ok && holidays.data && (
        <HolidayList holidays={holidays.data} />
      )}
      {holidays?.ok === false && <ErrorNotice what="οι Αργίες" />}
      {page.automations.length === 0 && (
        <StateNotice kind="empty" title="Αυτό το Γεγονός δεν έχει Αυτοματισμό">
          Πρόσθεσε τον πρώτο από το κουμπί παρακάτω.
        </StateNotice>
      )}
      {page.automations.map((a) => (
        <AutomationCard key={a.id} page={page} automation={a} />
      ))}
      <NewAutomation page={page} />
      {page.automations.some((a) => !a.isInitial) && (
        <p className="btn-row">
          <Badge>έχει προσθήκες Διαχείρισης</Badge>
        </p>
      )}
    </>
  );
}

// K1 σελίδα Γεγονότος στη νέα εμφάνιση (prototype `k1-event.tsx`): Είδος, Μία περίπτωση, Μεταβλητές, Αργίες (στην «Αργία»)
// και οι κάρτες Αυτοματισμών. Η «Επαναφορά αρχικών» του prototype δεν έχει ενέργεια στην εφαρμογή και λείπει.
export async function SpacesAutomationEvent({ code }: { code: string }) {
  if (!can(await getViewer(), "automations.manage")) return <K1Denied />;
  const isValid = EVENT_CODE_PATTERN.test(code);
  const [page, catalog, holidays] = await Promise.all([
    isValid ? getAutomationEvent(code) : null,
    getCatalog(),
    code === HOLIDAY_EVENT ? getHolidays(athensYear()) : null,
  ]);
  if (page?.ok === false)
    return (
      <div data-spaces>
        <ErrorNotice what="τους Αυτοματισμούς" />
      </div>
    );
  return (
    <K1Frame>
      {page?.data ? (
        <EventBody
          page={page.data}
          catalog={catalog.ok ? (catalog.data ?? null) : null}
          holidays={holidays}
        />
      ) : (
        <StateNotice kind="empty" title="Δεν υπάρχει αυτό το Γεγονός">
          <Link href={AUTOMATIONS_PATH}>Πίσω στον κατάλογο</Link>
        </StateNotice>
      )}
    </K1Frame>
  );
}
