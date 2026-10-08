import { ScreenHeader } from "@/components/shell/screen-header";
import { AccessNotice, getViewer } from "@/modules/access";
import { salesCaps } from "@/modules/sales";
import { SettingsTabs } from "@/modules/settings";

import { SalesSettingsContent } from "./sales-settings-parts";

export const metadata = { title: "Ρυθμίσεις · Πωλήσεις" };

// O2 Ρυθμίσεις › Πωλήσεις. Τη σελίδα τη βλέπει μόνο όποιος «Διαχειρίζεται Ρυθμίσεις».
export default async function SalesSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ retired?: string }>;
}) {
  const viewer = await getViewer();
  const header = <ScreenHeader eyebrow="O2 · Ρυθμίσεις" title="Ρυθμίσεις" />;
  if (!salesCaps(viewer).canManageSettings)
    return (
      <>
        {header}
        <AccessNotice viewer={viewer}>
          <p className="m-0">
            Τις Ρυθμίσεις τις βλέπει όποιος «Διαχειρίζεται Ρυθμίσεις».
          </p>
        </AccessNotice>
      </>
    );

  const { retired } = await searchParams;
  return (
    <>
      {header}
      <div className="grid gap-4">
        <SettingsTabs current="sales" />
        <SalesSettingsContent showRetired={retired === "1"} />
      </div>
    </>
  );
}
