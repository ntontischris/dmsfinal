import { z } from "zod";

import { CONVERSATIONS_TITLE, SpacesConversation } from "@/modules/knowledge";

export const metadata = { title: CONVERSATIONS_TITLE };

interface ConversationPageProps {
  params: Promise<{ id: string }>;
}

// L2 μία Συζήτηση: μόνο ανάγνωση, μόνο με «Διαχειρίζεται Γνώση». Χωρίς Δικαίωμα ή ανύπαρκτη: ίδια σελίδα άρνησης.
export default async function ConversationPage({
  params,
}: ConversationPageProps) {
  const { id } = await params;
  const isValid = z.uuid().safeParse(id).success;
  return <SpacesConversation id={isValid ? id : null} />;
}
