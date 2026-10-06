"use client";

import Link from "next/link";
import { useState } from "react";

import {
  EQUIPMENT,
  EQUIPMENT_TEMPLATES,
  equipmentName,
  findEquipment,
  isReservable,
} from "@/data/equipment";
import { canReserveOn, otherHoldersOf } from "@/data/equipment-access";
import { FILMING_RULES, type Filming } from "@/data/filming";
import type { RoleId } from "@/data/roles";
import {
  withFilming,
  withLog,
  type Live,
  type UpdateLive,
} from "@/screens/e3-model";
import { Warning } from "@/screens/e3-ui";
import { filmingLabel } from "@/screens/f-model";
import { screenHref } from "@/screens/shared";

interface E3EquipmentProps {
  role: RoleId;
  live: Live;
  update: UpdateLive;
}

const holdersOf = (filming: Filming, itemId: string) =>
  otherHoldersOf(filming, itemId);

// Εφαρμογή Προτύπου: ό,τι δεν είναι διαθέσιμο παραλείπεται· η σύγκρουση παραλείπεται μόνο όταν οι Κανόνες μπλοκάρουν.
const applyTemplate = (
  filming: Filming,
  itemIds: readonly string[],
  blocks: boolean,
) => {
  const fresh = itemIds.filter((id) => !filming.equipment.includes(id));
  const skipped = fresh.filter(
    (id) => !isReservable(id) || (blocks && holdersOf(filming, id).length > 0),
  );
  return { added: fresh.filter((id) => !skipped.includes(id)), skipped };
};

// Δέσμευση εξοπλισμού στο Γύρισμα, από το μητρώο (F1) ή από Πρότυπο (F3).
export function E3Equipment({ role, live, update }: E3EquipmentProps) {
  const f = live.filming;
  const [picked, setPicked] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [lastSkipped, setLastSkipped] = useState<readonly string[]>([]);
  const blocks = FILMING_RULES.equipmentConflict === "μπλοκάρει";
  const isEditable =
    canReserveOn(role, f) &&
    (f.state === "προγραμματισμένο" || f.state === "αναμένει έγκριση");
  const set = (equipment: readonly string[], text: string) =>
    update((l) => withLog(withFilming(l, { equipment }), text));
  const candidates = EQUIPMENT.filter(
    (item) => isReservable(item.id) && !f.equipment.includes(item.id),
  );
  const candidateHolders = picked ? holdersOf(f, picked) : [];
  const isCandidateBlocked = blocks && candidateHolders.length > 0;

  const handleTemplate = () => {
    const template = EQUIPMENT_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    const { added, skipped } = applyTemplate(f, template.itemIds, blocks);
    set(
      [...f.equipment, ...added],
      `Πρότυπο «${template.name}»: δεσμεύτηκαν ${added.length}${skipped.length ? `, παραλείφθηκαν ${skipped.length}` : ""}.`,
    );
    setLastSkipped(skipped);
    setTemplateId("");
  };

  return (
    <section className="card">
      <div className="card-title">
        <h2>Εξοπλισμός</h2>
      </div>
      {f.equipment.length === 0 && (
        <p className="muted">Δεν έχει δεσμευτεί Εξοπλισμός.</p>
      )}
      <ul className="list">
        {f.equipment.map((id) => {
          const item = findEquipment(id);
          return (
            <li key={id}>
              <div className="row">
                <Link href={screenHref(role, "F2", { id })}>
                  {equipmentName(id)}
                </Link>
                {isEditable && (
                  <button
                    type="button"
                    className="button"
                    onClick={() =>
                      set(
                        f.equipment.filter((e) => e !== id),
                        `Αποδεσμεύτηκε: ${equipmentName(id)}.`,
                      )
                    }
                  >
                    Αποδέσμευση
                  </button>
                )}
              </div>
              {item && item.status !== "διαθέσιμο" && (
                <Warning>
                  Το αντικείμενο είναι «{item.status}»
                  {item.statusNote ? ` (${item.statusNote})` : ""}. Αποφάσισε αν
                  θα είναι έτοιμο εγκαίρως.
                </Warning>
              )}
              {otherHoldersOf(f, id).map((other) => (
                <Warning key={other.id}>
                  Σύγκρουση: δεσμεύεται και στο {filmingLabel(other)}.
                </Warning>
              ))}
            </li>
          );
        })}
      </ul>
      {isEditable && (
        <div className="stack">
          <div className="e3-inline">
            <select
              className="select"
              aria-label="Εξοπλισμός"
              value={picked}
              onChange={(event) => setPicked(event.target.value)}
            >
              <option value="">Δέσμευσε αντικείμενο…</option>
              {candidates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="button"
              disabled={!picked || isCandidateBlocked}
              onClick={() => {
                set(
                  [...f.equipment, picked],
                  `Δεσμεύτηκε: ${equipmentName(picked)}.`,
                );
                setPicked("");
              }}
            >
              Δέσμευση
            </button>
          </div>
          {candidateHolders.map((other) => (
            <Warning key={other.id}>
              {isCandidateBlocked ? "Μπλοκάρεται" : "Θα συγκρούεται"}: ήδη
              δεσμευμένο στο {filmingLabel(other)}.
            </Warning>
          ))}
          <div className="e3-inline">
            <select
              className="select"
              aria-label="Πρότυπο εξοπλισμού"
              value={templateId}
              onChange={(event) => setTemplateId(event.target.value)}
            >
              <option value="">Εφάρμοσε Πρότυπο…</option>
              {EQUIPMENT_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="button"
              disabled={!templateId}
              onClick={handleTemplate}
            >
              Εφαρμογή
            </button>
          </div>
          {lastSkipped.length > 0 && (
            <Warning>
              Παραλείφθηκαν: {lastSkipped.map(equipmentName).join(", ")} (δεν
              είναι διαθέσιμα{blocks ? " ή συγκρούονται" : ""}).
            </Warning>
          )}
        </div>
      )}
      {!isEditable && (
        <p className="muted">
          Μόνο ανάγνωση: δεσμεύεις σε ανοιχτά Γυρίσματα που σε αφορούν.
        </p>
      )}
    </section>
  );
}
