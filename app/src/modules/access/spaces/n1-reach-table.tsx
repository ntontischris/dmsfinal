import { Badge } from "@/spaces/screens/shared";

import type { PermissionDef, RoleSummary } from "../queries";
import { permissionAreas, reachRow } from "./team-reach";

const CELL = { all: "Όλα", mine: "Μόνο δικά του" } as const;

interface RoleReachTableProps {
  roles: readonly RoleSummary[];
  permissions: readonly PermissionDef[];
}

// Ρόλοι × περιοχές με μια ματιά (prototype `screens/n1-reach-table.tsx`). Ένας Χρήστης με πολλούς Ρόλους βλέπει την ένωσή τους.
export function RoleReachTable({ roles, permissions }: RoleReachTableProps) {
  const areas = permissionAreas(permissions, "team");
  const rows = roles
    .filter((def) => def.kind === "team")
    .map((def) => ({
      def,
      row: def.isOwner ? null : reachRow(def.grants, permissions),
    }));
  return (
    <details className="card n1-section">
      <summary>
        <h2 style={{ display: "inline" }}>Ποιος Ρόλος βλέπει τι</h2>
      </summary>
      <p className="muted">
        «Μόνο δικά του»: Πελάτες και Ευκαιρίες όπου είναι Υπεύθυνος, Παραγωγές
        όπου είναι Μέλος. Με δύο ή περισσότερους Ρόλους, ισχύει το ευρύτερο.
      </p>
      <div className="scroll">
        <table className="rtable">
          <thead>
            <tr>
              <th>Περιοχή</th>
              {rows.map(({ def }) => (
                <th key={def.id}>{def.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {areas.map((area) => (
              <tr key={area}>
                <td data-label="Περιοχή">{area}</td>
                {rows.map(({ def, row }) => {
                  const scope = row ? row[area] : "all";
                  return (
                    <td key={def.id} data-label={def.name}>
                      {scope ? (
                        <Badge tone={scope === "all" ? "strong" : undefined}>
                          {CELL[scope]}
                        </Badge>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
