import { getViewer } from "@/modules/access";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { salesCaps } from "../helpers";
import { listDuplicatePairs } from "../queries-queue";
import { DuplicatePairs } from "./b6-pairs";

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div data-spaces>{children}</div>
);

// B6 Πιθανά διπλά στη νέα εμφάνιση (prototype `screens/B6.tsx`). Μόνο όποιος «Συγχωνεύει Πελάτες».
export async function SpacesDuplicates() {
  const viewer = await getViewer();
  if (!salesCaps(viewer).canMerge)
    return (
      <Frame>
        <StateNotice kind="denied" title="Χωρίς πρόσβαση">
          <p>Τα Πιθανά διπλά τα βλέπει όποιος «Συγχωνεύει Πελάτες».</p>
        </StateNotice>
      </Frame>
    );
  const pairs = await listDuplicatePairs();
  if (!pairs.ok)
    return (
      <Frame>
        <ErrorNotice what="τα Πιθανά διπλά" />
      </Frame>
    );
  return (
    <Frame>
      {pairs.data.length === 0 ? (
        <StateNotice kind="empty" title="Κανένα Πιθανό διπλό">
          <p>
            Όταν μια φόρμα μοιάζει με υπάρχοντα Πελάτη χωρίς ακριβές ταίριασμα,
            θα εμφανιστεί εδώ.
          </p>
        </StateNotice>
      ) : (
        <DuplicatePairs pairs={pairs.data} />
      )}
    </Frame>
  );
}
