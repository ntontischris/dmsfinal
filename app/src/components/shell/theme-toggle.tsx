"use client";

import {
  parseThemePreference,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from "./theme";

// Το A3 ακούει αυτό το γεγονός για να ξαναζωγραφίσει την επιλογή (π.χ. «system» που δεν αλλάζει το data-theme).
export const THEME_CHANGE_EVENT = "dms-theme-change";

const readTheme = (): ResolvedTheme =>
  document.documentElement.dataset.theme === "light" ? "light" : "dark";

export const readThemePreference = (): ThemePreference => {
  try {
    return parseThemePreference(localStorage.getItem("theme"));
  } catch {
    return parseThemePreference(null);
  }
};

const saveTheme = (theme: ThemePreference): void => {
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // Χωρίς αποθήκευση (ιδιωτικό παράθυρο) το θέμα ισχύει μόνο για αυτή τη σελίδα.
  }
};

const applyTheme = (theme: ResolvedTheme): void => {
  if (theme === "light") document.documentElement.dataset.theme = "light";
  else delete document.documentElement.dataset.theme;
};

// Σκοτεινό, φωτεινό ή όπως η συσκευή· το inline script του layout ακολουθεί τη συσκευή όταν αλλάζει.
export const chooseTheme = (preference: ThemePreference): void => {
  const prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
  saveTheme(preference);
  applyTheme(resolveTheme(preference, prefersDark));
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
};

// Εναλλαγή σκοτεινό / φωτεινό, από το μενού προφίλ.
export const toggleTheme = (): void =>
  chooseTheme(readTheme() === "dark" ? "light" : "dark");

