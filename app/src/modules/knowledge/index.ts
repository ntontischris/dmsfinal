// Module «Γνώση» (L, #190): Γνώση (A8) για κάθε Χρήστη και Διαχείριση Γνώσης (L1). Έξω φαίνεται μόνο ό,τι χρειάζονται οι σελίδες.
export { parseManageTab, parseQuery, parseStatusFilter } from "./helpers";
export { LIBRARY_TITLE, MANAGE_TITLE } from "./labels";
export { getFileLink, getImageLink } from "./queries";

// Συζητήσεις Βοηθού (L2) και Αναπάντητες ερωτήσεις (L3), #192.
export {
  parseAudienceTab,
  parseDone,
  parsePage,
  parseUnansweredTab,
} from "./assistant-helpers";
export { CONVERSATIONS_TITLE, UNANSWERED_TITLE } from "./assistant-labels";

// Οι οθόνες (Χώροι, prototype A8, L1, L2, L3) με πραγματικά δεδομένα.
export { SpacesKnowledge } from "./spaces/a8-screen";
export { SpacesKnowledgeItem } from "./spaces/a8-item";
export { SpacesKnowledgeManage } from "./spaces/l1-screen";
export { SpacesKnowledgeEditor } from "./spaces/l1-editor";
export { SpacesConversations } from "./spaces/l2-screen";
export { SpacesConversation } from "./spaces/l2-detail";
export { SpacesUnanswered } from "./spaces/l3-screen";
export { parseSelection } from "./spaces/l3-adapter";
