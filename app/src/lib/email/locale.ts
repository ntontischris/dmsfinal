// Οι δύο γλώσσες του συστήματος. Ό,τι δεν είναι «en» είναι ελληνικά (η προεπιλογή).
export type Locale = "el" | "en";

export const toLocale = (value: string | null | undefined): Locale => (value === "en" ? "en" : "el");

export const pick = (locale: Locale, el: string, en: string): string => (locale === "en" ? en : el);
