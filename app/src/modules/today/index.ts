// Module «Σήμερα» (A1, #180): η αρχική σελίδα κάθε Χρήστη. Κάρτες από το μητρώο της βάσης (public.today_cards),
// κάθε μία φορτώνει χωριστά. Οι renderers καρτών ζουν στο cards/<ομάδα>.tsx.
export type { CardData, CardItem, TodayCard, TodayCounts } from "./view-schema";
export { TODAY_TITLE } from "./labels";
export { TodayScreen } from "./components/today-screen";
