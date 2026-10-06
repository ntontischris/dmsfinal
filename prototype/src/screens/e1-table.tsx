import Link from "next/link";

import { FILMING_RULES, type Filming } from "@/data/filming";
import {
  clientNameOf,
  equipmentConflicts,
  needsOutcome,
  productionOf,
} from "@/data/filming-access";
import type { RoleId } from "@/data/roles";
import { whenLabel } from "@/screens/e1-format";
import { Badge, screenHref } from "@/screens/shared";

import "./e1.css";

const hasCantDo = (filming: Filming): boolean =>
  filming.state === "προγραμματισμένο" &&
  filming.crew.some((slot) => slot.response === "δεν μπορώ");

const isAttention = (filming: Filming): boolean =>
  filming.state === "αναμένει έγκριση" ||
  needsOutcome(filming) ||
  !!filming.cancelRequest ||
  hasCantDo(filming);

const stateLabel = (filming: Filming): string =>
  needsOutcome(filming) ? "προγραμματισμένο · θέλει «έγινε»" : filming.state;

const crewLabel = (filming: Filming): string => {
  if (filming.state !== "προγραμματισμένο") return "—";
  if (filming.crew.length === 0) return "χωρίς Συνεργείο";
  const confirmed = filming.crew.filter(
    (slot) => slot.response === "επιβεβαιώνω",
  ).length;
  return `${confirmed}/${filming.crew.length} επιβεβαίωσαν`;
};

function Signals({ filming }: { filming: Filming }) {
  const conflicts = equipmentConflicts(filming).length;
  const hasEquipmentSignal = conflicts > 0 && !!FILMING_RULES.equipmentConflict;
  const hasAny =
    !!filming.cancelRequest || hasCantDo(filming) || hasEquipmentSignal;
  return (
    <span className="e1-signals">
      {filming.cancelRequest && <Badge tone="attention">αίτημα ακύρωσης</Badge>}
      {hasCantDo(filming) && <Badge tone="attention">δεν μπορώ</Badge>}
      {hasEquipmentSignal && (
        <Badge tone="attention">σύγκρουση εξοπλισμού</Badge>
      )}
      {!hasAny && "—"}
    </span>
  );
}

interface E1TableProps {
  role: RoleId;
  filmings: readonly Filming[];
  isClient: boolean;
}

export function E1Table({ role, filmings, isClient }: E1TableProps) {
  return (
    <table className="rtable">
      <thead>
        <tr>
          <th>Πότε</th>
          {!isClient && <th>Πελάτης</th>}
          <th>Παραγωγή</th>
          <th>Κατάσταση</th>
          {!isClient && <th>Συνεργείο</th>}
          <th>{isClient ? "Σημείωση" : "Σήματα"}</th>
        </tr>
      </thead>
      <tbody>
        {filmings.map((filming) => (
          <tr key={filming.id}>
            <td data-label="Πότε" className="e1-when">
              {whenLabel(filming)}
            </td>
            {!isClient && <td data-label="Πελάτης">{clientNameOf(filming)}</td>}
            <td data-label="Παραγωγή">
              <Link href={screenHref(role, "E3", { id: filming.id })}>
                {productionOf(filming)?.title ?? "—"}
              </Link>
            </td>
            <td data-label="Κατάσταση">
              <Badge
                tone={
                  isAttention(filming) && !isClient ? "attention" : undefined
                }
              >
                {isClient && filming.cancelRequest
                  ? "ζητήθηκε ακύρωση"
                  : isClient
                    ? filming.state
                    : stateLabel(filming)}
              </Badge>
            </td>
            {!isClient && (
              <td data-label="Συνεργείο">
                {crewLabel(filming)}
                {hasCantDo(filming) && " · κάποιος δεν μπορεί"}
              </td>
            )}
            <td data-label={isClient ? "Σημείωση" : "Σήματα"}>
              {isClient ? (
                (filming.clientNote ?? "—")
              ) : (
                <Signals filming={filming} />
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
