import Link from "next/link";

import { Panel } from "@/spaces/kit/panel";
import { hrefOf } from "@/spaces/data/screens";
import { Badge } from "@/spaces/screens/shared";

import { EXTERNAL } from "../labels";

// ?view=down: τι γίνεται όταν αποτυγχάνει ο εξωτερικός έλεγχος.
// Το ίδιο το DMS δεν μπορεί να το δείξει όσο είναι κάτω· το λέει το email της υπηρεσίας ελέγχου.
export function DownView() {
  return (
    <>
      <div className="p2-banner" data-red="true" role="alert">
        <Panel
          label="Το DMS δεν απαντά"
          aside={<Badge tone="attention">θέλει προσοχή</Badge>}
        >
          <p className="muted">
            Αυτή την οθόνη το ίδιο το DMS δεν μπορεί να τη δείξει όσο είναι
            κάτω. Αυτό που γίνεται τότε είναι το παρακάτω.
          </p>
        </Panel>
      </div>
      <Panel label={EXTERNAL.downTitle}>
        {EXTERNAL.downText.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </Panel>
      <Link href={hrefOf("P2")}>Πίσω στην Υγεία συστήματος</Link>
    </>
  );
}
