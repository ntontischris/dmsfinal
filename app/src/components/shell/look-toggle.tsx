"use client";

import { useRouter } from "next/navigation";

import { LOOK_COOKIE, type Look } from "@/components/shell/look";
import { Button } from "@/components/ui/button";

const ONE_YEAR = 60 * 60 * 24 * 365;

// Γράφει πάντα ρητή τιμή· χωρίς cookie ισχύει η νέα εμφάνιση.
export const saveLook = (look: Look): void => {
  document.cookie = `${LOOK_COOKIE}=${look}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
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
