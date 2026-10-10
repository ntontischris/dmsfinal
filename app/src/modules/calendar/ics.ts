// Το αρχείο .ics του Συνδέσμου ημερολογίου (μόνο ανάγνωση). Χωρίς βιβλιοθήκη: RFC 5545 για ό,τι χρειάζεται εδώ.

import { athensDate } from "@/modules/filming";

export interface IcsEvent {
  uid: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  summary: string;
  location: string | null;
  description: string | null;
}

export interface IcsFeed {
  name: string | null;
  events: readonly IcsEvent[];
}

const MAX_OCTETS = 75;
const encoder = new TextEncoder();

// Κείμενο ιδιοτήτων: πρώτα η κάθετος, μετά τα διαχωριστικά και η αλλαγή γραμμής.
export const escapeText = (value: string): string =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");

// Στιγμή ως «ΕΕΕΕΜΜΗΗTΩΩΛΛΔΔZ» (UTC).
export const formatUtc = (instant: string | Date): string =>
  new Date(instant)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

// Σπάει μια γραμμή σε κομμάτια έως 75 οκτάδες. Η συνέχεια ξεκινά με κενό και δεν σπάει χαρακτήρα UTF-8.
export function foldLine(line: string): string[] {
  const parts: string[] = [];
  let current = "";
  let octets = 0;
  for (const char of line) {
    const width = encoder.encode(char).length;
    const limit = parts.length === 0 ? MAX_OCTETS : MAX_OCTETS - 1;
    if (octets + width > limit) {
      parts.push(current);
      current = char;
      octets = width;
    } else {
      current += char;
      octets += width;
    }
  }
  parts.push(current);
  return parts.map((part, index) => (index === 0 ? part : ` ${part}`));
}

const optionalLine = (name: string, value: string | null): string[] =>
  value ? [`${name}:${escapeText(value)}`] : [];

// Όλη μέρα: ημερομηνία Ώρας Ελλάδας, με τέλος αποκλειστικό (η βάση δίνει τα μεσάνυχτα της επόμενης μέρας).
const timingLines = (event: IcsEvent): string[] =>
  event.allDay
    ? [
        `DTSTART;VALUE=DATE:${athensDate(event.startsAt).replaceAll("-", "")}`,
        `DTEND;VALUE=DATE:${athensDate(event.endsAt).replaceAll("-", "")}`,
      ]
    : [
        `DTSTART:${formatUtc(event.startsAt)}`,
        `DTEND:${formatUtc(event.endsAt)}`,
      ];

const eventLines = (event: IcsEvent, stamp: string): string[] => [
  "BEGIN:VEVENT",
  `UID:${escapeText(event.uid)}`,
  `DTSTAMP:${stamp}`,
  ...timingLines(event),
  `SUMMARY:${escapeText(event.summary)}`,
  ...optionalLine("LOCATION", event.location),
  ...optionalLine("DESCRIPTION", event.description),
  "END:VEVENT",
];

const calendarName = (name: string | null): string =>
  escapeText(name ? `Devre Media · ${name}` : "Devre Media");

// Το ημερολόγιο ως κείμενο με CRLF. Το `now` μπαίνει στο DTSTAMP και περνά από έξω για να είναι ντετερμινιστικό.
export function buildCalendarIcs(
  feed: IcsFeed,
  now: Date = new Date(),
): string {
  const stamp = formatUtc(now);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Devre Media//DMS//EL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${calendarName(feed.name)}`,
    "X-WR-TIMEZONE:Europe/Athens",
    ...feed.events.flatMap((event) => eventLines(event, stamp)),
    "END:VCALENDAR",
  ];
  return `${lines.flatMap((line) => foldLine(line)).join("\r\n")}\r\n`;
}
