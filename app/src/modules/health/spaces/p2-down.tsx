import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";

import { EXTERNAL } from "../labels";

// ?view=down: τι γίνεται όταν αποτυγχάνει ο εξωτερικός έλεγχος.
// Το ίδιο το DMS δεν μπορεί να το δείξει όσο είναι κάτω· το λέει το email της υπηρεσίας ελέγχου.
export function DownView() {
  return (
    <div className="ml-stack">
      <div className="p2-banner" data-red="true" role="alert">
        <strong>Το DMS δεν απαντά</strong>
        <small>θέλει προσοχή</small>
        <p className="muted">
          Αυτή την οθόνη το ίδιο το DMS δεν μπορεί να τη δείξει όσο είναι κάτω.
          Αυτό που γίνεται τότε είναι το παρακάτω.
        </p>
      </div>
      <details className="ml-box" open>
        <summary>
          <h2 className="ml-box-title">{EXTERNAL.downTitle}</h2>
          <small>βήμα βήμα</small>
        </summary>
        {EXTERNAL.downText.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </details>
      <Link href={hrefOf("P2")}>Πίσω στην Υγεία συστήματος</Link>
    </div>
  );
}
