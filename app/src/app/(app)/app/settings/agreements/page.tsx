import { ScreenHeader } from "@/components/shell/screen-header";
import { AccessNotice, getViewer } from "@/modules/access";
import { agreementCaps } from "@/modules/agreements";
import { SettingsTabs } from "@/modules/settings";

import { AgreementsSettingsContent } from "./agreements-settings-parts";

export const metadata = { title: "Ρυθμίσεις · Συμφωνίες" };

// O3 Ρυθμίσεις › Συμφωνίες. Τη σελίδα τη βλέπει μόνο όποιος «Διαχειρίζεται Ρυθμίσεις».
export default async function AgreementsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ retired?: string; set?: string }>;
}) {
  const viewer = await getViewer();
  const header = <ScreenHeader eyebrow="O3 · Ρυθμίσεις" title="Ρυθμίσεις" />;
  if (!agreementCaps(viewer).canManageSettings)
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

  const { retired, set } = await searchParams;
  return (
    <>
      {header}
      <div className="grid gap-4">
        <SettingsTabs current="agreements" />
        <AgreementsSettingsContent
          showRetired={retired === "1"}
          set={set === "one_off" ? "one_off" : "monthly"}
        />
      </div>
    </>
  );
}
