import { formatDateTime, formatHours } from "../helpers";
import type { SheetSnapshot, SheetView } from "../sheet-types";

import { MutedNote } from "./form-fields";

// Η τρέχουσα έκδοση για το μέλος του Συνεργείου: μόνο ανάγνωση (πού, πότε, ποιοι, εξοπλισμός, λήψεις, σημείωση).
export function SheetReadonly({ sheet }: { sheet: SheetView }) {
  const latest = sheet.latest;
  if (latest === null) return <MutedNote>Δεν έχει εκδοθεί Δελτίο ακόμα.</MutedNote>;
  return (
    <div className="grid gap-3 text-sm">
      <SnapshotLines snapshot={latest} />
      <ShotLines snapshot={latest} />
    </div>
  );
}

function SnapshotLines({ snapshot }: { snapshot: SheetSnapshot }) {
  const crewNames = snapshot.crew.map((member) => member.name).join(", ");
  const equipmentNames = snapshot.equipment.map((item) => item.name).join(", ");
  return (
    <div className="grid gap-1">
      <p className="m-0">
        <span className="kit-label mr-2">Πότε</span>
        {formatDateTime(snapshot.startsAt)} · {formatHours(snapshot.hours)} ώρ.
      </p>
      <p className="m-0">
        <span className="kit-label mr-2">Πού</span>
        {snapshot.location ?? "—"}
      </p>
      <p className="m-0">
        <span className="kit-label mr-2">Ποιοι</span>
        {crewNames || "—"}
      </p>
      <p className="m-0">
        <span className="kit-label mr-2">Εξοπλισμός</span>
        {equipmentNames || "—"}
      </p>
      {snapshot.crewNote && (
        <p className="m-0">
          <span className="kit-label mr-2">Σημείωση</span>
          {snapshot.crewNote}
        </p>
      )}
    </div>
  );
}

function ShotLines({ snapshot }: { snapshot: SheetSnapshot }) {
  if (snapshot.shots.length === 0) return <MutedNote>Χωρίς λήψεις.</MutedNote>;
  return (
    <ol className="m-0 grid gap-1 pl-5">
      {snapshot.shots.map((shot) => (
        <li key={shot.id}>{shot.text}</li>
      ))}
    </ol>
  );
}
