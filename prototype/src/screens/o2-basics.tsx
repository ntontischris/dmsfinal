import {
  DEFAULT_ASSIGNEE,
  FORM_ASSIGNEES,
  OPEN_PROPOSALS,
  PROPOSAL_VALIDITY_DAYS,
  PROPOSAL_VALIDITY_WAS,
} from "@/data/settings-sales";
import type { RoleId } from "@/data/roles";
import { SaveRow, SettingsCard } from "@/screens/o-shared";
import type { ScreenQuery } from "@/screens/shared";

interface O2BasicsProps {
  role: RoleId;
  query: ScreenQuery;
}

// Υπεύθυνος για νέες Ευκαιρίες από τη φόρμα και ισχύς πρότασης.
export function O2Basics({ role, query }: O2BasicsProps) {
  return (
    <>
      <SettingsCard title="Νέες Ευκαιρίες από τη φόρμα">
        <span className="stack o-field">
          <label htmlFor="o2-assignee">
            Νέες Ευκαιρίες από τη φόρμα πάνε σε
          </label>
          <select
            id="o2-assignee"
            className="select"
            defaultValue={DEFAULT_ASSIGNEE}
          >
            {FORM_ASSIGNEES.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
          <span className="muted o-hint">
            Με «Χωρίς υπεύθυνο» μπαίνουν σε κοινή ουρά μέχρι να τις αναλάβει
            κάποιος. Όσο αναθέτει ένας μόνο άνθρωπος, η ουρά δεν φαίνεται και η
            Ευκαιρία πάει σε αυτόν.
          </span>
        </span>
        <SaveRow role={role} query={query} code="O2" card="assignee" />
      </SettingsCard>
      <SettingsCard title="Πρόταση">
        <span className="stack o-field">
          <label htmlFor="o2-validity">Ισχύς πρότασης (μέρες)</label>
          <input
            id="o2-validity"
            className="input"
            inputMode="numeric"
            defaultValue={String(PROPOSAL_VALIDITY_DAYS)}
          />
          <span className="muted o-hint">
            Άλλαξε πρόσφατα από {PROPOSAL_VALIDITY_WAS} σε{" "}
            {PROPOSAL_VALIDITY_DAYS} μέρες.
          </span>
        </span>
        <SaveRow
          role={role}
          query={query}
          code="O2"
          card="validity"
          forward={{ affected: OPEN_PROPOSALS, what: "ανοιχτές προτάσεις" }}
        />
      </SettingsCard>
    </>
  );
}
