import Link from "next/link";

import type { RoleId } from "@/data/roles";
import { screenHref, type ScreenQuery } from "@/screens/shared";

// ?view=down: τι γίνεται όταν αποτυγχάνει ο εξωτερικός έλεγχος.
// Το ίδιο το DMS δεν μπορεί να το δείξει όσο είναι κάτω· αυτό είναι το email.
export function DownView({
  role,
  query,
}: {
  role: RoleId;
  query: ScreenQuery;
}) {
  return (
    <>
      <section className="card p2-banner" data-red="true" role="alert">
        <h2>Το DMS δεν απαντά</h2>
        <p className="muted">
          Αυτή την οθόνη το ίδιο το DMS δεν μπορεί να τη δείξει όσο είναι κάτω.
          Αυτό που βλέπεις παρακάτω είναι το email που φτάνει.
        </p>
      </section>
      <section className="card" aria-label="Παράδειγμα email">
        <p className="muted">
          Από: υπηρεσία ελέγχου (εξωτερική) · Προς: όσοι έχουν «Βλέπει Υγεία
          συστήματος» και ο developer
        </p>
        <h3>Το DMS δεν απαντά</h3>
        <p>
          Ο έλεγχος απέτυχε 2 φορές στη σειρά (~5 λεπτά). Τελευταία απάντηση
          04:10. Δεν χρειάζεται να κάνεις κάτι στο DMS· ο developer
          ειδοποιήθηκε.
        </p>
        <p className="note">
          Όταν το σύστημα επανέλθει, φτάνει δεύτερο email «Το DMS επανήλθε». SMS
          και push θα έρθουν μετά την πρώτη έκδοση.
        </p>
      </section>
      <Link href={screenHref(role, "P2", { ...query, view: undefined })}>
        Πίσω στην Υγεία συστήματος
      </Link>
    </>
  );
}
