import { SpacesCalendar } from "@/modules/calendar";

export const metadata = { title: "Ημερολόγιο" };

// A5: Εβδομάδα, Μήνας, Λίστα. Η βάση ορίζει τι βλέπει ο καθένας· εδώ μόνο φαίνεται.
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <SpacesCalendar query={await searchParams} />;
}
