import type { ReactNode } from "react";

import { openNotification } from "../actions";

// Το «Άνοιγμα» μιας Ειδοποίησης: φόρμα με ένα κουμπί (POST), ώστε κανένα prefetch να μη τη σημειώνει διαβασμένη.
export function OpenButton({
  id,
  className,
  onSubmit,
  children,
}: {
  id: string;
  className?: string;
  onSubmit?: () => void;
  children: ReactNode;
}) {
  return (
    <form action={openNotification} onSubmit={onSubmit} className="contents">
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
