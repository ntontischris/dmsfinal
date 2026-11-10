import { SpacesTeamUser, getViewer } from "@/modules/access";
import { SpacesHistoryLink } from "@/modules/audit";
import { SpacesGdprAnonymize, SpacesGdprUserSection } from "@/modules/gdpr";

export const metadata = { title: "Χρήστης ομάδας" };

// N1 Χρήστης ομάδας: ταυτότητα, Ρόλοι (χωρίς κλιμάκωση), απενεργοποίηση.
export default async function TeamUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ confirm?: string }>;
}) {
  const [{ userId }, { confirm }, viewer] = await Promise.all([
    params,
    searchParams,
    getViewer(),
  ]);
  const userHref = `/app/team/${encodeURIComponent(userId)}`;
  return (
    <SpacesTeamUser
      userId={userId}
      confirm={typeof confirm === "string" ? confirm : undefined}
      gdprSection={
        <SpacesGdprUserSection
          userId={userId}
          anonymizeHref={`${userHref}?confirm=anonymize`}
        />
      }
      gdprConfirm={<SpacesGdprAnonymize userId={userId} backHref={userHref} />}
      history={
        <SpacesHistoryLink viewer={viewer} entity="team_users" id={userId} />
      }
    />
  );
}
