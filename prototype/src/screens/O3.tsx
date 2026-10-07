import { settingsCapsOf } from "@/data/settings-access";
import type { TermSet } from "@/data/settings-agreements";
import { SettingsFrame } from "@/screens/o-shared";
import { PolicyCard, PricingCard, TermsCard } from "@/screens/o3-terms";
import { BenefitTypesCard } from "@/screens/o3-types";
import { StateNotice, type ScreenProps } from "@/screens/shared";

import "./o3.css";

// O3 «Ρυθμίσεις: Συμφωνίες»: Ιδιοκτήτης και Διαχείριση.
export function O3({ role, query }: ScreenProps) {
  const set: TermSet = query.set === "oneoff" ? "oneoff" : "monthly";
  return (
    <SettingsFrame
      role={role}
      query={query}
      code="O3"
      what="τις ρυθμίσεις των Συμφωνιών"
    >
      {(state) =>
        !settingsCapsOf(role).canManageSettings ? (
          <StateNotice kind="denied" title="Χωρίς δικαίωμα">
            Τις Ρυθμίσεις τις αλλάζει μόνο η Διαχείριση και ο Ιδιοκτήτης.
          </StateNotice>
        ) : (
          <>
            <TermsCard role={role} query={query} set={set} />
            <PolicyCard role={role} query={query} />
            <PricingCard role={role} query={query} />
            <BenefitTypesCard
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
