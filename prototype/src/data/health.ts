// Υγεία συστήματος (P2): φανταστικά δεδομένα. Πηγές: blueprint 04, Γεγονότα 50–53 και 57, ADR 0018.

export interface ScheduledJob {
  id: string;
  name: string;
  lastRun: string; // "YYYY-MM-DD HH:MM"
  nextRun: string;
  failed?: boolean;
}

export const JOBS: readonly ScheduledJob[] = [
  {
    id: "j1",
    name: "Υπενθυμίσεις ημέρας",
    lastRun: "2026-09-20 07:00",
    nextRun: "2026-09-21 07:00",
  },
  {
    id: "j2",
    name: "Ληξιπρόθεσμα Τιμολόγια",
    lastRun: "2026-09-20 08:00",
    nextRun: "2026-09-21 08:00",
  },
  {
    id: "j3",
    name: "Ευχές αργιών",
    lastRun: "2026-09-20 07:30",
    nextRun: "2026-09-21 07:30",
  },
  {
    id: "j4",
    name: "Διαγραφή παλιών Συζητήσεων",
    lastRun: "2026-09-19 03:00",
    nextRun: "2026-09-26 03:00",
  },
  {
    id: "j5",
    name: "Ενημέρωση Βοηθού",
    lastRun: "2026-09-20 02:00",
    nextRun: "2026-09-21 02:00",
  },
  {
    id: "j6",
    name: "Κλείσιμο μήνα κόστους",
    lastRun: "2026-08-31 23:50",
    nextRun: "2026-09-30 23:50",
    failed: true,
  },
];

export const EXTERNAL_CHECK = {
  availability: "99,96%",
  lastIncident: "2026-09-03 04:10–04:16",
  lastIncidentReason: "δεν απαντούσε",
};

export interface FailedSend {
  id: string;
  what: string;
  to: string;
  reason: string;
  at: string;
}

export const FAILED_SENDS: readonly FailedSend[] = [
  {
    id: "a13",
    what: "Ληξιπρόθεσμο Τιμολόγιο Α-58",
    to: "Κυψέλη Καφέ (Μαρία Παπαδάκη)",
    reason: "όριο αποστολών",
    at: "2026-09-19 17:40",
  },
];

export const GOOGLE_SYNC = { lastSync: "2026-09-20 10:38", queued: 0 };

export interface StuckEvent {
  id: string;
  name: string;
  since: string;
}

export const STUCK_EVENTS: readonly StuckEvent[] = [
  {
    id: "g1",
    name: "Γεγονός 27 «Νέα Έκδοση προς έγκριση»",
    since: "2026-09-20 09:10",
  },
];

export const ASSISTANT_CAP = { used: 11.4, limit: 30, widgetStopsAt: 0.8 };
