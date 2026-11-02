"use client";

import { usePathname } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

interface ToolMenuProps {
  summary: ReactNode;
  summaryClassName: string;
  label: string;
  children: ReactNode;
}

// Μενού πάνω δεξιά: ανοίγει με κλικ ή αφή (όχι με πέρασμα του ποντικιού), κλείνει όταν αλλάξει η οθόνη,
// όταν διαλέξεις κάτι, με κλικ έξω από αυτό ή με Escape.
export function ToolMenu({
  summary,
  summaryClassName,
  label,
  children,
}: ToolMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const pathname = usePathname();
  // Ανοιχτό μόνο στην οθόνη όπου άνοιξε: με την αλλαγή οθόνης κλείνει μόνο του.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const isOpen = openAt === pathname;

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (event: globalThis.MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpenAt(null);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenAt(null);
      buttonRef.current?.focus();
    };
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  // Μια επιλογή κλείνει το μενού, και όταν οδηγεί στην ίδια οθόνη με άλλο query.
  const handlePick = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest("a")) setOpenAt(null);
  };

  return (
    <div ref={ref} className="tool-menu">
      <button
        ref={buttonRef}
        type="button"
        className={summaryClassName}
        aria-label={label}
        title={label}
        aria-expanded={isOpen}
        aria-controls={listId}
        onClick={() => setOpenAt(isOpen ? null : pathname)}
      >
        {summary}
      </button>
      <div id={listId} hidden={!isOpen} onClick={handlePick}>
        {children}
      </div>
    </div>
  );
}
