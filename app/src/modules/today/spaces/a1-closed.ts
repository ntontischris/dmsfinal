// «Έκλεισες N» της λίστας «Σήμερα»: καθαρή συνάρτηση, χωρίς βάση. Το «ξαναβγαίνουν αύριο» το δείχνει η γραμμή «Για αργότερα».

export interface ClosedCount {
  closed: number;
  // Οι γραμμές που φαίνονται τώρα (remainingOf της λίστας).
  remaining: number;
}

// Όταν η λίστα άδειασε: «Έκλεισες N σήμερα». Αλλιώς μόνο το μικρό «Έκλεισες N». Χωρίς κλεισμένες, τίποτα.
export function closedNoteOf({ closed, remaining }: ClosedCount): string | null {
  if (closed <= 0) return null;
  return remaining > 0 ? `Έκλεισες ${closed}` : `Έκλεισες ${closed} σήμερα`;
}
