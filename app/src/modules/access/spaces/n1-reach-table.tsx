import type { PermissionDef, RoleSummary } from "../queries";
import { Box, Line } from "./n-parts";
import { permissionAreas, reachRow } from "./team-reach";

interface RoleReachTableProps {
  roles: readonly RoleSummary[];
  permissions: readonly PermissionDef[];
}

type Row = ReturnType<typeof reachRow> | null;

// Χωρίς γραμμή Δικαιωμάτων (Ιδιοκτήτης) = όλα σε όλες τις περιοχές.
const areasWith = (
  areas: readonly string[],
  row: Row,
  scope: "all" | "mine",
): readonly string[] =>
  areas.filter((area) => (row ? row[area] === scope : scope === "all"));

const reachSub = (all: readonly string[], mine: readonly string[]): string => {
  const parts = [
    all.length > 0 ? `Όλα: ${all.join(", ")}` : null,
    mine.length > 0 ? `Μόνο δικά του: ${mine.join(", ")}` : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(" · ") : "Τίποτα ακόμα";
};

// Τι βλέπει κάθε Ρόλος ομάδας ανά περιοχή (prototype `screens/n1-reach-table.tsx`), μία γραμμή ανά Ρόλο.
// Ένας Χρήστης με πολλούς Ρόλους βλέπει την ένωσή τους.
export function RoleReachTable({ roles, permissions }: RoleReachTableProps) {
  const areas = permissionAreas(permissions, "team");
  const rows = roles
    .filter((def) => def.kind === "team")
    .map((def) => {
      const row = def.isOwner ? null : reachRow(def.grants, permissions);
      return {
        def,
        all: areasWith(areas, row, "all"),
        mine: areasWith(areas, row, "mine"),
      };
    });
  return (
    <Box
      title="Ποιος Ρόλος βλέπει τι"
      hint={`${rows.length} Ρόλοι ομάδας · ${areas.length} περιοχές`}
    >
      <p className="muted">
        «Μόνο δικά του»: Πελάτες και Ευκαιρίες όπου είναι Υπεύθυνος, Παραγωγές
        όπου είναι Μέλος. Με δύο ή περισσότερους Ρόλους, ισχύει το ευρύτερο.
      </p>
      <ul className="ml-list">
        {rows.map(({ def, all, mine }) => (
          <Line
            key={def.id}
            name={def.name}
            title={def.name}
            sub={reachSub(all, mine)}
          />
        ))}
      </ul>
    </Box>
  );
}
