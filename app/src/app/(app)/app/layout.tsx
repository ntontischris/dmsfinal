import Link from "next/link";
import type { ReactNode } from "react";

import type { Look } from "@/components/shell/look";
import { LookToggle } from "@/components/shell/look-toggle";
import { visibleNav } from "@/components/shell/nav";
import { readLook } from "@/components/shell/read-look";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { spacesShell, type SpaceLink } from "@/components/shell/spaces";
import { SpacesShell } from "@/components/shell/spaces-shell";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { ToolLink } from "@/components/shell/tool-link";
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
import { AssistantLauncher } from "@/modules/assistant";
import { NotificationBell, getBell } from "@/modules/notifications";

type Bell = Awaited<ReturnType<typeof getBell>> | null;

// «owner», «team» και «client» δεν είναι Δικαιώματα· όλα τα άλλα ελέγχονται ως Δικαιώματα (ομάδας ή πελάτη).
const allowsRequirement = (viewer: Viewer, requirement: string): boolean => {
  if (requirement === "owner") return isOwner(viewer);
  if (requirement === "team") return viewer.status === "signed-in" && viewer.team !== null;
  if (requirement === "client") return viewer.status === "signed-in" && viewer.team === null;
  return can(viewer, requirement);
};

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

// Η νέα εμφάνιση είναι για την ομάδα (και για την περιήγηση χωρίς βάση)· ο Χρήστης πελάτη μένει στην παλιά προς το παρόν.
const canChooseLook = (viewer: Viewer): boolean =>
  viewer.status === "unconfigured" || (viewer.status === "signed-in" && viewer.team !== null);

// Τα εργαλεία πάνω δεξιά της νέας εμφάνισης. Χωρίς καμπανάκι, οι Ειδοποιήσεις μένουν σύνδεσμος, για να μη χαθούν.
function SpacesTools({ viewer, look, bell, tools, clientRows }: {
  viewer: Viewer;
  look: Look;
  bell: Bell;
  tools: readonly SpaceLink[];
  clientRows: readonly MembershipRow[];
}) {
  const notifications = tools.find((tool) => tool.code === "A2");
  const knowledge = tools.find((tool) => tool.code === "A8");
  return (
    <>
      {clientRows.length > 1 && <ClientSwitcher memberships={clientRows} />}
      {bell?.ok && bell.data ? (
        <NotificationBell initial={bell.data} />
      ) : (
        notifications && <ToolLink href={notifications.href} icon="bell" label={notifications.label} />
      )}
      {knowledge && <ToolLink href={knowledge.href} icon="book" label={knowledge.label} />}
      <ThemeToggle />
      <LookToggle look={look} />
      {viewer.status === "signed-in" && <SignOutButton />}
    </>
  );
}

// Το κέλυφος του συστήματος (πίσω από το /login): μπάρα με τη «λυχνία», πλαϊνή πλοήγηση, περιεχόμενο.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer();
  const memberships = viewer.status === "signed-in" && !viewer.team ? await listMemberships() : null;
  const clientRows = memberships?.ok ? memberships.data : [];
  // Α9: καμπανάκι για ομάδα και πελάτη· null όταν ο Χρήστης δεν έχει Ειδοποιήσεις.
  const bell = viewer.status === "signed-in" ? await getBell() : null;
  // Χωρίς βάση φαίνονται όλες οι οθόνες, για να περιηγείται κανείς το σύστημα· η καθεμία λέει ότι λείπει η βάση.
  // A9: ο Βοηθός για Χρήστη ομάδας και για Χρήστη πελάτη με Πελάτη (η βάση ξαναελέγχει σε κάθε ερώτηση).
  const assistantAudience =
    viewer.status !== "signed-in" ? null : viewer.team ? "team" : clientRows.length > 0 ? "client" : null;
  const allows = (requirement: string) =>
    viewer.status === "unconfigured" ? true : allowsRequirement(viewer, requirement);
  const isLookChoosable = canChooseLook(viewer);
  const look: Look = isLookChoosable ? await readLook() : "classic";
  const assistant = assistantAudience && <AssistantLauncher audience={assistantAudience} />;
  if (look === "spaces") {
    const shell = spacesShell(allows);
    return (
      <SpacesShell
        shell={shell}
        tools={<SpacesTools viewer={viewer} look={look} bell={bell} tools={shell.tools} clientRows={clientRows} />}
        notice={<ViewerNotice viewer={viewer} memberships={clientRows} />}
        assistant={assistant}
      >
        {children}
      </SpacesShell>
    );
  }
  const sections = visibleNav(allows);
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
          {bell?.ok && bell.data && <NotificationBell initial={bell.data} />}
          <ThemeToggle />
          {isLookChoosable && <LookToggle look={look} />}
          {viewer.status === "signed-in" && <SignOutButton />}
        </div>
      </header>
      <ViewerNotice viewer={viewer} memberships={clientRows} />
      <div className="grid md:grid-cols-[15rem_1fr]">
        <aside className="order-2 border-t bg-card p-3 md:order-none md:min-h-[calc(100dvh-3rem)] md:border-t-0 md:border-r">
          <SidebarNav sections={sections} />
        </aside>
        <main className="w-full min-w-0 max-w-6xl p-4 pb-16 md:p-6 md:pb-16">{children}</main>
      </div>
      {assistant}
    </div>
  );
}
