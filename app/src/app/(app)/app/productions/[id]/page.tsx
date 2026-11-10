import { SpacesProduction } from "@/modules/productions";

export const metadata = { title: "Παραγωγή" };

// G2: μία Παραγωγή. Ό,τι δεν επιτρέπεται στον θεατή δεν εμφανίζεται· η βάση ξαναελέγχει κάθε ενέργεια.
export default async function ProductionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <SpacesProduction id={(await params).id} />;
}
