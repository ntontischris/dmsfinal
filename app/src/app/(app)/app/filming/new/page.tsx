import { redirect } from "next/navigation";

import { getCalendarView } from "@/modules/calendar";
import {
  parseBlockedPrefill,
  parseFromRequest,
  parsePreferredClient,
  SpacesNewFilming,
} from "@/modules/filming";
import { listProductions, reopenProduction, type ProductionCard } from "@/modules/productions";
import { getClient } from "@/modules/sales";
import { newFilmingEntryOf } from "@/spaces/flows/flows";

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

const heldOf = (card: ProductionCard) =>
  card.state === "open"
    ? []
    : [
        {
          id: card.id,
          title: card.title,
          state: card.state,
          clientId: card.client?.id ?? null,
          period: card.period ? { starts: card.period.starts, ends: card.period.ends } : null,
        },
      ];

// Οι Παραγωγές που δεν δέχονται Γυρίσματα (Παραδομένες, ακυρωμένες), για τη γραμμή του οδηγού στο βήμα της φόρμας.
const held = async () => {
  const lists = await Promise.all(
    (["delivered", "cancelled"] as const).map((state) => listProductions({ state, internalOnly: false })),
  );
  return lists.every((list) => list.ok) ? lists.flatMap((list) => (list.ok ? list.data.flatMap(heldOf) : [])) : null;
};

// E4: κλείσιμο Γυρίσματος από την ομάδα για Συμφωνία με ενεργή Περίοδο. Η βάση ελέγχει τα πάντα.
export default async function NewFilmingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const fromRequest = parseFromRequest(query);
  const prefill = parseBlockedPrefill(query);
  const clientId = parsePreferredClient(query);
  // Χωρίς οδηγό και χωρίς προσυμπλήρωση, το «Νέο Γύρισμα» περνά από τον οδηγό «Στήνω γύρισμα».
  const entry = newFilmingEntryOf({
    hasJob: Boolean(query.job),
    isPrefilled: Boolean(fromRequest || prefill),
    clientId,
  });
  if (entry) redirect(entry);
  return (
    <SpacesNewFilming
      prefill={prefill}
      fromRequest={fromRequest}
      preferred={fromRequest ? null : await preferredOf(clientId)}
      internal={() => listProductions({ state: "open", internalOnly: true })}
      guide={query.job ? { busyOn, held, reopen: reopenProduction } : null}
    />
  );
}
