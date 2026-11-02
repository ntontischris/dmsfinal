"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Icon } from "@/spaces/shell/icons";
import type { SearchItem } from "@/spaces/data/search";
import { matchesSearch } from "@/spaces/data/search-match";

interface SearchDialogProps {
  items: readonly SearchItem[];
}

// Αναζήτηση με Ctrl+K: οι ενότητες και οι ενέργειες του Χρήστη. Χωρίς όρο δείχνει μόνο τις ενότητες.
export function SearchDialog({ items }: SearchDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [term, setTerm] = useState("");
  const isEmpty = term.trim() === "";
  const found = items.filter((item) =>
    isEmpty
      ? item.kind === "section"
      : matchesSearch(`${item.label} ${item.keywords ?? ""}`, term),
  );

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        dialogRef.current?.showModal();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const handleClose = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        className="tool-button"
        aria-label="Αναζήτηση (Ctrl+K)"
        title="Αναζήτηση (Ctrl+K)"
        onClick={() => dialogRef.current?.showModal()}
      >
        <Icon name="search" size={18} />
        <span className="tool-label">Αναζήτηση</span>
      </button>
      <dialog
        ref={dialogRef}
        className="search-dialog"
        onClick={(event) => event.target === dialogRef.current && handleClose()}
      >
        <input
          className="search-input"
          type="search"
          aria-label="Αναζήτηση"
          placeholder="Ψάξε ενότητα ή ενέργεια…"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          autoFocus
        />
        <ul className="search-results">
          {found.map((item) => (
            <li key={item.href}>
              <Link href={item.href} onClick={handleClose}>
                <span>{item.label}</span>
                <span className="muted">{item.space}</span>
              </Link>
            </li>
          ))}
          {found.length === 0 && (
            <li className="muted">
              Τίποτα με «{term}». Δοκίμασε μία λέξη, π.χ. «τιμολόγια».
            </li>
          )}
        </ul>
      </dialog>
    </>
  );
}
