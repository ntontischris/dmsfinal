import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { AccessNotice, type Viewer } from "@/modules/access";
import {
  ItemBasicsForm,
  ItemCostSection,
  ItemProvisionsForm,
  ItemPublicForm,
  ItemUsage,
  itemKindLabel,
  type CatalogueCaps,
  type CatalogueItem,
  type CostHint,
  type ProvisionKind,
} from "@/modules/catalogue";

export const EYEBROW = "C2 · Κατάλογος";

const BackLink = () => (
  <Link href="/app/catalogue" className={buttonVariants({ variant: "ghost" })}>
    ← Κατάλογος
  </Link>
);

export function LoadError() {
  return (
    <Notice kind="error" title="Δεν φόρτωσε το στοιχείο του Καταλόγου">
      <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
    </Notice>
  );
}

export function NoAccess({ viewer }: { viewer: Viewer }) {
  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title="Κατάλογος" />
      <AccessNotice viewer={viewer}>
        <p className="m-0">Τον Κατάλογο τον βλέπει όποιος «Βλέπει Κατάλογο».</p>
      </AccessNotice>
    </>
  );
}

// Άγνωστο id, ή στοιχείο που η βάση δεν δείχνει σε αυτόν τον θεατή (π.χ. αρχειοθετημένο σε όποιον δεν Διαχειρίζεται Κατάλογο).
export function Missing() {
  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title="Κατάλογος">
        <BackLink />
      </ScreenHeader>
      <Notice kind="empty" title="Αυτό το στοιχείο δεν υπάρχει ή δεν σε αφορά">
        <p className="m-0">
          Ο Κατάλογος δείχνει σε όσους δεν τον διαχειρίζονται μόνο ό,τι
          πουλιέται.
        </p>
      </Notice>
    </>
  );
}

export function ItemHeader({
  item,
  caps,
}: {
  item: CatalogueItem;
  caps: CatalogueCaps;
}) {
  return (
    <ScreenHeader eyebrow={EYEBROW} title={item.name}>
      <Badge>{itemKindLabel(item)}</Badge>
      {item.isPublic && <Badge>Δημόσιο</Badge>}
      {item.isRetired && <Badge>Αρχειοθετημένο</Badge>}
      {!caps.canManage && <Badge>Μόνο ανάγνωση</Badge>}
      <BackLink />
    </ScreenHeader>
  );
}

// Η εκτίμηση των Πραγματικών ωρών έρχεται με τις Παραγωγές: εδώ μόνο η θέση της, χωρίς νούμερα.
function ActualHoursPlaceholder() {
  return (
    <Notice
      kind="empty"
      title="Οι μέσες Πραγματικές ώρες έρχονται με το module Παραγωγές"
    >
      <p className="m-0">
        Όταν υπάρξουν Παραγωγές με Πραγματικές ώρες, εδώ φαίνεται ο μέσος όρος
        δίπλα στην εκτίμηση. Τίποτα δεν αλλάζει μόνο του.
      </p>
    </Notice>
  );
}

interface ItemPanelsProps {
  item: CatalogueItem;
  kinds: readonly ProvisionKind[];
  hint: CostHint | null;
  vatRate: number | null;
  caps: CatalogueCaps;
}

// Οι ενότητες με τη σειρά τους· σε πλατιά οθόνη δύο στήλες (1+2, 3+4, 5+6), σε κινητό η μία κάτω από την άλλη.
export function ItemPanels({
  item,
  kinds,
  hint,
  vatRate,
  caps,
}: ItemPanelsProps) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Panel label="Βασικά και τιμή">
        <ItemBasicsForm item={item} caps={caps} vatRate={vatRate} />
      </Panel>
      <Panel label="Παροχές">
        <ItemProvisionsForm item={item} kinds={kinds} caps={caps} />
      </Panel>
      {caps.canSeeCost && (
        <>
          <Panel label="Κόστος και περιθώριο">
            <ItemCostSection item={item} hint={hint} caps={caps} />
          </Panel>
          <Panel label="Μέσες Πραγματικές ώρες">
            <ActualHoursPlaceholder />
          </Panel>
        </>
      )}
      {item.kind === "package" && (
        <Panel label="Δημόσιο">
          <ItemPublicForm item={item} canEdit={caps.canManage} />
        </Panel>
      )}
      <Panel label="Χρήση και αρχειοθέτηση">
        <ItemUsage item={item} canManage={caps.canManage} />
      </Panel>
    </div>
  );
}
