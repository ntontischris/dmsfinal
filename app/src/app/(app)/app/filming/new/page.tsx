import { ScreenHeader } from "@/components/shell/screen-header";
import { getViewer } from "@/modules/access";
import {
  NewFilmingForm,
  athensDate,
  filmingCaps,
  listBookingOptions,
  parseBlockedPrefill,
} from "@/modules/filming";
import { listProductions } from "@/modules/productions";

import { LoadError, NoAccess } from "../filming-parts";

export const metadata = { title: "Νέο Γύρισμα" };

const EYEBROW = "E4 · Νέο Γύρισμα";

// E4: κλείσιμο Γυρίσματος από την ομάδα για Συμφωνία με ενεργή Περίοδο. Η βάση ελέγχει τα πάντα.
export default async function NewFilmingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  const caps = filmingCaps(viewer);
  if (!caps.canBook)
    return (
      <NoAccess
        viewer={viewer}
        eyebrow={EYEBROW}
        message="Τα Γυρίσματα κλείνονται από όποιον «Κλείνει Γυρίσματα»."
      />
    );

  const [options, productions] = await Promise.all([
    listBookingOptions(),
    caps.canBookInternal ? listProductions({ state: "open", internalOnly: true }) : null,
  ]);
  if (!options.ok) return <LoadError />;
  const prefill = parseBlockedPrefill(await searchParams);
  const internal = productions?.ok
    ? productions.data.map((production) => ({ id: production.id, name: production.title }))
    : [];

  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title="Νέο Γύρισμα" />
      <NewFilmingForm
        options={options.data}
        productions={internal}
        today={athensDate(new Date())}
        prefill={prefill}
      />
    </>
  );
}
