import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, can, getViewer } from "@/modules/access";
import {
  AUTOMATIONS_PATH,
  AutomationsSubnav,
  BACK_TO_CATALOGUE,
  EVENT_CODE_PATTERN,
  EventScreen,
  K1_EYEBROW,
  K1_NOTE,
  LOAD_FAILED_TEXT,
  LOAD_FAILED_TITLE,
  NO_EVENT_TITLE,
  NO_MANAGE_TEXT,
  SETTINGS_TITLE,
  getAutomationEvent,
  getCatalog,
  getHolidays,
} from "@/modules/notifications";
import { SettingsTabs } from "@/modules/settings";

export const metadata = { title: "Ρυθμίσεις · Αυτοματισμοί" };

interface EventPageProps {
  params: Promise<{ event: string }>;
}

const HOLIDAY_EVENT = "holiday.greeting";

const athensYear = (): number =>
  Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Athens",
      year: "numeric",
    }).format(new Date()),
  );

// K1: η σελίδα ενός Γεγονότος με τους Αυτοματισμούς του (και τις Αργίες στο «Αργία»).
export default async function AutomationEventPage({ params }: EventPageProps) {
  const [viewer, { event }] = await Promise.all([getViewer(), params]);
  const header = <ScreenHeader eyebrow={K1_EYEBROW} title={SETTINGS_TITLE} />;
  if (!can(viewer, "automations.manage"))
    return (
      <>
        {header}
        <AccessNotice viewer={viewer}>
          <p className="m-0">{NO_MANAGE_TEXT}</p>
        </AccessNotice>
      </>
    );

  const code = decodeURIComponent(event);
  const isValid = EVENT_CODE_PATTERN.test(code);
  const [page, catalog, holidays] = await Promise.all([
    isValid ? getAutomationEvent(code) : null,
    getCatalog(),
    code === HOLIDAY_EVENT ? getHolidays(athensYear()) : null,
  ]);
  const groupCode = page?.ok ? page.data?.event.group : undefined;
  const group = catalog.ok
    ? catalog.data?.groups.find((item) => item.code === groupCode)
    : undefined;
  return (
    <>
      {header}
      <div className="grid gap-4">
        <SettingsTabs current="automations" />
        <AutomationsSubnav current="automations" />
        {page?.ok === false ? (
          <Notice kind="error" title={LOAD_FAILED_TITLE}>
            <p className="m-0">{LOAD_FAILED_TEXT}</p>
          </Notice>
        ) : page?.data ? (
          <EventScreen
            page={page.data}
            groupLabel={
              group ? `${group.code}. ${group.label}` : page.data.event.group
            }
            holidays={holidays?.ok ? holidays.data : null}
          />
        ) : (
          <Notice kind="empty" title={NO_EVENT_TITLE}>
            <Link href={AUTOMATIONS_PATH}>{BACK_TO_CATALOGUE}</Link>
          </Notice>
        )}
        <p className="m-0 text-sm text-muted-foreground">{K1_NOTE}</p>
      </div>
    </>
  );
}
