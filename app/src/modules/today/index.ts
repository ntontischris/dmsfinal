// Module «Σήμερα» (A1, #180): η αρχική σελίδα κάθε Χρήστη. Κάρτες από το μητρώο της βάσης (public.today_cards),
// κάθε μία φορτώνει χωριστά. Η οθόνη ζει στο spaces/.
export type { CardData, CardItem, TodayCard, TodayCounts } from "./view-schema";
export { TODAY_TITLE } from "./labels";
export { SpacesToday } from "./spaces/a1-screen";
export { getSpaceStrip } from "./spaces/space-strip";
