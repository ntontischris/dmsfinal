import { can, isClientViewer, type Viewer } from "@/modules/access";

// Τι δικαιούται ο θεατής στα Μηνύματα: η ομάδα με «Συνομιλεί με πελάτη» έχει Εισερχόμενα και Συνομιλίες. Ο Χρήστης πελάτη
// θα έχει τη δική του όψη στο Jβ. Η βάση ξαναελέγχει σε κάθε RPC.
export interface MessagesCaps {
  canChat: boolean;
  isClient: boolean;
  canOpenClient: boolean;
  // «Μεταβιβάζει Υπεύθυνο»: βλέπει το «χωρίς υπεύθυνο» και αλλάζει υπεύθυνο Αιτημάτων.
  canTransfer: boolean;
}

const isTeam = (viewer: Viewer): boolean =>
  viewer.status === "signed-in" && viewer.team !== null;

export const messagesCaps = (viewer: Viewer): MessagesCaps => ({
  canChat: isTeam(viewer) && can(viewer, "messages.chat"),
  isClient: isClientViewer(viewer),
  canOpenClient: isTeam(viewer) && can(viewer, "clients.view"),
  canTransfer: isTeam(viewer) && can(viewer, "clients.transfer"),
});

// Ποια όψη των Μηνυμάτων βλέπει ο θεατής (όπως στα Οικονομικά): ομάδα (Εισερχόμενα), Χρήστης πελάτη με «Βλέπει Συνομιλία», ή καμία.
export type MessagesView = "team" | "client" | "none";

export const messagesViewOf = (viewer: Viewer): MessagesView => {
  if (isClientViewer(viewer))
    return can(viewer, "c.chatRead") ? "client" : "none";
  return messagesCaps(viewer).canChat ? "team" : "none";
};
