import { SpacesPipeline, parseB3Selection } from "@/modules/sales";

export const metadata = { title: "Pipeline Ευκαιριών" };

// B3 Pipeline Ευκαιριών: οι ανοιχτές Ευκαιρίες ανά Στάδιο. Τα «ποιον παίρνω» είναι μέσα στη σελίδα· Υπεύθυνος, Πηγή και
// Κλείσιμο ζουν στη διεύθυνση.
export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <SpacesPipeline selection={parseB3Selection(await searchParams)} />;
}
