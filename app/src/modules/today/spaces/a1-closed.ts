// «Έκλεισες N» της λίστας «Σήμερα»: καθαρή συνάρτηση, χωρίς βάση. Τα νούμερα έρχονται από public.today_closed.

export interface ClosedCounts {
  closed: number;
  later: number;
  // Οι γραμμές που φαίνονται τώρα (remainingOf της λίστας).
  remaining: number;
}

// Όταν η λίστα άδειασε: «Έκλεισες N σήμερα» και, αν υπάρχουν, τα «ξαναβγαίνουν αύριο». Αλλιώς μόνο το μικρό «Έκλεισες N».
export function closedNotesOf({ closed, later, remaining }: ClosedCounts): string[] {
  if (remaining > 0) {
    return closed > 0 ? [`Έκλεισες ${closed}`] : [];
  }
  return [
    closed > 0 ? `Έκλεισες ${closed} σήμερα` : null,
    later > 0 ? `${later} ξαναβγαίνουν αύριο το πρωί` : null,
  ].filter((note): note is string => note !== null);
}
