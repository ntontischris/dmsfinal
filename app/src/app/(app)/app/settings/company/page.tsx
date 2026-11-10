import { SpacesCompanySettings } from "@/modules/settings";

export const metadata = { title: "Ρυθμίσεις · Εταιρεία" };

// O1 Ρυθμίσεις › Εταιρεία. Τη σελίδα τη βλέπει μόνο όποιος «Διαχειρίζεται Ρυθμίσεις».
export default async function CompanySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ bank?: string }>;
}) {
  const { bank } = await searchParams;
  return <SpacesCompanySettings isAddingBank={bank === "new"} />;
}
