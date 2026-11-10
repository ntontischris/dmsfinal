import {
  parseBlockedPrefill,
  parseFromRequest,
  SpacesNewFilming,
} from "@/modules/filming";
import { listProductions } from "@/modules/productions";

export const metadata = { title: "Νέο Γύρισμα" };

// E4: κλείσιμο Γυρίσματος από την ομάδα για Συμφωνία με ενεργή Περίοδο. Η βάση ελέγχει τα πάντα.
export default async function NewFilmingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return (
    <SpacesNewFilming
      prefill={parseBlockedPrefill(query)}
      fromRequest={parseFromRequest(query)}
      internal={() => listProductions({ state: "open", internalOnly: true })}
    />
  );
}
