import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, getViewer, type Viewer } from "@/modules/access";
import {
  AgreementsTable,
  agreementCaps,
  athensToday,
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

const IN_PROGRESS_DAYS = 7;

const plusDays = (day: string, days: number): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

// «Σε εξέλιξη» (η κάρτα της Σήμερα): πρόταση που στάλθηκε και λήγει σε έως 7 μέρες ή την άνοιξε ο πελάτης.
const isInProgress = (row: AgreementRow, today: string): boolean =>
  row.state === "proposal" &&
  row.path === "sent" &&
  (row.validUntil <= plusDays(today, IN_PROGRESS_DAYS) || row.linksOpened > 0);

function InProgressNote() {
  return (
    <p className="m-0 text-sm">
      Μόνο οι προτάσεις σε εξέλιξη (λήγουν σε {IN_PROGRESS_DAYS} μέρες ή τις
      άνοιξε ο πελάτης). <Link href="/app/agreements">Όλες οι Συμφωνίες</Link>
    </p>
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
export default async function AgreementsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const [viewer, { view }] = await Promise.all([getViewer(), searchParams]);
  const caps = agreementCaps(viewer);
  if (!caps.canView) return <NoAccess viewer={viewer} />;

  const isFiltered = view === "in_progress";
  const today = athensToday();
  const found = await listAgreements();
  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title="Συμφωνίες" />
      <div className="grid gap-4">
        <p className="m-0 text-sm text-muted-foreground">
          Μια πρόταση ξεκινά πάντα μέσα σε μια Ευκαιρία: από τη σελίδα της{" "}
          <Link href="/app/pipeline">Ευκαιρίας</Link>, με «Σύνταξη».
        </p>
        {isFiltered && <InProgressNote />}
        {found.ok ? (
          <Body
            items={isFiltered ? found.data.filter((row) => isInProgress(row, today)) : found.data}
            caps={caps}
          />
        ) : (
          <LoadError />
        )}
      </div>
    </>
  );
}
