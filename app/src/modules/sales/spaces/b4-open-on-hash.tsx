"use client";

import { useEffect } from "react";

// Οι σύνδεσμοι #b4-… της κεφαλίδας στοχεύουν μέσα σε κλειστό <details>: το ανοίγουμε ρητά (όχι μόνο Chrome).
const openTarget = (): void => {
  const id = window.location.hash.slice(1);
  if (id === "") return;
  const details = document.getElementById(id)?.closest("details");
  if (!details) return;
  details.open = true;
  details.scrollIntoView({ block: "start" });
};

export function OpenOnHash() {
  useEffect(() => {
    openTarget();
    window.addEventListener("hashchange", openTarget);
    return () => window.removeEventListener("hashchange", openTarget);
  }, []);
  return null;
}
