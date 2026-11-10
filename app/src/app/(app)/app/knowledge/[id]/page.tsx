import { z } from "zod";

import { LIBRARY_TITLE, SpacesKnowledgeItem } from "@/modules/knowledge";

export const metadata = { title: LIBRARY_TITLE };

interface KnowledgeItemPageProps {
  params: Promise<{ id: string }>;
}

// Ένα στοιχείο της Γνώσης (A8). Ανύπαρκτο, πρόχειρο ή εκτός Κοινού φαίνονται ίδια: «δεν ανήκει στο Κοινό σου».
export default async function KnowledgeItemPage({
  params,
}: KnowledgeItemPageProps) {
  const { id } = await params;
  const isValid = z.uuid().safeParse(id).success;
  return <SpacesKnowledgeItem id={isValid ? id : null} />;
}
