import Link from "next/link";


// Το «Τώρα»: το ένα πιο επείγον πράγμα της οθόνης, με την ενέργεια που το κλείνει (prototype `screens/a1-now.ts`).
export interface Now {
  // Η κάρτα από την οποία βγήκε, ώστε οι αριθμοί δίπλα να μην την επαναλαμβάνουν.
  cardId: string;
  label: string;
  title: string;
  detail?: string;
  action: string;
  href: string;
}

interface NowTileProps {
  now: Now;
}

// Το κίτρινο «Τώρα» (από το screens2): το μόνο κίτρινο της οθόνης, πάντα με μία ενέργεια.
export function NowTile({ now }: NowTileProps) {
  return (
    <Link className="now-tile" href={now.href}>
      <div>
        <p className="now-tile-label">
          <span className="now-tile-dot" aria-hidden="true" /> {now.label}
        </p>
        <p className="now-tile-title">{now.title}</p>
        {now.detail && <p className="now-tile-detail">{now.detail}</p>}
      </div>
      <span className="now-tile-action">{now.action} →</span>
    </Link>
  );
}
