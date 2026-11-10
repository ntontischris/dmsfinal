import { SpacesSalesSettings } from "@/modules/sales";

export const metadata = { title: "Ρυθμίσεις · Πωλήσεις" };

// O2 Ρυθμίσεις › Πωλήσεις. Τη σελίδα τη βλέπει μόνο όποιος «Διαχειρίζεται Ρυθμίσεις».
export default async function SalesSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ retired?: string }>;
}) {
  const { retired } = await searchParams;
  return <SpacesSalesSettings showRetired={retired === "1"} />;
}
