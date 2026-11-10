import { z } from "zod";

import { STATUS_LABELS, listTemplates } from "@/modules/equipment";
import { SpacesFilming } from "@/modules/filming";

export const metadata = { title: "Γύρισμα" };

// E3: ένα Γύρισμα. Κάθε ενέργεια και κάθε φόρμα εμφανίζεται μόνο αν το viewerCan της βάσης το επιτρέπει.
export default async function FilmingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const parsedId = z.uuid().safeParse((await params).id);
  return (
    <SpacesFilming
      id={parsedId.success ? parsedId.data : null}
      equipment={{ statusLabels: STATUS_LABELS, listTemplates }}
    />
  );
}
