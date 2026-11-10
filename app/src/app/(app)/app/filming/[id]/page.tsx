import { z } from "zod";

import { STATUS_LABELS, listTemplates } from "@/modules/equipment";
import { SpacesFilming } from "@/modules/filming";

export const metadata = { title: "Γύρισμα" };

// E3: ένα Γύρισμα. Κάθε ενέργεια και κάθε φόρμα εμφανίζεται μόνο αν το viewerCan της βάσης το επιτρέπει.
// Το «done» της διεύθυνσης φέρνει το μήνυμα μετά από κράτηση ή μετάθεση.
export default async function FilmingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ done?: string | string[] }>;
}) {
  const parsedId = z.uuid().safeParse((await params).id);
  const { done } = await searchParams;
  return (
    <SpacesFilming
      id={parsedId.success ? parsedId.data : null}
      equipment={{ statusLabels: STATUS_LABELS, listTemplates }}
      done={typeof done === "string" ? done : undefined}
    />
  );
}
