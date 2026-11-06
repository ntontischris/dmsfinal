"use client";

// PROTOTYPE — throwaway, three variants of the Client page via ?variant=.
// Ο πλωτός διακόπτης κάτω στο κέντρο (μόνο εκτός παραγωγής): ← / → (και τα βελάκια του πληκτρολογίου) ανάμεσα σε
// «Τώρα — όπως είναι» → Α → Β → Γ, και «Τι σκέφτεται;» με το σκεπτικό κάθε παραλλαγής. Δεν είναι μέρος του σχεδίου.

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

import {
  NOW_LABEL,
  PROTO_ORDER,
  VARIANTS,
  type ProtoVariant,
} from "./b2-proto-model";

import "./b2-proto.css";

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
      className="b2p-switcher"
      role="region"
      aria-label="Παραλλαγές (prototype)"
    >
      {isThinking && (
        <div className="b2p-think">
          {info === null ? (
            <p>
              Η σημερινή Σελίδα Πελάτη, όπως είναι. Πάτα → για τις τρεις
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
      <div className="b2p-bar">
        <button type="button" aria-label="Προηγούμενη" onClick={() => go(-1)}>
          ←
        </button>
        <span className="b2p-bar-label">{info?.label ?? NOW_LABEL}</span>
        <button type="button" aria-label="Επόμενη" onClick={() => go(1)}>
          →
        </button>
        <button
          type="button"
          className="b2p-bar-think"
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

// Οι σημερινές ενότητες γράφουν συνδέσμους προς την ίδια σελίδα χωρίς ?variant= (π.χ. τα φίλτρα του «Τι στάλθηκε»):
// εδώ τους κρατάμε μέσα στην παραλλαγή.
export function KeepVariant({
  variant,
  children,
}: {
  variant: ProtoVariant;
  children: ReactNode;
}) {
  const router = useRouter();
  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey)
      return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest("a");
    if (!anchor || anchor.target === "_blank") return;
    const url = new URL(anchor.href, window.location.href);
    if (
      url.origin !== window.location.origin ||
      url.pathname !== window.location.pathname ||
      url.searchParams.has("variant")
    )
      return;
    url.searchParams.set("variant", variant);
    event.preventDefault();
    router.push(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
  };
  return (
    <div className="b2p-root" onClickCapture={onClickCapture}>
      {children}
    </div>
  );
}
