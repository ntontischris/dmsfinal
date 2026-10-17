import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";

import { CLIENT_ALL, CLIENT_APPLY, CLIENT_LABEL } from "../labels";
import { DEFAULT_PERIOD, type PeriodCode } from "../url";
import type { ClientRef } from "../view-schema";

interface ClientPickerProps {
  reportId: string;
  period: PeriodCode;
  clients: readonly ClientRef[];
  selected?: string;
}

// Φίλτρο Πελάτη με απλή φόρμα GET: το URL κρατά Αναφορά, Περίοδο και Πελάτη, χωρίς JavaScript.
export function ClientPicker({ reportId, period, clients, selected }: ClientPickerProps) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="report" value={reportId} />
      {period !== DEFAULT_PERIOD && <input type="hidden" name="period" value={period} />}
      <Field label={CLIENT_LABEL}>
        <Select name="client" defaultValue={selected ?? ""}>
          <option value="">{CLIENT_ALL}</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit">{CLIENT_APPLY}</Button>
    </form>
  );
}
