import { SpacesInvite } from "@/modules/access";
import { getClientCard, listClients } from "@/modules/sales";

export const metadata = { title: "Πρόσκληση" };

interface ClientChoice {
  id: string;
  name: string;
}

// Οι Πελάτες της φόρμας (το RPC κρίνει το Εύρος), μαζί με τον Πελάτη του ?client= και όταν δεν είναι στους πρώτους 100.
async function clientChoices(clientId: string | undefined): Promise<ClientChoice[]> {
  const [list, preset] = await Promise.all([
    listClients({ limit: 100 }),
    clientId ? getClientCard(clientId) : null,
  ]);
  const clients = list.ok ? list.data.map(({ id, name }) => ({ id, name })) : [];
  const extra = preset?.ok && preset.data ? preset.data : null;
  return extra && !clients.some((client) => client.id === extra.id)
    ? [{ id: extra.id, name: extra.name }, ...clients]
    : clients;
}

// N6 Πρόσκληση: άνθρωπος της ομάδας ή Πελάτη, από το «+ Νέο». ?kind=client&client=<id> την ανοίγει έτοιμη.
export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; client?: string }>;
}) {
  const { kind, client } = await searchParams;
  const clientId = typeof client === "string" ? client : undefined;
  return (
    <SpacesInvite
      kind={typeof kind === "string" ? kind : undefined}
      clientId={clientId}
      clients={await clientChoices(clientId)}
    />
  );
}
