import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

// Άδεια κατάσταση: γιατί είναι άδεια και τι κάνεις. Σφάλμα: δεν χάθηκε τίποτα, τι να δοκιμάσεις.
interface NoticeProps {
  kind: "empty" | "error";
  title: string;
  children?: ReactNode;
}

export function Notice({ kind, title, children }: NoticeProps) {
  return (
    <section
      role={kind === "error" ? "alert" : undefined}
      className={cn(
        "grid justify-items-center gap-2 rounded-md border bg-card px-4 py-6 text-center",
        kind === "error" ? "border-destructive/60" : "border-dashed",
      )}
    >
      <h3 className="m-0 text-base font-semibold">{title}</h3>
      {children && (
        <div className="grid justify-items-center gap-3 text-sm text-muted-foreground">
          {children}
        </div>
      )}
    </section>
  );
}
