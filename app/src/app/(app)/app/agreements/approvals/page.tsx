import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, getViewer, type Viewer } from "@/modules/access";
import {
  ApprovalQueue,
  agreementCaps,
  listApprovals,
} from "@/modules/agreements";

export const metadata = { title: "Προτάσεις προς έγκριση" };

const EYEBROW = "D4 · Συμφωνίες";
const TITLE = "Προτάσεις προς έγκριση";

function NoAccess({ viewer }: { viewer: Viewer }) {
  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title={TITLE} />
      <AccessNotice viewer={viewer}>
        <p className="m-0">
          Τις προτάσεις προς έγκριση τις βλέπει όποιος «Παρεκκλίνει από τον
          Κατάλογο».
        </p>
      </AccessNotice>
    </>
  );
}

// D4: η ουρά Εγκρίσεων. «Εγκρίνω» στέλνει την πρόταση αμέσως σε όλους τους παραλήπτες· «Απόρριψη» θέλει σχόλιο.
export default async function ApprovalsPage() {
  const viewer = await getViewer();
  const caps = agreementCaps(viewer);
  if (!caps.canDeviate) return <NoAccess viewer={viewer} />;

  const found = await listApprovals();
  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title={TITLE} />
      {found.ok ? (
        <ApprovalQueue items={found.data} canSeeAmounts={caps.canSeeAmounts} />
      ) : (
        <Notice kind="error" title="Δεν φόρτωσαν οι προτάσεις προς έγκριση">
          <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
        </Notice>
      )}
    </>
  );
}
