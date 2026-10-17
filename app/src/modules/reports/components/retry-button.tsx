"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

import { RETRY_LABEL } from "../labels";

// «Ξαναδοκίμασε»: ξαναφορτώνει την ίδια διεύθυνση (ίδια Αναφορά, ίδια φίλτρα) από τον server.
export function RetryButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
    >
      {RETRY_LABEL}
    </Button>
  );
}
