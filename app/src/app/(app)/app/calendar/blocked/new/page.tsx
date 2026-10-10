import { ScreenHeader } from "@/components/shell/screen-header";
import { AccessNotice, getViewer } from "@/modules/access";
import { athensDate } from "@/modules/filming";
import {
  BlockedTimeForm,
  LoadNotice,
  calendarCaps,
  getCalendarView,
  parseCalendarParams,
} from "@/modules/calendar";

export const metadata = { title: "Νέος κλεισμένος χρόνος" };

const EYEBROW = "A6 · Κλεισμένος χρόνος";
const DEFAULT_FROM = "09:00";
const DEFAULT_TO = "10:00";

// A6: νέος κλεισμένος χρόνος. Μόνο η ομάδα· το άτομο αλλάζει μόνο όσοι «Κλείνουν χρόνο άλλων».
export default async function NewBlockedTimePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  const caps = calendarCaps(viewer);
  if (!caps.isTeam || viewer.status !== "signed-in" || viewer.team === null)
    return (
      <>
        <ScreenHeader eyebrow={EYEBROW} title="Νέος κλεισμένος χρόνος" />
        <AccessNotice viewer={viewer} />
      </>
    );

  const today = athensDate(new Date());
  const { date } = parseCalendarParams(await searchParams, today);
  const view = await getCalendarView({ from: today, to: today });
  if (!view.ok) return <LoadNotice />;
  const canPickPerson = view.data.canBlockOthers;

  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title="Νέος κλεισμένος χρόνος" />
      <BlockedTimeForm
        id={null}
        values={{
          day: date,
          untilDay: null,
          allDay: false,
          from: DEFAULT_FROM,
          to: DEFAULT_TO,
          title: "",
          userId: viewer.userId,
        }}
        people={canPickPerson ? view.data.team : []}
        personName={viewer.team.name}
      />
    </>
  );
}
