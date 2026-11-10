"use client";

// PROTOTYPE — throwaway, three simpler proposal pages via ?variant=.
// Ο πλωτός διακόπτης κάτω στο κέντρο (μόνο εκτός παραγωγής): ← / → (και τα βελάκια του πληκτρολογίου) ανάμεσα σε
// «Τώρα — όπως είναι» → Α → Β → Γ, και «Τι σκέφτεται;» με το σκεπτικό κάθε παραλλαγής. Δεν είναι μέρος του σχεδίου.

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

import {
  NOW_LABEL,
  PROTO_ORDER,
  VARIANTS,
  type ProtoVariant,
} from "./d2-proto-model";

import "./d2-proto.css";

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

function SwitcherBar({ current }: { current: ProtoVariant | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isThinking, setIsThinking] = useState(false);
  const index = PROTO_ORDER.indexOf(current);

  const go = useCallback(
    (step: number) => {
      const next =
        PROTO_ORDER[(index + step + PROTO_ORDER.length) % PROTO_ORDER.length];
      const query = new URLSearchParams(params.toString());
      if (next === null) query.delete("variant");
      else query.set("variant", next);
      const search = query.toString();
      router.replace(`${pathname}${search ? `?${search}` : ""}`, {
        scroll: false,
      });
    },
    [index, params, pathname, router],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
        return;
      if (isTyping(event.target) || isTyping(document.activeElement)) return;
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const info = current === null ? null : VARIANTS[current];
  return (
    <div
      className="d2p-switcher"
      role="region"
      aria-label="Παραλλαγές (prototype)"
    >
      {isThinking && (
        <div className="d2p-think">
          {info === null ? (
            <p>
              Η σημερινή Σελίδα Συμφωνίας, όπως είναι. Πάτα → για τις τρεις
              προτάσεις.
            </p>
          ) : (
            <>
              <h3>Πώς το σκέφτεται</h3>
              <p>{info.thinks}</p>
              <h3>Τι αλλάζει</h3>
              <ul>
                {info.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      <div className="d2p-bar">
        <button type="button" aria-label="Προηγούμενη" onClick={() => go(-1)}>
          ←
        </button>
        <span className="d2p-bar-label">{info?.label ?? NOW_LABEL}</span>
        <button type="button" aria-label="Επόμενη" onClick={() => go(1)}>
          →
        </button>
        <button
          type="button"
          className="d2p-bar-think"
          aria-expanded={isThinking}
          onClick={() => setIsThinking(!isThinking)}
        >
          Τι σκέφτεται;
        </button>
      </div>
    </div>
  );
}

export function ProtoSwitcher({ current }: { current: ProtoVariant | null }) {
  return (
    <Suspense fallback={null}>
      <SwitcherBar current={current} />
    </Suspense>
  );
}
