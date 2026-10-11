// Τα JSON των RPC του Google, camelCase. `null` = δεν βλέπεται ή δεν υπάρχει· ποτέ μηδέν για άγνωστο.

export type NewEventRule = "blocked" | "none";
export type DeleteHours = 12 | 24 | 48;

// Οι τρεις Κανόνες (Ρυθμίσεις › Γυρίσματα, ADR 0015).
export interface GoogleRules {
  newEvent: NewEventRule;
  deleteHours: DeleteHours;
  writePending: boolean;
}

export interface GoogleActivityEntry {
  at: string;
  kind: string;
  message: string;
  filmingId: string | null;
}

export interface GoogleView {
  connected: boolean;
  sharedWith: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  pendingWrites: number;
  oldestPendingAt: string | null;
  pendingDeletions: number;
  rules: GoogleRules;
  activity: GoogleActivityEntry[];
}

// Γύρισμα που διαγράφηκε στο Google και περιμένει απόφαση (A7).
export interface GoogleDeletion {
  filmingId: string;
  title: string | null;
  startsAt: string;
  state: string;
  detectedAt: string;
  deadlineAt: string;
}
