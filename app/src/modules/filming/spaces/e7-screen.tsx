import { getViewer } from "@/modules/access";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { filmingCaps } from "../caps";
import { listCrewCandidates, listCrewTemplates } from "../queries";
import { E7Templates } from "./e7-templates";

import "./e.css";

// E7 Πρότυπα συνεργείου στη νέα εμφάνιση (prototype `screens/E7.tsx`). Όποιος «Διαχειρίζεται Συνεργείο».
export async function SpacesCrewTemplates() {
  const caps = filmingCaps(await getViewer());
  if (!caps.canCrew)
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>Πρότυπα συνεργείου φτιάχνει όποιος διαχειρίζεται Συνεργείο.</p>
        </StateNotice>
      </div>
    );
  const [templates, people] = await Promise.all([
    listCrewTemplates(),
    listCrewCandidates(),
  ]);
  return (
    <div data-spaces>
      <div className="e">
        {templates.ok && people.ok ? (
          <E7Templates templates={templates.data} people={people.data} />
        ) : (
          <ErrorNotice what="τα Πρότυπα συνεργείου" />
        )}
      </div>
    </div>
  );
}
