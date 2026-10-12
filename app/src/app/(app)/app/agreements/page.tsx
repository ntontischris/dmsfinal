import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, getViewer, type Viewer } from "@/modules/access";
import {
  AGREEMENTS_LIST_LIMIT,
  AgreementsTable,
  IN_PROGRESS_DAYS,
  agreementCaps,
  athensToday,
  isInProgress,
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

function InProgressNote() {
  return (
    <p className="m-0 text-sm">
      Μόνο οι προτάσεις σε εξέλιξη (λήγουν σε {IN_PROGRESS_DAYS} μέρες ή τις
      άνοιξε ο πελάτης). <Link href="/app/agreements">Όλες οι Συμφωνίες</Link>
    </p>
  );
}

// Η ανάγνωση φέρνει έως AGREEMENTS_LIST_LIMIT, τις πιο πρόσφατα αλλαγμένες· το φίλτρο δεν βλέπει τις υπόλοιπες.
function TruncatedNote() {
  return (
    <Notice kind="empty" title="Ίσως λείπουν παλαιότερες">
      <p className="m-0">
        Το φίλτρο κοιτά τις {AGREEMENTS_LIST_LIMIT} πιο πρόσφατα αλλαγμένες
        Συμφωνίες.
      </p>
    </Notice>
  );
}

function Body({
  items,
  caps,
  isFiltered,
}: {
  items: readonly AgreementRow[];
  caps: AgreementCaps;
  isFiltered: boolean;
}) {
  if (items.length === 0 && isFiltered)
    return (
      <Notice kind="empty" title="Καμία πρόταση σε εξέλιξη">
        <p className="m-0">
          Καμία πρόταση δεν λήγει σε {IN_PROGRESS_DAYS} μέρες και καμία δεν
          την άνοιξε ο πελάτης.
        </p>
      </Notice>
    );
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
        {isFiltered && found.ok && found.data.length >= AGREEMENTS_LIST_LIMIT && <TruncatedNote />}
        {found.ok ? (
          <Body
            items={isFiltered ? found.data.filter((row) => isInProgress(row, today)) : found.data}
            caps={caps}
            isFiltered={isFiltered}
          />
        ) : (
          <LoadError />
        )}
      </div>
    </>
  );
}
