// Module «Ενσωματώσεις και συνδρομές» (N5, μόνο Ιδιοκτήτης, Ν9–Ν10): κατάσταση συνδέσεων, «Έλεγχος τώρα», GA4/Pixel,
// μητρώο συνδρομών. Η κατάσταση (getConnectionStatuses) είναι η κοινή πηγή που θα ξαναχρησιμοποιήσει η Υγεία (P2).
export { getConnectionStatuses, type ConnectionsView } from "./status";
export { getSubscriptions } from "./queries";
export type {
  ConnectionId,
  ConnectionState,
  ConnectionStatus,
} from "./connections";
export { ConnectionsGrid } from "./components/connections-grid";
export { SubscriptionsSection } from "./components/subscriptions-section";
