import { Specimen } from "./specimen";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Inspector, Split } from "@/components/ui/inspector";
import { Notice } from "@/components/ui/notice";
import { Panel, StatGrid } from "@/components/ui/panel";
import { Rows } from "@/components/ui/rows";
import { Steps } from "@/components/ui/steps";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Timeline } from "@/components/ui/timeline";

// Δομικά: δείκτες, πάνελ, λίστες, πίνακας, πλαϊνή στήλη, timeline, βήματα, καταστάσεις. Φανταστικά δεδομένα.

const INVOICES: readonly [
  string,
  string,
  string,
  string,
  string,
  Tone,
  string,
][] = [
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
];

function InvoiceTable() {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Αριθμός</Th>
          <Th>Πελάτης</Th>
          <Th>Έκδοση</Th>
          <Th isNumeric>Σύνολο</Th>
          <Th isNumeric>Υπόλοιπο</Th>
          <Th>Κατάσταση</Th>
        </tr>
      </thead>
      <tbody>
        {INVOICES.map(([code, client, date, total, rest, tone, status]) => (
          <Tr key={code}>
            <Td data-label="Αριθμός" className="font-mono">
              {code}
            </Td>
            <Td data-label="Πελάτης">{client}</Td>
            <Td data-label="Έκδοση">{date}</Td>
            <Td data-label="Σύνολο" isNumeric>
              {total}
            </Td>
            <Td data-label="Υπόλοιπο" isNumeric>
              {rest}
            </Td>
            <Td data-label="Κατάσταση">
              <Badge tone={tone}>{status}</Badge>
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}

export function Blocks() {
  return (
    <>
      <Specimen
        id="stats"
        title="Κάρτες δεικτών"
        origin="Τεχνικό δελτίο"
        when="Ένας αριθμός που απαντά μία ερώτηση, με σύνδεσμο στη λίστα πίσω του. Στην κορυφή μιας οθόνης, 2 έως 4."
      >
        <StatGrid
          items={[
            {
              label: "Προς τιμολόγηση",
              value: "900 €",
              hint: "Κυψέλη, Σεπτέμβριος",
              tone: "strong",
            },
            {
              label: "Ληξιπρόθεσμα",
              value: "616 €",
              hint: "Α-58, από 19/08",
              tone: "attention",
            },
            {
              label: "Γυρίσματα εβδομάδας",
              value: "3",
              hint: "1 αναμένει έγκριση",
            },
            { label: "Εισπράξεις μήνα", value: "2.112 €", tone: "ok" },
          ]}
        />
      </Specimen>
      <Specimen
        id="panel"
        title="Πάνελ"
        origin="Μοντάζ"
        when="Ομάδα πληροφορίας με κεφαλίδα-ετικέτα."
      >
        <Panel label="Αιτήματα για εσένα" aside="2">
          <p className="m-0">Η Μαρία ζητά τρίτο Γύρισμα τον Σεπτέμβριο.</p>
        </Panel>
      </Specimen>
      <Specimen
        id="rows"
        title="Γραμμές λίστας"
        origin="Φως"
        when="Λίστες όπου μετρά ο τίτλος (Πελάτες, Ευκαιρίες, Δουλειές). Για σύγκριση αριθμών, πίνακας."
      >
        <Rows
          items={[
            {
              id: "1",
              title: "Μηνιαία Παρουσία",
              meta: "Κυψέλη Καφέ · ως 31/12",
              aside: (
                <>
                  <span className="tabular-nums">900 €/μήνα</span>
                  <Badge tone="ok">ενεργή</Badge>
                </>
              ),
            },
            {
              id: "2",
              title: "Βίντεο εγκαινίων",
              meta: "Πρόταση · ισχύει ως 02/10",
              aside: (
                <>
                  <span className="tabular-nums">1.200 €</span>
                  <Badge tone="strong">περιμένει υπογραφή</Badge>
                </>
              ),
            },
            {
              id: "3",
              title: "Ανανέωση 2027",
              meta: "Πρώτη επαφή · κλήση 20/10",
              aside: <span className="tabular-nums">1.300 €/μήνα</span>,
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
        <InvoiceTable />
      </Specimen>
      <Specimen
        id="inspector"
        title="Πλαϊνή στήλη ιδιοτήτων"
        origin="Μοντάζ · «Πληροφορίες κλιπ»"
        when="Η ταυτότητα ενός αντικειμένου με μια ματιά, δίπλα στο περιεχόμενό του. Σε κινητό ανεβαίνει πάνω."
      >
        <Split>
          <Inspector
            code="Γ-0912"
            title="Γύρισμα 24/09"
            fields={[
              { label: "Πελάτης", value: "Κυψέλη Καφέ" },
              {
                label: "Κατάσταση",
                value: <Badge tone="strong">αναμένει έγκριση</Badge>,
              },
              { label: "Ώρα", value: "10:00 – 13:00" },
              { label: "Συνεργείο", value: "Άρης, Λένα" },
            ]}
          >
            <Button variant="primary">Εγκρίνω</Button>
            <Button>Απορρίπτω</Button>
          </Inspector>
          <Panel label="Περιεχόμενο">
            <p className="m-0 text-sm text-muted-foreground">
              Καρτέλες, λίστες ή πίνακες του αντικειμένου.
            </p>
          </Panel>
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
                { id: "a", label: "Κυψέλη 09/09", from: 9, to: 9, tone: "ok" },
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
                  from: 10,
                  to: 14,
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
        when="Η άδεια λέει γιατί είναι άδεια και τι κάνεις. Το σφάλμα λέει ότι δεν χάθηκε τίποτα."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Notice kind="empty" title="Κανένα Τιμολόγιο ακόμα">
            <p className="m-0">
              Μόλις καταχωρίσεις το πρώτο, θα εμφανιστεί εδώ.
            </p>
            <Button variant="primary">Καταχώρηση Τιμολογίου</Button>
          </Notice>
          <Notice kind="error" title="Δεν φόρτωσαν τα Τιμολόγια">
            <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
          </Notice>
        </div>
      </Specimen>
    </>
  );
}
