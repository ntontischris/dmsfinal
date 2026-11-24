import { getViewer } from "@/modules/access";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { publishBlockers } from "../helpers";
import { CONTENT_RULE_NOTE, KIND_LABEL, STATUS_LABEL } from "../labels";
import { getManageItem } from "../queries";
import type { EditableItem } from "../view-schema";
import {
  AudienceForm,
  ContentForm,
  PublishDetails,
  PublishQuick,
} from "./l1-editor-forms";
import { kindLetter } from "./a8-adapter";
import { KBox } from "./k-box";

import "../../finance/spaces/money-lines.css";
import "./k.css";

const DENIED =
  "Τη Γνώση τη διαχειρίζεται όποιος έχει «Διαχειρίζεται Γνώση» (στους έτοιμους Ρόλους: Ιδιοκτήτης και Διαχείριση).";

// Το hint του κουτιού «Δημοσίευση»: τι λείπει ή «Έτοιμο».
const publishHint = (item: EditableItem): string => {
  if (item.status !== "draft") return "Δημοσιευμένο";
  const missing = publishBlockers({ ...item, hasFile: item.file !== null });
  return missing.length > 0 ? `Λείπουν ${missing.length}` : "Έτοιμο";
};

const audienceHint = ({
  roles,
  isPublic,
}: {
  roles: readonly { name: string }[];
  isPublic: boolean;
}): string => {
  const names = roles.map((role) => role.name);
  if (isPublic) names.push("δημόσιο");
  return names.length === 0 ? "Κανείς ακόμα" : names.join(", ");
};

// Ο επεξεργαστής ενός στοιχείου στη νέα εμφάνιση (prototype `screens/l1-editor.tsx`). Το id έχει ελεγχθεί ως uuid στη
// σελίδα· null = άκυρο. Χωρίς Δικαίωμα ή ανύπαρκτο: ίδια άρνηση.
export async function SpacesKnowledgeEditor({ id }: { id: string | null }) {
  const viewer = await getViewer();
  const result =
    viewer.status === "signed-in" && id !== null
      ? await getManageItem(id)
      : null;
  if (result?.ok === false)
    return (
      <div data-spaces className="k">
        <ErrorNotice what="το στοιχείο της Γνώσης" />
      </div>
    );
  const item = result?.data?.item;
  if (!result?.data || !item)
    return (
      <div data-spaces className="k">
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          {DENIED}
        </StateNotice>
      </div>
    );
  const isDraft = item.status === "draft";
  return (
    <div data-spaces className="k">
      <section>
        <header className="ml-hero">
          <span className="ml-hero-mono" aria-hidden="true">
            {kindLetter(item.kind)}
          </span>
          <div>
            <Badge tone={isDraft ? "attention" : "strong"}>
              {STATUS_LABEL[item.status]}
            </Badge>
            <h1 data-page-title>{item.title}</h1>
            <p>
              {KIND_LABEL[item.kind]} · {CONTENT_RULE_NOTE}
            </p>
          </div>
          <div className="k-hero-forms">
            <PublishQuick item={item} />
          </div>
        </header>
      </section>
      <div className="ml-stack">
        <KBox
          title="Περιεχόμενο"
          hint="Ενότητα, Τίτλος, Περίληψη, κείμενο"
          isOpen
        >
          <ContentForm item={item} options={result.data} />
        </KBox>
        <KBox title="Δημοσίευση" hint={publishHint(item)}>
          <PublishDetails item={item} />
        </KBox>
        <KBox title="Κοινό" hint={audienceHint(item.audience)}>
          <AudienceForm item={item} roles={result.data.roles} />
        </KBox>
      </div>
    </div>
  );
}
