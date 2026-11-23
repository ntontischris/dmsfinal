import type { CatalogueCaps, CatalogueItem, CatalogueRow } from "../types";

import { ArchiveAction } from "./c2-archive";
import { initialsOf } from "./c2-box";

interface HeroProps {
  item: CatalogueItem;
  // Τα ίδια κείμενα με τη γραμμή του Καταλόγου: τιμή, κόστος, περιθώριο, Παροχές (null ό,τι δεν δικαιούται ο Χρήστης).
  row: CatalogueRow;
  caps: CatalogueCaps;
}

const READ_ONLY_NOTE =
  "Βλέπεις τιμές και Παροχές για να διαλέγεις γραμμές στην πρόταση. Οι ώρες και το κόστος είναι εσωτερικά.";

const costFacts = (row: CatalogueRow, caps: CatalogueCaps): string =>
  [
    caps.canSeeCost ? `εκτ. κόστος ${row.cost ?? "—"}` : null,
    caps.canSeeCost && row.price !== null
      ? `περιθώριο ${row.margin ?? "—"}`
      : null,
    row.isBelowMin ? "κάτω από την ελάχιστη" : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");

function Tags({
  item,
  caps,
  kindLabel,
}: Pick<HeroProps, "item" | "caps"> & { kindLabel: string }) {
  return (
    <span className="c2-tags">
      <span className="ml-tag">{kindLabel}</span>
      {item.isPublic && <span className="ml-tag">Δημόσιο</span>}
      {item.isRetired && <span className="ml-tag">Αρχειοθετημένο</span>}
      {!caps.canManage && <span className="ml-tag">Μόνο ανάγνωση</span>}
    </span>
  );
}

// Πάνω στη σελίδα: Είδος και σήματα, το όνομα, η τιμή μεγάλη και από κάτω κόστος/περιθώριο· δεξιά η Αρχειοθέτηση.
export function C2Hero({ item, row, caps }: HeroProps) {
  const costs = costFacts(row, caps);
  return (
    <header className="ml-hero c2-hero">
      <span className="ml-hero-mono" aria-hidden="true">
        {initialsOf(item.name)}
      </span>
      <div>
        <Tags item={item} caps={caps} kindLabel={row.kindLabel} />
        <h1>{item.name}</h1>
        <p>Παροχές: {row.provisions || "—"}</p>
        {row.price !== null ? (
          <p className="ml-hero-amount">
            {row.price}
            <small>{["χωρίς ΦΠΑ", costs].filter(Boolean).join(" · ")}</small>
          </p>
        ) : (
          costs && <p>{costs}</p>
        )}
        {!caps.canManage && <p className="c2-lead">{READ_ONLY_NOTE}</p>}
      </div>
      {caps.canManage && (
        <div className="ml-quick">
          <ArchiveAction item={item} />
        </div>
      )}
    </header>
  );
}
