"use client";

import { useState } from "react";

import type { FormState } from "@/lib/form-state";
import { useKeptForm } from "@/lib/use-kept-form";

import { styleBlockedKind } from "../actions-kinds";
import {
  DEFAULT_KIND_COLOR,
  KIND_COLORS,
  KIND_COLOR_LABELS,
  KIND_ICONS,
  KIND_ICON_LIMIT,
  kindToneOf,
} from "../kind-style";
import type { BlockedKind } from "../types";

// Σχέδιο «3B»: χρώμα (δείγματα της παλέτας ως radio), εικονίδιο (λίστα με ένα πάτημα ή δικό σου) και «Μπορεί να γίνει
// Γύρισμα» ενός Είδους, στις Ρυθμίσεις › Γυρίσματα (O4).

function FormNote({ state }: { state: FormState }) {
  const text = state.error ?? state.notice;
  if (!text) return null;
  return (
    <span className="note" role={state.error ? "alert" : "status"}>
      {text}
    </span>
  );
}

// Το δείγμα και το εικονίδιο του Είδους, όπως φαίνονται στο Ημερολόγιο.
export function KindBadge({ kind }: { kind: BlockedKind }) {
  return (
    <span
      className="kind-badge"
      data-tone={kindToneOf(kind.color) ?? undefined}
      aria-hidden="true"
    >
      <span className="kind-dot" />
      {kind.icon && <span>{kind.icon}</span>}
    </span>
  );
}

// Εικονίδιο: τα έτοιμα ως radio, «Χωρίς», και «Δικό σου» για ό,τι άλλο (έως 4 χαρακτήρες).
function IconPicker({
  label,
  icon,
  onPick,
}: {
  label: string;
  icon: string;
  onPick: (icon: string) => void;
}) {
  const options = ["", ...KIND_ICONS];
  return (
    <fieldset className="kind-icons">
      <legend>Εικονίδιο: {label}</legend>
      {options.map((option) => (
        <label
          key={option || "none"}
          className="kind-icon"
          title={option || "Χωρίς εικονίδιο"}
        >
          <input
            type="radio"
            name="iconPick"
            value={option}
            checked={icon.trim() === option}
            onChange={() => onPick(option)}
            aria-label={option || "Χωρίς εικονίδιο"}
          />
          {option || "Χωρίς"}
        </label>
      ))}
      <label className="kind-icon-own">
        Δικό σου{" "}
        <input
          className="input"
          name="icon"
          aria-label={`Δικό σου εικονίδιο: ${label}`}
          value={icon}
          onChange={(event) => onPick(event.target.value)}
        />
        <span className="muted">έως {KIND_ICON_LIMIT} χαρακτήρες</span>
      </label>
    </fieldset>
  );
}

export function KindStyleForm({ kind }: { kind: BlockedKind }) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(styleBlockedKind);
  const [color, setColor] = useState(
    kindToneOf(kind.color) ?? DEFAULT_KIND_COLOR,
  );
  const [icon, setIcon] = useState(kind.icon ?? "");
  const [becomesFilming, setBecomesFilming] = useState(kind.becomesFilming);
  const isChanged =
    color !== kind.color ||
    icon.trim() !== (kind.icon ?? "") ||
    becomesFilming !== kind.becomesFilming;
  return (
    <form ref={formRef} className="kind-style" onSubmit={onSubmit}>
      <input type="hidden" name="id" value={kind.id} />
      <fieldset className="kind-swatches">
        <legend>Χρώμα: {kind.label}</legend>
        {KIND_COLORS.map((key) => (
          <label key={key} className="kind-swatch" data-tone={key}>
            <input
              type="radio"
              name="color"
              value={key}
              checked={color === key}
              onChange={() => setColor(key)}
            />
            <span className="kind-dot" aria-hidden="true" />
            {KIND_COLOR_LABELS[key]}
          </label>
        ))}
      </fieldset>
      <IconPicker label={kind.label} icon={icon} onPick={setIcon} />
      <label className="kind-check">
        <input
          type="checkbox"
          name="becomesFilming"
          checked={becomesFilming}
          onChange={(event) => setBecomesFilming(event.target.checked)}
        />
        Μπορεί να γίνει Γύρισμα
        <span className="muted">
          (δείχνει «Μετατροπή σε Γύρισμα» στον κλεισμένο χρόνο)
        </span>
      </label>
      <div className="btn-row">
        <button
          type="submit"
          className="button"
          data-primary="true"
          disabled={isPending || !isChanged}
        >
          Αποθήκευση
        </button>
        <FormNote state={state} />
      </div>
    </form>
  );
}
