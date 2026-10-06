import { permissionAreas } from "@/data/team-access";
import {
  PERMISSIONS,
  type PermissionDef,
  type RoleKind,
  type Scope,
} from "@/data/team";

// Ο πίνακας Δικαιωμάτων ενός Ρόλου, ανά περιοχή. Κάθε γραμμή στοιβάζεται (ετικέτα πάνω, επιλογές κάτω),
// ώστε να χωρά στα 375px χωρίς οριζόντια κύλιση.

type Choice = { value: string; label: string };

const NONE: Choice = { value: "", label: "—" };
const SCOPE_CHOICES: readonly { scope: Scope; label: string }[] = [
  { scope: "Α", label: "Όσα με αφορούν" },
  { scope: "Ό", label: "Όλα" },
];

const teamChoices = (perm: PermissionDef): readonly Choice[] => [
  NONE,
  ...SCOPE_CHOICES.filter((c) => perm.scopes.includes(c.scope)).map((c) => ({
    value: c.scope,
    label: c.label,
  })),
];

const CLIENT_CHOICES: readonly Choice[] = [
  { value: "", label: "Όχι" },
  { value: "Ό", label: "Ναι" },
];

interface PermissionRowProps {
  perm: PermissionDef;
  current: Scope | undefined;
  locked: boolean;
  prefix: string;
}

function PermissionRow({ perm, current, locked, prefix }: PermissionRowProps) {
  const choices = perm.kind === "ομάδας" ? teamChoices(perm) : CLIENT_CHOICES;
  const onlyAll = perm.kind === "ομάδας" && perm.scopes.length === 1;
  return (
    <li className="n4-perm">
      <span className="n4-perm-label">
        {perm.label}
        {onlyAll && <span className="muted"> (μόνο «Όλα»)</span>}
      </span>
      <span className="n4-choices" role="radiogroup" aria-label={perm.label}>
        {choices.map((choice) => (
          <label key={choice.value || "none"} className="n4-choice">
            <input
              type="radio"
              name={`${prefix}${perm.id}`}
              value={choice.value}
              defaultChecked={(current ?? "") === choice.value}
              disabled={locked}
            />
            {choice.label}
          </label>
        ))}
      </span>
    </li>
  );
}

interface PermissionMatrixProps {
  kind: RoleKind;
  grants: Readonly<Record<string, Scope>>;
  locked?: boolean;
  prefix?: string;
}

export function PermissionMatrix({
  kind,
  grants,
  locked = false,
  prefix = "perm-",
}: PermissionMatrixProps) {
  return (
    <div className="n4-matrix">
      {kind === "ομάδας" && (
        <p className="note">
          «Όσα με αφορούν»: μόνο ό,τι αφορά τον ίδιο τον Χρήστη. «Όλα»: όλη η
          εταιρεία.
          Φαίνονται μόνο τα Εύρη που υποστηρίζει κάθε Δικαίωμα.
        </p>
      )}
      {kind === "πελάτη" && (
        <p className="note">
          Τα Δικαιώματα πελάτη δεν έχουν Εύρος: καλύπτουν τον Πελάτη που έχει
          επιλέξει ο Χρήστης.
        </p>
      )}
      {permissionAreas(kind).map((area) => (
        <fieldset key={area} className="n4-area" disabled={locked}>
          <legend>{area}</legend>
          <ul className="list">
            {PERMISSIONS.filter((p) => p.kind === kind && p.area === area).map(
              (perm) => (
                <PermissionRow
                  key={perm.id}
                  perm={perm}
                  current={grants[perm.id]}
                  locked={locked}
                  prefix={prefix}
                />
              ),
            )}
          </ul>
        </fieldset>
      ))}
    </div>
  );
}
