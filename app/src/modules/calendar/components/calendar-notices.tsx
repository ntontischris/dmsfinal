import { Notice } from "@/components/ui/notice";

// Οι καταστάσεις που δεν είναι φόρμα: η βάση δεν απάντησε, ή το στοιχείο δεν υπάρχει (ή δεν το βλέπεις).

export function LoadNotice() {
  return (
    <Notice kind="error" title="Δεν φόρτωσε">
      <p className="m-0">Δοκίμασε ξανά σε λίγο.</p>
    </Notice>
  );
}

export function MissingNotice() {
  return <Notice kind="empty" title="Ο κλεισμένος χρόνος δεν βρέθηκε" />;
}
