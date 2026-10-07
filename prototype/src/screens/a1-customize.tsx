import Link from "next/link";

import { layoutParam, moved, toggled, type CardDef } from "@/screens/a1-model";

interface CustomizeProps {
  available: readonly CardDef[];
  shown: readonly string[];
  isDefault: boolean;
  hrefWith: (cards: string | undefined, isEditing: boolean) => string;
}

// «Προσαρμογή»: ο Χρήστης κρύβει ή εμφανίζει κάρτες και αλλάζει σειρά. Διαλέγει μόνο από όσες του επιτρέπουν
// τα Δικαιώματά του· δεν προσθέτει καινούργιες. Η επιλογή αποθηκεύεται στον λογαριασμό του, σε κάθε συσκευή.
export function Customize({
  available,
  shown,
  isDefault,
  hrefWith,
}: CustomizeProps) {
  const hidden = available.filter((card) => !shown.includes(card.id));
  const ordered = [
    ...shown.flatMap((id) => available.filter((card) => card.id === id)),
    ...hidden,
  ];
  const link = (ids: readonly string[]) => hrefWith(layoutParam(ids), true);
  return (
    <section className="card a1-customize" aria-labelledby="a1-customize-title">
      <header className="a1-card-head">
        <h2 id="a1-customize-title">Προσαρμογή της «Σήμερα»</h2>
        <Link
          className="button"
          data-primary
          href={hrefWith(isDefault ? undefined : layoutParam(shown), false)}
        >
          Τέλος
        </Link>
      </header>
      <p className="muted">
        Βλέπεις όσες κάρτες σου επιτρέπουν τα Δικαιώματά σου. Κρύψε όσες δεν
        θέλεις και άλλαξε τη σειρά. Η αλλαγή ισχύει μόνο για σένα. Μια κάρτα που
        κρύβεις δεν σταματά τις Ειδοποιήσεις της.
      </p>
      <ol className="a1-custom-list">
        {ordered.map((card) => {
          const isShown = shown.includes(card.id);
          const index = shown.indexOf(card.id);
          return (
            <li key={card.id} data-shown={isShown}>
              <span className="a1-custom-title">
                {card.title} <span className="muted">· {card.source}</span>
              </span>
              <span className="btn-row">
                {isShown && index > 0 && (
                  <Link
                    className="button"
                    href={link(moved(shown, card.id, -1))}
                    aria-label={`${card.title} πιο πάνω`}
                  >
                    ↑
                  </Link>
                )}
                {isShown && index < shown.length - 1 && (
                  <Link
                    className="button"
                    href={link(moved(shown, card.id, 1))}
                    aria-label={`${card.title} πιο κάτω`}
                  >
                    ↓
                  </Link>
                )}
                <Link className="button" href={link(toggled(shown, card.id))}>
                  {isShown ? "Κρύψε" : "Εμφάνισε"}
                </Link>
              </span>
            </li>
          );
        })}
      </ol>
      {!isDefault && (
        <p>
          <Link href={hrefWith(undefined, true)}>Επαναφορά προεπιλογής</Link>
        </p>
      )}
    </section>
  );
}
