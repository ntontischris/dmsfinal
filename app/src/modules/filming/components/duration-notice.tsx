import { Notice } from "@/components/ui/notice";

import { isAboveDefault } from "../helpers";
import type { ProvisionMeasure } from "../types";

interface DurationNoticeProps {
  hours: number;
  measure: ProvisionMeasure;
  defaultHours: number | null;
}

// Η προειδοποίηση διάρκειας: πάνω από τη διάρκεια του είδους, το επιπλέον είναι έξτρα. Δεν μπλοκάρει.
export function DurationNotice({ hours, measure, defaultHours }: DurationNoticeProps) {
  if (!isAboveDefault(hours, measure, defaultHours)) return null;
  return (
    <Notice kind="empty" title="Πάνω από τη διάρκεια του είδους">
      <p className="m-0">Το επιπλέον είναι έξτρα.</p>
    </Notice>
  );
}
