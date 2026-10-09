import { ScreenHeader } from "@/components/shell/screen-header";
import { getViewer } from "@/modules/access";
import { MineList, filmingCaps, listMine } from "@/modules/filming";

import { LoadError, NoAccess } from "../filming-parts";

export const metadata = { title: "Τα Γυρίσματά μου" };

const EYEBROW = "E6 · Τα Γυρίσματά μου";

// E6: τα ανοιχτά Γυρίσματα όπου είσαι στο Συνεργείο. Επιβεβαιώνεις ή δηλώνεις «δεν μπορώ».
export default async function MinePage() {
  const viewer = await getViewer();
  const caps = filmingCaps(viewer);
  if (!caps.canView)
    return (
      <NoAccess
        viewer={viewer}
        eyebrow={EYEBROW}
        message="Τα Γυρίσματά σου τα βλέπει όποιος «Βλέπει Γυρίσματα»."
      />
    );

  const entries = await listMine();
  if (!entries.ok) return <LoadError />;
  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title="Τα Γυρίσματά μου" />
      <MineList entries={entries.data} />
    </>
  );
}
