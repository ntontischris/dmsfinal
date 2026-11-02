import Link from "next/link";

import { can, getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { rebuildMemory } from "../actions-memory";
import { getOpenUnansweredCount } from "../assistant-queries";
import { MANAGE_PATH, type ManageTab } from "../helpers";
import { MEMORY_NOTE } from "../labels";
import { getManageList } from "../queries";
import type { ItemStatus, ManageList } from "../view-schema";
import { SpacesForm } from "./k-form";
import { l1Filters, l1RowOf, manageHref, type L1Row } from "./l1-adapter";
import { NewItem } from "./l1-new-item";
import { SectionsTab } from "./l1-sections";

import "./l1.css";

const DENIED =
  "Τη Γνώση τη διαχειρίζεται όποιος έχει «Διαχειρίζεται Γνώση» (στους έτοιμους Ρόλους: Ιδιοκτήτης και Διαχείριση).";

function Tabs({ tab }: { tab: ManageTab }) {
  return (
    <nav className="tabs" aria-label="Ενότητες οθόνης">
      <Link
        className="tab"
        href={MANAGE_PATH}
        aria-current={tab === "items" ? "page" : undefined}
      >
        Στοιχεία
      </Link>
      <Link
        className="tab"
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
    <div className="l1-links">
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
        <span className="muted">
          Όρια του Βοηθού: στις Ρυθμίσεις → Εταιρεία → Βοηθός
        </span>
      )}
    </div>
  );
}

// Άδεια Γνώση: ανοίγει κατευθείαν η φόρμα «Νέα Ενότητα» από κάτω (τα στοιχεία θέλουν Ενότητα).
function EmptyKnowledge() {
  return (
    <StateNotice
      kind="empty"
      title="Η Γνώση είναι άδεια. Ξεκίνα με μια Ενότητα και ένα Άρθρο."
    />
  );
}

function ItemCard({ row }: { row: L1Row }) {
  return (
    <ListRow
      lead={
        <span className="l1-kind" aria-hidden="true">
          {row.letter}
        </span>
      }
      href={row.href}
      title={row.title}
      sub={
        <>
          <span className="part-sub">{row.facts}</span>
          <span className="part-sub">{row.updated}</span>
          {row.isImageOnly && (
            <span className="part-sub">
              Είναι εικόνα· ο Βοηθός διαβάζει μόνο την Περίληψη.
            </span>
          )}
        </>
      }
      aside={<Badge tone={row.tone}>{row.status}</Badge>}
    />
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
    <form className="toolbar" method="get" action={MANAGE_PATH}>
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
      <button className="button" type="submit">
        Φίλτρο
      </button>
    </form>
  );
}

function ItemsTab({ list, status, sectionId }: ItemsTabProps) {
  return (
    <>
      <Panel label="Στοιχεία" aside={list.items.length} isFlush>
        <NewItem sections={list.sections} />
        <div className="l1-pad">
          <div className="l1-filters">
            {l1Filters(status, sectionId).map((filter) => (
              <Link
                key={filter.label}
                href={filter.href}
                aria-current={filter.isCurrent}
              >
                {filter.label}
              </Link>
            ))}
          </div>
          <SectionFilter list={list} status={status} sectionId={sectionId} />
        </div>
        {list.items.length === 0 ? (
          <p className="muted l1-pad">Κανένα στοιχείο σε αυτό το φίλτρο.</p>
        ) : (
          <RowList>
            {list.items.map((item) => (
              <ItemCard key={item.id} row={l1RowOf(item)} />
            ))}
          </RowList>
        )}
      </Panel>
      <Panel label="Μνήμη του Βοηθού">
        <SpacesForm
          action={rebuildMemory}
          submitLabel="Ξαναφτιάξε τη μνήμη του Βοηθού"
          pendingLabel="Στην ουρά…"
          tone="plain"
        >
          <p className="muted">{MEMORY_NOTE}</p>
        </SpacesForm>
      </Panel>
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
    <div data-spaces>
      <Shortcuts
        openUnanswered={openUnanswered}
        canManageSettings={can(viewer, "settings.manage")}
      />
      <Tabs tab={showSections ? "sections" : "items"} />
      {isEmpty && <EmptyKnowledge />}
      {showSections ? (
        <SectionsTab sections={list.sections} isOpenAtStart={isEmpty} />
      ) : (
        <ItemsTab list={list} status={status} sectionId={sectionId} />
      )}
    </div>
  );
}
