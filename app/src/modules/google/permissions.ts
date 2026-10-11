import { can, isOwner, type Viewer } from "@/modules/access";

// Η ρύθμιση του ημερολογίου (δημιουργία, συγχρονισμός τώρα) θέλει «Διαχειρίζεται Ρυθμίσεις». Η βάση ελέγχει ξανά όπου μπορεί.
export const canManageGoogle = (viewer: Viewer): boolean => isOwner(viewer) || can(viewer, "settings.manage");

// Το ημερολόγιο του Google φαίνεται στην Οθόνη Ημερολογίου και στα Γυρίσματα μόνο με το Δικαίωμα calendar.google.
export const canSeeGoogleCalendar = (viewer: Viewer): boolean => can(viewer, "calendar.google");
