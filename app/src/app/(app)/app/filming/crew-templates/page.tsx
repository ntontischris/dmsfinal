import { ScreenHeader } from "@/components/shell/screen-header";
import { getViewer } from "@/modules/access";
import {
  CrewTemplateList,
  filmingCaps,
  listCrewCandidates,
  listCrewTemplates,
} from "@/modules/filming";

import { LoadError, NoAccess } from "../filming-parts";

export const metadata = { title: "Πρότυπα Συνεργείου" };

const EYEBROW = "E7 · Πρότυπα Συνεργείου";

// E7: τα Πρότυπα Συνεργείου. Τα βλέπει και τα αλλάζει όποιος «Διαχειρίζεται Συνεργείο».
export default async function CrewTemplatesPage() {
  const viewer = await getViewer();
  const caps = filmingCaps(viewer);
  if (!caps.canCrew)
    return (
      <NoAccess
        viewer={viewer}
        eyebrow={EYEBROW}
        message="Τα Πρότυπα Συνεργείου τα βλέπει όποιος «Διαχειρίζεται Συνεργείο»."
      />
    );

  const [templates, candidates] = await Promise.all([listCrewTemplates(), listCrewCandidates()]);
  if (!templates.ok || !candidates.ok) return <LoadError />;
  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title="Πρότυπα Συνεργείου" />
      <CrewTemplateList templates={templates.data} candidates={candidates.data} />
    </>
  );
}
