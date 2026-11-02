import Link from "next/link";

import { getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { agreementCaps, athensToday, toAgreementRowView } from "../helpers";
import { IN_PROGRESS_DAYS, isInProgress } from "../in-progress";
import { LIST_LIMIT, listAgreements } from "../queries-agreements";
import { AgreementsTable } from "./d1-agreements-table";

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div data-spaces>{children}</div>
);

// D1 Συμφωνίες στη νέα εμφάνιση (prototype `screens/D1.tsx`, όψη ομάδας). Δεν υπάρχει «Νέα Συμφωνία»: η πρόταση ξεκινά
// από την Ευκαιρία. Με ?view=in_progress (από τη Σήμερα) μόνο οι προτάσεις σε εξέλιξη, όπως στη σημερινή σελίδα.
export async function SpacesAgreements({ view }: { view: string | undefined }) {
  const viewer = await getViewer();
  const caps = agreementCaps(viewer);
  if (!caps.canView)
    return (
      <Frame>
        <StateNotice kind="denied" title="Δεν έχεις πρόσβαση στις Συμφωνίες">
          <p>Τις Συμφωνίες τις βλέπει όποιος «Βλέπει Συμφωνίες».</p>
        </StateNotice>
      </Frame>
    );
  const isFiltered = view === "in_progress";
  const found = await listAgreements();
  if (!found.ok)
    return (
      <Frame>
        <ErrorNotice what="η λίστα Συμφωνιών" />
      </Frame>
    );
  const today = athensToday();
  const items = isFiltered
    ? found.data.filter((row) => isInProgress(row, today))
    : found.data;
  const isReadOnly = !caps.canDraft && !caps.canDeviate;
  return (
    <Frame>
      <div className="toolbar">
        <span className="muted grow">
          {isFiltered && (
            <>
              Μόνο οι προτάσεις σε εξέλιξη (λήγουν σε {IN_PROGRESS_DAYS} μέρες ή
              τις άνοιξε ο πελάτης).{" "}
              <Link href={hrefOf("D1")}>Όλες οι Συμφωνίες</Link>
            </>
          )}
        </span>
        {isReadOnly && <Badge>Μόνο ανάγνωση</Badge>}
      </div>
      {caps.canDraft && (
        <p className="note">
          Νέα πρόταση ξεκινά πάντα μέσα από μια Ευκαιρία:{" "}
          <Link href={hrefOf("B3")}>άνοιξε το Pipeline</Link>.
        </p>
      )}
      {isFiltered && found.data.length >= LIST_LIMIT && (
        <p className="muted">
          Το φίλτρο κοιτά τις {LIST_LIMIT} πιο πρόσφατα αλλαγμένες Συμφωνίες.
        </p>
      )}
      {items.length === 0 ? (
        <StateNotice
          kind="empty"
          title={
            isFiltered
              ? "Καμία πρόταση σε εξέλιξη"
              : "Καμία Συμφωνία ακόμα. Η πρώτη ξεκινά από μια Ευκαιρία."
          }
        />
      ) : (
        <AgreementsTable
          rows={items.map(toAgreementRowView)}
          showAmount={caps.canSeeAmounts}
          canSeeCost={caps.canSeeCost}
        />
      )}
    </Frame>
  );
}
