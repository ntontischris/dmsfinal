import Link from "next/link";
import type { ReactNode } from "react";

import { visibleNav } from "@/components/shell/nav";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import {
  ClientSwitcher,
  SignOutButton,
  can,
  getViewer,
  isOwner,
  listMemberships,
  type MembershipRow,
  type Viewer,
} from "@/modules/access";

// Μια γραμμή κάτω από τη μπάρα όταν κάτι δεν επιτρέπει την κανονική δουλειά.
function ViewerNotice({ viewer, memberships }: { viewer: Viewer; memberships: readonly MembershipRow[] }) {
  const text =
    viewer.status === "unconfigured"
      ? "Η βάση δεν έχει συνδεθεί ακόμα: βλέπεις το σύστημα χωρίς δεδομένα."
      : viewer.status === "signed-in" && !viewer.team && memberships.length === 0
        ? "Ο λογαριασμός σου δεν έχει ακόμα πρόσβαση στην ομάδα. Ζήτησε πρόσκληση από τον Ιδιοκτήτη."
        : null;
  if (!text) return null;
  return (
    <p
      role="status"
      className="m-0 border-b border-primary/40 bg-primary/10 px-4 py-2 text-sm"
    >
      {text}
    </p>
  );
}

// Το κέλυφος του συστήματος (πίσω από το /login): μπάρα με τη «λυχνία», πλαϊνή πλοήγηση, περιεχόμενο.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer();
  const memberships = viewer.status === "signed-in" && !viewer.team ? await listMemberships() : null;
  const clientRows = memberships?.ok ? memberships.data : [];
  // Χωρίς βάση φαίνονται όλες οι οθόνες, για να περιηγείται κανείς το σύστημα· η καθεμία λέει ότι λείπει η βάση.
  const sections = visibleNav((requirement) =>
    viewer.status === "unconfigured" ? true : requirement === "owner" ? isOwner(viewer) : can(viewer, requirement),
  );
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
        <div className="flex flex-wrap items-center gap-2">
          {clientRows.length > 1 && <ClientSwitcher memberships={clientRows} />}
          {viewer.status === "signed-in" && (
            <span className="text-sm text-muted-foreground">
              {viewer.team?.name ?? viewer.email}
            </span>
          )}
          <ThemeToggle />
          {viewer.status === "signed-in" && <SignOutButton />}
        </div>
      </header>
      <ViewerNotice viewer={viewer} memberships={clientRows} />
      <div className="grid md:grid-cols-[15rem_1fr]">
        <aside className="order-2 border-t bg-card p-3 md:order-none md:min-h-[calc(100dvh-3rem)] md:border-t-0 md:border-r">
          <SidebarNav sections={sections} />
        </aside>
        <main className="w-full min-w-0 max-w-6xl p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
