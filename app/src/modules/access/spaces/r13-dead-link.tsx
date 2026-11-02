import Link from "next/link";

// R13 «Ο σύνδεσμος δεν ισχύει πια» (prototype `DeadLink` του `screens/r13-dead.tsx`) για τους συνδέσμους από email
// (πρόσκληση, είσοδος, επαναφορά). Ο server δεν λέει ποιο από τα τρία ήταν· οι ενέργειες καλύπτουν όλα.
export function SpacesDeadLink() {
  return (
    <>
      <p className="r-reason">Ο σύνδεσμος έληξε ή χρησιμοποιήθηκε ήδη.</p>
      <p>
        Ζητήστε νέο σύνδεσμο από την Είσοδο. Για πρόσκληση, ζητήστε νέα από
        όποιον σας προσκάλεσε.
      </p>
      <div className="r-help">
        <Link className="site-button" href="/login">
          Είσοδος
        </Link>
        <Link className="site-button" data-quiet="true" href="/login/reset">
          Νέος σύνδεσμος επαναφοράς
        </Link>
      </div>
    </>
  );
}
