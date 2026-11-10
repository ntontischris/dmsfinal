import { z } from "zod";

import { MANAGE_TITLE, SpacesKnowledgeEditor } from "@/modules/knowledge";

export const metadata = { title: MANAGE_TITLE };

interface EditPageProps {
  params: Promise<{ id: string }>;
}

// L1 επεξεργαστής στοιχείου: μόνο με «Διαχειρίζεται Γνώση».
export default async function KnowledgeEditPage({ params }: EditPageProps) {
  const { id } = await params;
  const isValid = z.uuid().safeParse(id).success;
  return <SpacesKnowledgeEditor id={isValid ? id : null} />;
}
