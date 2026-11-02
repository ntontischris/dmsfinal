"use client";

import { useSyncExternalStore } from "react";

import { toggleTheme } from "@/components/shell/theme-toggle";

type Theme = "dark" | "light";

const THEMES: readonly { id: Theme; label: string }[] = [
  { id: "dark", label: "Σκοτεινό" },
  { id: "light", label: "Φωτεινό" },
];

const readTheme = (): Theme =>
  document.documentElement.dataset.theme === "light" ? "light" : "dark";

// Το θέμα ζει στο data-theme του <html>· η σελίδα ξαναζωγραφίζει όταν αλλάξει (και από το μενού προφίλ).
const subscribe = (onChange: () => void): (() => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
};

// «Θέμα» του A3: ίδια αποθήκευση με τον διακόπτη του μενού προφίλ (στον browser), με την τρέχουσα επιλογή σημειωμένη.
export function ThemeChoice() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "dark");
  const handleChoose = (next: Theme) => {
    if (next !== readTheme()) toggleTheme();
  };
  return (
    <div className="a3-choice">
      {THEMES.map((item) => (
        <button
          key={item.id}
          className="button"
          type="button"
          aria-current={item.id === theme}
          onClick={() => handleChoose(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
