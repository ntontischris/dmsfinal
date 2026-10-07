// Δείγμα γραμμής από το αρχείο συναινέσεων (ADR 0016): ανά επιλογή, ημερομηνία και έκδοση πολιτικής.
export function ConsentLog({ version }: { version: string }) {
  return (
    <section style={{ marginTop: "var(--space-4)" }}>
      <h3>Αρχείο συναινέσεων (δείγμα)</h3>
      <p className="r-form-note">
        Κάθε επιλογή και κάθε αλλαγή γράφεται με ημερομηνία και έκδοση
        πολιτικής. Δεν αποθηκεύεται όνομα ή email.
      </p>
      <div className="r-log">
        {`2026-09-20 11:32  Απαραίτητα: ναι · Στατιστικά: ναι · Marketing: όχι  · πολιτική ${version}`}
      </div>
    </section>
  );
}
