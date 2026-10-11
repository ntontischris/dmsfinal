import { z } from "zod";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, getViewer } from "@/modules/access";
import {
  THREAD_EYEBROW,
  THREAD_NO_ACCESS_TEXT,
  ThreadScreen,
  messagesCaps,
  parseFilter,
  parseProduction,
} from "@/modules/messages";

export const metadata = { title: "Συνομιλία" };

interface ThreadPageProps {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ production?: string; filter?: string }>;
}

// J2: η Συνομιλία ενός Πελάτη (?production= ετικέτα και προεπιλογή του συντάκτη, ?filter=untagged|internal).
export default async function ThreadPage({
  params,
  searchParams,
}: ThreadPageProps) {
  const [viewer, { clientId }, query] = await Promise.all([
    getViewer(),
    params,
    searchParams,
  ]);
  const caps = messagesCaps(viewer);
  const parsed = z.uuid().safeParse(clientId);
  return (
    <>
      <ScreenHeader eyebrow={THREAD_EYEBROW} title="Συνομιλία" />
      {!caps.canChat ? (
        <AccessNotice viewer={viewer}>
          <p className="m-0">{THREAD_NO_ACCESS_TEXT}</p>
        </AccessNotice>
      ) : !parsed.success ? (
        <Notice kind="empty" title="Δεν βρέθηκε Συνομιλία" />
      ) : (
        <ThreadScreen
          clientId={parsed.data}
          filters={{
            filter: parseFilter(query.filter),
            production: parseProduction(query.production),
          }}
          clientHref={
            caps.canOpenClient ? `/app/clients/${parsed.data}` : undefined
          }
        />
      )}
    </>
  );
}
