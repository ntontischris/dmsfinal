// e3: πώς ανανεώνεται η Συνομιλία. Με ενεργό κανάλι Realtime η οθόνη ανανεώνεται μόνο όταν αλλάξει κάτι·
// αν το κανάλι δεν ανοίξει ή πέσει, γυρίζει στην ανανέωση κάθε 20″ (όπως πριν).
export const REFRESH_INTERVAL_MS = 20_000;

export type RefreshMode = "realtime" | "poll";

// Η κατάσταση του καναλιού Realtime (REALTIME_SUBSCRIBE_STATES) → τρόπος ανανέωσης.
export const refreshModeOf = (status: string): RefreshMode =>
  status === "SUBSCRIBED" ? "realtime" : "poll";

// Το θέμα Realtime της Συνομιλίας ενός Πελάτη: η ομάδα ακούει και τα Εσωτερικά, ο πελάτης όχι.
export const chatTopicOf = (audience: "team" | "client", clientId: string): string =>
  `chat-${audience}:${clientId}`;
