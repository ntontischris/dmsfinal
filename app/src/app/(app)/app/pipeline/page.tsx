import { SpacesPipeline } from "@/modules/sales";

export const metadata = { title: "Pipeline Ευκαιριών" };

// B3 Pipeline Ευκαιριών: οι ανοιχτές Ευκαιρίες ανά Στάδιο (τα φίλτρα είναι μέσα στη σελίδα).
export default function PipelinePage() {
  return <SpacesPipeline />;
}
