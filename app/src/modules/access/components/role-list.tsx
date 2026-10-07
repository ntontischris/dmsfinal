import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Rows } from "@/components/ui/rows";

import type { RoleKind, RoleSummary } from "../queries";

const users = (count: number): string => (count === 1 ? "1 Χρήστης" : `${count} Χρήστες`);

// Τα όσα κάνει μόνο ο Ιδιοκτήτης: δεν είναι Δικαιώματα και δεν δίνονται σε κανέναν Ρόλο (κεφ. 1).
const OWNER_ONLY = [
  "Ρόλοι και Δικαιώματα, και ο Ρόλος Ιδιοκτήτης",
  "Συνδρομές και ενσωματώσεις",
  "Φορολογικά στοιχεία (ΑΦΜ, ΔΟΥ, ΓΕΜΗ), λογαριασμοί τραπέζης, ΦΠΑ",
  "Πλαφόν AI και «Άνοιγμα σε πελάτες»",
  "Αιτήματα GDPR",
];

function RoleSection({ title, kind, roles }: { title: string; kind: RoleKind; roles: readonly RoleSummary[] }) {
  return (
    <Panel
      label={title}
      aside={
        <Link href={`/app/team/roles/new?kind=${kind}`} className={buttonVariants({ size: "sm" })}>
          Νέος Ρόλος
        </Link>
      }
    >
      <Rows
        isNumbered={false}
        items={roles.map((role) => ({
          id: role.id,
          title: role.name,
          href: `/app/team/roles/${role.id}`,
          meta: role.description,
          aside: (
            <>
              <span className="text-sm text-muted-foreground">{users(role.holders.length)}</span>
              {role.isOwner ? (
                <Badge tone="attention">κλειδωμένος</Badge>
              ) : role.isBuiltin ? (
                <Badge>έτοιμος</Badge>
              ) : (
                <Badge tone="strong">δικός σου</Badge>
              )}
            </>
          ),
        }))}
      />
    </Panel>
  );
}

export function RoleList({ roles }: { roles: readonly RoleSummary[] }) {
  return (
    <div className="grid gap-4">
      <RoleSection title="Ρόλοι ομάδας" kind="team" roles={roles.filter((r) => r.kind === "team")} />
      <RoleSection title="Ρόλοι πελάτη" kind="client" roles={roles.filter((r) => r.kind === "client")} />
      <Panel label="Μόνο ο Ιδιοκτήτης">
        <p className="mt-0 text-sm text-muted-foreground">
          Δεν είναι Δικαιώματα: δεν δίνονται σε κανέναν Ρόλο, ούτε στη Διαχείριση.
        </p>
        <ul className="m-0 grid gap-1 pl-5 text-sm">
          {OWNER_ONLY.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Panel>
      <p className="m-0 text-sm text-muted-foreground">
        Ένας Χρήστης ομάδας μπορεί να έχει πολλούς Ρόλους· ισχύει το ευρύτερο Εύρος. Ρόλους σε Χρήστες δίνεις στην{" "}
        <Link href="/app/team">Ομάδα</Link>.
      </p>
    </div>
  );
}
