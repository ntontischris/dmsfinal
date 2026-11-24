import Link from "next/link";
import type { ReactNode } from "react";

import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";
import { initialsOf } from "@/spaces/shell/avatar";

import {
  getRole,
  listPermissions,
  listRoleUsage,
  listRoles,
  listTeamUsers,
  type RoleSummary,
  type TeamUserRow,
} from "../queries";
import { getRoleFirstSteps } from "../first-steps";
import { EMPTY_USAGE, type RoleUsage } from "../role-usage";
import { getViewer, isOwner } from "../viewer";
import {
  deletePlan,
  KIND_LABEL,
  moveLabel,
  moveTargets,
  pluralUsers,
  roleCandidates,
  roleHolders,
  roleHref,
  ROLES_PATH,
} from "./n4-adapter";
import { Denied, roleKindTag } from "./n4-common";
import { DeleteRoleConfirm } from "./n4-delete-form";
import { GiveRoleForm, RoleEditForm } from "./n4-forms";
import { RoleFirstStepsForm } from "./n4-first-steps";
import { Box, Hero, Line } from "./n-parts";

// Η σελίδα ενός Ρόλου: κεφαλίδα με το όνομα ως h1 και κουτιά από κάτω (στοιχεία, Δικαιώματα, Πρώτα βήματα,
// Χρήστες, διαγραφή). Η «Διαγραφή Ρόλου» ανοίγει την επιβεβαίωση στη θέση των κουτιών.

function HoldersBox({
  role,
  users,
}: {
  role: RoleSummary;
  users: readonly TeamUserRow[];
}) {
  const holders = roleHolders(role, users);
  return (
    <Box title="Χρήστες με αυτόν τον Ρόλο" hint={pluralUsers(holders.length)}>
      {holders.length === 0 ? (
        <p className="ml-empty">Κανείς δεν έχει αυτόν τον Ρόλο ακόμα.</p>
      ) : (
        <ul className="ml-list">
          {holders.map((holder) => (
            <Line
              key={holder.key}
              name={holder.name}
              title={holder.name}
              href={holder.href}
              sub={holder.detail}
            />
          ))}
        </ul>
      )}
      <GiveRoleForm candidates={roleCandidates(role, users)} />
      {role.isOwner && (
        <p className="muted">
          Τον Ρόλο Ιδιοκτήτης τον δίνει και τον αφαιρεί μόνο Ιδιοκτήτης. Τον
          αφαιρείς από τη σελίδα του Χρήστη, στην Ομάδα.
        </p>
      )}
    </Box>
  );
}

interface DeleteView {
  // Μικρή γραμμή στο κλειστό κουτί (π.χ. «Τον έχουν 1 Χρήστη ομάδας.»).
  hint: string;
  body: string;
  // Αν η «Διαγραφή Ρόλου» ανοίγει επιβεβαίωση.
  canDelete: boolean;
}

// Πάντα υπάρχει δρόμος: ελεύθερος Ρόλος διαγράφεται, Ρόλος που τον έχουν διαγράφεται με μετακίνηση.
// Όχι ο Ιδιοκτήτης και όχι ο «Πλήρης» (μία γραμμή με τον λόγο).
function deleteView(
  role: RoleSummary,
  roles: readonly RoleSummary[],
  usage: RoleUsage,
): DeleteView {
  const plan = deletePlan(role, usage);
  const kind = KIND_LABEL[role.kind];
  if (plan.kind === "blocked")
    return { hint: "Δεν διαγράφεται", body: plan.reason, canDelete: false };
  if (plan.kind === "free")
    return {
      hint: "Δεν τον έχει κανείς",
      body: "Διαγράφεται χωρίς μετακίνηση. Η διαγραφή γράφεται στο Ίχνος.",
      canDelete: true,
    };
  const hint = `Τον έχουν ${plan.usage}.`;
  if (moveTargets(role, roles).length === 0)
    return {
      hint,
      body: `Δεν υπάρχει άλλος Ρόλος ${kind} για να πάνε. Φτιάξε πρώτα έναν.`,
      canDelete: false,
    };
  return {
    hint,
    body: `Με τη διαγραφή πάνε σε άλλον Ρόλο ${kind} που διαλέγεις.`,
    canDelete: true,
  };
}

