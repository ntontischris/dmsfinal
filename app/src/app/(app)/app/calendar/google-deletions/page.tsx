import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, getViewer } from "@/modules/access";
import {
  GoogleDeletionsList,
  canSeeGoogleCalendar,
  getGoogleDeletions,
} from "@/modules/google";

export const metadata = { title: "Διαγραφές από το Google" };

const EYEBROW = "A7 · Ημερολόγιο";

// A7: Γυρίσματα που διαγράφηκαν στο Google. Η απόφαση είναι του Χρήστη, πριν λήξει η προθεσμία.
export default async function GoogleDeletionsPage() {
  const viewer = await getViewer();
  const header = <ScreenHeader eyebrow={EYEBROW} title="Διαγραφές από το Google" />;
  if (!canSeeGoogleCalendar(viewer))
    return (
      <>
        {header}
        <AccessNotice viewer={viewer}>
          <p className="m-0">Τις διαγραφές από το Google τις βλέπει όποιος έχει πρόσβαση στο Google Calendar.</p>
        </AccessNotice>
      </>
    );

  const deletions = await getGoogleDeletions();
  if (!deletions.ok)
    return (
      <>
        {header}
        <Notice kind="error" title="Οι διαγραφές δεν φόρτωσαν">
          <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
        </Notice>
      </>
    );
  return (
    <>
      {header}
      <GoogleDeletionsList items={deletions.data} />
    </>
  );
}
