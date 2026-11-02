import type { ReactNode } from "react";

import type { FormState } from "@/lib/form-state";

// Το μήνυμα της κάρτας εισόδου (prototype `Msg` του `screens/r9-card.tsx`): λάθος ως alert, ενημέρωση ως status.
export function Msg({
  kind,
  children,
}: {
  kind: "error" | "info";
  children: ReactNode;
}) {
  return (
    <p
      className="r-msg"
      data-kind={kind}
      role={kind === "error" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}

// Η απάντηση μιας φόρμας (server action) στη μορφή του Msg.
export function FormMsg({ state }: { state: FormState<unknown> }) {
  if (state.error) return <Msg kind="error">{state.error}</Msg>;
  if (state.notice) return <Msg kind="info">{state.notice}</Msg>;
  return null;
}
