"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Icon } from "@/spaces/shell/icons";
import type { SearchItem } from "@/spaces/data/search";
import { matchesSearch } from "@/spaces/data/search-match";
import { searchRecords } from "@/spaces/data/search-records";
import type { RecordGroup } from "@/spaces/data/search-records-model";

interface SearchDialogProps {
  items: readonly SearchItem[];
}

// Από 2 χαρακτήρες και μετά από μια μικρή παύση στο πληκτρολόγιο ψάχνονται και οι εγγραφές.
const MIN_RECORD_TERM = 2;
const DEBOUNCE_MS = 250;

interface RecordSearch {
  groups: readonly RecordGroup[];
  // Περιμένει απάντηση για τον τρέχοντα όρο: το «Τίποτα» δεν φαίνεται ακόμα.
  isPending: boolean;
}

// Οι εγγραφές του όρου: η πιο πρόσφατη απάντηση κερδίζει, οι παλιές αγνοούνται.
function useRecordSearch(term: string): RecordSearch {
  const [found, setFound] = useState<{ term: string; groups: readonly RecordGroup[] }>({ term: "", groups: [] });
  const trimmed = term.trim();
  const isSearchable = trimmed.length >= MIN_RECORD_TERM;
  useEffect(() => {
    if (!isSearchable) return;
    let isCurrent = true;
    const timer = window.setTimeout(() => {
      searchRecords(trimmed)
        .then((groups) => isCurrent && setFound({ term: trimmed, groups }))
        .catch((error: unknown) => {
          console.error("searchRecords:", error);
          if (isCurrent) setFound({ term: trimmed, groups: [] });
        });
    }, DEBOUNCE_MS);
    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
    };
  }, [trimmed, isSearchable]);
  const isAnswered = found.term === trimmed;
  return {
    groups: isSearchable && isAnswered ? found.groups : [],
    isPending: isSearchable && !isAnswered,
  };
}

// Αναζήτηση με Ctrl+K: οι ενότητες και οι ενέργειες του Χρήστη, και οι εγγραφές που βλέπει (Πελάτες, Παραγωγές κ.λπ.).
// Χωρίς όρο δείχνει μόνο τις ενότητες.
export function SearchDialog({ items }: SearchDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [term, setTerm] = useState("");
  const isEmpty = term.trim() === "";
  const { groups, isPending } = useRecordSearch(term);
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
          placeholder="Ψάξε ενότητα, Πελάτη, Παραγωγή, Τιμολόγιο…"
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
          {groups.map((group) => (
            <RecordResults key={group.kind} group={group} onPick={handleClose} />
          ))}
          {found.length === 0 && groups.length === 0 && !isPending && (
            <li className="muted">
              Τίποτα με «{term}». Δοκίμασε μία λέξη, π.χ. «τιμολόγια».
            </li>
          )}
        </ul>
      </dialog>
    </>
  );
}

interface RecordResultsProps {
  group: RecordGroup;
  onPick: () => void;
}

// Μία ομάδα εγγραφών: η επικεφαλίδα του είδους και οι εγγραφές του, όπως οι ενότητες (τίτλος αριστερά, πού ανήκει δεξιά).
function RecordResults({ group, onPick }: RecordResultsProps) {
  return (
    <>
      <li className="muted" role="presentation">
        {group.label}
      </li>
      {group.hits.map((hit) => (
        <li key={`${group.kind}-${hit.id}`}>
          <Link href={hit.href} onClick={onPick}>
            <span>{hit.label}</span>
            {hit.sublabel && <span className="muted">{hit.sublabel}</span>}
          </Link>
        </li>
      ))}
    </>
  );
}
