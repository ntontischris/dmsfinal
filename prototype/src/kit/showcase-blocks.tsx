import { Inspector, Split } from "@/kit/inspector";
import { Panel, StatGrid } from "@/kit/panel";
import { Rows } from "@/kit/rows";
import { Specimen } from "@/kit/showcase-parts";
import { Steps } from "@/kit/steps";
import { Timeline } from "@/kit/timeline";
import { Badge } from "@/screens/shared";

// Δομικά: δείκτες, πάνελ, λίστες, πίνακας, πλαϊνή στήλη, timeline, βήματα, καταστάσεις.

function TableDemo() {
  const rows = [
    [
      "Α-58",
      "Κυψέλη Καφέ",
      "04/08",
      "1.116,00 €",
      "616,00 €",
      "attention",
      "ληξιπρόθεσμο",
    ],
    [
      "Α-64",
      "Γυμναστήριο Κίνηση",
      "02/09",
      "1.736,00 €",
      "0,00 €",
      "ok",
      "εξοφλημένο",
    ],
    [
      "Α-68",
      "Καφέ Αθηνά",
      "08/09",
      "1.257,36 €",
      "757,36 €",
      "strong",
      "μερικώς",
    ],
  ] as const;
  return (
    <div className="scroll">
      <table className="rtable">
        <thead>
          <tr>
            <th>Αριθμός</th>
            <th>Πελάτης</th>
            <th>Έκδοση</th>
            <th className="num">Σύνολο</th>
            <th className="num">Υπόλοιπο</th>
            <th>Κατάσταση</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([code, client, date, total, rest, tone, status]) => (
            <tr key={code}>
              <td data-label="Αριθμός">
                <code>{code}</code>
              </td>
              <td data-label="Πελάτης">{client}</td>
              <td data-label="Έκδοση">
                {date}
              </td>
              <td data-label="Σύνολο" className="num">
                {total}
              </td>
              <td data-label="Υπόλοιπο" className="num">
                {rest}
              </td>
              <td data-label="Κατάσταση">
                <Badge tone={tone}>{status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Blocks() {
  return (
    <>
      <Specimen
        id="stats"
        title="Κάρτες δεικτών"
        origin="Τεχνικό δελτίο"
        when="Ένας αριθμός που απαντά μία ερώτηση, με σύνδεσμο στη λίστα πίσω του. Μόνο στην κορυφή μιας οθόνης, 2 έως 4."
      >
        <StatGrid
          items={[
            {
              label: "Προς τιμολόγηση",
              value: "900 €",
              hint: "Κυψέλη, Σεπτέμβριος",
              tone: "strong",
              href: "/owner/I1",
            },
            {
              label: "Ληξιπρόθεσμα",
              value: "616 €",
              hint: "Α-58, από 19/08",
              tone: "attention",
              href: "/owner/I2?filter=ληξιπρόθεσμα",
            },
            {
              label: "Γυρίσματα εβδομάδας",
              value: "3",
              hint: "1 αναμένει έγκριση",
              href: "/owner/A5",
            },
            { label: "Εισπράξεις μήνα", value: "2.112 €", tone: "ok" },
          ]}
        />
      </Specimen>
      <Specimen
        id="panel"
        title="Πάνελ"
        origin="Μοντάζ"
        when="Ομάδα πληροφορίας με κεφαλίδα-ετικέτα. Η κάρτα (.card) είναι το ίδιο χωρίς κεφαλίδα."
      >
        <Panel label="Αιτήματα για εσένα" aside="2">
          <p style={{ margin: 0 }}>
            Η Μαρία ζητά τρίτο Γύρισμα τον Σεπτέμβριο.
          </p>
        </Panel>
      </Specimen>
      <Specimen
        id="rows"
        title="Γραμμές λίστας"
        origin="Φως"
        when="Λίστες αντικειμένων όπου μετρά ο τίτλος (Πελάτες, Ευκαιρίες, Δουλειές). Για σύγκριση αριθμών, πίνακας."
      >
        <Rows
          items={[
            {
              id: "1",
              title: "Μηνιαία Παρουσία",
              href: "/owner/D2?id=ag-kypseli-social",
              meta: "Κυψέλη Καφέ · ως 31/12",
              aside: (
                <>
                  <span className="num">900 €/μήνα</span>
                  <Badge tone="ok">ενεργή</Badge>
                </>
              ),
            },
            {
              id: "2",
              title: "Βίντεο εγκαινίων",
              href: "/owner/B4?id=o-launch",
              meta: "Πρόταση · ισχύει ως 02/10",
              aside: (
                <>
                  <span className="num">1.200 €</span>
                  <Badge tone="strong">περιμένει υπογραφή</Badge>
                </>
              ),
            },
            {
              id: "3",
              title: "Ανανέωση 2027",
              href: "/owner/B4?id=o-renewal",
              meta: "Πρώτη επαφή · κλήση 20/10",
              aside: <span className="num">1.300 €/μήνα</span>,
            },
          ]}
        />
      </Specimen>
      <Specimen
        id="table"
        title="Πίνακας"
        origin="Τεχνικό δελτίο"
        when="Πολλά αντικείμενα που συγκρίνονται σε στήλες. Ποσά δεξιά, κωδικοί σε mono. Σε κινητό κάθε γραμμή γίνεται κάρτα."
      >
        <TableDemo />
      </Specimen>
      <Specimen
        id="inspector"
        title="Πλαϊνή στήλη ιδιοτήτων"
        origin="Μοντάζ · «Πληροφορίες κλιπ»"
        when="Η ταυτότητα ενός αντικειμένου με μια ματιά, δίπλα στο περιεχόμενό του. Σε κινητό ανεβαίνει πάνω."
      >
        <Split>
          <Panel label="Περιεχόμενο">
            <p style={{ margin: 0 }} className="muted">
              Καρτέλες, λίστες ή πίνακες του αντικειμένου.
            </p>
          </Panel>
          <Inspector
            code="Γ-0912"
            title="Γύρισμα 24/09"
            fields={[
              { label: "Πελάτης", value: "Κυψέλη Καφέ" },
              {
                label: "Κατάσταση",
                value: <Badge tone="strong">αναμένει έγκριση</Badge>,
              },
              {
                label: "Ώρα",
                value: <span className="num">10:00 – 13:00</span>,
              },
              { label: "Συνεργείο", value: "Άρης, Λένα" },
            ]}
          >
            <button type="button" className="button" data-primary="true">
              Εγκρίνω
            </button>
            <button type="button" className="button">
              Απορρίπτω
            </button>
          </Inspector>
        </Split>
      </Specimen>
      <Specimen
        id="timeline"
        title="Timeline"
        origin="Μοντάζ"
        when="Ό,τι έχει διάρκεια στον χρόνο: Περίοδοι, Γυρίσματα, προθεσμίες. Η κόκκινη γραμμή είναι το σήμερα."
      >
        <Timeline
          days={30}
          today={19}
          ticks={[
            { day: 1, label: "01/09" },
            { day: 8, label: "08/09" },
            { day: 15, label: "15/09" },
            { day: 22, label: "22/09" },
            { day: 29, label: "29/09" },
          ]}
          lanes={[
            {
              name: "Γυρίσματα",
              clips: [
                { id: "a", label: "Κυψέλη", from: 9, to: 9, tone: "ok" },
                {
                  id: "b",
                  label: "Κυψέλη 24/09",
                  from: 24,
                  to: 24,
                  tone: "strong",
                },
              ],
            },
            {
              name: "Παραδοτέα",
              clips: [
                {
                  id: "c",
                  label: "Reel 3 · Έκδοση 2",
                  from: 15,
                  to: 21,
                  tone: "strong",
                },
                {
                  id: "d",
                  label: "Reel 5",
                  from: 12,
                  to: 18,
                  tone: "attention",
                },
              ],
            },
            {
              name: "Περίοδος",
              clips: [
                { id: "e", label: "Σεπτέμβριος · 900 €", from: 1, to: 30 },
              ],
            },
          ]}
        />
      </Specimen>
      <Specimen
        id="steps"
        title="Βήματα"
        origin="Χρωματική διόρθωση · κόμβοι"
        when="Μια διαδικασία με σταθερή σειρά: τι έγινε, πού είμαστε, τι μένει."
      >
        <Steps
          label="Πορεία Παραδοτέου"
          steps={[
            { label: "Γύρισμα", hint: "09/09", state: "done" },
            { label: "Μοντάζ", hint: "Έκδοση 2", state: "done" },
            { label: "Έλεγχος", hint: "Ιδιοκτήτης", state: "current" },
            { label: "Πελάτης", hint: "γύρος 1 από 2", state: "todo" },
            { label: "Παράδοση", state: "todo" },
          ]}
        />
      </Specimen>
      <Specimen
        id="states"
        title="Άδεια κατάσταση και σφάλμα"
        origin="Μοντάζ"
        when="Η άδεια λέει γιατί είναι άδεια και τι κάνεις. Το σφάλμα λέει ότι δεν χάθηκε τίποτα και τι να δοκιμάσεις."
      >
        <div className="grid2">
          <section className="card notice">
            <h3>Κανένα Τιμολόγιο ακόμα</h3>
            <p className="muted">
              Μόλις καταχωρίσεις το πρώτο, θα εμφανιστεί εδώ.
            </p>
            <button type="button" className="button" data-primary="true">
              Καταχώρηση Τιμολογίου
            </button>
          </section>
          <section className="card notice" data-kind="error">
            <h3>Δεν φόρτωσαν τα Τιμολόγια</h3>
            <p className="muted">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
          </section>
        </div>
      </Specimen>
    </>
  );
}
