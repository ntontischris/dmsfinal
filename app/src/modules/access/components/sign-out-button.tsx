import { Button } from "@/components/ui/button";

import { signOut } from "../actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button size="sm" type="submit" variant="ghost">
        Έξοδος
      </Button>
    </form>
  );
}
