"use client";

// «Εκτύπωση / Αποθήκευση ως PDF» του εγγράφου, όπως στον Σύνδεσμο πρότασης (D5).
export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className="button" onClick={() => window.print()}>
      {label}
    </button>
  );
}
