// Τα JSON της βάσης του Ημερολογίου, camelCase. `null` = δεν βλέπεται (π.χ. τίτλος άλλου), ποτέ μηδέν.

export interface FilmingEntry {
  id: string;
  startsAt: string;
  hours: number;
  state: string;
  title: string | null;
  isMine: boolean;
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
}

export interface BusyEntry {
  userId: string;
  userName: string | null;
  startsAt: string;
  endsAt: string;
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

// Η ομάδα βλέπει τα πάντα του Ρόλου της· ο Πελάτης μόνο τα δικά του Γυρίσματα και τις μέρες.
export interface CalendarData {
  isTeam: boolean;
  filmings: FilmingEntry[];
  blocked: BlockedEntry[];
  busy: BusyEntry[];
  days: DayStatus[];
  canBlockOthers: boolean;
  canBook: boolean;
  team: CalendarMember[];
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
  canEdit: boolean;
  canConvert: boolean;
}

export interface CalendarLinkStatus {
  exists: boolean;
  createdAt: string | null;
}
