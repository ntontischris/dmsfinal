import Link from "next/link";

import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import {
  listPermissions,
  listRoleUsage,
  listRoles,
  listTeamUsers,
  type PermissionDef,
  type RoleKind,
  type RoleSummary,
  type TeamUserRow,
} from "../queries";
import { EMPTY_USAGE, type RoleUsage } from "../role-usage";
import { getViewer, isOwner } from "../viewer";
import {
  deletePlan,
  newRoleHref,
  pluralUsers,
  roleHolders,
  roleHref,
} from "./n4-adapter";
import { Denied, roleTag } from "./n4-common";
import { Box, Line, ListSection } from "./n-parts";
import { roleReachText } from "./team-reach";

// N4 «Ρόλοι και Δικαιώματα» (μόνο ο Ιδιοκτήτης): δύο λίστες Ρόλων (ομάδας, πελάτη) στο ύφος των «Χρημάτων»
// και ένα κλειστό κουτί με όσα κάνει μόνο ο Ιδιοκτήτης. Ο τίτλος της σελίδας είναι του κελύφους.

const OWNER_ONLY: readonly string[] = [
  "Αλλάζει Ρόλους (νέοι Ρόλοι, Δικαιώματα και Εύρος)",
  "Δίνει ή αφαιρεί τον Ρόλο Ιδιοκτήτης",
  "Συνδρομές και ενσωματώσεις",
  "ΑΦΜ, ΔΟΥ, ΓΕΜΗ, λογαριασμοί τραπέζης, ΦΠΑ",
  "Πλαφόν δαπάνης AI",
  "Αιτήματα GDPR: εξαγωγή και ανωνυμοποίηση",
  "Άνοιγμα σε πελάτες (Έλεγχος ετοιμότητας)",
];

interface RoleListProps {
  title: string;
  kind: RoleKind;
  roles: readonly RoleSummary[];
  permissions: readonly PermissionDef[];
  users: readonly TeamUserRow[];
  usage: Readonly<Record<string, RoleUsage>>;
}

// Ρόλος ομάδας: οι ενεργοί Χρήστες του. Ρόλος πελάτη: οι Χρήστες πελάτη του (από τη βάση).
const holderCount = (
  role: RoleSummary,
  users: readonly TeamUserRow[],
  usage: RoleUsage,
): number =>
  role.kind === "team" ? roleHolders(role, users).length : usage.clientUsers;

// «Διαγραφή» στη λίστα μόνο για Ρόλο που δεν τον έχει κανείς· οι άλλοι διαγράφονται από τη σελίδα τους.
function QuickDelete({ role, usage }: { role: RoleSummary; usage: RoleUsage }) {
  if (deletePlan(role, usage).kind !== "free") return null;
  return (
    <Link
      data-danger="true"
      href={`${roleHref(role.id)}?confirm=delete`}
      aria-label={`Διαγραφή του Ρόλου «${role.name}»`}
    >
      Διαγραφή
    </Link>
  );
}

const roleSub = (def: RoleSummary, permissions: readonly PermissionDef[]) =>
  def.kind === "team"
    ? `${def.description} · ${roleReachText(def, permissions)}`
    : def.description;

function RoleList(props: RoleListProps) {
  const { roles, permissions, users, usage } = props;
  return (
    <ListSection
      title={props.title}
      hint={`${roles.length} Ρόλοι`}
      quick={<Link href={newRoleHref(props.kind)}>Νέος Ρόλος</Link>}
    >
      <ul className="ml-list">
        {roles.map((def) => {
          const used = usage[def.id] ?? EMPTY_USAGE;
          return (
            <Line
              key={def.id}
              name={def.name}
              title={def.name}
              href={roleHref(def.id)}
              tag={roleTag(def)}
              sub={roleSub(def, permissions)}
              amount={pluralUsers(holderCount(def, users, used))}
              quick={<QuickDelete role={def} usage={used} />}
            />
          );
        })}
      </ul>
    </ListSection>
  );
}

function OwnerOnlyBox() {
  return (
    <Box
      title="Μόνο ο Ιδιοκτήτης"
      hint={`${OWNER_ONLY.length} πράγματα που δεν δίνονται σε Ρόλο`}
    >
      <p className="muted">
        Αυτά δεν είναι Δικαιώματα: δεν δίνονται σε κανέναν Ρόλο, ούτε στη
        Διαχείριση. Τα κάνει μόνο όποιος έχει τον Ρόλο Ιδιοκτήτης.
      </p>
      <ul className="ml-list">
        {OWNER_ONLY.map((item) => (
          <li key={item} className="ml-line">
            <span className="ml-main">
              <strong>{item}</strong>
            </span>
          </li>
        ))}
      </ul>
    </Box>
  );
}

export async function SpacesRoles() {
  if (!isOwner(await getViewer())) return <Denied />;
  const [roles, permissions, users, usage] = await Promise.all([
    listRoles(),
    listPermissions(),
    listTeamUsers(),
    listRoleUsage(),
  ]);
  if (!roles.ok || !permissions.ok || !users.ok || !usage.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="τους Ρόλους" />
      </div>
    );
  const shared = {
    permissions: permissions.data,
    users: users.data,
    usage: usage.data,
  };
  const pick = (kind: RoleKind) =>
    roles.data.filter((role) => role.kind === kind);
  const hasOwn = roles.data.some((role) => !role.isBuiltin);
  return (
    <div data-spaces className="n4">
      <div className="n-stack">
        {!hasOwn && (
          <StateNotice kind="empty" title="Δεν έχεις φτιάξει δικό σου Ρόλο">
            Υπάρχουν μόνο οι έτοιμοι Ρόλοι. Με «Νέος Ρόλος» φτιάχνεις έναν από
            το μηδέν ή ως «Αντίγραφο του…» έτοιμου, π.χ. για εξωτερικό συνεργάτη
            που βλέπει μόνο τα Γυρίσματά του.
          </StateNotice>
        )}
        <RoleList
          title="Ρόλοι ομάδας"
          kind="team"
          roles={pick("team")}
          {...shared}
        />
        <RoleList
          title="Ρόλοι πελάτη"
          kind="client"
          roles={pick("client")}
          {...shared}
        />
        <OwnerOnlyBox />
        <p className="muted">
          Ένας Χρήστης ομάδας μπορεί να έχει πολλούς Ρόλους· ισχύει το ευρύτερο
          Εύρος. Τους Ρόλους των Χρηστών τους δίνεις και στην οθόνη Ομάδα.
        </p>
      </div>
    </div>
  );
}
