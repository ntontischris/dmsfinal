"use client";

// PROTOTYPE — throwaway, branch prototype/clients-three-levels. Ο πλωτός διακόπτης παραλλαγών (κάτω στο κέντρο):
// ← ετικέτα →, και τα βελάκια του πληκτρολογίου όταν δεν γράφεις κάπου. Φαίνεται μόνο εκτός production.
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";

import { VARIANTS } from "./variants";

import "./prototype.css";

const STOPS = [null, ...VARIANTS.map((item) => item.id)] as const;

const labelOf = (id: string | null): string => {
  const found = VARIANTS.find((item) => item.id === id);
  return found ? `${found.id} — ${found.label}` : "Σημερινή οθόνη";
};

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

export function VariantSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("variant");
  const index = Math.max(
    0,
    STOPS.findIndex((stop) => stop === current),
  );

  const go = useCallback(
    (step: number) => {
      const next = STOPS[(index + step + STOPS.length) % STOPS.length];
      const query = new URLSearchParams(params.toString());
      if (next === null) query.delete("variant");
      else query.set("variant", next);
      const search = query.toString();
      router.replace(search ? `${pathname}?${search}` : pathname, {
        scroll: false,
      });
    },
    [index, params, pathname, router],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTyping(event.target) || event.altKey || event.metaKey) return;
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  return (
    <div className="pc-switcher" role="group" aria-label="Παραλλαγή πρωτοτύπου">
      <button type="button" onClick={() => go(-1)} aria-label="Προηγούμενη">
        ←
      </button>
      <span aria-live="polite">{labelOf(current)}</span>
      <button type="button" onClick={() => go(1)} aria-label="Επόμενη">
        →
      </button>
    </div>
  );
}
