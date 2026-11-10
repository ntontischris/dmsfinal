import {
  CONVERSATIONS_TITLE,
  SpacesConversations,
  parseAudienceTab,
  parseDone,
  parsePage,
} from "@/modules/knowledge";

export const metadata = { title: CONVERSATIONS_TITLE };

interface ConversationsPageProps {
  searchParams: Promise<{ tab?: string; page?: string; done?: string }>;
}

// L2 Συζητήσεις Βοηθού: μόνο με «Διαχειρίζεται Γνώση». Καρτέλα και σελίδα στη διεύθυνση.
export default async function ConversationsPage({
  searchParams,
}: ConversationsPageProps) {
  const params = await searchParams;
  return (
    <SpacesConversations
      audience={parseAudienceTab(params.tab)}
      page={parsePage(params.page)}
      done={parseDone(params.done)}
    />
  );
}
