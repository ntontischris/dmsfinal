import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, can, getViewer, isOwner } from "@/modules/access";
import {
  ReadinessList,
  SettingsTabs,
  getOpenedAt,
  getReadiness,
} from "@/modules/settings";

export const metadata = { title: "Ρυθμίσεις · Έλεγχος ετοιμότητας" };

// O7 Έλεγχος ετοιμότητας: τι λείπει πριν το σύστημα ανοίξει σε πελάτες.
export default async function ReadinessPage() {
  const viewer = await getViewer();
  const header = (
    <ScreenHeader eyebrow="O7 · Ρυθμίσεις" title="Έλεγχος ετοιμότητας" />
  );
  if (!can(viewer, "settings.manage"))
    return (
      <>
        {header}
        <AccessNotice viewer={viewer}>
          <p className="m-0">
            Τον Έλεγχο ετοιμότητας τον βλέπει όποιος «Διαχειρίζεται Ρυθμίσεις».
          </p>
        </AccessNotice>
      </>
    );

  const [rows, openedAt] = await Promise.all([getReadiness(), getOpenedAt()]);
  return (
    <>
      {header}
      <div className="grid gap-4">
        <SettingsTabs current="readiness" />
        {rows.ok && openedAt.ok ? (
          <ReadinessList
            rows={rows.data}
            isOwner={isOwner(viewer)}
            openedAt={openedAt.data}
          />
        ) : (
          <Notice kind="error" title="Δεν φόρτωσε ο Έλεγχος ετοιμότητας">
            <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
          </Notice>
        )}
      </div>
    </>
  );
}
