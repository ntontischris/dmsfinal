import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";

// Τ3: χωρίς προεπιλεγμένο λογαριασμό τραπέζης ο πελάτης βλέπει μόνο «Επικοινωνήστε μαζί μας». Η ομάδα το μαθαίνει
// εδώ, με σύνδεσμο στις Ρυθμίσεις (τον λογαριασμό τον βάζει ο Ιδιοκτήτης).
export function NoBankWarning() {
  return (
    <p className="note" role="status">
      <strong>Δεν έχεις βάλει λογαριασμό τράπεζας</strong> — οι πελάτες δεν
      βλέπουν πώς να πληρώσουν.{" "}
      <Link href={hrefOf("O1")}>Βάλε λογαριασμό στις Ρυθμίσεις</Link>
    </p>
  );
}
