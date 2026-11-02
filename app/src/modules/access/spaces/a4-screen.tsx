import { Panel } from "@/spaces/kit/panel";
import { Entity, ListRow, RowList } from "@/spaces/kit/parts";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { selectClient } from "../client-user-actions";
import { listMemberships } from "../invitation-queries";
import type { MembershipRow } from "../invitation-schemas";
import type { Viewer } from "../viewer";

import "./a4.css";

// Οι κανόνες της εναλλαγής, όσοι ισχύουν στο σύστημα (prototype `SwitchRules` του `screens/a4-cards.tsx`).
const RULES: readonly string[] = [
  "Στην είσοδο ανοίγει ο Πελάτης που χρησιμοποίησες τελευταίο.",
  "Αν δεν ανήκεις πια σε εκείνον τον Πελάτη, βλέπεις «Χωρίς δικαίωμα».",
  "Μετά την εναλλαγή βλέπεις μόνο τα δεδομένα του επιλεγμένου Πελάτη.",
];

function ClientCards({ rows }: { rows: readonly MembershipRow[] }) {
  return (
    <div className="grid2">
      {rows.map((m) => (
        <Panel
          key={m.clientId}
          label={m.name}
          aside={m.isCurrent && <Badge tone="strong">Δουλεύεις τώρα με</Badge>}
          isFlush
        >
          <RowList>
            <ListRow
              title={<Entity name={m.name} sub={`Ρόλος σου: ${m.roleName}`} />}
            />
          </RowList>
          {!m.isCurrent && (
            <form className="a4-foot" action={selectClient}>
              <input type="hidden" name="clientId" value={m.clientId} />
              <button className="button" type="submit">
                Αλλαγή
              </button>
            </form>
          )}
        </Panel>
      ))}
    </div>
  );
}

function SwitchRules() {
  return (
    <Panel label="Πώς δουλεύει η εναλλαγή" isFlush>
      <RowList>
        {RULES.map((rule) => (
          <ListRow key={rule} title={<span className="a4-rule">{rule}</span>} />
        ))}
      </RowList>
    </Panel>
  );
}

// A4 Εναλλαγή Πελάτη στη νέα εμφάνιση (prototype `screens/A4.tsx`): μόνο Χρήστης πελάτη· κάρτες ανά Πελάτη και
// «Αλλαγή» με την ίδια ενέργεια με τον επιλογέα της μπάρας (client_user_select).
export async function SpacesSwitchClient({ viewer }: { viewer: Viewer }) {
  if (viewer.status !== "signed-in" || viewer.team !== null)
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Την εναλλαγή Πελάτη την έχουν μόνο οι Χρήστες πελάτη.
        </StateNotice>
      </div>
    );
  const memberships = await listMemberships();
  if (!memberships.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="τους Πελάτες σου" />
      </div>
    );
  const rows = memberships.data;
  const current = rows.find((row) => row.isCurrent) ?? rows[0];
  return (
    <div data-spaces className="stack">
      {rows.length > 1 ? (
        <ClientCards rows={rows} />
      ) : (
        <StateNotice
          kind="empty"
          title={
            current
              ? `Ανήκεις μόνο στην ${current.name}`
              : "Δεν έχεις Πελάτη ακόμα"
          }
        >
          Η εναλλαγή φαίνεται όταν ανήκεις σε περισσότερους Πελάτες.
        </StateNotice>
      )}
      <SwitchRules />
    </div>
  );
}
