import Link from "next/link";
import type { ReactNode } from "react";

import { FilterBar } from "@/spaces/kit/filter-bar";
import { Panel } from "@/spaces/kit/panel";
import { Avatar, ListRow, RowList } from "@/spaces/kit/parts";
import { hrefOf } from "@/spaces/data/screens";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";
import { initialsOf } from "@/spaces/shell/avatar";

import {
  getRole,
  listPermissions,
  listRoleUsage,
  listRoles,
  listTeamUsers,
  type PermissionDef,
  type RoleKind,
  type RoleSummary,
  type TeamUserRow,
} from "../queries";
import { getRoleFirstSteps } from "../first-steps";
import { EMPTY_USAGE, type RoleUsage } from "../role-usage";
import { can, getViewer, isOwner } from "../viewer";
import {
  deletePlan,
  KIND_LABEL,
  moveLabel,
  moveTargets,
  newRoleHref,
  pickKind,
  pluralUsers,
  roleCandidates,
  roleHolders,
  roleHref,
  ROLES_PATH,
} from "./n4-adapter";
import { DeleteRoleConfirm } from "./n4-delete-form";
import { GiveRoleForm, NewRoleForm, RoleEditForm } from "./n4-forms";
import { RoleFirstStepsForm } from "./n4-first-steps";
import { PermissionMatrix } from "./n4-matrix";
import { roleReachText } from "./team-reach";

import "./n4.css";

// N4 «Ρόλοι και Δικαιώματα» στη νέα εμφάνιση (prototype `screens/N4.tsx`): μόνο ο Ιδιοκτήτης.

async function Denied() {
  const viewer = await getViewer();
  return (
    <div data-spaces>
      <StateNotice kind="denied" title="Χωρίς δικαίωμα">
        <p>
          Τους Ρόλους και τα Δικαιώματά τους (νέοι Ρόλοι, Εύρος, διαγραφή) τους
          αλλάζει μόνο ο Ιδιοκτήτης.
        </p>
        {can(viewer, "access.team") && (
          <p>
            Ρόλους σε Χρήστες ομάδας δίνεις στην{" "}
            <Link href={hrefOf("N1")}>Ομάδα</Link>.
          </p>
        )}
      </StateNotice>
    </div>
  );
}

const OWNER_ONLY: readonly string[] = [
  "Αλλάζει Ρόλους (νέοι Ρόλοι, Δικαιώματα και Εύρος)",
  "Δίνει ή αφαιρεί τον Ρόλο Ιδιοκτήτης",
  "Συνδρομές και ενσωματώσεις",
  "ΑΦΜ, ΔΟΥ, ΓΕΜΗ, λογαριασμοί τραπέζης, ΦΠΑ",
  "Πλαφόν δαπάνης AI",
  "Αιτήματα GDPR: εξαγωγή και ανωνυμοποίηση",
  "Άνοιγμα σε πελάτες (Έλεγχος ετοιμότητας)",
];

function RoleBadges({ role }: { role: RoleSummary }) {
  return (
    <>
      {role.isBuiltin ? (
        <Badge>έτοιμος</Badge>
      ) : (
        <Badge tone="strong">δικός σου</Badge>
      )}
      {role.isOwner && <Badge tone="attention">κλειδωμένος</Badge>}
    </>
  );
}

// Οι Χρήστες ομάδας κάθε Ρόλου είναι γνωστοί· των Ρόλων πελάτη δεν διαβάζονται εδώ.
const activeHolders = (role: RoleSummary, users: readonly TeamUserRow[]) =>
  roleHolders(role, users).length;

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
  role.kind === "team" ? activeHolders(role, users) : usage.clientUsers;

// «Διαγραφή» στη λίστα μόνο για Ρόλο που δεν τον έχει κανείς· οι άλλοι διαγράφονται από τη σελίδα τους.
function QuickDelete({ role, usage }: { role: RoleSummary; usage: RoleUsage }) {
  if (deletePlan(role, usage).kind !== "free") return null;
  return (
    <Link
      className="button"
      data-danger="true"
      href={`${roleHref(role.id)}?confirm=delete`}
      aria-label={`Διαγραφή του Ρόλου «${role.name}»`}
    >
      Διαγραφή
    </Link>
  );
}

