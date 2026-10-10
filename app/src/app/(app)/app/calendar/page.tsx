import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { AccessNotice, getViewer } from "@/modules/access";
import { athensDate, formatDateTime } from "@/modules/filming";
import {
  CalendarBody,
  CalendarFilters,
  CalendarLinkPanel,
  CalendarNav,
  LoadNotice,
  buildCalendarDays,
  calendarCaps,
  datesOf,
  getCalendarView,
  getLinkStatus,
  parseCalendarParams,
  rangeOf,
} from "@/modules/calendar";
import type { CalendarData, CalendarLinkStatus, LayerKey } from "@/modules/calendar";

export const metadata = { title: "Ημερολόγιο" };

const EYEBROW = "A5 · Ημερολόγιο";

// A5: Εβδομάδα, Μήνας, Λίστα. Η βάση ορίζει τι βλέπει ο καθένας· εδώ μόνο φαίνεται.
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  const caps = calendarCaps(viewer);
  if (!caps.canSee)
    return (
      <>
        <ScreenHeader eyebrow={EYEBROW} title="Ημερολόγιο" />
        <AccessNotice viewer={viewer}>
          <p className="m-0">
            Το Ημερολόγιο το βλέπει η ομάδα και οι Πελάτες με λογαριασμό.
          </p>
        </AccessNotice>
      </>
    );

  const today = athensDate(new Date());
  const params = parseCalendarParams(await searchParams, today);
  const range = rangeOf(params.view, params.date);
  const [view, link] = await Promise.all([
    getCalendarView(range),
    getLinkStatus(),
  ]);
  if (!view.ok) return <LoadNotice />;
  const data = view.data;
  const days = buildCalendarDays(
    data,
    datesOf(params.view, params.date),
    params.layers,
  );
  const isEmpty =
    data.filmings.length + data.blocked.length + data.busy.length === 0;

  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title="Ημερολόγιο">
        {data.isTeam && (
          <Link
            className={buttonVariants({ variant: "primary" })}
            href={`/app/calendar/blocked/new?date=${params.date}`}
          >
            Κλεισμένος χρόνος
          </Link>
        )}
      </ScreenHeader>
      {!data.isTeam && (
        <p className="m-0 mb-4 text-sm text-muted-foreground">
          Βλέπεις τα Γυρίσματά σου και, για κάθε μέρα, αν είναι ελεύθερη, γεμάτη
          ή κλειστή.
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 content-start gap-4">
          <CalendarNav params={params} today={today} />
          {data.isTeam && (
            <CalendarFilters
              params={params}
              available={availableLayers(data)}
            />
          )}
          <CalendarBody
            params={params}
            days={days}
            isEmpty={isEmpty}
            isTeam={data.isTeam}
            canBook={data.canBook}
            today={today}
          />
        </div>
        <aside className="grid content-start gap-4">
          <CalendarLinkPanel
            exists={link.ok && link.data.exists}
            createdLabel={createdLabel(link.ok ? link.data : null)}
          />
        </aside>
      </div>
    </>
  );
}

// Το «Ομάδα» (απασχολημένος) φαίνεται μόνο όταν υπάρχει κάτι να δείξει.
function availableLayers(data: CalendarData): readonly LayerKey[] {
  return data.busy.length > 0
    ? ["filmings", "blocked", "busy"]
    : ["filmings", "blocked"];
}

const createdLabel = (status: CalendarLinkStatus | null): string | null =>
  status?.createdAt ? formatDateTime(status.createdAt) : null;
