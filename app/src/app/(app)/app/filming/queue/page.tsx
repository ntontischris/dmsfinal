import { listTemplates } from "@/modules/equipment";
import { SpacesFilmingQueue } from "@/modules/filming";

export const metadata = { title: "Ουρά έγκρισης" };

const EGKRINO_JOB = "egkrino-gyrismata";

const textOf = (value: string | string[] | undefined): string | null =>
  typeof value === "string" ? value : null;

// E2: όσα περιμένουν απόφαση της ομάδας: νέες κρατήσεις, αιτήματα μετάθεσης και ακύρωσης.
// Με ?job=egkrino-gyrismata&step=&req= φαίνεται και η κάρτα του οδηγού για ένα αίτημα.
export default async function FilmingQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const step = Number(textOf(params.step));
  const guide =
    textOf(params.job) === EGKRINO_JOB && Number.isInteger(step)
      ? { step, reqId: textOf(params.req) }
      : null;
  return <SpacesFilmingQueue guide={guide} equipmentTemplates={listTemplates} />;
}
