import {
  PERMISSIONS,
  type RoleDef,
  type Scope,
  type TeamUser,
} from "@/data/team";
import {
  activeOwners,
  canGrantRole,
  covers,
  grantsOf,
  isOwnerUser,
  teamRoles,
} from "@/data/team-access";

const scopeLabel = (scope: Scope): string =>
  scope === "Ό" ? "όλα" : "όσα τον αφορούν";

// Τα Δικαιώματα (με Εύρος) που δίνει ο Ρόλος αλλά δεν έχει ο actor.
const missingGrants = (actor: TeamUser, def: RoleDef): readonly string[] => {
  const mine = grantsOf(actor.roleIds);
  return Object.entries(def.grants)
    .filter(([perm, scope]) => !covers(mine[perm], scope))
    .map(([perm, scope]) => {
      const label = PERMISSIONS.find((p) => p.id === perm)?.label ?? perm;
      return `${label} (${scopeLabel(scope)})`;
    });
};

// Γιατί ο actor δεν μπορεί να δώσει (ή να αφαιρέσει) αυτόν τον Ρόλο σε αυτόν τον Χρήστη· null αν μπορεί.
const lockReason = (
  actor: TeamUser,
  def: RoleDef,
  target: TeamUser | undefined,
): string | null => {
  const isLastOwner =
    def.isOwner &&
    !!target &&
    isOwnerUser(target) &&
    activeOwners().length <= 1;
  if (isLastOwner) {
    return "ο τελευταίος ενεργός Ιδιοκτήτης δεν χάνει τον Ρόλο· πρώτα δώσε τον Ρόλο Ιδιοκτήτης σε άλλον";
  }
  if (target && isOwnerUser(target) && !isOwnerUser(actor)) {
    return "τους Ρόλους ενός Ιδιοκτήτη τους αλλάζει μόνο Ιδιοκτήτης";
  }
  if (canGrantRole(actor, def)) return null;
  if (def.isOwner)
    return "τον Ρόλο Ιδιοκτήτης τον δίνει ή αφαιρεί μόνο ο Ιδιοκτήτης";
  return `δίνει Δικαιώματα που δεν έχεις: ${missingGrants(actor, def).join(", ")}`;
};

interface RolePickerProps {
  actor: TeamUser;
  idPrefix: string;
  selected: readonly string[];
  target?: TeamUser;
}

export function RolePicker({
  actor,
  idPrefix,
  selected,
  target,
}: RolePickerProps) {
  return (
    <fieldset className="n1-roles">
      <legend>Ρόλοι (τουλάχιστον ένας)</legend>
      {teamRoles().map((def) => {
        const reason = lockReason(actor, def, target);
        const id = `${idPrefix}-${def.id}`;
        return (
          <div key={def.id} className="n1-role" data-locked={!!reason}>
            <input
              type="checkbox"
              id={id}
              name="roles"
              value={def.id}
              defaultChecked={selected.includes(def.id)}
              disabled={!!reason}
            />
            <label htmlFor={id}>
              <strong>{def.name}</strong>{" "}
              <span className="muted">{def.description}</span>
              {reason && <span className="n1-why">Δεν γίνεται: {reason}.</span>}
            </label>
          </div>
        );
      })}
    </fieldset>
  );
}
