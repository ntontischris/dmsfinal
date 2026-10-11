import { can, isClientViewer, type Viewer } from "@/modules/access";

// Τι δικαιούται ο θεατής στα Μηνύματα: η ομάδα με «Συνομιλεί με πελάτη» έχει Εισερχόμενα και Συνομιλίες. Ο Χρήστης πελάτη
// θα έχει τη δική του όψη στο Jβ. Η βάση ξαναελέγχει σε κάθε RPC.
export interface MessagesCaps {
  canChat: boolean;
  isClient: boolean;
  canOpenClient: boolean;
}

const isTeam = (viewer: Viewer): boolean =>
  viewer.status === "signed-in" && viewer.team !== null;

export const messagesCaps = (viewer: Viewer): MessagesCaps => ({
  canChat: isTeam(viewer) && can(viewer, "messages.chat"),
  isClient: isClientViewer(viewer),
  canOpenClient: isTeam(viewer) && can(viewer, "clients.view"),
});
