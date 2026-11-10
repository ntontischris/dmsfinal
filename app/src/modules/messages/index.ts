// Module «Μηνύματα» (J, #160): Εισερχόμενα (J1) και Συνομιλία ομάδας (J2). Έξω φαίνεται μόνο ό,τι χρειάζονται οι σελίδες.
export {
  messagesCaps,
  messagesViewOf,
  type MessagesCaps,
  type MessagesView,
} from "./caps";
export {
  MESSAGES_PATH,
  parseClientTab,
  parseFilter,
  parseProduction,
  parseTab,
  threadHref,
  type ClientTab,
} from "./helpers";
export { CLIENT_NO_ACCESS_TEXT, INBOX_TITLE } from "./labels";
export { getAttachmentLink } from "./queries";
export { getMessageSettings } from "./queries-settings";
export { parseRequestView } from "./request-helpers";
export { SpacesInbox } from "./spaces/j1-screen";
export { SpacesThread } from "./spaces/j2-screen";
export { SpacesClientMessages } from "./spaces/j3-screen";
export { parseJ3Order } from "./spaces/j3-adapter";
export { SpacesMessageSettings } from "./spaces/settings-screen";
// Σύνοψη της Συνομιλίας ενός Πελάτη για άλλες οθόνες (B2, B4).
export {
  getClientChatDigest,
  type ClientChatDigest,
  type ClientLastReply,
} from "./chat-digest";
