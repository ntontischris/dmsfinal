import type { DoneCode } from "../assistant-helpers";
import { DONE_TEXT } from "../assistant-labels";

// Το μήνυμα μετά από μια ενέργεια που γύρισε στη λίστα (?done=…).
export function DoneNotice({ done }: { done: DoneCode | null }) {
  if (!done) return null;
  return (
    <p
      role="status"
      className="m-0 rounded-md border bg-card px-3 py-2 text-sm"
    >
      {DONE_TEXT[done]}
    </p>
  );
}
