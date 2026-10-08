import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, getViewer } from "@/modules/access";
import { DuplicatePairs, listDuplicatePairs, salesCaps } from "@/modules/sales";

export const metadata = { title: "Πιθανά διπλά" };

const EYEBROW = "B6 · Πελάτες και Πωλήσεις";

// B6: μόνο όποιος «Συγχωνεύει Πελάτες» βλέπει τα ζευγάρια (η βάση επιστρέφει κενό στους άλλους).
export default async function DuplicatesPage() {
  const viewer = await getViewer();
  const header = <ScreenHeader eyebrow={EYEBROW} title="Πιθανά διπλά" />;
  if (!salesCaps(viewer).canMerge)
    return (
      <>
        {header}
        <AccessNotice viewer={viewer}>
          <p className="m-0">
            Τα Πιθανά διπλά τα βλέπει όποιος «Συγχωνεύει Πελάτες».
          </p>
        </AccessNotice>
      </>
    );

  const pairs = await listDuplicatePairs();
  return (
    <>
      {header}
      {pairs.ok ? (
        <DuplicatePairs pairs={pairs.data} />
      ) : (
        <Notice kind="error" title="Δεν φόρτωσαν τα Πιθανά διπλά">
          <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
        </Notice>
      )}
    </>
  );
}
