import { z } from "zod";

import { lookOf } from "@/components/shell/read-look";
import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, getViewer } from "@/modules/access";
import {
  THREAD_EYEBROW,
  THREAD_NO_ACCESS_TEXT,
  SpacesThread,
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
// Στη νέα εμφάνιση (Χώροι, μόνο για την ομάδα) η οθόνη του prototype· αλλιώς η σημερινή.
export default async function ThreadPage({
  params,
  searchParams,
}: ThreadPageProps) {
  const [viewer, { clientId }, query] = await Promise.all([
    getViewer(),
    params,
    searchParams,
  ]);
  const parsed = z.uuid().safeParse(clientId);
  const filters = {
    filter: parseFilter(query.filter),
    production: parseProduction(query.production),
  };
  if ((await lookOf(viewer)) === "spaces")
    return (
      <SpacesThread
        clientId={parsed.success ? parsed.data : undefined}
        filters={filters}
      />
    );
  const caps = messagesCaps(viewer);
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
          filters={filters}
          clientHref={
            caps.canOpenClient ? `/app/clients/${parsed.data}` : undefined
          }
        />
      )}
    </>
  );
}