function DeleteConfirm(props: {
  role: RoleSummary;
  roles: readonly RoleSummary[];
  usage: RoleUsage;
}) {
  const plan = deletePlan(props.role, props.usage);
  const view = deleteView(props.role, props.roles, props.usage);
  if (!view.canDelete || plan.kind === "blocked")
    return (
      <section className="n-confirm" role="alert">
        <h2 className="ml-box-title">Δεν γίνεται η διαγραφή</h2>
        <p>{view.body}</p>
        <div className="ml-actions">
          <Link href={roleHref(props.role.id)}>Πίσω στον Ρόλο</Link>
        </div>
      </section>
    );
  const move =
    plan.kind === "move"
      ? {
          label: moveLabel(plan),
          usage: plan.usage,
          targets: moveTargets(props.role, props.roles),
        }
      : null;
  return (
    <DeleteRoleConfirm
      role={props.role}
      backHref={roleHref(props.role.id)}
      move={move}
    />
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

function RoleHero(props: {
  role: RoleSummary;
  canDelete: boolean;
  isConfirming: boolean;
  history?: ReactNode;
}) {
  const { role } = props;
  return (
    <Hero
      mono={initialsOf(role.name)}
      tag={roleKindTag(role)}
      title={role.name}
      lead={role.description || undefined}
      quick={
        <>
          {props.history}
          {props.canDelete && !props.isConfirming && (
            <Link
              data-danger="true"
              href={`${roleHref(role.id)}?confirm=delete`}
            >
              Διαγραφή Ρόλου
            </Link>
          )}
        </>
      }
    />
  );
}

async function loadRole(roleId: string) {
  const [role, permissions, users, roles, usage, firstSteps] =
    await Promise.all([
      getRole(roleId),
      listPermissions(),
      listTeamUsers(),
      listRoles(),
      listRoleUsage(),
      getRoleFirstSteps(roleId),
    ]);
  return { role, permissions, users, roles, usage, firstSteps };
}

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
  const { role, permissions, users, roles, usage, firstSteps } =
    await loadRole(roleId);
  if (!role.ok || !permissions.ok || !users.ok || !roles.ok || !usage.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="ο Ρόλος" />
      </div>
    );
  if (!role.data) return <NotFound />;
  const current = role.data;
  const used = usage.data[current.id] ?? EMPTY_USAGE;
  const removal = deleteView(current, roles.data, used);
  const isConfirming = confirm === "delete";
  return (
    <div data-spaces className="n4">
      <div className="ml-stack">
        <RoleHero
          role={current}
          canDelete={removal.canDelete}
          isConfirming={isConfirming}
          history={history}
        />
        {isConfirming ? (
          <DeleteConfirm role={current} roles={roles.data} usage={used} />
        ) : (
          <>
            <RoleEditForm
              role={current}
              permissions={permissions.data.filter(
                (p) => p.kind === current.kind,
              )}
            />
            {firstSteps !== null && (
              <RoleFirstStepsForm roleId={current.id} body={firstSteps} />
            )}
            {current.kind === "team" ? (
              <HoldersBox role={current} users={users.data} />
            ) : (
              <p className="muted">
                Ο Ρόλος πελάτη ισχύει ανά Πελάτη: ο ίδιος Χρήστης μπορεί να έχει
                άλλον Ρόλο σε άλλον Πελάτη. Τον δίνεις από τη σελίδα του Πελάτη.
              </p>
            )}
            <Box title="Διαγραφή Ρόλου" hint={removal.hint} isDanger>
              <p className="muted">{removal.body}</p>
            </Box>
          </>
        )}
      </div>
    </div>
  );
}
