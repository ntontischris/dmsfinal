// Module «Σήμερα» (A1, #180): η αρχική σελίδα κάθε Χρήστη. Κάρτες από το μητρώο της βάσης (public.today_cards),
// κάθε μία φορτώνει χωριστά. Η οθόνη ζει στο spaces/.
export type { CardData, CardItem, TodayCard, TodayCounts } from "./view-schema";
export { TODAY_TITLE } from "./labels";
export { SpacesToday } from "./spaces/a1-screen";
export { getSpaceStrip } from "./spaces/space-strip";
// Για τη λίστα «Σήμερα» των οδηγών (spaces/flows): οι ίδιες κάρτες ως γραμμές.
export { getTodayCounts } from "./queries";
export { loadCards } from "./spaces/a1-load";
export { withoutRepeats } from "./spaces/a1-zones";
export { wholeEuros } from "./spaces/a1-facts";
export type { CardContent, CardRow } from "./spaces/a1-model";
