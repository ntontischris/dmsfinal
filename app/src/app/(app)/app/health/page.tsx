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
  getHealth,
  monitorUrl,
} from "@/modules/health";

export const metadata = { title: HEALTH_TITLE };

// P2 Υγεία συστήματος (#215): για όποιον «Βλέπει Υγεία συστήματος». Η βάση το ξανακρίνει σε κάθε κλήση.
export default async function HealthPage() {
  const viewer = await getViewer();
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
