import Link from "next/link";
import type { ReactNode } from "react";
import { z } from "zod";

import { getViewer, type Viewer } from "@/modules/access";
import {
  filmingCaps,
  getFilmingSettings,
  listOpenFilmings,
  type FilmingRow,
} from "@/modules/filming";
import { hrefOf } from "@/spaces/data/screens";
import { FilterBar } from "@/spaces/kit/filter-bar";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { equipmentCaps } from "../caps";
import { historyLines, selectableCategories } from "../helpers";
import { getItem, listCategories, listItems } from "../queries";
import type { EquipmentItemDetail, EquipmentItemRow } from "../types";
import {
  candidateViewsOf,
  conflictPairsOf,
  historyRowsOf,
  reservationViewsOf,
} from "./f-adapter";
import { replacementsFor } from "./f-model";
import { F2Item } from "./f2-item";

import "./f.css";

function Frame({ children }: { children: ReactNode }) {
  return (
    <div data-spaces>
      <div className="f">{children}</div>
    </div>
  );
}

function Missing() {
  return (
    <Frame>
      <StateNotice kind="empty" title="Δεν βρέθηκε αντικείμενο">
        <p>
          Ίσως διαγράφηκε. Δες το{" "}
          <Link href={hrefOf("F1")}>μητρώο Εξοπλισμού</Link>.
        </p>
      </StateNotice>
    </Frame>
  );
}

// Η κάρτα «Αντικείμενο» με αναζήτηση: όσα είναι σε χρήση, και το τρέχον ακόμα κι αν αποσύρθηκε.
function Picker({
  items,
  current,
}: {
  items: readonly EquipmentItemRow[];
  current: string;
}) {
  return (
    <FilterBar
      label="Αντικείμενα"
      filters={[
        {
          label: "Αντικείμενο",
          isSearchable: true,
          options: items
            .filter(
              (other) => other.status !== "retired" || other.id === current,
            )
            .map((other) => ({
              label: other.name,
              href: hrefOf("F2", { id: other.id }),
              isCurrent: other.id === current,
            })),
        },
      ]}
    />
  );
}

const isReserveScoped = (viewer: Viewer): boolean =>
  viewer.status === "signed-in" &&
  viewer.team?.permissions["equipment.reserve"] === "mine";

async function loadExtras(viewer: Viewer, canManage: boolean) {
  const filmings = filmingCaps(viewer);
  const [categories, items, openFilmings, settings] = await Promise.all([
    canManage ? listCategories({ includeRetired: true }) : null,
    listItems({ includeRetired: true }),
    filmings.canView ? listOpenFilmings() : null,
    filmings.canManageSettings ? getFilmingSettings() : null,
  ]);
  return { filmings, categories, items, openFilmings, settings, isScoped: isReserveScoped(viewer) };
}

// F2 Αντικείμενο στη νέα εμφάνιση (prototype `screens/F2.tsx`): στοιχεία, Δεσμεύσεις, συγκρούσεις, ιστορικό.
// Η «Δήλωση βλάβης» του prototype λείπει: δεν υπάρχει ακόμα το Δικαίωμα `equipment.fault` ούτε ενέργεια στη βάση.
export async function SpacesEquipmentItem({ id }: { id: string }) {
  const viewer = await getViewer();
  const caps = equipmentCaps(viewer);
  if (!caps.canView)
    return (
      <Frame>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>Τον Εξοπλισμό τον βλέπει όποιος «Βλέπει Εξοπλισμό».</p>
        </StateNotice>
      </Frame>
    );
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return <Missing />;
  const [item, extras] = await Promise.all([
    getItem(parsed.data),
    loadExtras(viewer, caps.canManage),
  ]);
  if (!item.ok || (extras.categories !== null && !extras.categories.ok))
    return (
      <Frame>
        <ErrorNotice what="το αντικείμενο" />
      </Frame>
    );
  if (item.data === null) return <Missing />;
  return (
    <ItemBody item={item.data} canManage={caps.canManage} extras={extras} />
  );
}

function ItemBody({
  item,
  canManage,
  extras,
}: {
  item: EquipmentItemDetail;
  canManage: boolean;
  extras: Awaited<ReturnType<typeof loadExtras>>;
}) {
  const items = extras.items.ok ? extras.items.data : [];
  const open: FilmingRow[] = extras.openFilmings?.ok
    ? extras.openFilmings.data
    : [];
  const reservations = reservationViewsOf(item.reservations, open, new Date());
  const canReserve = extras.filmings.canReserve;
  return (
    <Frame>
      {extras.items.ok ? (
        <Picker items={items} current={item.id} />
      ) : (
        <ErrorNotice what="η λίστα αντικειμένων" />
      )}
      {canReserve &&
        extras.openFilmings !== null &&
        !extras.openFilmings.ok && (
          <ErrorNotice what="τα ανοιχτά Γυρίσματα για Δέσμευση" />
        )}
      <F2Item
        item={item}
        canManage={canManage}
        categories={
          extras.categories?.ok
            ? selectableCategories(extras.categories.data, item.categoryId)
            : []
        }
        replacements={replacementsFor(item, items).map((other) => other.name)}
        reservations={reservations}
        conflicts={conflictPairsOf(reservations)}
        candidates={canReserve ? candidateViewsOf(open, item.reservations) : []}
        history={historyRowsOf(historyLines(item.history))}
        access={{
          canReserve,
          isReserveScoped: canReserve && extras.isScoped,
          blocks: extras.settings?.ok
            ? extras.settings.data.equipmentConflict === "block"
            : null,
        }}
      />
    </Frame>
  );
}
