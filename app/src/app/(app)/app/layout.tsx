import type { ReactNode } from "react";

import {
  ClientSwitcher,
  can,
  getViewer,
  isOwner,
  listMemberships,
  type MembershipRow,
  type Viewer,
} from "@/modules/access";
import { SpacesAssistant } from "@/modules/assistant";
import { NotificationBell, getBell } from "@/modules/notifications";
import { getLogoVersion } from "@/modules/settings";
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

// Λογαριασμός χωρίς ομάδα και χωρίς Πελάτη: συνήθως Χρήστης πελάτη που δεν έχει ακόμα συνδεθεί με την επιχείρησή του
// (ή που αφαιρέθηκε). Μιλά στον πελάτη, όχι στην ομάδα.
const NO_ACCESS_NOTICE =
  "Ο λογαριασμός σου δεν έχει ακόμα συνδεθεί με την επιχείρησή σου. Μόλις η εταιρεία σε προσκαλέσει, θα βλέπεις εδώ τη δουλειά σας.";

// Τι λέει η γραμμή κάτω από τη μπάρα όταν κάτι δεν επιτρέπει την κανονική δουλειά.
const noticeText = (viewer: Viewer, memberships: readonly MembershipRow[]): string | null =>
  viewer.status === "unconfigured"
    ? "Η βάση δεν έχει συνδεθεί ακόμα: βλέπεις το σύστημα χωρίς δεδομένα."
    : viewer.status === "signed-in" && !viewer.team && memberships.length === 0
      ? NO_ACCESS_NOTICE
      : null;

// Το όνομα στο avatar του μενού προφίλ.
const nameOf = (viewer: Viewer): string =>
  viewer.status === "signed-in" ? (viewer.team?.name ?? viewer.email) : "Επισκέπτης";

// Το κέλυφος του συστήματος (πίσω από το /login): οι Χώροι, η μόνη εμφάνιση.
export default async function AppLayout({ children }: { children: ReactNode }) {
  // Α9: καμπανάκι για ομάδα και πελάτη· null όταν ο Χρήστης δεν έχει Ειδοποιήσεις. Ζητείται μαζί με τον θεατή
  // (το /app το βλέπει μόνο συνδεδεμένος, το proxy στέλνει τους άλλους στο /login).
  // e1: και η έκδοση του λογότυπου της εταιρείας για τη μπάρα.
  const [viewer, bellResult, logoVersion] = await Promise.all([getViewer(), getBell(), getLogoVersion()]);
  const memberships = viewer.status === "signed-in" && !viewer.team ? await listMemberships() : null;
  const clientRows = memberships?.ok ? memberships.data : [];
  const bell = viewer.status === "signed-in" ? bellResult : null;
  // Χωρίς βάση φαίνονται όλες οι οθόνες, για να περιηγείται κανείς το σύστημα· η καθεμία λέει ότι λείπει η βάση.
  // A9: ο Βοηθός για Χρήστη ομάδας και για Χρήστη πελάτη με Πελάτη (η βάση ξαναελέγχει σε κάθε ερώτηση).
  const assistantAudience =
    viewer.status !== "signed-in" ? null : viewer.team ? "team" : clientRows.length > 0 ? "client" : null;
  const allows = (requirement: string) =>
    viewer.status === "unconfigured" ? true : allowsRequirement(viewer, requirement);
  const model = spacesModel(allows);
  const tools = {
    search: searchItemsFor(allows),
    entry: newEntryFor(allows),
    tools: model.tools,
    profile: model.profile,
    bell: bell?.ok && bell.data ? <NotificationBell initial={bell.data} /> : null,
    clientSwitcher: clientRows.length > 1 ? <ClientSwitcher memberships={clientRows} /> : null,
    name: nameOf(viewer),
    canSignOut: viewer.status === "signed-in",
  };
  return (
    <SpacesShell model={model} tools={tools} notice={noticeText(viewer, clientRows)} assistant={assistantAudience && <SpacesAssistant audience={assistantAudience} />} logoVersion={logoVersion}>
      {children}
    </SpacesShell>
  );
}
