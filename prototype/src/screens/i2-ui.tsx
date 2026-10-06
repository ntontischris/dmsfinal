import { Badge } from "@/screens/shared";

export function CsvButton() {
  return (
    <button
      type="button"
      className="button"
      title="Prototype: δεν κατεβαίνει αρχείο"
    >
      Εξαγωγή CSV
    </button>
  );
}

export function PdfLink({ pdf }: { pdf: string }) {
  return (
    <a href="#" title={pdf}>
      PDF
    </a>
  );
}

export function VoidedBadge() {
  return <Badge tone="attention">ακυρώθηκε</Badge>;
}
