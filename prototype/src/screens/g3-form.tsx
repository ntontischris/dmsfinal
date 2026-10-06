"use client";

import type { ProductionStub } from "@/data/filming";
import { fmtDate } from "@/screens/shared";
import {
  filmingsOf,
  isInternal,
  suggestedShootHours,
} from "@/data/productions-access";
import { parseNumber, type HoursForm, type HoursValue } from "@/screens/g3-model";

interface G3FormProps {
  production: ProductionStub;
  canManageCost: boolean;
  form: HoursForm;
  saved: HoursValue;
  estimateDirectCost: number;
  internalEstimate: { shoot: number; edit: number } | null;
  onChange: (change: Partial<HoursForm>) => void;
  onInternalEstimate: (value: { shoot: number; edit: number } | null) => void;
  onSave: () => void;
}

const n = (value: number | null): string =>
  value === null ? "—" : value.toLocaleString("el-GR");

function ShootBreakdown({ production }: { production: ProductionStub }) {
  const done = filmingsOf(production).filter((f) => f.state === "έγινε");
  if (done.length === 0)
    return <p className="muted">Κανένα Γύρισμα «έγινε» ακόμα.</p>;
  return (
    <ul className="list">
      {done.map((f) => {
        const people = Math.max(
          1,
          f.crew.filter((slot) => slot.response === "επιβεβαιώνω").length,
        );
        const duration = f.outcome?.actualHours ?? f.hours;
        return (
          <li key={f.id}>
            {fmtDate(f.date)}: {duration} ώ × {people} άτομα ={" "}
            <strong>{duration * people} ώ</strong>
          </li>
        );
      })}
    </ul>
  );
}

function ReadOnly({ saved }: { saved: HoursValue }) {
  return (
    <>
      <dl className="dl">
        <dt>Ώρες γυρίσματος</dt>
        <dd>
          {n(saved.shoot)}
          {saved.shoot !== null && !saved.shootConfirmed && " (δεν επιβεβαιώθηκαν)"}
        </dd>
        <dt>Ώρες μοντάζ</dt>
        <dd>{n(saved.edit)}</dd>
        <dt>Άμεσο κόστος</dt>
        <dd>{n(saved.directCost)}</dd>
      </dl>
      <p className="note">
        Τις γράφει μόνο όποιος «Διαχειρίζεται κόστος» (αρχικά ο Ιδιοκτήτης).
      </p>
    </>
  );
}

function InternalEstimate({
  value,
  onChange,
}: {
  value: { shoot: number; edit: number } | null;
  onChange: G3FormProps["onInternalEstimate"];
}) {
  const set = (key: "shoot" | "edit", text: string) => {
    const parsed = parseNumber(text);
    const next = { shoot: value?.shoot ?? 0, edit: value?.edit ?? 0, [key]: parsed ?? 0 };
    onChange(text.trim() === "" && !value ? null : next);
  };
  return (
    <fieldset className="stack">
      <legend>Εκτίμηση εσωτερικής δουλειάς (προαιρετική, μόνο ο Ιδιοκτήτης)</legend>
      <label>
        Γύρισμα (ώρες){" "}
        <input className="input" inputMode="decimal" value={value?.shoot ?? ""} onChange={(e) => set("shoot", e.target.value)} />
      </label>
      <label>
        Μοντάζ (ώρες){" "}
        <input className="input" inputMode="decimal" value={value?.edit ?? ""} onChange={(e) => set("edit", e.target.value)} />
      </label>
    </fieldset>
  );
}

export function G3Form(props: G3FormProps) {
  const { production, canManageCost, form, saved, onChange } = props;
  const suggested = suggestedShootHours(production);
  return (
    <section className="card">
      <div className="card-title">
        <h2>Πραγματικές ώρες</h2>
        <span className="muted">μόνο στη μνήμη του prototype</span>
      </div>
      {!canManageCost ? (
        <ReadOnly saved={saved} />
      ) : (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            props.onSave();
          }}
        >
          <label>
            Ώρες γυρίσματος (πρόταση συστήματος: {suggested} ώ){" "}
            <input className="input" inputMode="decimal" value={form.shoot} onChange={(e) => onChange({ shoot: e.target.value, shootConfirmed: false })} />
          </label>
          <ShootBreakdown production={production} />
          <label>
            <input type="checkbox" checked={form.shootConfirmed} onChange={(e) => onChange({ shootConfirmed: e.target.checked })} />{" "}
            Επιβεβαιώνω τις ώρες γυρίσματος
          </label>
          <label>
            Ώρες μοντάζ{" "}
            <input className="input" inputMode="decimal" value={form.edit} onChange={(e) => onChange({ edit: e.target.value })} />
          </label>
          <label>
            Πραγματικό άμεσο κόστος (προεπιλογή: της εκτίμησης, {props.estimateDirectCost} €){" "}
            <input className="input" inputMode="decimal" value={form.directCost} onChange={(e) => onChange({ directCost: e.target.value })} />
          </label>
          <p className="note">
            Οι ώρες γράφονται όποτε θες, όχι μόνο μετά την παράδοση. Μισές ώρες
            (γύρισμα χωρίς επιβεβαίωση ή χωρίς μοντάζ) μετράνε ως «χωρίς
            πραγματικές ώρες».
          </p>
          <button className="button" type="submit" data-primary="true">
            Αποθήκευση ωρών
          </button>
        </form>
      )}
      {canManageCost && isInternal(production) && (
        <InternalEstimate value={props.internalEstimate} onChange={props.onInternalEstimate} />
      )}
    </section>
  );
}
