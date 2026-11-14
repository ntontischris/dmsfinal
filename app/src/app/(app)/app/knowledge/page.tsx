import {
  LIBRARY_TITLE,
  SpacesKnowledge,
  parseQuery,
  parseSection,
} from "@/modules/knowledge";

export const metadata = { title: LIBRARY_TITLE };

interface KnowledgePageProps {
  searchParams: Promise<{ q?: string; section?: string }>;
}

// A8 για κάθε Χρήστη (ομάδας ή πελάτη): μόνο τα δημοσιευμένα του Κοινού του. Η αναζήτηση (?q=) και η Ενότητα
// (?section=) ζουν στη διεύθυνση.
export default async function KnowledgePage({
  searchParams,
}: KnowledgePageProps) {
  const params = await searchParams;
  return (
    <SpacesKnowledge
      q={parseQuery(params.q)}
      section={parseSection(params.section)}
    />
  );
}
