"use client";

import { toggleTheme } from "@/components/shell/theme-toggle";

// Οι ενέργειες του μενού προφίλ: το θέμα.
export function ProfileActions() {
  return (
    <li>
      <button type="button" onClick={toggleTheme}>
        Σκοτεινό / φωτεινό
      </button>
    </li>
  );
}
