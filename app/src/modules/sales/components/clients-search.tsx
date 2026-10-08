import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

// Η αναζήτηση ζει στη διεύθυνση (?q=): GET φόρμα, χωρίς JavaScript.
export function ClientsSearch({ query }: { query: string }) {
  return (
    <form
      method="get"
      action="/app/clients"
      className="flex flex-wrap items-end gap-2"
    >
      <Field label="Αναζήτηση πελάτη">
        <Input
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Αναζήτηση πελάτη…"
          autoComplete="off"
        />
      </Field>
      <Button type="submit">Αναζήτηση</Button>
    </form>
  );
}
