import { lookOf } from "@/components/shell/read-look";
import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, can, getViewer, isOwner } from "@/modules/access";
import {
  HEALTH_EYEBROW,
  HEALTH_LOAD_ERROR_TEXT,
  HEALTH_LOAD_ERROR_TITLE,
  HEALTH_NO_ACCESS,
  HEALTH_TITLE,
  HealthScreen,
  SpacesHealth,
  getHealth,
  monitorUrl,
} from "@/modules/health";

export const metadata = { title: HEALTH_TITLE };

// P2 Υγεία συστήματος (#215): για όποιον «Βλέπει Υγεία συστήματος». Η βάση το ξανακρίνει σε κάθε κλήση.
// Στη νέα εμφάνιση (Χώροι) η οθόνη του prototype· αλλιώς η σημερινή.
export default async function HealthPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const viewer = await getViewer();
  if ((await lookOf(viewer)) === "spaces") {
    const { view } = await searchParams;
    return (
      <SpacesHealth
        canView={can(viewer, "health.view")}
        isOwner={isOwner(viewer)}
        monitorUrl={monitorUrl()}
        view={typeof view === "string" ? view : undefined}
      />
    );
  }
  const header = <ScreenHeader eyebrow={HEALTH_EYEBROW} title={HEALTH_TITLE} />;
  if (!can(viewer, "health.view"))
    return (
      <>
        {header}
        <AccessNotice viewer={viewer}>
          <p className="m-0">{HEALTH_NO_ACCESS}</p>
        </AccessNotice>
      </>
    );

  const health = await getHealth();
  return (
    <>
      {header}
      {health.ok ? (
        <HealthScreen
          view={health.data}
          monitorUrl={monitorUrl()}
          isOwner={isOwner(viewer)}
        />
      ) : (
        <Notice kind="error" title={HEALTH_LOAD_ERROR_TITLE}>
          <p className="m-0">{HEALTH_LOAD_ERROR_TEXT}</p>
        </Notice>
      )}
    </>
  );
}
