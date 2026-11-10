import { SpacesAgreementsSettings } from "@/modules/agreements";

export const metadata = { title: "Ρυθμίσεις · Συμφωνίες" };

// O3 Ρυθμίσεις › Συμφωνίες. Τη σελίδα τη βλέπει μόνο όποιος «Διαχειρίζεται Ρυθμίσεις».
export default async function AgreementsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ retired?: string; set?: string }>;
}) {
  const { retired, set } = await searchParams;
  return (
    <SpacesAgreementsSettings
      showRetired={retired === "1"}
      set={set === "one_off" ? "one_off" : "monthly"}
    />
  );
}
