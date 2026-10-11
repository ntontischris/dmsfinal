// Τύποι του Δελτίου γυρίσματος (#136): λήψεις, εκδόσεις και το στιγμιότυπο κάθε έκδοσης. Τα JSON της βάσης έρχονται camelCase.

export interface SheetShot {
  id: string;
  text: string;
}

// Η τρέχουσα έκδοση: αριθμός, πότε, ποιος (όνομα) και τι άλλαξε (κενό στην πρώτη).
export interface SheetCurrent {
  version: number;
  issuedAt: string;
  issuedBy: string | null;
  change: string | null;
}

export interface SheetVersionEntry {
  version: number;
  issuedAt: string;
  issuedByName: string | null;
  change: string | null;
}

// Ό,τι φαινόταν τη στιγμή της έκδοσης: αμετάβλητο.
export interface SheetSnapshot {
  startsAt: string;
  hours: number;
  location: string | null;
  production: string;
  client: string | null;
  crew: { userId: string; name: string }[];
  equipment: { name: string }[];
  shots: SheetShot[];
  crewNote: string | null;
}

// Το Δελτίο όπως το βλέπει ο Χρήστης (null σε κάρτα = δεν το βλέπει).
export interface SheetView {
  shots: SheetShot[];
  crewNote: string | null;
  current: SheetCurrent | null;
  versions: SheetVersionEntry[];
  hasChanges: boolean;
  canEdit: boolean;
  canIssue: boolean;
  latest: SheetSnapshot | null;
}

// Η σύνοψη στην κάρτα του Γυρίσματος (E3): έκδοση και αν υπάρχουν αλλαγές από αυτήν.
export interface SheetSummary {
  version: number;
  hasChanges: boolean;
}
