import { can, getViewer, isOwner } from "@/modules/access";
import { HEALTH_TITLE, SpacesHealth, monitorUrl } from "@/modules/health";

export const metadata = { title: HEALTH_TITLE };

// P2 Υγεία συστήματος (#215): για όποιον «Βλέπει Υγεία συστήματος». Η βάση το ξανακρίνει σε κάθε κλήση.
export default async function HealthPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const [viewer, { view }] = await Promise.all([getViewer(), searchParams]);
  return (
    <SpacesHealth
      canView={can(viewer, "health.view")}
      isOwner={isOwner(viewer)}
      monitorUrl={monitorUrl()}
      view={typeof view === "string" ? view : undefined}
    />
  );
}
