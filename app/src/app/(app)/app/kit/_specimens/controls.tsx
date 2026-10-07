import { Specimen } from "./specimen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Segmented, Tabs } from "@/components/ui/segmented";

// Χειριστήρια: κουμπιά, πεδία, φίλτρα, καρτέλες, σήματα.
export function Controls({ filter }: { filter: string }) {
  const href = (value: string) => `/app/kit?f=${value}#filters`;
  return (
    <>
      <Specimen
        id="buttons"
        title="Κουμπιά"
        origin="Μοντάζ · «Εξαγωγή»"
        when="Ένα κύριο (amber) ανά περιοχή: η ενέργεια που περιμένει η οθόνη. Τα υπόλοιπα ουδέτερα. Κόκκινο περίγραμμα μόνο για ό,τι δεν αναιρείται."
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="primary">Εγκρίνω το Γύρισμα</Button>
          <Button>Απορρίπτω με λόγο</Button>
          <Button variant="danger">Ακύρωση Τιμολογίου</Button>
          <Button disabled>Χωρίς Δικαίωμα</Button>
        </div>
      </Specimen>
      <Specimen
        id="fields"
        title="Πεδία"
        origin="Μοντάζ"
        when="Ετικέτα πάνω από το πεδίο, πάντα ορατή. Η εστίαση φαίνεται με το χρώμα έμφασης."
      >
        <div className="grid gap-3">
          <Field label="Πελάτης">
            <Input defaultValue="Κυψέλη Καφέ" />
          </Field>
          <Field label="Ποσό χωρίς ΦΠΑ" hint="Με κόμμα για τα δεκαδικά.">
            <Input
              defaultValue="900,00"
              inputMode="decimal"
              className="tabular-nums"
            />
          </Field>
          <Field label="Τρόπος είσπραξης">
            <Select defaultValue="bank">
              <option value="bank">Τραπεζική μεταφορά</option>
              <option value="cash">Μετρητά</option>
            </Select>
          </Field>
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
              href: href("all"),
              isCurrent: filter === "all",
              count: 14,
            },
            {
              label: "Ανεξόφλητα",
              href: href("open"),
              isCurrent: filter === "open",
              count: 3,
            },
            {
              label: "Ληξιπρόθεσμα",
              href: href("late"),
              isCurrent: filter === "late",
              count: 1,
            },
            {
              label: "Πιστωτικά",
              href: href("credit"),
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
        when="Ενότητες του ίδιου αντικειμένου. Σε κινητό κυλούν οριζόντια μέσα τους."
      >
        <Tabs
          label="Δείγμα καρτελών"
          options={[
            { label: "Στοιχεία", href: "#tabs", isCurrent: true },
            { label: "Ευκαιρίες", href: "#tabs", isCurrent: false },
            { label: "Συμφωνίες", href: "#tabs", isCurrent: false },
            { label: "Καρτέλα Πελάτη", href: "#tabs", isCurrent: false },
          ]}
        />
      </Specimen>
      <Specimen
        id="badges"
        title="Σήματα κατάστασης"
        origin="Ρεζί · tally"
        when="Λυχνία + λέξη. Κόκκινο = πρόβλημα, amber = σειρά σου, πράσινο = έτοιμο, ουδέτερο = πληροφορία."
      >
        <div className="flex flex-wrap gap-2">
          <Badge tone="attention">ληξιπρόθεσμο</Badge>
          <Badge tone="strong">αναμένει έγκριση</Badge>
          <Badge tone="ok">εξοφλημένο</Badge>
          <Badge>πιστωτικό</Badge>
        </div>
      </Specimen>
    </>
  );
}
