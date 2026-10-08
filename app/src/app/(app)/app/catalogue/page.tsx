import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, getViewer, type Viewer } from "@/modules/access";
import {
  CatalogueTable,
  CostNote,
  catalogueCaps,
  getCostHint,
  listCatalogue,
  listProvisionKinds,
  toCatalogueRow,
  type CatalogueCaps,
  type CatalogueItem,
  type CostHint,
  type ProvisionKind,
} from "@/modules/catalogue";

export const metadata = { title: "Κατάλογος" };

const EYEBROW = "C1 · Κατάλογος";

function LoadError() {
  return (
    <Notice kind="error" title="Δεν φόρτωσε ο Κατάλογος">
      <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
    </Notice>
  );
}

function NoAccess({ viewer }: { viewer: Viewer }) {
  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title="Κατάλογος" />
      <AccessNotice viewer={viewer}>
        <p className="m-0">Τον Κατάλογο τον βλέπει όποιος «Βλέπει Κατάλογο».</p>
      </AccessNotice>
    </>
  );
}

function NewItemLinks() {
  return (
    <>
      <Link
        href="/app/catalogue/new?type=package"
        className={buttonVariants({ variant: "primary" })}
      >
        Νέο Πακέτο
      </Link>
      <Link href="/app/catalogue/new?type=service" className={buttonVariants()}>
        Νέα Υπηρεσία
      </Link>
    </>
  );
}

function EmptyCatalogue({ canManage }: { canManage: boolean }) {
  return (
    <Notice kind="empty" title="Ο Κατάλογος είναι άδειος">
      <p className="m-0">
        {canManage
          ? "Γράψε το πρώτο Πακέτο ή την πρώτη Υπηρεσία."
          : "Η Διαχείριση δεν έχει γράψει ακόμα Πακέτα και Υπηρεσίες."}
      </p>
    </Notice>
  );
}

interface CatalogueBodyProps {
  items: readonly CatalogueItem[];
  kinds: readonly ProvisionKind[];
  hint: CostHint | null;
  caps: CatalogueCaps;
}

function CatalogueBody({ items, kinds, hint, caps }: CatalogueBodyProps) {
  const rows = items.map((item) => toCatalogueRow(item, { kinds, hint }));
  return (
    <div className="grid gap-4">
      <p className="m-0 text-sm text-muted-foreground">
        {caps.canManage
          ? "Ό,τι αλλάζεις εδώ ισχύει για νέες προτάσεις. Οι υπογεγραμμένες Συμφωνίες κρατούν το δικό τους αντίγραφο."
          : "Μόνο ανάγνωση: Πακέτα και Υπηρεσίες για να διαλέγεις γραμμές στην πρόταση."}
      </p>
      {caps.canSeeCost && <CostNote hint={hint} />}
      {rows.length === 0 ? (
        <EmptyCatalogue canManage={caps.canManage} />
      ) : (
        <CatalogueTable
          rows={rows}
          columns={{
            price: caps.canSeePrice,
            cost: caps.canSeeCost,
            margin: caps.canSeeCost && caps.canSeePrice,
          }}
          canSeeRetired={caps.canManage}
        />
      )}
    </div>
  );
}

// C1: η λίστα Πακέτων και Υπηρεσιών. Τα ποσά που ο θεατής δεν δικαιούται δεν φτάνουν ποτέ εδώ: η βάση στέλνει null.
export default async function CataloguePage() {
  const viewer = await getViewer();
  const caps = catalogueCaps(viewer);
  if (!caps.canView) return <NoAccess viewer={viewer} />;

  const [items, kinds, hint] = await Promise.all([
    listCatalogue({ withRetired: caps.canManage }),
    listProvisionKinds(),
    caps.canSeeCost ? getCostHint() : null,
  ]);
  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title="Κατάλογος">
        {caps.canManage && <NewItemLinks />}
      </ScreenHeader>
      {items.ok && kinds.ok && (hint === null || hint.ok) ? (
        <CatalogueBody
          items={items.data}
          kinds={kinds.data}
          hint={hint === null ? null : hint.data}
          caps={caps}
        />
      ) : (
        <LoadError />
      )}
    </>
  );
}
