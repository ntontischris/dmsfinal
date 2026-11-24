import { Suspense, type ReactNode } from "react";

import { ExpenseNumbers } from "@/modules/costs";
import { FinanceNumbers } from "@/modules/finance";

// Τα Τιμολόγια: οι αριθμοί των καρτών φορτώνουν δίπλα στη σελίδα, χωρίς να την κρατούν.
export default function FinanceLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <FinanceNumbers />
      </Suspense>
      <Suspense fallback={null}>
        <ExpenseNumbers />
      </Suspense>
    </>
  );
}
