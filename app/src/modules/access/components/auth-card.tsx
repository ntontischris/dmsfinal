import type { ReactNode } from "react";

// Το πλαίσιο των σελίδων εισόδου: η «λυχνία», ένας τίτλος, ένα πάνελ.
export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <section className="w-full max-w-sm overflow-hidden rounded-md border bg-card">
        <header className="flex items-center gap-2 border-b bg-muted px-4 py-2">
          <span aria-hidden="true" className="size-2 rounded-full bg-destructive shadow-[0_0_8px_var(--destructive)]" />
          <span className="kit-label">DMS</span>
        </header>
        <div className="grid gap-4 p-5">
          <h1 className="m-0 text-2xl font-medium tracking-tight">{title}</h1>
          {children}
        </div>
      </section>
    </main>
  );
}
