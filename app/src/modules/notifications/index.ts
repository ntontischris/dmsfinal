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
