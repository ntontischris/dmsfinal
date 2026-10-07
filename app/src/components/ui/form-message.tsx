import type { FormState } from "@/lib/form-state";

// Το μήνυμα μιας φόρμας εισόδου: λάθος σε κόκκινο, ενημέρωση ουδέτερη. Ανακοινώνεται στους αναγνώστες οθόνης.
export function FormMessage({ state }: { state: FormState }) {
  if (state.error)
    return (
      <p role="alert" className="m-0 text-sm text-destructive">
        {state.error}
      </p>
    );
  if (state.notice)
    return (
      <p role="status" className="m-0 rounded-sm border bg-muted px-3 py-2 text-sm">
        {state.notice}
      </p>
    );
  return null;
}
