import { Specimen, Swatches, type Swatch } from "@/kit/showcase-parts";

// Θεμέλια του Kit: αρχές, χρώματα, τυπογραφία.

const PRINCIPLES: readonly { title: string; text: string }[] = [
  {
    title: "Πρώτα UX, μετά design",
    text: "Η εφαρμογή είναι χώρος εργασίας για 8 ώρες. Το θέαμα μένει στην Ιστοσελίδα· μέσα, ίδια tokens αλλά ησυχία.",
  },
  {
    title: "Κανένα κεφαλαίο σε περιεχόμενο",
    text: "Στα ελληνικά τα κεφαλαία χάνουν τους τόνους και διαβάζονται πιο αργά. Κεφαλαία μόνο σε μικρές ετικέτες.",
  },
  {
    title: "Mono μόνο για ετικέτες, κωδικούς, timecodes",
    text: "Κείμενο, ποσά και ημερομηνίες σε sans. Τα ποσά σε στήλες με ψηφία ίσου πλάτους, για να στοιχίζονται.",
  },
  {
    title: "Ένα χρώμα έμφασης",
    text: "Το amber είναι η κύρια ενέργεια και η «σειρά σου». Ένα κύριο κουμπί ανά περιοχή.",
  },
  {
    title: "Κόκκινο μόνο για πρόβλημα",
    text: "Η κόκκινη λυχνία σημαίνει «κοίτα εδώ». Κάθε χρώμα κατάστασης έχει λέξη δίπλα του.",
  },
  {
    title: "Κίνηση σχεδόν καθόλου μέσα",
    text: "Μικρές μεταβάσεις στο hover. Αυτόματο παίξιμο και κίνηση στην κύλιση μόνο στην Ιστοσελίδα, και ποτέ με «μειωμένη κίνηση».",
  },
];

const SURFACES: readonly Swatch[] = [
  { token: "--color-bg", name: "Φόντο", use: "η αίθουσα" },
  {
    token: "--color-surface",
    name: "Πάνελ",
    use: "κάρτες, πλαϊνή στήλη, μπάρα",
  },
  {
    token: "--color-surface-raised",
    name: "Υψωμένο",
    use: "κεφαλίδες πάνελ, hover, ενεργό",
  },
  { token: "--color-border", name: "Γραμμή", use: "λεπτά διαχωριστικά" },
  { token: "--color-text", name: "Κείμενο", use: "κύριο" },
  {
    token: "--color-text-muted",
    name: "Δευτερεύον",
    use: "ετικέτες, στοιχεία",
  },
];

const SIGNALS: readonly Swatch[] = [
  {
    token: "--color-accent",
    name: "Έμφαση (amber)",
    use: "κύρια ενέργεια, «σειρά σου», playhead επιλογής",
  },
  {
    token: "--color-danger",
    name: "Λυχνία (κόκκινο)",
    use: "πρόβλημα: ληξιπρόθεσμο, σφάλμα, σύγκρουση",
  },
  {
    token: "--color-ok",
    name: "Έτοιμο (πράσινο)",
    use: "εξοφλημένο, εγκεκριμένο, υπογεγραμμένο",
  },
];

export function Foundations() {
  return (
    <>
      <Specimen
        id="principles"
        title="Αρχές"
        origin="για όλες τις οθόνες"
        when="Ό,τι αποφασίζεται για μια νέα οθόνη ελέγχεται πρώτα απέναντι σε αυτές."
      >
        <ol className="kit-principles">
          {PRINCIPLES.map((p) => (
            <li key={p.title}>
              <strong>{p.title}</strong>
              <span className="muted">{p.text}</span>
            </li>
          ))}
        </ol>
      </Specimen>
      <Specimen
        id="colors"
        title="Χρώματα"
        origin="Μοντάζ · OKLCH"
        when="Ψυχρό σχεδόν-μαύρο με ένα θερμό amber. Το φωτεινό θέμα βγαίνει από τα ίδια tokens. Οι τελικές τιμές μένουν ανοιχτές ως το build."
      >
        <h3 className="kit-label">Επιφάνειες</h3>
        <Swatches items={SURFACES} />
        <h3 className="kit-label">Σήματα</h3>
        <Swatches items={SIGNALS} />
      </Specimen>
      <Specimen
        id="type"
        title="Τυπογραφία"
        origin="Inter Tight + JetBrains Mono"
        when="Μία variable sans με ελληνικά για όλο το κείμενο· μία mono για ετικέτες, κωδικούς και timecodes."
      >
        <div className="kit-type">
          <p className="kit-type-xl">Κυψέλη Καφέ, Σεπτέμβριος</p>
          <p className="kit-type-lg">Η Συμφωνία και οι Περίοδοί της</p>
          <p>
            Κείμενο σώματος: η Μαρία ζητά τρίτο Γύρισμα τον Σεπτέμβριο. Δεν
            έμεινε Παροχή, οπότε το αίτημα πάει στην Άννα.
          </p>
          <p className="muted">Δευτερεύον: ενημερώθηκε 19/09, 10:42</p>
          <p className="num">900 € · 1.300 € · 616,00 € · 24/09/2026</p>
          <p className="kit-label">Ετικέτα · Α-58 · 00:01:32:14</p>
        </div>
      </Specimen>
    </>
  );
}
