import { LIBRARY_TITLE, SpacesKnowledge, parseQuery } from "@/modules/knowledge";

export const metadata = { title: LIBRARY_TITLE };

interface KnowledgePageProps {
  searchParams: Promise<{ q?: string }>;
}

// A8 για κάθε Χρήστη (ομάδας ή πελάτη): μόνο τα δημοσιευμένα του Κοινού του. Η αναζήτηση ζει στη διεύθυνση (?q=).
export default async function KnowledgePage({
  searchParams,
}: KnowledgePageProps) {
  const params = await searchParams;
  return <SpacesKnowledge q={parseQuery(params.q)} />;
}
