import Link from "next/link";

import { can, type Viewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";

// Τα Τιμολόγια και η Καρτέλα, ένα πάτημα από την αρχική· μόνο για όποιον βλέπει τα Οικονομικά του Πελάτη.
export function ClientMoneyShelf({ viewer }: { viewer: Viewer }) {
  if (!can(viewer, "c.finance")) return null;
  return (
    <nav className="ml-shelf a1-shelf" aria-label="Τα οικονομικά σου">
      <Link href={hrefOf("I2")}>
        <span className="ml-mark" aria-hidden>
          €
        </span>
        <strong>Τιμολόγια</strong>
        <small>Τι έχεις πληρώσει και τι μένει</small>
      </Link>
      <Link href={hrefOf("I5")}>
        <span className="ml-mark" aria-hidden>
          ≡
        </span>
        <strong>Καρτέλα</strong>
        <small>Όλες οι κινήσεις σου με εμάς</small>
      </Link>
    </nav>
  );
}
