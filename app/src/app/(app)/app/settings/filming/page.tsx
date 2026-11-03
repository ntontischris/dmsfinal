import { lookOf } from "@/components/shell/read-look";
import { ScreenHeader } from "@/components/shell/screen-header";
import { AccessNotice, getViewer } from "@/modules/access";
import {
  BookingExceptions,
  BookingHolidays,
  BookingHoursForm,
  FilmingRulesForm,
  filmingCaps,
  getBookingHours,
  getFilmingSettings,
  SpacesFilmingSettings,
} from "@/modules/filming";
import { SpacesBlockedKinds } from "@/modules/calendar";
import { SettingsTabs } from "@/modules/settings";
import { GoogleRulesForm, SpacesGoogleRules, getGoogleView } from "@/modules/google";

import { Notice } from "@/components/ui/notice";

export const metadata = { title: "Ρυθμίσεις · Γυρίσματα" };

// Ρυθμίσεις › Γυρίσματα: οι Κανόνες του Γ7. Τη σελίδα τη βλέπει μόνο όποιος «Διαχειρίζεται Ρυθμίσεις».
export default async function FilmingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ part?: string }>;
}) {
  const viewer = await getViewer();
  // Στη νέα εμφάνιση (Χώροι) η οθόνη του prototype· αλλιώς η σημερινή.
  if ((await lookOf(viewer)) === "spaces")
    return (
      <SpacesFilmingSettings
        part={(await searchParams).part}
        google={<SpacesGoogleRules />}
        calendar={<SpacesBlockedKinds />}
      />
    );
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

  const [settings, hours, google] = await Promise.all([getFilmingSettings(), getBookingHours(), getGoogleView()]);
  if (!settings.ok || !hours.ok)
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
        <BookingHoursForm view={hours.data} />
        <BookingExceptions exceptions={hours.data.exceptions} />
        <BookingHolidays holidays={hours.data.holidays} />
        {google.ok && <GoogleRulesForm rules={google.data.rules} />}
      </div>
    </>
  );
}
