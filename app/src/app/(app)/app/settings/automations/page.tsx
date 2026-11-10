import { SpacesAutomations } from "@/modules/notifications";

export const metadata = { title: "Ρυθμίσεις · Αυτοματισμοί" };

interface AutomationsPageProps {
  searchParams: Promise<{ group?: string; only?: string }>;
}

// K1 Αυτοματισμοί (#173): ο κατάλογος των Γεγονότων ανά ομάδα. Μόνο όποιος «Διαχειρίζεται Αυτοματισμούς».
export default async function AutomationsPage({
  searchParams,
}: AutomationsPageProps) {
  const { group, only } = await searchParams;
  return <SpacesAutomations group={group} only={only} />;
}
