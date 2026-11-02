import { can, getViewer, isOwner } from "@/modules/access";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { getOpenedAt, getReadiness } from "../queries";
import { linesOf, pendingOf } from "./o7-adapter";
import { RequiredLines } from "./o7-lines";
import { OpenButton, OpenConfirm, OpenedNotice, WaitingCard } from "./o7-open";
import { SettingsTabs } from "./o-shared";

import "./o7.css";

// O7 Έλεγχος ετοιμότητας στη νέα εμφάνιση (prototype `screens/O7.tsx`): όποιος «Διαχειρίζεται Ρυθμίσεις»·
// το «Άνοιγμα» μόνο ο Ιδιοκτήτης, μία φορά. Κάθε γραμμή υπολογίζεται από τα δεδομένα (public.readiness).
export async function SpacesReadiness({
  isConfirming,
}: {
  isConfirming: boolean;
}) {
  const viewer = await getViewer();
  if (!can(viewer, "settings.manage"))
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Τον Έλεγχο ετοιμότητας τον βλέπει όποιος «Διαχειρίζεται Ρυθμίσεις».
        </StateNotice>
      </div>
    );
  const [rows, openedAt] = await Promise.all([getReadiness(), getOpenedAt()]);
  if (!rows.ok || !openedAt.ok)
    return (
      <div data-spaces>
        <SettingsTabs code="O7" />
        <ErrorNotice what="τον έλεγχο ετοιμότητας" />
      </div>
    );
  const owner = isOwner(viewer);
  const lines = linesOf(rows.data);
  const pending = pendingOf(lines);
  const opened = openedAt.data;
  const showConfirm = isConfirming && owner && pending === 0 && !opened;
  return (
    <div data-spaces>
      <SettingsTabs code="O7" />
      {opened ? (
        <OpenedNotice openedAt={opened} />
      ) : (
        <p>
          <strong>
            {lines.length - pending} από {lines.length} έτοιμα
          </strong>{" "}
          · {pending} εκκρεμούν
        </p>
      )}
      <RequiredLines lines={lines} isOwner={owner} isLocked={opened !== null} />
      {!opened && <WaitingCard />}
      {showConfirm && <OpenConfirm />}
      {!opened && !showConfirm && (
        <OpenButton isOwner={owner} pending={pending} />
      )}
    </div>
  );
}
