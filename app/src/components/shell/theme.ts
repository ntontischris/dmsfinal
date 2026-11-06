// Η προτίμηση θέματος ζει στον browser (localStorage "theme"). «system» = όπως η συσκευή.
export type ThemePreference = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

// Χωρίς αποθηκευμένη (ή με άγνωστη) τιμή μένει το σκοτεινό, όπως ήταν πάντα για νέους Χρήστες.
export const parseThemePreference = (stored: string | null): ThemePreference =>
  stored === "light" || stored === "system" ? stored : "dark";

export const resolveTheme = (
  preference: ThemePreference,
  prefersDark: boolean,
): ResolvedTheme =>
  preference === "system" ? (prefersDark ? "dark" : "light") : preference;

// Τρέχει πριν ζωγραφιστεί η σελίδα, για να μην αναβοσβήνει, και ακολουθεί τη συσκευή όταν αλλάζει
// (μόνο όσο η αποθηκευμένη επιλογή είναι «system»). Ίδιος κανόνας με τις δύο συναρτήσεις πιο πάνω.
export const THEME_SCRIPT = `try{var q=matchMedia('(prefers-color-scheme: dark)'),a=function(){var t=localStorage.getItem('theme'),l=t==='light'||(t==='system'&&!q.matches),d=document.documentElement;if(l)d.dataset.theme='light';else delete d.dataset.theme};a();q.addEventListener('change',function(){if(localStorage.getItem('theme')==='system')a()})}catch(e){}`;
