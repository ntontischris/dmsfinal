import Link from "next/link";

import {
  FILMING_POLICY,
  ONEOFF_MILESTONES,
  PRICING_DEFAULTS,
  TERMS_FORWARD,
  TERM_ROWS,
  type FilmingPolicyRow,
  type TermSet,
} from "@/data/settings-agreements";
import type { RoleId } from "@/data/roles";
import { SaveRow, SettingsCard } from "@/screens/o-shared";
import { screenHref, type ScreenQuery } from "@/screens/shared";

interface Props {
  role: RoleId;
  query: ScreenQuery;
  set: TermSet;
}

const SET_LABELS: Record<TermSet, string> = {
  monthly: "Μηνιαίες Συμφωνίες",
  oneoff: "Εφάπαξ Συμφωνίες",
};

// Όροι Συμφωνίας σε δύο σετ, με εναλλαγή μέσω ?set=.
export function TermsCard({ role, query, set }: Props) {
  return (
    <SettingsCard title="Όροι Συμφωνίας">
      <div className="o3-switch" aria-label="Σετ Όρων">
        {(Object.keys(SET_LABELS) as TermSet[]).map((key) => (
          <Link
            key={key}
            className="button"
            data-primary={key === set ? "true" : undefined}
            aria-current={key === set ? "true" : undefined}
            href={screenHref(role, "O3", { state: query.state, set: key })}
          >
            {SET_LABELS[key]}
          </Link>
        ))}
      </div>
      <div className="scroll">
        <table className="rtable o3-table">
          <thead>
            <tr>
              <th>Όρος</th>
              <th>Τιμή</th>
            </tr>
          </thead>
          <tbody>
            {TERM_ROWS.map((row) => (
              <tr key={row.id}>
                <td data-label="Όρος">{row.label}</td>
                <td data-label="Τιμή">
                  {row[set] === "—" ? (
                    <span className="muted">— δεν ισχύει</span>
                  ) : (
                    <input
                      className="input"
                      aria-label={row.label}
                      defaultValue={row[set]}
                    />
                  )}
                </td>
              </tr>
            ))}
            <tr>
              <td data-label="Όρος">Δόσεις σε ορόσημα</td>
              <td data-label="Τιμή">
                {set === "oneoff" ? (
                  ONEOFF_MILESTONES.map((m) => `${m.percent}% ${m.label}`).join(
                    " / ",
                  )
                ) : (
                  <span className="muted">— μόνο στις εφάπαξ</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="muted o-hint">
        Αυτές είναι οι προεπιλογές. Κάθε Συμφωνία αλλάζει τους Όρους της στη{" "}
        <Link href={screenHref(role, "D2", {})}>D2</Link>· ό,τι είναι πιο χαλαρό
        από την προεπιλογή γράφεται ως Παρέκκλιση.
      </p>
      <SaveRow
        role={role}
        query={query}
        code="O3"
        card={`terms-${set}`}
        forward={TERMS_FORWARD}
      />
    </SettingsCard>
  );
}

function FieldRows({ rows }: { rows: readonly FilmingPolicyRow[] }) {
  return (
    <div className="o-fields">
      {rows.map((row) => (
        <span key={row.id} className="stack o-field">
          <label htmlFor={`o3-${row.id}`}>{row.label}</label>
          <input
            id={`o3-${row.id}`}
            className="input"
            defaultValue={row.value}
          />
          {row.hint && <span className="muted o-hint">{row.hint}</span>}
        </span>
      ))}
    </div>
  );
}

export function PolicyCard({ role, query }: Omit<Props, "set">) {
  return (
    <SettingsCard title="Πολιτική Γυρισμάτων του πελάτη">
      <FieldRows rows={FILMING_POLICY} />
      <p className="muted o-hint">
        Η αργή ακύρωση και το «δεν έγινε» δέχονται «ναι» ή «όχι».
      </p>
      <SaveRow
        role={role}
        query={query}
        code="O3"
        card="policy"
        forward={{ affected: 5, what: "ήδη κλεισμένα Γυρίσματα" }}
      />
    </SettingsCard>
  );
}

export function PricingCard({ role, query }: Omit<Props, "set">) {
  return (
    <SettingsCard title="Προεπιλογές τιμολόγησης">
      <FieldRows rows={PRICING_DEFAULTS} />
      <SaveRow role={role} query={query} code="O3" card="pricing" />
    </SettingsCard>
  );
}
