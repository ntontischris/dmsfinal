import { getCalendarView } from "@/modules/calendar";
import {
  parseBlockedPrefill,
  parseFromRequest,
  parsePreferredClient,
  SpacesNewFilming,
} from "@/modules/filming";
import { listProductions } from "@/modules/productions";
import { getClient } from "@/modules/sales";

export const metadata = { title: "Νέο Γύρισμα" };

// Ο Πελάτης που διαλέχτηκε πριν (`?client=`), με τοποθεσία την πόλη του αν την έχει.
const preferredOf = async (clientId: string | null) => {
  if (!clientId) return null;
  const client = await getClient(clientId);
  return { clientId, location: client.ok ? (client.data?.city ?? "") : "" };
};

const HOUR = 3_600_000;
const ACTIVE = new Set(["pending", "scheduled"]);

// Ποιος είναι πιασμένος τη μέρα (Γυρίσματα, Κλεισμένος χρόνος, Google), για την ώρα που προτείνει ο οδηγός.
const busyOn = async (day: string) => {
  const view = await getCalendarView({ from: day, to: day });
  if (!view.ok) return null;
  const { filmings, blocked, busy } = view.data;
  return [
    ...filmings
      .filter((item) => ACTIVE.has(item.state))
      .map((item) => ({
        userIds: item.crewIds,
        startsAt: item.startsAt,
        endsAt: new Date(Date.parse(item.startsAt) + item.hours * HOUR).toISOString(),
      })),
    ...[...blocked, ...busy].map((item) => ({
      userIds: [item.userId],
      startsAt: item.startsAt,
      endsAt: item.endsAt,
    })),
  ];
};

// E4: κλείσιμο Γυρίσματος από την ομάδα για Συμφωνία με ενεργή Περίοδο. Η βάση ελέγχει τα πάντα.
export default async function NewFilmingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const fromRequest = parseFromRequest(query);
  return (
    <SpacesNewFilming
      prefill={parseBlockedPrefill(query)}
      fromRequest={fromRequest}
      preferred={fromRequest ? null : await preferredOf(parsePreferredClient(query))}
      internal={() => listProductions({ state: "open", internalOnly: true })}
      guide={query.job ? { busyOn } : null}
    />
  );
}
