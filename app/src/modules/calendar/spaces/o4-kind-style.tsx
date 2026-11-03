"use client";

import { useState } from "react";

import type { FormState } from "@/lib/form-state";
import { useKeptForm } from "@/lib/use-kept-form";

import { styleBlockedKind } from "../actions-kinds";
import {
  DEFAULT_KIND_COLOR,
  KIND_COLORS,
  KIND_COLOR_LABELS,
  KIND_ICON_LIMIT,
  kindToneOf,
} from "../kind-style";
import type { BlockedKind } from "../types";

// Σχέδιο «3B»: χρώμα (δείγματα της παλέτας ως radio) και εικονίδιο ενός Είδους, στις Ρυθμίσεις › Γυρίσματα (O4).

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

export function KindStyleForm({ kind }: { kind: BlockedKind }) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(styleBlockedKind);
  const [color, setColor] = useState(
    kindToneOf(kind.color) ?? DEFAULT_KIND_COLOR,
  );
  const [icon, setIcon] = useState(kind.icon ?? "");
  const isChanged = color !== kind.color || icon.trim() !== (kind.icon ?? "");
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
      <div className="kind-icon-field">
        <label>
          Εικονίδιο{" "}
          <input
            className="input"
            name="icon"
            aria-label={`Εικονίδιο: ${kind.label}`}
            placeholder="π.χ. 🌙"
            value={icon}
            onChange={(event) => setIcon(event.target.value)}
          />
        </label>
        <span className="muted">
          έως {KIND_ICON_LIMIT} χαρακτήρες, κενό = χωρίς εικονίδιο
        </span>
      </div>
      <div className="btn-row">
        <button
          type="submit"
          className="button"
          data-primary="true"
          disabled={isPending || !isChanged}
        >
          Αποθήκευση χρώματος
        </button>
        <FormNote state={state} />
      </div>
    </form>
  );
}
