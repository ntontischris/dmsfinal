"use client";

import { useRouter } from "next/navigation";

import type { Look } from "@/components/shell/look";
import { saveLook } from "@/components/shell/look-toggle";
import { toggleTheme } from "@/components/shell/theme-toggle";

// Οι ενέργειες του μενού προφίλ: θέμα και εμφάνιση. Ίδια λογική με τους διακόπτες της παλιάς εμφάνισης.
export function ProfileActions({ look }: { look: Look }) {
  const router = useRouter();
  const handleLook = () => {
    saveLook(look === "spaces" ? "classic" : "spaces");
    router.refresh();
  };
  return (
    <>
      <li>
        <button type="button" onClick={toggleTheme}>
          Σκοτεινό / φωτεινό
        </button>
      </li>
      <li>
        <button type="button" onClick={handleLook}>
          {look === "spaces" ? "Παλιά εμφάνιση" : "Νέα εμφάνιση"}
        </button>
      </li>
    </>
  );
}
