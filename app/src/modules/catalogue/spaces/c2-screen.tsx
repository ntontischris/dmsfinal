import Link from "next/link";
import type { ReactNode } from "react";
import { z } from "zod";

import { getViewer } from "@/modules/access";
import { getCompany } from "@/modules/settings";
import { Panel } from "@/spaces/kit/panel";
import { hrefOf } from "@/spaces/data/screens";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { ItemBasicsForm } from "../components/item-basics-form";
import { ItemCostSection } from "../components/item-cost-section";
import { ItemProvisionsForm } from "../components/item-provisions-form";
import { ItemPublicForm } from "../components/item-public-form";
import { ItemUsage } from "../components/item-usage";
import { NewItemForm } from "../components/new-item-form";
import { catalogueCaps, itemKindLabel } from "../helpers";
import {
  getCatalogueItem,
  getCostHint,
  listProvisionKinds,
} from "../queries-items";

const Frame = ({ children }: { children: ReactNode }) => (
  <div data-spaces>{children}</div>
);

// Οι φόρμες της σημερινής σελίδας μπαίνουν όπως είναι (πραγματικά πεδία και ενέργειες), ως [data-tw], μέσα στα Panel του prototype.
const Embedded = ({ children }: { children: ReactNode }) => (
  <div data-tw>{children}</div>
);

// C2 Πακέτο ή Υπηρεσία στη νέα εμφάνιση (prototype `screens/C2.tsx`): κεφαλίδα, σήματα και οι ενότητες σε δύο στήλες.
// Ο ζωντανός έλεγχος τιμής του prototype (`c2-price-live`) είναι μέσα στη φόρμα «Βασικά και τιμή» της εφαρμογής.
export async function SpacesCatalogueItem({ itemId }: { itemId: string }) {
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
  const missing = (
    <Frame>
      <StateNotice kind="empty" title="Δεν βρέθηκε στον Κατάλογο">
        <p>
          Ο Κατάλογος δείχνει σε όσους δεν τον διαχειρίζονται μόνο ό,τι
          πουλιέται.
        </p>
        <p>
          <Link href={hrefOf("C1")}>Πίσω στον Κατάλογο</Link>
        </p>
      </StateNotice>
    </Frame>
  );
  const id = z.uuid().safeParse(itemId);
  if (!id.success) return missing;
  const [item, kinds, hint, company] = await Promise.all([
    getCatalogueItem(id.data),
    listProvisionKinds(),
    caps.canSeeCost ? getCostHint() : null,
    caps.canSeePrice ? getCompany() : null,
  ]);
  if (!item.ok || !kinds.ok || (hint !== null && !hint.ok))
    return (
      <Frame>
        <ErrorNotice what="η Σελίδα Πακέτου ή Υπηρεσίας" />
      </Frame>
    );
  if (item.data === null) return missing;
  const found = item.data;
  const costHint = hint === null || !hint.ok ? null : hint.data;
  // Αν δεν διαβαστεί ο ΦΠΑ, λείπει μόνο η υπόδειξη «Με ΦΠΑ».
  const vatRate = company?.ok ? company.data.vat_rate : null;
  const isReadOnly = !caps.canManage;
  return (
    <Frame>
      <div className="card-title">
        <h2>{found.name}</h2>
        <span className="btn-row">
          <Badge tone="strong">{itemKindLabel(found)}</Badge>
          {found.isPublic && <Badge>Δημόσιο</Badge>}
          {found.isRetired && <Badge>Αρχειοθετημένο</Badge>}
          {isReadOnly && <Badge>Μόνο ανάγνωση</Badge>}
        </span>
      </div>
      {isReadOnly && (
        <p className="note">
          Βλέπεις τιμές και Παροχές για να διαλέγεις γραμμές στην πρόταση. Οι
          ώρες και το κόστος είναι εσωτερικά.
        </p>
      )}
      <div className="grid2">
        <Panel label="Βασικά και τιμή">
          <Embedded>
            <ItemBasicsForm item={found} caps={caps} vatRate={vatRate} />
          </Embedded>
        </Panel>
        <Panel label="Παροχές">
          <Embedded>
            <ItemProvisionsForm item={found} kinds={kinds.data} caps={caps} />
          </Embedded>
        </Panel>
      </div>
      {caps.canSeeCost && (
        <div className="grid2">
          <Panel label="Κόστος και περιθώριο">
            <Embedded>
              <ItemCostSection item={found} hint={costHint} caps={caps} />
            </Embedded>
          </Panel>
          <Panel label="Μέσες Πραγματικές ώρες">
            <p className="muted">
              Όταν υπάρξουν Παραγωγές με Πραγματικές ώρες, εδώ φαίνεται ο μέσος
              όρος δίπλα στην εκτίμηση. Τίποτα δεν αλλάζει μόνο του.
            </p>
          </Panel>
        </div>
      )}
      {found.kind === "package" && (
        <Panel label="Δημόσιο">
          <Embedded>
            <ItemPublicForm item={found} canEdit={caps.canManage} />
          </Embedded>
        </Panel>
      )}
      <Panel label="Χρήση και αρχειοθέτηση">
        <Embedded>
          <ItemUsage item={found} canManage={caps.canManage} />
        </Embedded>
      </Panel>
    </Frame>
  );
}

// Νέο Πακέτο ή Υπηρεσία (prototype C2 με `?new=`): η ίδια σελίδα με άδεια πεδία· η πραγματική φόρμα δημιουργίας.
export async function SpacesNewCatalogueItem({ type }: { type: string | undefined }) {
  const viewer = await getViewer();
  const caps = catalogueCaps(viewer);
  if (!caps.canManage)
    return (
      <Frame>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>Νέο Πακέτο ή Υπηρεσία γράφει μόνο όποιος «Διαχειρίζεται Κατάλογο».</p>
        </StateNotice>
      </Frame>
    );
  const kinds = await listProvisionKinds();
  const isService = type === "service";
  return (
    <Frame>
      <div className="card-title">
        <h2>{isService ? "Νέα Υπηρεσία" : "Νέο Πακέτο"}</h2>
      </div>
      {!kinds.ok ? (
        <ErrorNotice what="τα είδη Παροχής" />
      ) : (
        <Panel label="Στοιχεία">
          <Embedded>
            <NewItemForm
              kinds={kinds.data}
              canEditPrice={caps.canEditPrice}
              initialType={isService ? "service" : "package_monthly"}
            />
          </Embedded>
        </Panel>
      )}
    </Frame>
  );
}
