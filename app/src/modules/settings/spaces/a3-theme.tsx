"use client";

import { useSyncExternalStore } from "react";

import {
  chooseTheme,
  readThemePreference,
  THEME_CHANGE_EVENT,
} from "@/components/shell/theme-toggle";
import type { ThemePreference } from "@/components/shell/theme";

const THEMES: readonly { id: ThemePreference; label: string }[] = [
  { id: "dark", label: "Σκοτεινό" },
  { id: "light", label: "Φωτεινό" },
  { id: "system", label: "Όπως η συσκευή" },
];

// Η επιλογή ζει στον browser· η σελίδα ξαναζωγραφίζει όταν αλλάξει (και από το μενού προφίλ).
const subscribe = (onChange: () => void): (() => void) => {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
};

// «Θέμα» του A3: ίδια αποθήκευση με τον διακόπτη του μενού προφίλ (στον browser), με την τρέχουσα επιλογή σημειωμένη.
export function ThemeChoice() {
  const theme = useSyncExternalStore(
    subscribe,
    readThemePreference,
    (): ThemePreference => "dark",
  );
  return (
    <div className="a3-choice">
      {THEMES.map((item) => (
        <button
          key={item.id}
          className="button"
          type="button"
          aria-current={item.id === theme}
          onClick={() => chooseTheme(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
