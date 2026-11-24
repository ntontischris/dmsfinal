import Link from "next/link";

import { can, getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { fileHref } from "../helpers";
import { KIND_LABEL } from "../labels";
import { getItem } from "../queries";
import { formatSize } from "../upload-rules";
import type { ItemView } from "../view-schema";
import { athensDate, kindLetter } from "./a8-adapter";
import { ArticleBody } from "./a8-markdown";

import "../../finance/spaces/money-lines.css";
import "./a8.css";
import "./k.css";

function ItemContent({
  item,
  canManage,
}: {
  item: ItemView;
  canManage: boolean;
}) {
  if (item.kind === "article")
    return (
      <section className="ml-page">
        <ArticleBody source={item.body ?? ""} />
      </section>
    );
  if (!item.file) return null;
  return (
    <section className="ml-page">
      <dl className="ml-kv">
        <dt>Αρχείο</dt>
        <dd>{item.file.name}</dd>
        <dt>Μέγεθος</dt>
        <dd>{formatSize(item.file.size)}</dd>
      </dl>
      {canManage && item.textStatus === "image_only" && (
        <p className="k-note">
          Ο Βοηθός διαβάζει μόνο την Περίληψη αυτού του Αρχείου (είναι εικόνα).
        </p>
      )}
    </section>
  );
}

// Η κεφαλή του στοιχείου: ο τίτλος του είναι το h1 της σελίδας (όχι «Γνώση»)· το κέλυφος δείχνει «← Γνώση» για επιστροφή.
function Hero({ item }: { item: ItemView }) {
  return (
    <header className="ml-hero">
      <span className="ml-hero-mono" aria-hidden="true">
        {kindLetter(item.kind)}
      </span>
      <div>
        <Badge>{KIND_LABEL[item.kind]}</Badge>
        <h1 data-page-title>{item.title}</h1>
        <p>
          Ενότητα: {item.sectionName} · Ενημερώθηκε {athensDate(item.updatedAt)}
        </p>
        <p>Περίληψη: {item.summary}</p>
      </div>
      {item.kind === "file" && item.file && (
        <div className="ml-quick">
          <a href={fileHref(item.id)} data-primary>
            Λήψη
          </a>
        </div>
      )}
    </header>
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
    <div data-spaces className="k">
      <div className="ml-stack">
        <Hero item={item} />
        <ItemContent item={item} canManage={can(viewer, "knowledge.manage")} />
      </div>
    </div>
  );
}
