"use client";

import { useRouter } from "next/navigation";

import { LOOK_COOKIE, SPACES_LOOK, type Look } from "@/components/shell/look";
import { Button } from "@/components/ui/button";

const ONE_YEAR = 60 * 60 * 24 * 365;

// Γράφει ή σβήνει το cookie· χωρίς cookie ισχύει η παλιά εμφάνιση.
export const saveLook = (look: Look): void => {
  document.cookie =
    look === "spaces"
      ? `${LOOK_COOKIE}=${SPACES_LOOK}; path=/; max-age=${ONE_YEAR}; samesite=lax`
      : `${LOOK_COOKIE}=; path=/; max-age=0; samesite=lax`;
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
