import { getViewer } from "@/modules/access";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { agreementCaps } from "../helpers";
import { listApprovals } from "../queries-agreements";
import { ApprovalQueue } from "./d4-queue";

import "../../finance/spaces/money-lines.css";

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div data-spaces>{children}</div>
);

const RIGHTS_NOTE =
  "Ο Ιδιοκτήτης και η Διαχείριση έχουν το Δικαίωμα «Παρεκκλίνει από τον Κατάλογο», άρα οι δικές τους προτάσεις δεν περνούν από εδώ. Σε εταιρεία ενός ανθρώπου η λίστα μένει άδεια.";

// D4 Προτάσεις προς έγκριση στη μορφή των «Χρημάτων»: μία γραμμή ανά πρόταση, η εξήγηση των δικαιωμάτων σε κλειστό κουτί.
export async function SpacesApprovals() {
  const viewer = await getViewer();
  const caps = agreementCaps(viewer);
  if (!caps.canDeviate)
    return (
      <Frame>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>
            Τις προτάσεις προς έγκριση τις βλέπει όποιος «Παρεκκλίνει από τον
            Κατάλογο».
          </p>
        </StateNotice>
      </Frame>
    );
  const found = await listApprovals();
  if (!found.ok)
    return (
      <Frame>
        <ErrorNotice what="οι Προτάσεις προς έγκριση" />
      </Frame>
    );
  return (
    <Frame>
      <div className="ml-head">
        <p>
          Εγκρίνεις ή απορρίπτεις τις προτάσεις που πάνε κάτω από τον Κατάλογο.
          Άνοιξε την «Παρέκκλιση» για να δεις τι αλλάζει.
        </p>
      </div>
      <details className="ml-box d4l-rights">
        <summary>
          <h2 className="ml-box-title">Ποιανού οι προτάσεις έρχονται εδώ</h2>
          <small>Ποιος δεν χρειάζεται Έγκριση</small>
        </summary>
        <p className="muted">{RIGHTS_NOTE}</p>
      </details>
      <ApprovalQueue items={found.data} canSeeAmounts={caps.canSeeAmounts} />
    </Frame>
  );
}
