import { Segmented } from "@/kit/segmented";
import { Specimen } from "@/kit/showcase-parts";
import { Badge } from "@/screens/shared";

// Χειριστήρια: κουμπιά, πεδία, φίλτρα, καρτέλες, σήματα κατάστασης.

export function Controls({ filter }: { filter: string }) {
  const filterHref = (value: string) => `/kit?f=${value}#filters`;
  return (
    <>
      <Specimen
        id="buttons"
        title="Κουμπιά"
        origin="Μοντάζ · «Εξαγωγή»"
        when="Ένα κύριο (amber) ανά περιοχή: η ενέργεια που περιμένει η οθόνη. Τα υπόλοιπα ουδέτερα. Κόκκινο περίγραμμα μόνο για ό,τι δεν αναιρείται."
      >
        <div className="btn-row">
          <button type="button" className="button" data-primary="true">
            Εγκρίνω το Γύρισμα
          </button>
          <button type="button" className="button">
            Απορρίπτω με λόγο
          </button>
          <button type="button" className="button" data-danger="true">
            Ακύρωση Τιμολογίου
          </button>
          <button type="button" className="button" disabled>
            Χωρίς Δικαίωμα
          </button>
        </div>
      </Specimen>
      <Specimen
        id="fields"
        title="Πεδία"
        origin="Μοντάζ"
        when="Ετικέτα πάνω από το πεδίο, πάντα ορατή. Η εστίαση φαίνεται με το χρώμα έμφασης."
      >
        <div className="stack kit-fields">
          <label className="stack">
            <span className="kit-label">Πελάτης</span>
            <input className="input" defaultValue="Κυψέλη Καφέ" />
          </label>
          <label className="stack">
            <span className="kit-label">Ποσό χωρίς ΦΠΑ</span>
            <input
              className="input num"
              defaultValue="900,00"
              inputMode="decimal"
            />
          </label>
          <label className="stack">
            <span className="kit-label">Τρόπος είσπραξης</span>
            <select className="select" defaultValue="bank">
              <option value="bank">Τραπεζική μεταφορά</option>
              <option value="cash">Μετρητά</option>
            </select>
          </label>
        </div>
      </Specimen>
      <Specimen
        id="filters"
        title="Φίλτρα"
        origin="Χρωματική διόρθωση · presets"
        when="Ένα ενεργό κάθε φορά, με πλήθος δίπλα. Η επιλογή ζει στη διεύθυνση, άρα ο σύνδεσμος ανοίγει την ίδια όψη."
      >
        <Segmented
          label="Φίλτρο Τιμολογίων"
          options={[
            {
              label: "Όλα",
              href: filterHref("all"),
              isCurrent: filter === "all",
              count: 14,
            },
            {
              label: "Ανεξόφλητα",
              href: filterHref("open"),
              isCurrent: filter === "open",
              count: 3,
            },
            {
              label: "Ληξιπρόθεσμα",
              href: filterHref("late"),
              isCurrent: filter === "late",
              count: 1,
            },
            {
              label: "Πιστωτικά",
              href: filterHref("credit"),
              isCurrent: filter === "credit",
              count: 2,
            },
          ]}
        />
      </Specimen>
      <Specimen
        id="tabs"
        title="Καρτέλες"
        origin="Μοντάζ"
        when="Ενότητες του ίδιου αντικειμένου (π.χ. Στοιχεία, Ευκαιρίες, Συμφωνίες). Σε κινητό κυλούν οριζόντια μέσα τους."
      >
        <nav className="tabs" aria-label="Δείγμα καρτελών">
          <a className="tab" aria-current="page" href="#tabs">
            Στοιχεία
          </a>
          <a className="tab" href="#tabs">
            Ευκαιρίες
          </a>
          <a className="tab" href="#tabs">
            Συμφωνίες
          </a>
          <a className="tab" href="#tabs">
            Καρτέλα Πελάτη
          </a>
        </nav>
      </Specimen>
      <Specimen
        id="badges"
        title="Σήματα κατάστασης"
        origin="Ρεζί · tally"
        when="Λυχνία + λέξη. Κόκκινο = πρόβλημα, amber = σειρά σου, πράσινο = έτοιμο, ουδέτερο = πληροφορία."
      >
        <div className="btn-row">
          <Badge tone="attention">ληξιπρόθεσμο</Badge>
          <Badge tone="strong">αναμένει έγκριση</Badge>
          <Badge tone="ok">εξοφλημένο</Badge>
          <Badge>πιστωτικό</Badge>
        </div>
      </Specimen>
    </>
  );
}
