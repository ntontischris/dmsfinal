import { SpacesIntegrations } from "@/modules/integrations";

export const metadata = { title: "Ενσωματώσεις και συνδρομές" };

interface IntegrationsPageProps {
  searchParams: Promise<{ sub?: string }>;
}

// N5 Ενσωματώσεις και συνδρομές (#209): κάρτες σύνδεσης, GA4/Pixel και μητρώο συνδρομών. Μόνο για τον Ιδιοκτήτη (η βάση
// το ξανακρίνει). Η ρύθμιση του Google ημερολογίου μένει εδώ· το Ιστορικό αποστολών είναι στο K3.
export default async function IntegrationsPage({
  searchParams,
}: IntegrationsPageProps) {
  const { sub } = await searchParams;
  return <SpacesIntegrations open={sub ?? null} />;
}
