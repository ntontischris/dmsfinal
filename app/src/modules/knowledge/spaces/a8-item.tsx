import Link from "next/link";

import { can, getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { Panel } from "@/spaces/kit/panel";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { MarkdownBody } from "../components/markdown";
import { fileHref } from "../helpers";
import { KIND_LABEL } from "../labels";
import { getItem } from "../queries";
import { formatSize } from "../upload-rules";
import type { ItemView } from "../view-schema";
import { athensDate } from "./a8-adapter";

import "./a8.css";

function ItemContent({
  item,
  canManage,
}: {
  item: ItemView;
  canManage: boolean;
}) {
  if (item.kind === "article")
    return (
      <div className="a8-body" data-tw>
        <MarkdownBody source={item.body ?? ""} />
      </div>
    );
  if (!item.file) return null;
  return (
    <>
      <dl className="dl">
        <dt>Αρχείο</dt>
        <dd>{item.file.name}</dd>
        <dt>Μέγεθος</dt>
        <dd>{formatSize(item.file.size)}</dd>
      </dl>
      <a className="button" href={fileHref(item.id)}>
        Λήψη
      </a>
      {canManage && item.textStatus === "image_only" && (
        <p className="note">
          Ο Βοηθός διαβάζει μόνο την Περίληψη αυτού του Αρχείου (είναι εικόνα).
        </p>
      )}
    </>
  );
}

// Ένα στοιχείο της Γνώσης στη νέα εμφάνιση (prototype `A8.tsx` › ItemView). Ανύπαρκτο, πρόχειρο ή εκτός Κοινού φαίνονται
// ίδια (η βάση δεν τα ξεχωρίζει). Το id έχει ελεγχθεί ως uuid στη σελίδα· null = άκυρο.
export async function SpacesKnowledgeItem({ id }: { id: string | null }) {
  const viewer = await getViewer();
  const result =
    viewer.status === "signed-in" && id !== null ? await getItem(id) : null;
  const back = (
    <p>
      <Link href={hrefOf("A8")}>← Γνώση</Link>
    </p>
  );
  if (result?.ok === false)
    return (
      <div data-spaces>
        {back}
        <ErrorNotice what="το στοιχείο της Γνώσης" />
      </div>
    );
  const item = result?.data;
  if (!item)
    return (
      <div data-spaces>
        {back}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Αυτό το στοιχείο δεν ανήκει στο Κοινό σου.
        </StateNotice>
      </div>
    );
  return (
    <div data-spaces>
      {back}
      <Panel label={item.title} aside={<Badge>{KIND_LABEL[item.kind]}</Badge>}>
        <div className="a8-meta">
          Ενότητα: {item.sectionName} · Ενημερώθηκε {athensDate(item.updatedAt)}
        </div>
        <p className="muted">Περίληψη: {item.summary}</p>
        <ItemContent item={item} canManage={can(viewer, "knowledge.manage")} />
      </Panel>
    </div>
  );
}
