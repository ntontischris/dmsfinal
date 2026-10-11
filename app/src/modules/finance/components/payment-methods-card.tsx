import { Field, Input } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import { restoreMethod, retireMethod, saveMethod } from "../actions-methods";
import { METHODS_NOTE, METHODS_TITLE } from "../labels";
import type { PaymentMethod } from "../types";

import { ActionForm } from "./action-form";

interface PaymentMethodsCardProps {
  methods: readonly PaymentMethod[];
  canManage: boolean;
}

// Ρυθμίσεις › Οικονομικά: οι Τρόποι είσπραξης. Προσθήκη, μετονομασία, απόσυρση και επαναφορά· χωρίς διαγραφή.
export function PaymentMethodsCard({
  methods,
  canManage,
}: PaymentMethodsCardProps) {
  return (
    <Panel label={METHODS_TITLE}>
      <div className="grid gap-4">
        <p className="m-0 text-sm text-muted-foreground">{METHODS_NOTE}</p>
        <ul className="m-0 grid list-none gap-3 p-0">
          {methods.map((method) => (
            <MethodRow key={method.id} method={method} canManage={canManage} />
          ))}
        </ul>
        {canManage && (
          <ActionForm action={saveMethod} submitLabel="Προσθήκη τρόπου">
            <input type="hidden" name="id" value="" />
            <Field label="Νέος τρόπος">
              <Input name="label" maxLength={60} />
            </Field>
          </ActionForm>
        )}
      </div>
    </Panel>
  );
}

function MethodRow({
  method,
  canManage,
}: {
  method: PaymentMethod;
  canManage: boolean;
}) {
  return (
    <li className="grid gap-2 border-b border-border pb-3">
      {canManage && !method.retired ? (
        <ActionForm
          action={saveMethod}
          onlyWhenChanged
          submitLabel="Μετονομασία"
        >
          <input type="hidden" name="id" value={method.id} />
          <Field label="Ονομασία">
            <Input name="label" maxLength={60} defaultValue={method.label} />
          </Field>
        </ActionForm>
      ) : (
        <span className="font-medium">
          {method.label}
          {method.retired && (
            <span className="text-muted-foreground"> · αποσύρθηκε</span>
          )}
        </span>
      )}
      {canManage && (
        <ActionForm
          action={method.retired ? restoreMethod : retireMethod}
          submitLabel={method.retired ? "Επαναφορά" : "Απόσυρση"}
        >
          <input type="hidden" name="id" value={method.id} />
        </ActionForm>
      )}
    </li>
  );
}
