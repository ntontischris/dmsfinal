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

// Στο v1 το θέμα θα ζει στο προφίλ του Χρήστη (A3)· ως τότε μένει στον browser.
export function ThemeToggle() {
  const handleClick = () => {
    const next = readTheme() === "dark" ? "light" : "dark";
    if (next === "light") document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    saveTheme(next);
  };

  return (
    <Button size="sm" onClick={handleClick}>
      Σκοτεινό / φωτεινό
    </Button>
  );
}
