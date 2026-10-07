import { settingsCapsOf } from "@/data/settings-access";
import { SettingsFrame } from "@/screens/o-shared";
import { DeadlinesCard, ReviewCard } from "@/screens/o5-rules";
import { StateNotice, type ScreenProps } from "@/screens/shared";

import "./o3.css";

// O5 «Ρυθμίσεις: Παραδοτέα»: Ιδιοκτήτης και Διαχείριση.
export function O5({ role, query }: ScreenProps) {
  return (
    <SettingsFrame
      role={role}
      query={query}
      code="O5"
      what="τις ρυθμίσεις των Παραδοτέων"
    >
      {(state) =>
        !settingsCapsOf(role).canManageSettings ? (
          <StateNotice kind="denied" title="Χωρίς δικαίωμα">
            Τις Ρυθμίσεις τις αλλάζει μόνο η Διαχείριση και ο Ιδιοκτήτης.
          </StateNotice>
        ) : (
          <>
            <ReviewCard role={role} query={query} isEmpty={state === "empty"} />
            <DeadlinesCard
              role={role}
              query={query}
              isEmpty={state === "empty"}
            />
          </>
        )
      }
    </SettingsFrame>
  );
}
