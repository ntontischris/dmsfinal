import { formatDateTime } from "../helpers";
import type { SheetVersionEntry } from "../sheet-types";

// Το ιστορικό εκδόσεων: αριθμός, ώρα, ποιος και τι άλλαξε (η πρώτη έκδοση δεν έχει αλλαγή).
export function SheetHistory({ versions }: { versions: readonly SheetVersionEntry[] }) {
  if (versions.length === 0) return null;
  return (
    <div className="grid gap-2">
      <h3 className="kit-label m-0">Ιστορικό εκδόσεων</h3>
      <ul className="m-0 grid list-none gap-1.5 p-0 text-sm">
        {versions.map((entry) => (
          <li key={entry.version}>
            {`Έκδοση ${entry.version} · ${formatDateTime(entry.issuedAt)} · ${entry.issuedByName ?? "—"}`}
            {entry.change ? ` · ${entry.change}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
