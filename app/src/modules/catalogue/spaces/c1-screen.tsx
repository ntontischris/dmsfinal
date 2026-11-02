import Link from "next/link";

import { getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import {
  catalogueCaps,
  formatMoney,
  formatMonth,
  formatMultiplier,
  toCatalogueRow,
} from "../helpers";
import {
  getCostHint,
  listCatalogue,
  listProvisionKinds,
} from "../queries-items";
import type { CostHint } from "../types";
import { CatalogueTable } from "./c1-catalogue-table";

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div data-spaces>{children}</div>
);

// Η γραμμή του Κόστους ώρας πάνω από τον Κατάλογο (prototype `.note`), για όποιον βλέπει κόστος.
function CostNote({ hint }: { hint: CostHint | null }) {
  if (hint === null || hint.hourCost === null)
    return (
      <p className="note">
        Δεν έχει οριστεί Κόστος ώρας· χωρίς αυτό δεν φαίνονται κόστος και
        περιθώριο. Ορίζεται στις{" "}
        <Link href={hrefOf("O6")}>Ρυθμίσεις Οικονομικών</Link>.
      </p>
    );
  const { min, target, max } = hint.multipliers;
  const month = hint.hourCostMonth ? ` ${formatMonth(hint.hourCostMonth)}` : "";
  return (
    <p className="note">
      Κόστος ώρας{month}: <strong>{formatMoney(hint.hourCost)}</strong> · Εύρος
      τιμής ×{formatMultiplier(min)} / ×{formatMultiplier(target)} / ×
      {formatMultiplier(max)}. Αλλάζουν στις{" "}
      <Link href={hrefOf("O6")}>Ρυθμίσεις Οικονομικών</Link>.
    </p>
  );
}

// C1 Κατάλογος στη νέα εμφάνιση (prototype `screens/C1.tsx`). Τα ποσά που ο Χρήστης δεν δικαιούται έρχονται null.
export async function SpacesCatalogue() {
  const viewer = await getViewer();
  const caps = catalogueCaps(viewer);
  if (!caps.canView)
    return (
      <Frame>
        <StateNotice kind="denied" title="Χωρίς πρόσβαση στον Κατάλογο">
          <p>Τον Κατάλογο τον βλέπει όποιος «Βλέπει Κατάλογο».</p>
        </StateNotice>
      </Frame>
    );
  const [items, kinds, hint] = await Promise.all([
    listCatalogue({ withRetired: caps.canManage }),
    listProvisionKinds(),
    caps.canSeeCost ? getCostHint() : null,
  ]);
  if (!items.ok || !kinds.ok || (hint !== null && !hint.ok))
    return (
      <Frame>
        <ErrorNotice what="ο Κατάλογος" />
      </Frame>
    );
  const costHint = hint === null || !hint.ok ? null : hint.data;
  const rows = items.data.map((item) =>
    toCatalogueRow(item, { kinds: kinds.data, hint: costHint }),
  );
  return (
    <Frame>
      <div className="toolbar">
        <span className="muted grow">
          {caps.canManage
            ? "Ό,τι αλλάζεις εδώ ισχύει για νέες προτάσεις. Οι υπογεγραμμένες Συμφωνίες κρατούν το δικό τους."
            : "Μόνο ανάγνωση: τιμές και Παροχές, για να διαλέγεις γραμμές στην πρόταση."}
        </span>
        {caps.canManage && (
          <span className="btn-row">
            <Link
              className="button"
              data-primary="true"
              href="/app/catalogue/new?type=package"
            >
              Νέο Πακέτο
            </Link>
            <Link className="button" href="/app/catalogue/new?type=service">
              Νέα Υπηρεσία
            </Link>
          </span>
        )}
      </div>
      {caps.canSeeCost && <CostNote hint={costHint} />}
      {rows.length === 0 ? (
        <StateNotice kind="empty" title="Ο Κατάλογος είναι άδειος">
          <p>
            {caps.canManage
              ? "Γράψε το πρώτο Πακέτο ή την πρώτη Υπηρεσία."
              : "Η Διαχείριση δεν έχει γράψει ακόμα Πακέτα και Υπηρεσίες."}
          </p>
        </StateNotice>
      ) : (
        <CatalogueTable
          rows={rows}
          showPrice={caps.canSeePrice}
          showCost={caps.canSeeCost}
          showMargin={caps.canSeeCost && caps.canSeePrice}
          showArchivedFilter={caps.canManage}
        />
      )}
    </Frame>
  );
}
