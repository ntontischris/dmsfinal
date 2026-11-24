"use client";

// Όταν κάτι στα Οικονομικά σπάσει (σελίδα ή αποθήκευση), μήνυμα στα ελληνικά αντί για την αγγλική σελίδα του Next.js.
export default function FinanceError({ reset }: { reset: () => void }) {
  return (
    <div data-spaces>
      <section className="card notice" data-kind="error" role="alert">
        <h2>Κάτι πήγε στραβά</h2>
        <div className="muted">
          <p>
            Η σελίδα δεν ολοκληρώθηκε. Αν αποθήκευες κάτι, έλεγξε στη λίστα αν
            καταχωρήθηκε πριν το ξαναπεράσεις.
          </p>
        </div>
        <button
          type="button"
          className="button"
          data-primary="true"
          onClick={reset}
        >
          Δοκίμασε ξανά
        </button>
      </section>
    </div>
  );
}
