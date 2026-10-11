// Έλεγχος του link μιας Έκδοσης στο όριο της εφαρμογής. Η ίδια λίστα με τη βάση (authz.deliverable_host):
// μόνο https και μόνο αυτές οι πλατφόρμες. Το `www.` αγνοείται. Η βάση ελέγχει ξανά.

export const ALLOWED_LINK_HOSTS: readonly string[] = [
  "drive.google.com",
  "docs.google.com",
  "vimeo.com",
  "youtube.com",
  "youtu.be",
];

const HTTPS_HOST = /^https:\/\/([^/?#\s]+)/;
const NOT_HTTPS = "Το link θέλει https.";
const NOT_ALLOWED = "Το link δεν είναι από επιτρεπτή πλατφόρμα.";
const TOO_LONG = "Το link είναι πολύ μεγάλο.";
const MAX_LINK_LENGTH = 2000;

// Το host του link (χωρίς `www.`), ή null αν δεν είναι https.
export const hostOf = (url: string): string | null => {
  const match = url.trim().toLowerCase().match(HTTPS_HOST);
  return match?.[1] ? match[1].replace(/^www\./, "") : null;
};

// Το μήνυμα λάθους του link, ή null αν είναι έγκυρο.
export const linkProblem = (url: string): string | null => {
  const trimmed = url.trim();
  if (trimmed.length > MAX_LINK_LENGTH) return TOO_LONG;
  const host = hostOf(trimmed);
  if (host === null) return NOT_HTTPS;
  return ALLOWED_LINK_HOSTS.includes(host) ? null : NOT_ALLOWED;
};
