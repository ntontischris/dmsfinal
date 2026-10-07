import { settingsCapsOf } from "@/data/settings-access";
import { AssistantCard } from "@/screens/o1-assistant";
import { CompanyCard, SignerCard } from "@/screens/o1-company";
import { BankCard, TaxCard, VatCard } from "@/screens/o1-money";
import { SettingsFrame } from "@/screens/o-shared";
import { StateNotice, type ScreenProps } from "@/screens/shared";

// O1 «Ρυθμίσεις: Εταιρεία»: Ιδιοκτήτης και Διαχείριση· τα 🔒 αλλάζει μόνο ο Ιδιοκτήτης.
export function O1({ role, query }: ScreenProps) {
  if (!settingsCapsOf(role).canManageSettings) {
    return (
      <StateNotice kind="denied" title="Χωρίς δικαίωμα">
        Τις Ρυθμίσεις τις βλέπουν μόνο ο Ιδιοκτήτης και η Διαχείριση.
      </StateNotice>
    );
  }
  return (
    <SettingsFrame
      role={role}
      query={query}
      code="O1"
      what="τις Ρυθμίσεις της Εταιρείας"
    >
      {(state) => {
        const props = { role, query, isEmpty: state === "empty" };
        return (
          <>
            <CompanyCard {...props} />
            <SignerCard {...props} />
            <TaxCard {...props} />
            <BankCard {...props} />
            <VatCard {...props} />
            <AssistantCard {...props} />
          </>
        );
      }}
    </SettingsFrame>
  );
}
