"use client";

import { Button } from "@/components/ui/button";

const readTheme = (): "dark" | "light" =>
  document.documentElement.dataset.theme === "light" ? "light" : "dark";

const saveTheme = (theme: "dark" | "light"): void => {
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // Χωρίς αποθήκευση (ιδιωτικό παράθυρο) το θέμα ισχύει μόνο για αυτή τη σελίδα.
  }
};

// Εναλλαγή σκοτεινό / φωτεινό· τη χρησιμοποιεί και το μενού προφίλ της νέας εμφάνισης.
export const toggleTheme = (): void => {
  const next = readTheme() === "dark" ? "light" : "dark";
  if (next === "light") document.documentElement.dataset.theme = "light";
  else delete document.documentElement.dataset.theme;
  saveTheme(next);
};

// Στο v1 το θέμα θα ζει στο προφίλ του Χρήστη (A3)· ως τότε μένει στον browser.
export function ThemeToggle() {
  return (
    <Button size="sm" onClick={toggleTheme}>
      Σκοτεινό / φωτεινό
    </Button>
  );
}
