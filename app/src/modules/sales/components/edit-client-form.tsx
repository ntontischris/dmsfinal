"use client";

import { updateClient } from "../actions-clients";
import type { ClientDetail } from "../types";

import { ActionForm } from "./action-form";
import { NewClientFields } from "./new-client-fields";

// Τα στοιχεία του Πελάτη. Το ΑΦΜ και το email ελέγχονται στη βάση (μοναδικά ανάμεσα στους ενεργούς Πελάτες).
export function EditClientForm({ client }: { client: ClientDetail }) {
  return (
    <ActionForm action={updateClient} onlyWhenChanged submitLabel="Αποθήκευση">
      <input type="hidden" name="clientId" value={client.id} />
      <NewClientFields
        defaults={{
          name: client.name,
          legalName: client.legalName,
          city: client.city,
          afm: client.afm ?? "",
          contactName: client.contactName,
          contactEmail: client.contactEmail,
          contactPhone: client.contactPhone,
        }}
      />
    </ActionForm>
  );
}
