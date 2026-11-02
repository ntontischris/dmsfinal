// Εικονίδια γραμμής (24×24, stroke currentColor), από το σετ του screens2.
import type { ReactNode } from "react";

import type { IconName as SpaceIconName } from "@/spaces/data/spaces";

const PATHS = {
  today: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  clients: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5" />
      <path d="M16 4.5a3.5 3.5 0 010 7M18 14.8c1.9.8 3.1 2.6 3.5 5.2" />
    </>
  ),
  production: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
    </>
  ),
  money: (
    <>
      <path d="M18 6.5A7 7 0 1018 17.5" />
      <path d="M4 10h10M4 14h10" />
    </>
  ),
  talk: <path d="M4 5h16v11H9l-5 4z" />,
  company: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
    </>
  ),
  work: (
    <>
      <path d="M3 7l9-4 9 4v10l-9 4-9-4z" />
      <path d="M3 7l9 4 9-4M12 11v10" />
    </>
  ),
  filming: (
    <>
      <path d="M3 7h3l2-3h8l2 3h3v12H3z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
  account: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  bell: (
    <>
      <path d="M6 16V11a6 6 0 0112 0v5l2 2H4z" />
      <path d="M10 21h4" />
    </>
  ),
  book: (
    <>
      <path d="M4 4h6a2 2 0 012 2v14a2 2 0 00-2-2H4zM20 4h-6a2 2 0 00-2 2v14a2 2 0 012-2h6z" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="19" cy="12" r="1.2" />
    </>
  ),
} satisfies Record<
  SpaceIconName | "search" | "plus" | "bell" | "book" | "arrow" | "more",
  ReactNode
>;

export type IconName = keyof typeof PATHS;

interface IconProps {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

// Το μονόγραμμα DM με την κόκκινη τελεία REC.
export function Monogram() {
  return (
    <svg
      viewBox="392 466 300 156"
      className="shell-monogram"
      aria-label="Devre Media"
    >
      <circle cx="414" cy="491" r="15" fill="var(--color-danger)" />
      <path
        d="M505 600 H476 Q461 600 461 585 V491 H508 Q545 491 566 514 L600 552 L652 497 Q664 485 676 497 V615"
        fill="none"
        stroke="currentColor"
        strokeWidth="30"
        strokeLinejoin="round"
      />
      <path
        d="M541 528 Q560 546 558 566 Q554 600 505 600"
        fill="none"
        stroke="currentColor"
        strokeWidth="30"
        strokeLinecap="round"
      />
    </svg>
  );
}
