import { SpacesTeam } from "@/modules/access";
import { SpacesGdprRequests } from "@/modules/gdpr";
import { listClients } from "@/modules/sales";

export const metadata = { title: "Ομάδα" };

// N1 Ομάδα: οι Χρήστες ομάδας, οι προσκλήσεις, η πρόσκληση νέου Χρήστη, απενεργοποίηση. Για όποιον «Προσκαλεί και απενεργοποιεί Χρήστες ομάδας».
export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const [{ status }, clients] = await Promise.all([
    searchParams,
    listClients({ limit: 100 }),
  ]);
  return (
    <SpacesTeam
      status={typeof status === "string" ? status : undefined}
      gdprRequests={<SpacesGdprRequests />}
      clients={clients.ok ? clients.data.map(({ id, name }) => ({ id, name })) : []}
    />
  );
}
