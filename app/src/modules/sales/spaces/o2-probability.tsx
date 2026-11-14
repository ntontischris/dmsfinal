"use client";

import { setStageProbability } from "../actions-forecast";
import type { ListItem } from "../types";
import { RowForm } from "./b5-forms";

// Στάδιο: η Πιθανότητα που παίρνει μια Ευκαιρία εδώ, όταν ο Υπεύθυνος δεν γράψει δική του (Πρόβλεψη στο Pipeline).
export function StageProbability({
  item,
  onDone,
}: {
  item: ListItem;
  onDone: (text: string) => void;
}) {
  return (
    <RowForm
      action={setStageProbability}
      submitLabel="Ορισμός"
      ariaLabel={`Ορισμός Πιθανότητας: ${item.label}`}
      className="o2-inline"
      onDone={onDone}
    >
      <input type="hidden" name="id" value={item.id} />
      <label className="o2-inline">
        <span className="part-sub">Πιθανότητα %</span>
        <input
          className="input"
          name="probability"
          inputMode="numeric"
          size={3}
          aria-label={`Πιθανότητα %: ${item.label}`}
          defaultValue={item.probability ?? ""}
        />
      </label>
    </RowForm>
  );
}
