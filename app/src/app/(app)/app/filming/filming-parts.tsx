import { Notice } from "@/components/ui/notice";

// Το σφάλμα φόρτωσης των Γυρισμάτων (το χρησιμοποιεί η Κράτηση).
export function LoadError({
  title = "Δεν φόρτωσαν τα Γυρίσματα",
}: {
  title?: string;
}) {
  return (
    <Notice kind="error" title={title}>
      <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
    </Notice>
  );
}
