import { Field, Input } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import { saveMultipliers } from "../actions-settings";
import { formatMultiplier, formatPercent } from "../helpers";
import { minimumMargin } from "../cost";
import type { Multipliers } from "../types";

import { ActionForm } from "./action-form";

interface MultipliersCardProps {
  multipliers: Multipliers;
  canManage: boolean;
}

const FIELDS = [
  { key: "min", name: "min", label: "Ελάχιστη (×)" },
  { key: "target", name: "target", label: "Στόχος (×)" },
  { key: "max", name: "max", label: "Μέγιστη (×)" },
] as const;

// Το κόμμα είναι ο δεκαδικός του ελληνικού πληκτρολογίου, γι' αυτό τα πεδία είναι κειμένου.
const decimalText = (value: number): string => String(value).replace(".", ",");

function ReadOnlyValues({ multipliers }: { multipliers: Multipliers }) {
  return (
    <div className="grid gap-2 text-sm">
      <dl className="m-0 grid gap-2">
        {FIELDS.map((item) => (
          <div key={item.key} className="flex flex-wrap gap-x-3">
            <dt className="kit-label">{item.label}</dt>
            <dd className="m-0 tabular-nums">
              ×{formatMultiplier(multipliers[item.key])}
            </dd>
          </div>
        ))}
      </dl>
      <p className="m-0 text-muted-foreground">
        Αλλάζουν μόνο από όποιον «Διαχειρίζεται κόστος».
      </p>
    </div>
  );
}

// O6 · Εύρος τιμής: οι τρεις πολλαπλασιαστές. Το Ελάχιστο περιθώριο βγαίνει από τον μικρότερο (ADR 0017).
export function MultipliersCard({
  multipliers,
  canManage,
}: MultipliersCardProps) {
  return (
    <Panel label="Εύρος τιμής">
      <div className="grid gap-4">
        <p className="m-0 text-sm text-muted-foreground">
          Δίπλα στην τιμή ενός Πακέτου ή μιας Υπηρεσίας φαίνονται ελάχιστη,
          στόχος και μέγιστη τιμή = κόστος × πολλαπλασιαστής. Είναι οδηγός: την
          τιμή τη γράφεις πάντα εσύ.
        </p>
        {canManage ? (
          <ActionForm action={saveMultipliers} onlyWhenChanged submitLabel="Αποθήκευση">
            {FIELDS.map((item) => (
              <Field key={item.key} label={item.label}>
                <Input
                  name={item.name}
                  inputMode="decimal"
                  required
                  defaultValue={decimalText(multipliers[item.key])}
                />
              </Field>
            ))}
          </ActionForm>
        ) : (
          <ReadOnlyValues multipliers={multipliers} />
        )}
        <p className="m-0 text-sm">
          Ελάχιστο περιθώριο:{" "}
          <strong className="tabular-nums">
            {formatPercent(minimumMargin(multipliers.min))}
          </strong>
          . Βγαίνει από τον ελάχιστο πολλαπλασιαστή· δεν έχει δική του ρύθμιση.
        </p>
      </div>
    </Panel>
  );
}
