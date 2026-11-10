import { SpacesTeam } from "@/modules/access";
import { SpacesGdprRequests } from "@/modules/gdpr";

export const metadata = { title: "Ομάδα" };

// N1 Ομάδα: οι Χρήστες ομάδας, οι προσκλήσεις, η πρόσκληση νέου Χρήστη, απενεργοποίηση. Για όποιον «Προσκαλεί και απενεργοποιεί Χρήστες ομάδας».
export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  return (
    <SpacesTeam
      status={typeof status === "string" ? status : undefined}
      gdprRequests={<SpacesGdprRequests />}
    />
  );
}
