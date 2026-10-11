import { Badge } from "@/components/ui/badge";

import { NO_REMINDER_TEXT } from "../labels";
import { reminderText } from "../helpers";

interface ToInvoiceRemindersProps {
  days: readonly number[];
}

// Σήματα «7 μ.» και «14 μ.»: μόνο για υπενθυμίσεις που έχουν ήδη περάσει. Είναι ενδείξεις, όχι κλείδωμα.
export function ToInvoiceReminders({ days }: ToInvoiceRemindersProps) {
  if (days.length === 0)
    return <span className="text-muted-foreground">{NO_REMINDER_TEXT}</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {days.map((day) => (
        <Badge key={day} tone="attention">
          {reminderText(day)}
        </Badge>
      ))}
    </span>
  );
}
