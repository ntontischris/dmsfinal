// Module «Google Calendar» (C2δ, #138): η κατάσταση του συγχρονισμού, οι Κανόνες και οι Διαγραφές.
// Έξω φαίνεται μόνο ό,τι εξάγεται εδώ· τα actions μένουν μέσα και τα καλούν τα δικά τους components.
export { getGoogleView } from "./queries";
export type { GoogleActivityEntry, GoogleDeletion, GoogleRules, GoogleView } from "./types";
export { ageLabel, pendingLabel } from "./helpers";
// Για τη ρύθμιση του Google στις Ενσωματώσεις της νέας εμφάνισης (N5).
export { createGoogleCalendar, runGoogleSyncNow } from "./actions-setup";
export { resyncGoogle } from "./actions";
export { SpacesGoogleDeletions } from "./spaces/a7-screen";
export { SpacesGoogleRules } from "./spaces/o4-google";
