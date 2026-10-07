import Link from "next/link";
import type { ReactNode } from "react";

import { SidebarNav } from "@/components/shell/sidebar-nav";
import { ThemeToggle } from "@/components/shell/theme-toggle";

// Το κέλυφος του συστήματος (πίσω από το /login): μπάρα με τη «λυχνία», πλαϊνή πλοήγηση, περιεχόμενο.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-2">
        <Link
          href="/app"
          className="inline-flex items-center gap-2 text-[0.8rem] font-semibold tracking-[0.12em] uppercase no-underline"
        >
          <span
            aria-hidden="true"
            className="size-2.5 rounded-full bg-destructive shadow-[0_0_8px_var(--destructive)]"
          />
          DMS
        </Link>
        <ThemeToggle />
      </header>
      <div className="grid md:grid-cols-[15rem_1fr]">
        <aside className="order-2 border-t bg-card p-3 md:order-none md:min-h-[calc(100dvh-3rem)] md:border-t-0 md:border-r">
          <SidebarNav />
        </aside>
        <main className="w-full min-w-0 max-w-6xl p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
