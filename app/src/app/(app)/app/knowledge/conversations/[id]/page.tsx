import Link from "next/link";
import { z } from "zod";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, getViewer } from "@/modules/access";
import {
  CONVERSATION_GONE_TEXT,
  CONVERSATIONS_EYEBROW,
  CONVERSATIONS_LOAD_ERROR,
  CONVERSATIONS_TITLE,
  ConversationView,
  LOAD_ERROR_TEXT,
  NO_CONVERSATIONS_ACCESS_TEXT,
  getConversation,
} from "@/modules/knowledge";

export const metadata = { title: CONVERSATIONS_TITLE };

interface ConversationPageProps {
  params: Promise<{ id: string }>;
}

// L2 μία Συζήτηση: μόνο ανάγνωση, μόνο με «Διαχειρίζεται Γνώση». Χωρίς Δικαίωμα ή ανύπαρκτη: ίδια σελίδα άρνησης.
export default async function ConversationPage({
  params,
}: ConversationPageProps) {
  const [viewer, { id }] = await Promise.all([getViewer(), params]);
  const isValid = z.uuid().safeParse(id).success;
  const result =
    viewer.status === "signed-in" && isValid ? await getConversation(id) : null;
  if (result?.ok && result.data)
    return (
      <>
        <ScreenHeader
          eyebrow={CONVERSATIONS_EYEBROW}
          title={CONVERSATIONS_TITLE}
        />
        <ConversationView conversation={result.data} />
      </>
    );
  return (
    <>
      <ScreenHeader
        eyebrow={CONVERSATIONS_EYEBROW}
        title={CONVERSATIONS_TITLE}
      />
      <p className="mt-0">
        <Link href="/app/knowledge/conversations">← Όλες οι Συζητήσεις</Link>
      </p>
      {result?.ok === false ? (
        <Notice kind="error" title={CONVERSATIONS_LOAD_ERROR}>
          <p className="m-0">{LOAD_ERROR_TEXT}</p>
        </Notice>
      ) : (
        <AccessNotice viewer={viewer}>
          <p className="m-0">
            {viewer.status === "signed-in"
              ? `${NO_CONVERSATIONS_ACCESS_TEXT} ${CONVERSATION_GONE_TEXT}`
              : NO_CONVERSATIONS_ACCESS_TEXT}
          </p>
        </AccessNotice>
      )}
    </>
  );
}
