import Link from "next/link";

import { can, getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { rebuildMemory } from "../actions-memory";
import { getOpenUnansweredCount } from "../assistant-queries";
import { MANAGE_PATH, type ManageTab } from "../helpers";
import { MEMORY_NOTE } from "../labels";
import { getManageList } from "../queries";
import type { ItemStatus, ManageList } from "../view-schema";
import { KBox } from "./k-box";
import { SpacesForm } from "./k-form";
import { l1Filters, l1RowOf, manageHref, type L1Row } from "./l1-adapter";
import { NewItem } from "./l1-new-item";
import { SectionsTab } from "./l1-sections";

import "../../finance/spaces/money-lines.css";
import "./k.css";

const DENIED =
  "Τη Γνώση τη διαχειρίζεται όποιος έχει «Διαχειρίζεται Γνώση» (στους έτοιμους Ρόλους: Ιδιοκτήτης και Διαχείριση).";

function Tabs({ tab }: { tab: ManageTab }) {
  return (
    <nav className="page-filters" aria-label="Ενότητες οθόνης">
      <Link
        href={MANAGE_PATH}
        aria-current={tab === "items" ? "page" : undefined}
      >
        Στοιχεία
      </Link>
      <Link
        href={manageHref({ tab: "sections" })}
        aria-current={tab === "sections" ? "page" : undefined}
      >
        Ενότητες
      </Link>
    </nav>
  );
}

function Shortcuts({
  openUnanswered,
  canManageSettings,
}: {
  openUnanswered: number | null;
  canManageSettings: boolean;
}) {
  return (
    <div className="ml-quick k-shortcuts">
      <Link href={hrefOf("L3")}>
        Αναπάντητες ερωτήσεις
        {openUnanswered === null ? "" : ` (${openUnanswered} ανοιχτές)`}
      </Link>
      <Link href={hrefOf("L2")}>Συζητήσεις Βοηθού</Link>
      {canManageSettings ? (
        <Link href="/app/settings/company#assistant">
          Όρια του Βοηθού: στις Ρυθμίσεις → Εταιρεία → Βοηθός
        </Link>
      ) : (
        <span>Όρια του Βοηθού: στις Ρυθμίσεις → Εταιρεία → Βοηθός</span>
      )}
    </div>
  );
}

// Άδεια Γνώση: ανοίγει κατευθείαν η φόρμα «Νέα Ενότητα» από κάτω (τα στοιχεία θέλουν Ενότητα).
function EmptyKnowledge() {
  return (
    <p className="ml-empty" role="status">
      Η Γνώση είναι άδεια. Ξεκίνα με μια Ενότητα και ένα Άρθρο.
    </p>
  );
}

function ItemLine({ row }: { row: L1Row }) {
  return (
    <li className="ml-line">
      <span className="ml-thumb" aria-hidden="true">
        {row.letter}
      </span>
      <div className="ml-main">
        <Link className="k-link" href={row.href}>
          <strong>{row.title}</strong>
        </Link>
        <small>{row.facts}</small>
        <small>{row.updated}</small>
        {row.isImageOnly && (
          <small>Είναι εικόνα· ο Βοηθός διαβάζει μόνο την Περίληψη.</small>
        )}
      </div>
      <span className="ml-quick">
        <Badge tone={row.tone}>{row.status}</Badge>
      </span>
    </li>
  );
}

interface ItemsTabProps {
  list: ManageList;
  status: ItemStatus | null;
  sectionId: string | null;
}

// Η Ενότητα ως φίλτρο (στη διεύθυνση, όπως η κατάσταση).
function SectionFilter({ list, status, sectionId }: ItemsTabProps) {
  return (
    <form className="k-filters" method="get" action={MANAGE_PATH}>
      {status && <input type="hidden" name="status" value={status} />}
      <select
        className="input"
        name="section"
        aria-label="Ενότητα"
        defaultValue={sectionId ?? ""}
      >
        <option value="">Όλες οι Ενότητες</option>
        {list.sections.map((section) => (
          <option key={section.id} value={section.id}>
            {section.name}
          </option>
        ))}
      </select>
      <span className="ml-quick">
        <button type="submit">Φίλτρο</button>
      </span>
    </form>
  );
}

function ItemsTab({ list, status, sectionId }: ItemsTabProps) {
  return (
    <>
      <KBox title="Στοιχεία" hint={`${list.items.length} στοιχεία`} isOpen>
        <NewItem sections={list.sections} />
        <nav className="page-filters" aria-label="Κατάσταση στοιχείων">
          {l1Filters(status, sectionId).map((filter) => (
            <Link
              key={filter.label}
              href={filter.href}
              aria-current={filter.isCurrent ? "page" : undefined}
            >
              {filter.label}
            </Link>
          ))}
        </nav>
        <SectionFilter list={list} status={status} sectionId={sectionId} />
        {list.items.length === 0 ? (
          <p className="ml-empty">Κανένα στοιχείο σε αυτό το φίλτρο.</p>
        ) : (
          <ul className="ml-list">
            {list.items.map((item) => (
              <ItemLine key={item.id} row={l1RowOf(item)} />
            ))}
          </ul>
        )}
      </KBox>
      <KBox
        title="Μνήμη του Βοηθού"
        hint="Ξαναφτιάχνεται όταν αλλάξει πολύ η Γνώση"
      >
        <SpacesForm
          action={rebuildMemory}
          submitLabel="Ξαναφτιάξε τη μνήμη του Βοηθού"
          pendingLabel="Στην ουρά…"
          tone="plain"
        >
          <p className="k-note">{MEMORY_NOTE}</p>
        </SpacesForm>
      </KBox>
    </>
  );
}

interface SpacesKnowledgeManageProps {
  tab: ManageTab;
  status: ItemStatus | null;
  sectionId: string | null;
}

// L1 Διαχείριση Γνώσης στη νέα εμφάνιση (prototype `screens/L1.tsx`). Χωρίς «Διαχειρίζεται Γνώση» η βάση δίνει null.
export async function SpacesKnowledgeManage({
  tab,
  status,
  sectionId,
}: SpacesKnowledgeManageProps) {
  const viewer = await getViewer();
  const [result, openUnanswered] =
    viewer.status === "signed-in"
      ? await Promise.all([
          getManageList(status, sectionId),
          getOpenUnansweredCount(),
        ])
      : [null, null];
  if (result?.ok === false)
    return (
      <div data-spaces>
        <ErrorNotice what="η Διαχείριση Γνώσης" />
      </div>
    );
  const list = result?.data;
  if (!list)
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          {DENIED}
        </StateNotice>
      </div>
    );
  const isEmpty = list.counts.all === 0 && list.sections.length === 0;
  const showSections = tab === "sections" || list.sections.length === 0;
  return (
    <div data-spaces className="k">
      <div className="ml-head">
        <p>Ό,τι ξέρει η ομάδα και ο Βοηθός: Ενότητες, Άρθρα, Αρχεία.</p>
        <Shortcuts
          openUnanswered={openUnanswered}
          canManageSettings={can(viewer, "settings.manage")}
        />
      </div>
      <Tabs tab={showSections ? "sections" : "items"} />
      {isEmpty && <EmptyKnowledge />}
      <div className="ml-stack">
        {showSections ? (
          <SectionsTab sections={list.sections} isOpenAtStart={isEmpty} />
        ) : (
          <ItemsTab list={list} status={status} sectionId={sectionId} />
        )}
      </div>
    </div>
  );
}
