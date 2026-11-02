import Link from "next/link";

import { getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { CONTENT_RULE_NOTE, STATUS_LABEL } from "../labels";
import { getManageItem } from "../queries";
import {
  AudienceForm,
  ContentForm,
  DraftActions,
  PublishedActions,
} from "./l1-editor-forms";

import "./l1.css";

const DENIED =
  "Τη Γνώση τη διαχειρίζεται όποιος έχει «Διαχειρίζεται Γνώση» (στους έτοιμους Ρόλους: Ιδιοκτήτης και Διαχείριση).";

// Ο επεξεργαστής ενός στοιχείου στη νέα εμφάνιση (prototype `screens/l1-editor.tsx`). Το id έχει ελεγχθεί ως uuid στη
// σελίδα· null = άκυρο. Χωρίς Δικαίωμα ή ανύπαρκτο: ίδια άρνηση.
export async function SpacesKnowledgeEditor({ id }: { id: string | null }) {
  const viewer = await getViewer();
  const result =
    viewer.status === "signed-in" && id !== null
      ? await getManageItem(id)
      : null;
  const back = (
    <p>
      <Link href={hrefOf("L1")}>← Διαχείριση Γνώσης</Link>
    </p>
  );
  if (result?.ok === false)
    return (
      <div data-spaces>
        {back}
        <ErrorNotice what="το στοιχείο της Γνώσης" />
      </div>
    );
  const item = result?.data?.item;
  if (!result?.data || !item)
    return (
      <div data-spaces>
        {back}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          {DENIED}
        </StateNotice>
      </div>
    );
  const isDraft = item.status === "draft";
  return (
    <div data-spaces>
      {back}
      <section className="card">
        <div className="card-title">
          <h2>{item.title}</h2>
          <Badge tone={isDraft ? "attention" : "strong"}>
            {STATUS_LABEL[item.status]}
          </Badge>
        </div>
        <p className="note">{CONTENT_RULE_NOTE}</p>
        <ContentForm item={item} options={result.data} />
        <AudienceForm item={item} roles={result.data.roles} />
        {isDraft ? (
          <DraftActions item={item} />
        ) : (
          <PublishedActions item={item} />
        )}
      </section>
    </div>
  );
}
