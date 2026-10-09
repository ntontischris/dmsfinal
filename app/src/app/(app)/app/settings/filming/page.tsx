import { ScreenHeader } from "@/components/shell/screen-header";
import { AccessNotice, getViewer } from "@/modules/access";
import {
  FilmingRulesForm,
  filmingCaps,
  getFilmingSettings,
} from "@/modules/filming";
import { SettingsTabs } from "@/modules/settings";

import { Notice } from "@/components/ui/notice";

export const metadata = { title: "Ρυθμίσεις · Γυρίσματα" };

// Ρυθμίσεις › Γυρίσματα: οι Κανόνες του Γ7. Τη σελίδα τη βλέπει μόνο όποιος «Διαχειρίζεται Ρυθμίσεις».
export default async function FilmingSettingsPage() {
  const viewer = await getViewer();
  const header = <ScreenHeader eyebrow="Ρυθμίσεις" title="Ρυθμίσεις" />;
  if (!filmingCaps(viewer).canManageSettings)
    return (
      <>
        {header}
        <AccessNotice viewer={viewer}>
          <p className="m-0">Τις Ρυθμίσεις τις βλέπει όποιος «Διαχειρίζεται Ρυθμίσεις».</p>
        </AccessNotice>
      </>
    );

  const settings = await getFilmingSettings();
  if (!settings.ok)
    return (
      <Notice kind="error" title="Δεν φόρτωσαν οι Κανόνες">
        <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
      </Notice>
    );
  return (
    <>
      {header}
      <div className="grid gap-4">
        <SettingsTabs current="filming" />
        <FilmingRulesForm settings={settings.data} />
      </div>
    </>
  );
}
