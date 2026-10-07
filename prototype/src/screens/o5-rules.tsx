import Link from "next/link";

import { BENEFIT_TYPES, DELIVERABLE_RULES } from "@/data/settings-agreements";
import type { RoleId } from "@/data/roles";
import { SaveRow, SettingsCard } from "@/screens/o-shared";
import { Badge, screenHref, type ScreenQuery } from "@/screens/shared";

interface Props {
  role: RoleId;
  query: ScreenQuery;
  isEmpty: boolean;
}

const typesWithDeliverables = (isEmpty: boolean) =>
  isEmpty ? [] : BENEFIT_TYPES.filter((t) => t.deadlineDays !== null);

export function ReviewCard({ role, query, isEmpty }: Props) {
  const types = typesWithDeliverables(isEmpty);
  return (
    <SettingsCard title="Εσωτερικός έλεγχος και αλλαγές">
      <div className="o-fields">
        <span className="stack o-field">
          <label htmlFor="o5-review">Εσωτερικός έλεγχος πριν τον πελάτη</label>
          <select
            id="o5-review"
            className="select"
            defaultValue={DELIVERABLE_RULES.internalReview}
          >
            <option>ναι</option>
            <option>όχι</option>
          </select>
        </span>
        <span className="stack o-field">
          <label htmlFor="o5-rework">
            Νέα προθεσμία μετά από «χρειάζεται αλλαγές» (εργάσιμες)
          </label>
          <input
            id="o5-rework"
            className="input"
            defaultValue={DELIVERABLE_RULES.reworkDays}
          />
        </span>
      </div>
      <p className="muted o-hint">Εξαιρέσεις ανά είδος Παροχής:</p>
      {types.length === 0 ? (
        <p className="muted">Δεν υπάρχουν είδη Παροχής ακόμα.</p>
      ) : (
        <ul className="list">
          {types.map((t) => (
            <li key={t.id}>
              <label>
                <input type="checkbox" defaultChecked={t.skipsInternalReview} />{" "}
                {t.label}: χωρίς εσωτερικό έλεγχο
              </label>
            </li>
          ))}
        </ul>
      )}
      <SaveRow role={role} query={query} code="O5" card="review" />
    </SettingsCard>
  );
}

export function DeadlinesCard({ role, query, isEmpty }: Props) {
  const types = typesWithDeliverables(isEmpty);
  return (
    <SettingsCard title="Προθεσμία ανά είδος Παροχής">
      <p className="muted o-hint">
        Σε εργάσιμες μέρες, από το δεμένο Γύρισμα όταν γίνει, αλλιώς από τη
        δημιουργία. Οι αργίες δεν μετρούν ως εργάσιμες.
      </p>
      {types.length === 0 ? (
        <p className="muted">
          Δεν υπάρχουν είδη Παροχής ακόμα. Ορίζονται στην{" "}
          <Link href={screenHref(role, "O3", {})}>O3</Link>.
        </p>
      ) : (
        <div className="scroll">
          <table className="rtable o3-table">
            <thead>
              <tr>
                <th>Είδος Παροχής</th>
                <th>Προθεσμία (εργάσιμες)</th>
                <th>Όριο αλλαγών</th>
                <th>Ανοιχτά Παραδοτέα</th>
              </tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr key={t.id}>
                  <td data-label="Είδος Παροχής">
                    {t.label} <span className="muted">/ {t.labelEn}</span>
                  </td>
                  <td data-label="Προθεσμία (εργάσιμες)">
                    <input
                      className="input"
                      aria-label={`Προθεσμία ${t.label}`}
                      defaultValue={t.deadlineDays ?? ""}
                    />
                  </td>
                  <td data-label="Όριο αλλαγών">
                    {t.changeLimit ?? "—"} <Badge>μόνο ανάγνωση</Badge>{" "}
                    <Link href={screenHref(role, "O3", {})}>
                      αλλάζει στην O3
                    </Link>
                  </td>
                  <td data-label="Ανοιχτά Παραδοτέα">{t.openDeliverables}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted o-hint">
        Οι υπενθυμίσεις στον πελάτη (στις 3 και 7 μέρες) είναι Αυτοματισμοί:
        ρυθμίζονται στην <Link href={screenHref(role, "K1", {})}>K1</Link>.
      </p>
      <SaveRow
        role={role}
        query={query}
        code="O5"
        card="deadlines"
        forward={{
          affected: DELIVERABLE_RULES.openDeliverables,
          what: "ανοιχτά Παραδοτέα, που κρατούν την προθεσμία τους",
        }}
      />
    </SettingsCard>
  );
}
