import type { PermissionDef, RoleSummary } from "../queries";
import { Box } from "./n-parts";
import { permissionAreas, reachRow } from "./team-reach";

const CELL = { all: "Όλα", mine: "Μόνο δικά του" } as const;

interface RoleReachTableProps {
  roles: readonly RoleSummary[];
  permissions: readonly PermissionDef[];
}

// Ρόλοι × περιοχές με μια ματιά (prototype `screens/n1-reach-table.tsx`): πραγματικός πίνακας για σύγκριση Ρόλων
// δίπλα-δίπλα, μαζί με τις περιοχές χωρίς πρόσβαση. Ένας Χρήστης με πολλούς Ρόλους βλέπει την ένωσή τους.
export function RoleReachTable({ roles, permissions }: RoleReachTableProps) {
  const areas = permissionAreas(permissions, "team");
  const rows = roles
    .filter((def) => def.kind === "team")
    .map((def) => ({
      def,
      row: def.isOwner ? null : reachRow(def.grants, permissions),
    }));
  return (
    <Box
      title="Ποιος Ρόλος βλέπει τι"
      hint={`${rows.length} Ρόλοι ομάδας · ${areas.length} περιοχές`}
    >
      <p className="muted">
        «Μόνο δικά του»: Πελάτες και Ευκαιρίες όπου είναι Υπεύθυνος, Παραγωγές
        όπου είναι Μέλος. Με δύο ή περισσότερους Ρόλους, ισχύει το ευρύτερο.
      </p>
      <div className="n-reach-scroll">
        <table className="n-reach">
          <thead>
            <tr>
              <th scope="col">Περιοχή</th>
              {rows.map(({ def }) => (
                <th key={def.id} scope="col">
                  {def.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {areas.map((area) => (
              <tr key={area}>
                <th scope="row">{area}</th>
                {rows.map(({ def, row }) => {
                  const scope = row ? row[area] : "all";
                  return (
                    <td key={def.id} data-scope={scope ?? "none"}>
                      {scope ? CELL[scope] : "Χωρίς πρόσβαση"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Box>
  );
}
