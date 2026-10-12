import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, can, getViewer } from "@/modules/access";
import {
  AutomationsCatalog,
  AutomationsSubnav,
  K1_EYEBROW,
  K1_NOTE,
  LOAD_FAILED_TEXT,
  LOAD_FAILED_TITLE,
  NO_MANAGE_TEXT,
  SETTINGS_TITLE,
  getCatalog,
  parseCatalogFilter,
} from "@/modules/notifications";
import { SettingsTabs } from "@/modules/settings";

export const metadata = { title: "Ρυθμίσεις · Αυτοματισμοί" };

interface AutomationsPageProps {
  searchParams: Promise<{ group?: string; only?: string }>;
}

// K1 Αυτοματισμοί (#173): ο κατάλογος των Γεγονότων ανά ομάδα. Μόνο όποιος «Διαχειρίζεται Αυτοματισμούς».
export default async function AutomationsPage({
  searchParams,
}: AutomationsPageProps) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  const header = <ScreenHeader eyebrow={K1_EYEBROW} title={SETTINGS_TITLE} />;
  if (!can(viewer, "automations.manage"))
    return (
      <>
        {header}
        <AccessNotice viewer={viewer}>
          <p className="m-0">{NO_MANAGE_TEXT}</p>
        </AccessNotice>
      </>
    );

  const catalog = await getCatalog();
  return (
    <>
      {header}
      <div className="grid gap-4">
        <SettingsTabs current="automations" />
        <AutomationsSubnav current="automations" />
        {catalog.ok && catalog.data ? (
          <AutomationsCatalog
            catalog={catalog.data}
            filter={parseCatalogFilter(params)}
          />
        ) : (
          <Notice kind="error" title={LOAD_FAILED_TITLE}>
            <p className="m-0">{LOAD_FAILED_TEXT}</p>
          </Notice>
        )}
        <p className="m-0 text-sm text-muted-foreground">{K1_NOTE}</p>
      </div>
    </>
  );
}
