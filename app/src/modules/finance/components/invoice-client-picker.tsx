import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";

import type { ClientOption } from "../types";

interface InvoiceClientPickerProps {
  clients: readonly ClientOption[];
  selected: string;
}

// Επιλογή Πελάτη με απλή φόρμα GET (?client=): το URL κρατά τον Πελάτη, χωρίς JavaScript.
export function InvoiceClientPicker({ clients, selected }: InvoiceClientPickerProps) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-2">
      <Field label="Πελάτης">
        <Select name="client" defaultValue={selected}>
          <option value="">Διάλεξε Πελάτη</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit">Αλλαγή</Button>
    </form>
  );
}
