import { ScreenHeader } from "@/components/shell/screen-header";
import { getViewer } from "@/modules/access";
import { QueueCancelRequests, QueuePending, filmingCaps, getQueue } from "@/modules/filming";

import { LoadError, NoAccess } from "../filming-parts";

export const metadata = { title: "Ουρά έγκρισης" };

const EYEBROW = "E2 · Ουρά έγκρισης";

// E2: όσα περιμένουν απόφαση της ομάδας: νέες κρατήσεις και αιτήματα ακύρωσης.
export default async function FilmingQueuePage() {
  const viewer = await getViewer();
  const caps = filmingCaps(viewer);
  if (!caps.canApprove)
    return (
      <NoAccess
        viewer={viewer}
        eyebrow={EYEBROW}
        message="Την ουρά έγκρισης τη βλέπει όποιος «Εγκρίνει Γυρίσματα»."
      />
    );

  const queue = await getQueue();
  if (!queue.ok) return <LoadError />;
  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title="Ουρά έγκρισης" />
      <div className="grid gap-4">
        <QueuePending entries={queue.data.pending} />
        <QueueCancelRequests requests={queue.data.cancelRequests} />
      </div>
    </>
  );
}
