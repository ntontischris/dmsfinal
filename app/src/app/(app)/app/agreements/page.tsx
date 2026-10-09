import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, getViewer, type Viewer } from "@/modules/access";
import {
  AgreementsTable,
  agreementCaps,
  listAgreements,
  toAgreementRowView,
  type AgreementCaps,
  type AgreementRow,
} from "@/modules/agreements";

export const metadata = { title: "Συμφωνίες" };

const EYEBROW = "D1 · Συμφωνίες";

function LoadError() {
  return (
    <Notice kind="error" title="Δεν φόρτωσαν οι Συμφωνίες">
      <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
    </Notice>
  );
}

function NoAccess({ viewer }: { viewer: Viewer }) {
  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title="Συμφωνίες" />
      <AccessNotice viewer={viewer}>
        <p className="m-0">
          Τις Συμφωνίες τις βλέπει όποιος «Βλέπει Συμφωνίες».
        </p>
      </AccessNotice>
    </>
  );
}

function Body({
  items,
  caps,
}: {
  items: readonly AgreementRow[];
  caps: AgreementCaps;
}) {
  if (items.length === 0)
    return (
      <Notice kind="empty" title="Δεν υπάρχουν Συμφωνίες ακόμα">
        <p className="m-0">Οι Συμφωνίες γεννιούνται από τις Ευκαιρίες.</p>
      </Notice>
    );
  return (
    <AgreementsTable
      rows={items.map(toAgreementRowView)}
      columns={{ amount: caps.canSeeAmounts }}
      canSeeCost={caps.canSeeCost}
    />
  );
}

// D1: οι Συμφωνίες που βλέπει ο χρήστης. Δεν υπάρχει «Νέα Συμφωνία»: η πρόταση ξεκινά από την Ευκαιρία (B4).
// Ποσά και χαμηλό περιθώριο φτάνουν μόνο σε όποιον τα δικαιούται (αλλιώς η βάση στέλνει null).
export default async function AgreementsPage() {
  const viewer = await getViewer();
  const caps = agreementCaps(viewer);
  if (!caps.canView) return <NoAccess viewer={viewer} />;

  const found = await listAgreements();
  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title="Συμφωνίες" />
      <div className="grid gap-4">
        <p className="m-0 text-sm text-muted-foreground">
          Μια πρόταση ξεκινά πάντα μέσα σε μια Ευκαιρία: από τη σελίδα της{" "}
          <Link href="/app/pipeline">Ευκαιρίας</Link>, με «Σύνταξη».
        </p>
        {found.ok ? <Body items={found.data} caps={caps} /> : <LoadError />}
      </div>
    </>
  );
}
