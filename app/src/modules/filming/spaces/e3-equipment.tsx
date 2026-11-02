"use client";

import { Fragment, useState } from "react";

import { hrefOf } from "@/spaces/data/screens";
import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";
import { initialsOf } from "@/spaces/shell/avatar";

import {
  applyEquipmentTemplate,
  setFilmingEquipment,
} from "../actions-equipment";
import type { EquipmentCandidate, FilmingCard, NamedRef } from "../types";
import { emptyEquipmentNote, isOpenState } from "./e3-model";
import { useRun } from "./e3-run";
import { LastDone, Warning } from "./e3-ui";

// Δέσμευση εξοπλισμού στο Γύρισμα (prototype `screens/e3-equipment.tsx`), από το μητρώο ή από Πρότυπο. Η βάση ορίζει
// τη λίστα ολόκληρη (filming_equipment_set) και αποφασίζει σύγκρουση/διαθεσιμότητα· το μήνυμά της φαίνεται κάτω.

interface E3EquipmentProps {
  card: FilmingCard;
  candidates: readonly EquipmentCandidate[];
  templates: readonly NamedRef[];
  // Οι λέξεις της κατάστασης αντικειμένου (από το module Εξοπλισμός, στον server).
  statusLabels: Readonly<Record<string, string>>;
}

const AVAILABLE = "available";

export function E3Equipment({
  card,
  candidates,
  templates,
  statusLabels,
}: E3EquipmentProps) {
  const statusOf = (status: string): string => statusLabels[status] ?? status;
  const [picked, setPicked] = useState("");
  const [templateId, setTemplateId] = useState("");
  const { run, isPending, result } = useRun();
  const isEditable = card.viewerCan.equipment && isOpenState(card.state);
  const itemIds = card.equipment.map((line) => line.itemId);
  const setItems = (ids: readonly string[]) =>
    run(setFilmingEquipment, { filmingId: card.id, itemId: ids });
  const free = candidates.filter((item) => !itemIds.includes(item.id));

  return (
    <Panel label="Εξοπλισμός">
      {card.equipment.length === 0 && (
        <p className="muted">{emptyEquipmentNote(card.state)}</p>
      )}
      <RowList>
        {card.equipment.map((line) => (
          <Fragment key={line.itemId}>
            <ListRow
              lead={
                <span className="part-tile" aria-hidden="true">
                  {initialsOf(line.name)}
                </span>
              }
              href={hrefOf("F2", { id: line.itemId })}
              title={line.name}
              sub={statusOf(line.status)}
              aside={
                isEditable && (
                  <button
                    type="button"
                    className="button"
                    aria-label={`Αποδέσμευση: ${line.name}`}
                    disabled={isPending}
                    onClick={() =>
                      setItems(itemIds.filter((id) => id !== line.itemId))
                    }
                  >
                    Αποδέσμευση
                  </button>
                )
              }
            />
            {(line.status !== AVAILABLE || line.conflict) && (
              <li className="sx-extra">
                {line.status !== AVAILABLE && (
                  <Warning>
                    Το αντικείμενο είναι «{statusOf(line.status)}». Αποφάσισε αν θα είναι
                    έτοιμο εγκαίρως.
                  </Warning>
                )}
                {line.conflict && (
                  <Warning>
                    Σύγκρουση: δεσμεύεται και σε άλλο Γύρισμα την ίδια ώρα.
                  </Warning>
                )}
              </li>
            )}
          </Fragment>
        ))}
      </RowList>
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
              {free.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.code ? ` (${item.code})` : ""} · {item.categoryName}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="button"
              disabled={!picked || isPending}
              onClick={() => {
                setItems([...itemIds, picked]);
                setPicked("");
              }}
            >
              Δέσμευση
            </button>
          </div>
          {templates.length > 0 && (
            <div className="e3-inline">
              <select
                className="select"
                aria-label="Πρότυπο εξοπλισμού"
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
              >
                <option value="">Εφάρμοσε Πρότυπο…</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="button"
                disabled={!templateId || isPending}
                onClick={() => {
                  run(applyEquipmentTemplate, {
                    filmingId: card.id,
                    templateId,
                  });
                  setTemplateId("");
                }}
              >
                Εφαρμογή
              </button>
            </div>
          )}
        </div>
      )}
      <LastDone log={result ? [result.text] : []} tone={result?.tone ?? "ok"} />
      {!isEditable && (
        <p className="muted">
          Μόνο ανάγνωση: δεσμεύεις σε ανοιχτά Γυρίσματα που σε αφορούν.
        </p>
      )}
    </Panel>
  );
}
