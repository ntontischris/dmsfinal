import { signInAsDemo } from "../actions";

// Τα κουμπιά «Δες ως…» της Εισόδου (demo.ts) στη νέα εμφάνιση. Στέλνουν μόνο τη θέση στη λίστα· το email το βρίσκει ο server.
export function SpacesDemoLogins({ labels }: { labels: readonly string[] }) {
  return (
    <>
      <p className="r-muted">Επίδειξη: δες τις οθόνες χωρίς κωδικό</p>
      <div className="r-demos">
        {labels.map((label, index) => (
          <form key={label} action={signInAsDemo}>
            <input type="hidden" name="demo" value={index} />
            <button className="site-button" data-quiet="true" type="submit">
              {label}
            </button>
          </form>
        ))}
      </div>
    </>
  );
}
