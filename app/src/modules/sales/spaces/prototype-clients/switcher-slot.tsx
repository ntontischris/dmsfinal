// PROTOTYPE — throwaway, branch prototype/clients-three-levels. Ο διακόπτης μέσα σε Suspense (διαβάζει τη διεύθυνση).
import { Suspense } from "react";

import { VariantSwitcher } from "./switcher";

export const SwitcherSlot = ({ isShown }: { isShown: boolean }) =>
  isShown ? (
    <Suspense fallback={null}>
      <VariantSwitcher />
    </Suspense>
  ) : null;
