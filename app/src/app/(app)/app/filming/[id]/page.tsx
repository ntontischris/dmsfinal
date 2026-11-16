import { z } from "zod";

import { STATUS_LABELS, listTemplates } from "@/modules/equipment";
import { SpacesFilming } from "@/modules/filming";

export const metadata = { title: "Γύρισμα" };

// E3: ένα Γύρισμα. Κάθε ενέργεια και κάθε φόρμα εμφανίζεται μόνο αν το viewerCan της βάσης το επιτρέπει.
// Το «done» της διεύθυνσης φέρνει το μήνυμα μετά από κράτηση ή μετάθεση· τα «job»/«step» τη θέση του οδηγού.
export default async function FilmingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    done?: string | string[];
    job?: string | string[];
    step?: string | string[];
  }>;
}) {
  const parsedId = z.uuid().safeParse((await params).id);
  const { done, job, step } = await searchParams;
  const stepNumber = Number(step);
  const guide =
    typeof job === "string" && Number.isInteger(stepNumber)
      ? { job, step: stepNumber }
      : null;
  return (
    <SpacesFilming
      id={parsedId.success ? parsedId.data : null}
      equipment={{ statusLabels: STATUS_LABELS, listTemplates }}
      done={typeof done === "string" ? done : undefined}
      guide={guide}
    />
  );
}
