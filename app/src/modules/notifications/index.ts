// Module «Ειδοποιήσεις» (A2, #170): καμπανάκι στην πάνω μπάρα και σελίδα Ειδοποιήσεων. Έξω φαίνεται μόνο ό,τι χρειάζονται οι σελίδες.
export type { Bell, NotificationItem, NotificationPage } from "./view-schema";
export {
  parseCursor,
  parseFilter,
  type NotificationCursor,
  type NotificationFilter,
} from "./helpers";
export {
  LOAD_ERROR_TEXT,
  LOAD_ERROR_TITLE,
  NO_ACCESS_TEXT,
  NOTIFICATIONS_EYEBROW,
  NOTIFICATIONS_TITLE,
  UNSUBSCRIBE_TEXT_EL,
  UNSUBSCRIBE_TEXT_EN,
  UNSUBSCRIBE_TITLE,
} from "./labels";
export {
  getBell,
  getMyLanguage,
  getNotifications,
  type EmailLanguage,
} from "./queries";
export { NotificationBell } from "./components/notification-bell";
export { NotificationsScreen } from "./components/notifications-screen";
export { LanguageForm } from "./components/language-form";
export { UnsubscribeForm } from "./components/unsubscribe-form";
// Ιστορικό αποστολών (K3) και καρτέλα «Αποστολές» του Πελάτη (#174).
export {
  canSeeClientSends,
  parseSendsChannel,
  parseSendsClient,
  parseSendsCursor,
  parseSendsTab,
  sendsCaps,
} from "./sends-helpers";
export {
  CLIENT_SENDS_TAB,
  SENDS_EYEBROW,
  SENDS_LOAD_ERROR_TEXT,
  SENDS_LOAD_ERROR_TITLE,
  SENDS_NO_ACCESS,
  SENDS_TITLE,
} from "./sends-labels";
export { getSends } from "./queries-sends";
export { SendsScreen } from "./components/sends-screen";
export { ClientSends } from "./components/client-sends";

// K1 Αυτοματισμοί, K2 Μηνύματα συστήματος, A2 Προτιμήσεις (#173).
export type {
  Catalog,
  EventPage,
  Holidays,
  Pref,
  SystemMessage,
} from "./automation-view-schema";
export {
  EVENT_CODE_PATTERN,
  parseCatalogFilter,
} from "./automation-helpers";
export {
  K1_EYEBROW,
  K1_NOTE,
  K2_EYEBROW,
  LOAD_FAILED_TEXT,
  LOAD_FAILED_TITLE,
  NO_EVENT_TITLE,
  NO_MANAGE_TEXT,
  PREFS_FAILED_TITLE,
  SETTINGS_TITLE,
  SYSTEM_MESSAGES_PATH,
  ALL_SYSTEM_MESSAGES,
  SYSTEM_NO_SWITCH,
  AUTOMATIONS_PATH,
  BACK_TO_CATALOGUE,
} from "./automation-labels";
export {
  getAutomationEvent,
  getCatalog,
  getHolidays,
  getPrefs,
  getSystemMessages,
} from "./queries-automations";
export { AutomationsCatalog } from "./components/automations-catalog";
export { EventScreen } from "./components/event-screen";
export {
  AutomationsSubnav,
  SystemMessageBadges,
  SystemMessageList,
  editedLine,
} from "./components/system-messages-screen";
export { SystemMessageEditor } from "./components/system-message-editor";
export { NotificationsTabs, PrefsTab } from "./components/prefs-tab";
