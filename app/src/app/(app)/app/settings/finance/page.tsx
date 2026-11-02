import { lookOf } from "@/components/shell/read-look";
import { ScreenHeader } from "@/components/shell/screen-header";
import { AccessNotice, getViewer } from "@/modules/access";
import { catalogueCaps } from "@/modules/catalogue";
import { SpacesFinanceSettings } from "@/modules/costs";
import { financeCaps } from "@/modules/finance";
import { SettingsTabs } from "@/modules/settings";

import { FinanceSettingsContent } from "./finance-settings-parts";

export const metadata = { title: "Ρυθμίσεις · Οικονομικά" };

// O6 Ρυθμίσεις › Οικονομικά (το μέρος του κόστους). Τη βλέπει όποιος «Βλέπει κόστος και κερδοφορία»·
// αλλάζει μόνο όποιος «Διαχειρίζεται κόστος». Στη νέα εμφάνιση (Χώροι) η οθόνη του prototype· αλλιώς η σημερινή.
export default async function FinanceSettingsPage() {
  const viewer = await getViewer();
  if ((await lookOf(viewer)) === "spaces") return <SpacesFinanceSettings />;
  const caps = catalogueCaps(viewer);
  const header = <ScreenHeader eyebrow="O6 · Ρυθμίσεις" title="Ρυθμίσεις" />;
  if (!caps.canSeeCost)
    return (
      <>
        {header}
        <AccessNotice viewer={viewer}>
          <p className="m-0">
            Τα στοιχεία κόστους τα βλέπει όποιος «Βλέπει κόστος και
            κερδοφορία».
          </p>
        </AccessNotice>
      </>
    );

  return (
    <>
      {header}
      <div className="grid gap-4">
        <SettingsTabs current="finance" />
        <FinanceSettingsContent
          canManage={caps.canManageCost}
          canManageMethods={financeCaps(viewer).canManageMethods}
        />
      </div>
    </>
  );
}
