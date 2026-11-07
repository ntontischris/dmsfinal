"use client";

import { useRouter } from "next/navigation";

import { CLASSIC_LOOK, LOOK_COOKIE, SPACES_LOOK, type Look } from "@/components/shell/look";
import { Button } from "@/components/ui/button";

const ONE_YEAR = 60 * 60 * 24 * 365;

// Γράφει ρητά την επιλογή στο cookie, ώστε να κερδίζει την προεπιλογή της εγκατάστασης.
export const saveLook = (look: Look): void => {
  const value = look === "spaces" ? SPACES_LOOK : CLASSIC_LOOK;
  document.cookie = `${LOOK_COOKIE}=${value}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
};

// Διακόπτης «Νέα / Παλιά εμφάνιση»: αλλάζει το cookie και ξαναζωγραφίζει τη σελίδα από τον server.
export function LookToggle({ look }: { look: Look }) {
  const router = useRouter();
  const handleClick = () => {
    saveLook(look === "spaces" ? "classic" : "spaces");
    router.refresh();
  };
  return (
    <Button size="sm" onClick={handleClick}>
      {look === "spaces" ? "Παλιά εμφάνιση" : "Νέα εμφάνιση"}
    </Button>
  );
}
