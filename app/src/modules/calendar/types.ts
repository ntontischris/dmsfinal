// Τα JSON της βάσης του Ημερολογίου, camelCase. `null` = δεν βλέπεται (π.χ. τίτλος άλλου), ποτέ μηδέν.

export interface FilmingEntry {
  id: string;
  startsAt: string;
  hours: number;
  state: string;
  title: string | null;
  isMine: boolean;
  // Το Συνεργείο (χωρίς «δεν μπορώ»), μόνο για όποιον το βλέπει· αλλιώς κενό. Για το φίλτρο ατόμου.
  crewIds: string[];
}

export interface BlockedEntry {
  id: string;
  userId: string;
  userName: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  title: string | null;
  isMine: boolean;
  // Το Είδος (Ρεπό, Ραντεβού…)· null για τον κλεισμένο χρόνο χωρίς Είδος (π.χ. παλιό ή από το Google).
  kindId: string | null;
  kindLabel: string | null;
}

export interface BusyEntry {
  userId: string;
  userName: string | null;
  startsAt: string;
  endsAt: string;
}

// Επόμενο βήμα ανοιχτής Ευκαιρίας που βλέπει ο Χρήστης, τη μέρα του.
export interface NextStepEntry {
  id: string;
  day: string;
  step: string;
  opportunityTitle: string;
  clientName: string;
  managerId: string | null;
  managerName: string | null;
  isMine: boolean;
}

// Προθεσμία Παραδοτέου που βλέπει ο Χρήστης (όχι ακυρωμένο, όχι εγκεκριμένο).
export interface DeadlineEntry {
  id: string;
  day: string;
  title: string;
  clientName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  isMine: boolean;
}

export interface DayStatus {
  day: string;
  status: string;
  holidayName: string | null;
}

export interface CalendarMember {
  userId: string;
  name: string;
}

// Η κατάσταση του Google στην Οθόνη Ημερολογίου (μόνο για calendar.google· αλλιώς null).
export interface CalendarGoogle {
  connected: boolean;
  pendingWrites: number;
  lastSyncAt: string | null;
  stale: boolean;
}

// Η ομάδα βλέπει τα πάντα του Ρόλου της· ο Πελάτης μόνο τα δικά του Γυρίσματα και τις μέρες.
export interface CalendarData {
  isTeam: boolean;
  filmings: FilmingEntry[];
  blocked: BlockedEntry[];
  busy: BusyEntry[];
  nextSteps: NextStepEntry[];
  deadlines: DeadlineEntry[];
  days: DayStatus[];
  canBlockOthers: boolean;
  canBook: boolean;
  team: CalendarMember[];
  // Τα άτομα του φίλτρου (μόνο για όσους βλέπουν άλλους) και ο ίδιος ο Χρήστης («Εγώ»).
  people: CalendarMember[];
  me: string | null;
  google: CalendarGoogle | null;
}

// Ένας κλεισμένος χρόνος όπως τον δίνει το blocked_time_view (A6).
export interface BlockedTime {
  id: string;
  userId: string;
  userName: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  title: string | null;
  kindId: string | null;
  kindLabel: string | null;
  canEdit: boolean;
  canConvert: boolean;
}

// Ένα Είδος κλεισμένου χρόνου (blocked_time_kinds_view). Το αποσυρμένο μένει μόνο στα παλιά.
export interface BlockedKind {
  id: string;
  label: string;
  retired: boolean;
}

// Γύρισμα που πέφτει πάνω στον κλεισμένο χρόνο, όπου το άτομο είναι στο Συνεργείο (blocked_time_conflicts).
export interface BlockedConflict {
  id: string;
  title: string | null;
  startsAt: string;
  endsAt: string;
  state: string;
}

// Η γραμμή της προειδοποίησης στη φόρμα A6, έτοιμη για εμφάνιση.
export interface ConflictLine {
  id: string;
  title: string;
  when: string;
  href: string;
}

export interface CalendarLinkStatus {
  exists: boolean;
  createdAt: string | null;
}
