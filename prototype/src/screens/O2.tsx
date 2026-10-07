import { settingsCapsOf } from "@/data/settings-access";
import { ACTIVITY_KINDS, LOSS_REASONS, SOURCES } from "@/data/settings-sales";
import { O2Basics } from "@/screens/o2-basics";
import { O2Stages } from "@/screens/o2-stages";
import { ListEditor, SettingsFrame } from "@/screens/o-shared";
import { StateNotice, type ScreenProps } from "@/screens/shared";

// O2 «Ρυθμίσεις: Πωλήσεις»: όλες οι λίστες είναι εσωτερικές, άρα μόνο ελληνικά.
export function O2({ role, query }: ScreenProps) {
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
      code="O2"
      what="τις Ρυθμίσεις των Πωλήσεων"
    >
      {(state) => {
        const isEmpty = state === "empty";
        const base = { role, query, code: "O2" };
        return (
          <>
            <O2Basics role={role} query={query} />
            <O2Stages role={role} query={query} isEmpty={isEmpty} />
            <ListEditor
              {...base}
              listId="sources"
              title="Πηγή"
              items={isEmpty ? [] : SOURCES}
            />
            <ListEditor
              {...base}
              listId="loss"
              title="Λόγος απώλειας"
              items={isEmpty ? [] : LOSS_REASONS}
            />
            <ListEditor
              {...base}
              listId="activity"
              title="Είδη Δραστηριότητας"
              items={isEmpty ? [] : ACTIVITY_KINDS}
            />
          </>
        );
      }}
    </SettingsFrame>
  );
}
