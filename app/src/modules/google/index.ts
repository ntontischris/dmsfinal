// Module «Google Calendar» (C2δ, #138): η κατάσταση του συγχρονισμού, οι Κανόνες και οι Διαγραφές.
// Έξω φαίνεται μόνο ό,τι εξάγεται εδώ· τα actions μένουν μέσα και τα καλούν τα δικά τους components.
export { canManageGoogle, canSeeGoogleCalendar } from "./permissions";
export { getGoogleDeletions, getGoogleView } from "./queries";
export type { GoogleActivityEntry, GoogleDeletion, GoogleRules, GoogleView } from "./types";
export { ageLabel } from "./helpers";
export { GoogleDeletionsList } from "./components/google-deletions-list";
export { GoogleRulesForm } from "./components/google-rules-form";
export { GoogleSettingsCard } from "./components/google-settings-card";
export { GoogleSyncCard } from "./components/google-sync-card";
