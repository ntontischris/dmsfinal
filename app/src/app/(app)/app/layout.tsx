import Link from "next/link";
import type { ReactNode } from "react";

import type { Look } from "@/components/shell/look";
import { LookToggle } from "@/components/shell/look-toggle";
import { visibleNav } from "@/components/shell/nav";
import { canChooseLook, readLook } from "@/components/shell/read-look";
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
import { AssistantLauncher, SpacesAssistant } from "@/modules/assistant";
import { NotificationBell, getBell } from "@/modules/notifications";
import { newEntryFor } from "@/spaces/data/new-actions";
import { searchItemsFor } from "@/spaces/data/search";
import { spacesModel } from "@/spaces/data/spaces";
import { SpacesShell } from "@/spaces/shell/spaces-shell";

// «owner», «team» και «client» δεν είναι Δικαιώματα· όλα τα άλλα ελέγχονται ως Δικαιώματα (ομάδας ή πελάτη).
const allowsRequirement = (viewer: Viewer, requirement: string): boolean => {
  if (requirement === "owner") return isOwner(viewer);
  if (requirement === "team") return viewer.status === "signed-in" && viewer.team !== null;
  if (requirement === "client") return viewer.status === "signed-in" && viewer.team === null;
  return can(viewer, requirement);
};

// Τι λέει η γραμμή κάτω από τη μπάρα όταν κάτι δεν επιτρέπει την κανονική δουλειά.
const noticeText = (viewer: Viewer, memberships: readonly MembershipRow[]): string | null =>
  viewer.status === "unconfigured"
    ? "Η βάση δεν έχει συνδεθεί ακόμα: βλέπεις το σύστημα χωρίς δεδομένα."
    : viewer.status === "signed-in" && !viewer.team && memberships.length === 0
      ? "Ο λογαριασμός σου δεν έχει ακόμα πρόσβαση στην ομάδα. Ζήτησε πρόσκληση από τον Ιδιοκτήτη."
      : null;

function ViewerNotice({ viewer, memberships }: { viewer: Viewer; memberships: readonly MembershipRow[] }) {
  const text = noticeText(viewer, memberships);
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

// Το όνομα στο avatar του μενού προφίλ.
const nameOf = (viewer: Viewer): string =>
  viewer.status === "signed-in" ? (viewer.team?.name ?? viewer.email) : "Επισκέπτης";

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
  if (look === "spaces") {
    const model = spacesModel(allows);
    const tools = {
      search: searchItemsFor(allows),
      entry: newEntryFor(allows),
      tools: model.tools,
      profile: model.profile,
      bell: bell?.ok && bell.data ? <NotificationBell initial={bell.data} /> : null,
      clientSwitcher: clientRows.length > 1 ? <ClientSwitcher memberships={clientRows} /> : null,
      name: nameOf(viewer),
      look,
      canSignOut: viewer.status === "signed-in",
    };
    return (
      <SpacesShell model={model} tools={tools} notice={noticeText(viewer, clientRows)} assistant={assistantAudience && <SpacesAssistant audience={assistantAudience} />}>
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
      {assistantAudience && <AssistantLauncher audience={assistantAudience} />}
    </div>
  );
}
