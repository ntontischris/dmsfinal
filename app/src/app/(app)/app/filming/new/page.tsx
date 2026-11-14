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
    />
  );
}
