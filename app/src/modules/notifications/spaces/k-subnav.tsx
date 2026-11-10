import Link from "next/link";

import { AUTOMATIONS_PATH, SYSTEM_MESSAGES_PATH } from "../automation-labels";
import { SENDS_PATH } from "../sends-helpers";

export type KSection = "automations" | "system" | "sends";

const SECTIONS: readonly { id: KSection; label: string; href: string }[] = [
  { id: "automations", label: "Αυτοματισμοί", href: AUTOMATIONS_PATH },
  { id: "system", label: "Μηνύματα συστήματος", href: SYSTEM_MESSAGES_PATH },
  { id: "sends", label: "Ιστορικό αποστολών", href: SENDS_PATH },
];

// Οι τρεις οθόνες των αποστολών (K1, K2, K3) σε μία σειρά καρτελών, όπως οι καρτέλες της παλιάς οθόνης: χωρίς αυτές
// τα Μηνύματα συστήματος και το Ιστορικό αποστολών δεν ανοίγουν από πουθενά μέσα στους Αυτοματισμούς.
export function KSubnav({ current }: { current: KSection }) {
  return (
    <nav className="tabs" aria-label="Αυτοματισμοί και αποστολές">
      {SECTIONS.map((section) => (
        <Link
          key={section.id}
          className="tab"
          href={section.href}
          aria-current={section.id === current ? "page" : undefined}
        >
          {section.label}
        </Link>
      ))}
    </nav>
  );
}
