"use client";

import type { AgreementLine } from "@/data/agreements";
import {
  PROVISION_KINDS,
  provisionKind,
  provisionsText,
  type ProvisionKindId,
} from "@/data/catalogue";
import { NumberInput } from "@/screens/d2-ui";

interface CellProps {
  line: AgreementLine;
  isEditing: boolean;
  onChange: (line: AgreementLine) => void;
}

// Παροχές της γραμμής: ποσότητα ανά είδος, για όλη την ποσότητα της γραμμής.
export function ProvisionsCell({ line, isEditing, onChange }: CellProps) {
  if (!isEditing) return <>{provisionsText(line.provisions)}</>;
  const missing = PROVISION_KINDS.filter(
    (kind) => !line.provisions.some((p) => p.kindId === kind.id),
  );
  const setQuantity = (kindId: ProvisionKindId, quantity: number) =>
    onChange({
      ...line,
      provisions: line.provisions.map((p) =>
        p.kindId === kindId ? { ...p, quantity } : p,
      ),
    });
  const remove = (kindId: ProvisionKindId) =>
    onChange({
      ...line,
      provisions: line.provisions.filter((p) => p.kindId !== kindId),
    });
  const add = (kindId: ProvisionKindId) =>
    onChange({
      ...line,
      provisions: [...line.provisions, { kindId, quantity: 1 }],
    });
  return (
    <span className="stack">
      {line.provisions.map((provision) => {
        const unit = provisionKind(provision.kindId).unit;
        return (
          <span key={provision.kindId} className="btn-row">
            <NumberInput
              label={`Ποσότητα ${unit}`}
              value={provision.quantity}
              onChange={(value) => setQuantity(provision.kindId, value)}
              suffix={unit}
            />
            <button
              type="button"
              className="button"
              aria-label={`Αφαίρεση ${unit}`}
              onClick={() => remove(provision.kindId)}
            >
              ×
            </button>
          </span>
        );
      })}
      {missing.length > 0 && (
        <select
          className="select"
          aria-label="Προσθήκη Παροχής"
          value=""
          onChange={(event) => add(event.target.value as ProvisionKindId)}
        >
          <option value="">+ Παροχή</option>
          {missing.map((kind) => (
            <option key={kind.id} value={kind.id}>
              {kind.unit}
            </option>
          ))}
        </select>
      )}
    </span>
  );
}

const roundHours = (hours: number): number => Math.round(hours * 10) / 10;

// Ώρες γυρίσματος / μοντάζ: τις βλέπει όποιος βλέπει κόστος, τις αλλάζει όποιος «Διαχειρίζεται κόστος».
export function HoursCell({ line, isEditing, onChange }: CellProps) {
  if (!isEditing)
    return <span>{`${roundHours(line.hours.shoot)} / ${roundHours(line.hours.edit)}`}</span>;
  const setHours = (field: "shoot" | "edit", value: number) =>
    onChange({ ...line, hours: { ...line.hours, [field]: value } });
  return (
    <span className="stack">
      <NumberInput
        label="Ώρες γυρίσματος"
        value={line.hours.shoot}
        step={0.5}
        onChange={(value) => setHours("shoot", value)}
        suffix="γύρ."
      />
      <NumberInput
        label="Ώρες μοντάζ"
        value={line.hours.edit}
        step={0.5}
        onChange={(value) => setHours("edit", value)}
        suffix="μοντ."
      />
    </span>
  );
}