function RoleList({
  title,
  kind,
  roles,
  permissions,
  users,
  usage,
}: RoleListProps) {
  return (
    <Panel
      label={title}
      aside={
        <Link className="button" href={newRoleHref(kind)}>
          Νέος Ρόλος
        </Link>
      }
    >
      <div className="n4-bleed">
        <RowList>
          {roles.map((def) => (
            <ListRow
              key={def.id}
              lead={
                <span className="part-tile" aria-hidden="true">
                  {initialsOf(def.name)}
                </span>
              }
              href={roleHref(def.id)}
              title={def.name}
              sub={`${def.description}${def.kind === "team" ? ` · ${roleReachText(def, permissions)}` : ""}`}
              aside={
                <>
                  <span className="part-sub">
                    {pluralUsers(
                      holderCount(def, users, usage[def.id] ?? EMPTY_USAGE),
                    )}
                  </span>
                  <RoleBadges role={def} />
                  <QuickDelete
                    role={def}
                    usage={usage[def.id] ?? EMPTY_USAGE}
                  />
                </>
              }
            />
          ))}
        </RowList>
      </div>
    </Panel>
  );
}

function OwnerOnlySection() {
  return (
    <Panel label="Μόνο ο Ιδιοκτήτης">
      <p className="muted">
        Αυτά δεν είναι Δικαιώματα: δεν δίνονται σε κανέναν Ρόλο, ούτε στη
        Διαχείριση. Τα κάνει μόνο όποιος έχει τον Ρόλο Ιδιοκτήτης.
      </p>
      <div className="n4-bleed">
        <RowList>
          {OWNER_ONLY.map((item) => (
            <ListRow
              key={item}
              title={item}
              aside={<Badge tone="attention">μόνο Ιδιοκτήτης</Badge>}
            />
          ))}
        </RowList>
      </div>
    </Panel>
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
  const pick = (kind: RoleKind) =>
    roles.data.filter((role) => role.kind === kind);
  const hasOwn = roles.data.some((role) => !role.isBuiltin);
  return (
    <div data-spaces className="n4">
      {!hasOwn && (
        <StateNotice kind="empty" title="Δεν έχεις φτιάξει δικό σου Ρόλο">
          Υπάρχουν μόνο οι έτοιμοι Ρόλοι. Με «Νέος Ρόλος» φτιάχνεις έναν από το
          μηδέν ή ως «Αντίγραφο του…» έτοιμου, π.χ. για εξωτερικό συνεργάτη που
          βλέπει μόνο τα Γυρίσματά του.
        </StateNotice>
      )}
      <RoleList
        title="Ρόλοι ομάδας"
        kind="team"
        roles={pick("team")}
        permissions={permissions.data}
        users={users.data}
        usage={usage.data}
      />
      <RoleList
        title="Ρόλοι πελάτη"
        kind="client"
        roles={pick("client")}
        permissions={permissions.data}
        users={users.data}
        usage={usage.data}
      />
      <OwnerOnlySection />
      <p className="note">
        Ένας Χρήστης ομάδας μπορεί να έχει πολλούς Ρόλους· ισχύει το ευρύτερο
        Εύρος. Τους Ρόλους των Χρηστών τους δίνεις και στην οθόνη Ομάδα.
      </p>
    </div>
  );
}

function HoldersSection({
  role,
  users,
}: {
  role: RoleSummary;
  users: readonly TeamUserRow[];
}) {
  const holders = roleHolders(role, users);
  return (
    <Panel label={`Χρήστες με αυτόν τον Ρόλο (${holders.length})`}>
      {holders.length === 0 ? (
        <p className="muted">Κανείς δεν έχει αυτόν τον Ρόλο ακόμα.</p>
      ) : (
        <div className="n4-bleed">
          <RowList>
            {holders.map((holder) => (
              <ListRow
                key={holder.key}
                lead={<Avatar name={holder.name} size={36} />}
                href={holder.href}
                title={holder.name}
                sub={holder.detail}
              />
            ))}
          </RowList>
        </div>
      )}
      <GiveRoleForm candidates={roleCandidates(role, users)} />
      {role.isOwner && (
        <p className="note">
          Τον Ρόλο Ιδιοκτήτης τον δίνει και τον αφαιρεί μόνο Ιδιοκτήτης. Τον
          αφαιρείς από τη σελίδα του Χρήστη, στην Ομάδα.
        </p>
      )}
    </Panel>
  );
}

interface DeleteSectionProps {
  role: RoleSummary;
  roles: readonly RoleSummary[];
  usage: RoleUsage;
  isConfirming: boolean;
}

function DeleteIntro({ move, href }: { move: string | null; href: string }) {
  return (
    <>
      <p className="muted">
        {move ?? "Δεν τον έχει κανείς, οπότε διαγράφεται."}
      </p>
      <Link className="button" data-danger="true" href={href}>
        Διαγραφή Ρόλου
      </Link>
    </>
  );
}

// Πάντα υπάρχει δρόμος: ελεύθερος Ρόλος διαγράφεται, Ρόλος που τον έχουν διαγράφεται με μετακίνηση.
// Όχι ο Ιδιοκτήτης και όχι ο «Πλήρης» (μία γραμμή με τον λόγο).
function DeleteSection({
  role,
  roles,
  usage,
  isConfirming,
}: DeleteSectionProps) {
  const plan = deletePlan(role, usage);
  if (plan.kind === "blocked")
    return (
      <Panel label="Διαγραφή Ρόλου">
        <p className="muted">{plan.reason}</p>
      </Panel>
    );
  const targets = moveTargets(role, roles);
  const kindLabel = KIND_LABEL[role.kind];
  const move =
    plan.kind === "move"
      ? { label: moveLabel(plan), usage: plan.usage, targets }
      : null;
  if (move && targets.length === 0)
    return (
      <Panel label="Διαγραφή Ρόλου">
        <p className="muted">
          Τον έχουν {move.usage}, και δεν υπάρχει άλλος Ρόλος {kindLabel} για να
          πάνε. Φτιάξε πρώτα έναν.
        </p>
      </Panel>
    );
  return (
    <Panel label="Διαγραφή Ρόλου">
      {isConfirming ? (
        <DeleteRoleConfirm
          role={role}
          backHref={roleHref(role.id)}
          move={move}
        />
      ) : (
        <DeleteIntro
          href={`${roleHref(role.id)}?confirm=delete`}
          move={
            move
              ? `Τον έχουν ${move.usage}. Με τη διαγραφή πάνε σε άλλον Ρόλο ${kindLabel} που διαλέγεις.`
              : null
          }
        />
      )}
    </Panel>
  );
}

const NotFound = () => (
  <div data-spaces>
    <StateNotice kind="empty" title="Αυτός ο Ρόλος δεν υπάρχει">
      <p>Ίσως διαγράφηκε.</p>
      <p>
        <Link href={ROLES_PATH}>Όλοι οι Ρόλοι</Link>
      </p>
    </StateNotice>
  </div>
);

// Η σελίδα ενός Ρόλου (prototype `screens/n4-role.tsx`): στοιχεία, Δικαιώματα, αποθήκευση με προεπισκόπηση, Χρήστες, διαγραφή.
export async function SpacesRole({
  roleId,
  confirm,
  history,
}: {
  roleId: string;
  confirm: string | undefined;
  // «Ιστορικό αλλαγών» του Ρόλου στο Ίχνος, από το module audit.
  history?: ReactNode;
}) {
  if (!isOwner(await getViewer())) return <Denied />;
  const [role, permissions, users, roles, usage, firstSteps] =
    await Promise.all([
      getRole(roleId),
      listPermissions(),
      listTeamUsers(),
      listRoles(),
      listRoleUsage(),
      getRoleFirstSteps(roleId),
    ]);
  if (!role.ok || !permissions.ok || !users.ok || !roles.ok || !usage.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="ο Ρόλος" />
      </div>
    );
  if (!role.data) return <NotFound />;
  const current = role.data;
  return (
    <div data-spaces className="n4">
      <p>
        <Link href={ROLES_PATH}>← Όλοι οι Ρόλοι</Link>
      </p>
      {history && <div className="btn-row">{history}</div>}
      <RoleEditForm
        role={current}
        permissions={permissions.data.filter((p) => p.kind === current.kind)}
        badges={<RoleBadges role={current} />}
      />
      {firstSteps !== null && (
        <RoleFirstStepsForm roleId={current.id} body={firstSteps} />
      )}
      {current.kind === "team" && (
        <HoldersSection role={current} users={users.data} />
      )}
      {current.kind === "client" && (
        <p className="note">
          Ο Ρόλος πελάτη ισχύει ανά Πελάτη: ο ίδιος Χρήστης μπορεί να έχει άλλον
          Ρόλο σε άλλον Πελάτη. Τον δίνεις από τη σελίδα του Πελάτη.
        </p>
      )}
      <DeleteSection
        role={current}
        roles={roles.data}
        usage={usage.data[current.id] ?? EMPTY_USAGE}
        isConfirming={confirm === "delete"}
      />
    </div>
  );
}

const KINDS: readonly { kind: RoleKind; label: string }[] = [
  { kind: "team", label: "Ρόλος ομάδας" },
  { kind: "client", label: "Ρόλος πελάτη" },
];

const chip = (isOn: boolean) => (isOn ? "strong" : undefined);

function NewRoleChips({
  kind,
  sources,
  source,
}: {
  kind: RoleKind;
  sources: readonly RoleSummary[];
  source: RoleSummary | undefined;
}) {
  return (
    <>
      <div className="n4-chips" role="group" aria-label="Είδος">
        <span className="muted">Είδος:</span>
        {KINDS.map((k) => (
          <Link
            key={k.kind}
            className="badge"
            data-tone={chip(k.kind === kind)}
            aria-current={k.kind === kind ? "true" : undefined}
            href={newRoleHref(k.kind)}
          >
            {k.label}
          </Link>
        ))}
      </div>
      <p className="note">
        Το είδος δεν αλλάζει μετά τη δημιουργία. Ένας Ρόλος ομάδας δεν γίνεται
        Ρόλος πελάτη, ούτε το αντίστροφο.
      </p>
      <FilterBar
        label="Αφετηρία"
        filters={[
          {
            label: "Ξεκίνα",
            all: {
              label: "από το μηδέν",
              href: newRoleHref(kind),
              isCurrent: !source,
            },
            options: sources.map((def) => ({
              label: `Αντίγραφο του «${def.name}»`,
              href: newRoleHref(kind, def.id),
              isCurrent: def.id === source?.id,
            })),
          },
        ]}
      />
      {kind === "team" && (
        <p className="muted">
          Ο Ιδιοκτήτης δεν αντιγράφεται: όσα κάνει μόνο αυτός δεν δίνονται σε
          Ρόλο.
        </p>
      )}
    </>
  );
}

// «Νέος Ρόλος» (prototype `screens/n4-new.tsx`): είδος, από το μηδέν ή «Αντίγραφο του…».
export async function SpacesNewRole({
  kind: rawKind,
  from,
}: {
  kind: string | undefined;
  from: string | undefined;
}) {
  if (!isOwner(await getViewer())) return <Denied />;
  const kind = pickKind(rawKind);
  const [roles, permissions] = await Promise.all([
    listRoles(),
    listPermissions(),
  ]);
  if (!roles.ok || !permissions.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="τους Ρόλους" />
      </div>
    );
  // Ο Ιδιοκτήτης δεν αντιγράφεται: ό,τι κάνει μόνο ο Ιδιοκτήτης δεν δίνεται σε Ρόλο.
  const sources = roles.data.filter((def) => def.kind === kind && !def.isOwner);
  const source = sources.find((def) => def.id === from);
  return (
    <div data-spaces className="n4">
      <p>
        <Link href={ROLES_PATH}>← Όλοι οι Ρόλοι</Link>
      </p>
      <NewRoleForm
        key={`${kind}-${source?.id ?? ""}`}
        kind={kind}
        source={source}
        cancelHref={ROLES_PATH}
        chips={<NewRoleChips kind={kind} sources={sources} source={source} />}
        matrix={
          <PermissionMatrix
            kind={kind}
            permissions={permissions.data.filter((p) => p.kind === kind)}
            grants={source?.grants ?? {}}
            locked
          />
        }
      />
    </div>
  );
}
