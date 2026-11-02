import { ListRow, RowList } from "@/spaces/kit/parts";

import type { Grants } from "../permissions";
import type { PermissionDef, RoleKind } from "../queries";
import { permissionAreas } from "./team-reach";

// Ο πίνακας Δικαιωμάτων ενός Ρόλου, ανά περιοχή (prototype `screens/n4-matrix.tsx`). Κάθε γραμμή στοιβάζεται (ετικέτα πάνω,
// επιλογές κάτω), ώστε να χωρά στα 375px χωρίς οριζόντια κύλιση. Τα ονόματα των πεδίων (perm.<κωδικός>) τα διαβάζει το saveRole.

interface Choice {
  value: string;
  label: string;
}

const NONE: Choice = { value: "", label: "—" };

const teamChoices = (perm: PermissionDef): readonly Choice[] => [
  NONE,
  ...(perm.scopes.includes("mine")
    ? [{ value: "mine", label: "Όσα με αφορούν" }]
    : []),
  ...(perm.scopes.includes("all") ? [{ value: "all", label: "Όλα" }] : []),
];

const CLIENT_CHOICES: readonly Choice[] = [
  { value: "", label: "Όχι" },
  { value: "all", label: "Ναι" },
];

interface PermissionRowProps {
  perm: PermissionDef;
  current: string;
  locked: boolean;
}

function PermissionRow({ perm, current, locked }: PermissionRowProps) {
  const choices = perm.kind === "team" ? teamChoices(perm) : CLIENT_CHOICES;
  const onlyAll =
    perm.kind === "team" &&
    perm.scopes.length === 1 &&
    perm.scopes[0] === "all";
  return (
    <ListRow
      title={
        <>
          {perm.label}
          {onlyAll && <span className="muted"> (μόνο «Όλα»)</span>}
        </>
      }
      aside={
        <span className="n4-choices" role="radiogroup" aria-label={perm.label}>
          {choices.map((choice) => (
            <label key={choice.value || "none"} className="n4-choice">
              <input
                type="radio"
                name={`perm.${perm.code}`}
                value={choice.value}
                defaultChecked={current === choice.value}
                disabled={locked}
              />
              {choice.label}
            </label>
          ))}
        </span>
      }
    />
  );
}

interface PermissionMatrixProps {
  kind: RoleKind;
  permissions: readonly PermissionDef[];
  grants: Grants;
  // Ο Ιδιοκτήτης: πάντα «Όλα», κλειδωμένος.
  isOwner?: boolean;
  locked?: boolean;
}

export function PermissionMatrix({
  kind,
  permissions,
  grants,
  isOwner = false,
  locked = false,
}: PermissionMatrixProps) {
  const isLocked = locked || isOwner;
  return (
    <div className="n4-matrix">
      {kind === "team" && (
        <p className="note">
          «Όσα με αφορούν»: μόνο ό,τι αφορά τον ίδιο τον Χρήστη. «Όλα»: όλη η
          εταιρεία. Φαίνονται μόνο τα Εύρη που υποστηρίζει κάθε Δικαίωμα.
        </p>
      )}
      {kind === "client" && (
        <p className="note">
          Τα Δικαιώματα πελάτη δεν έχουν Εύρος: καλύπτουν τον Πελάτη που έχει
          επιλέξει ο Χρήστης.
        </p>
      )}
      {permissionAreas(permissions, kind).map((area) => (
        <fieldset key={area} className="n4-area" disabled={isLocked}>
          <legend>{area}</legend>
          <RowList>
            {permissions
              .filter((p) => p.kind === kind && p.area === area)
              .map((perm) => (
                <PermissionRow
                  key={perm.code}
                  perm={perm}
                  current={isOwner ? "all" : (grants[perm.code] ?? "")}
                  locked={isLocked}
                />
              ))}
          </RowList>
        </fieldset>
      ))}
    </div>
  );
}
