import Link from "next/link";
import type { ReactNode } from "react";
import { z } from "zod";

import { getViewer } from "@/modules/access";
import { getCompany } from "@/modules/settings";
import { hrefOf } from "@/spaces/data/screens";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { catalogueCaps, itemKindLabel } from "../helpers";
import {
  getActualHours,
  getCatalogueItem,
  getCostHint,
  listProvisionKinds,
} from "../queries-items";

import { C2Basics } from "./c2-basics";
import { C2Cost } from "./c2-cost";
import { C2New } from "./c2-new";
import { C2Provisions } from "./c2-provisions";
import { C2Public } from "./c2-public";
import { C2Usage } from "./c2-usage";

const Frame = ({ children }: { children: ReactNode }) => (
  <div data-spaces>{children}</div>
);

// C2 Πακέτο ή Υπηρεσία στη νέα εμφάνιση (prototype `screens/C2.tsx`): κεφαλίδα, σήματα και οι ενότητες του prototype.
// Κάθε ενότητα έχει τη δική της πραγματική ενέργεια και το δικό της κουμπί (όχι ένα «Αποθήκευση» για όλη τη σελίδα).
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
  const [item, kinds, hint, company, actual] = await Promise.all([
    getCatalogueItem(id.data),
    listProvisionKinds(),
    caps.canSeeCost ? getCostHint() : null,
    caps.canSeePrice ? getCompany() : null,
    caps.canSeeCost ? getActualHours(id.data) : null,
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
  // Αν δεν διαβαστούν οι πραγματικές ώρες, λείπει μόνο αυτή η γραμμή.
  const actualHours = actual?.ok ? actual.data : null;
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
      <C2Basics item={found} caps={caps} vatRate={vatRate} />
      <C2Provisions item={found} kinds={kinds.data} caps={caps} />
      <C2Cost
        item={found}
        hint={costHint}
        caps={caps}
        actual={actualHours}
      />
      {found.kind === "package" && (
        <C2Public item={found} canEdit={caps.canManage} />
      )}
      <C2Usage item={found} canManage={caps.canManage} />
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
        <C2New
          kinds={kinds.data}
          canEditPrice={caps.canEditPrice}
          canManageSettings={caps.canManageSettings}
          initialType={isService ? "service" : "package_monthly"}
        />
      )}
    </Frame>
  );
}
