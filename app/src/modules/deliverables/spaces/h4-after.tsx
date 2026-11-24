"use client";

import { useCallback, useState } from "react";

import { requestChangeAfterApproval } from "../actions-client";
import type { ClientOpenRequest } from "../client-types";
import { H2Box } from "./h2-box";
import { fmtDay } from "./h4-adapter";
import { H34Form } from "./h4-form";

// Τελικά αρχεία: στην κορυφή της σελίδας μόλις εγκριθεί το Παραδοτέο (prototype `screens/h4-after.tsx`).
export function H4FinalFiles({ finalLink }: { finalLink: string | null }) {
  return (
    <H2Box
      title="Τελικά αρχεία"
      hint={finalLink ? "έτοιμα για λήψη" : "ετοιμάζονται"}
      isOpen
    >
      {finalLink ? (
        <div className="ml-quick h34-actions">
          <a
            data-primary="true"
            href={finalLink}
            target="_blank"
            rel="noreferrer"
            download
          >
            Λήψη τελικού αρχείου
          </a>
          <small className="muted">Ανοίγει σε νέα καρτέλα.</small>
        </div>
      ) : (
        <p className="muted">
          Η ομάδα ετοιμάζει τα τελικά αρχεία. Μόλις ανέβουν, θα δεις εδώ κουμπί
          λήψης.
        </p>
      )}
    </H2Box>
  );
}

interface AfterProps {
  deliverableId: string;
  request: ClientOpenRequest | null;
  canRequest: boolean;
}

// Μετά την έγκριση: αίτημα αλλαγής (requestChangeAfterApproval)· η ομάδα αποφασίζει τι γίνεται.
export function H4After({ deliverableId, request, canRequest }: AfterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const handleSuccess = useCallback(() => {
    setIsOpen(false);
    setText("");
  }, []);

  return (
    <H2Box
      title="Αλλαγή μετά την έγκριση"
      hint={request ? "το εξετάζει η ομάδα" : "αν θέλεις κάτι ακόμα"}
      isOpen={request !== null || isOpen}
    >
      {request ? (
        <p className="h34-memo" role="status">
          Το αίτημά σου στάλθηκε στις {fmtDay(request.createdAt)} και το
          εξετάζει η ομάδα. «{request.body}»
        </p>
      ) : (
        canRequest && (
          <>
            <div className="ml-quick h34-actions">
              <button type="button" onClick={() => setIsOpen(true)}>
                Ζητώ αλλαγή
              </button>
            </div>
            {isOpen && (
              <H34Form
                action={requestChangeAfterApproval}
                hidden={{ deliverableId }}
                submitLabel="Στέλνω το αίτημα"
                isPrimary
                isDisabled={text.trim().length === 0}
                onSuccess={handleSuccess}
                onClose={() => setIsOpen(false)}
              >
                <label>
                  Τι θέλεις να αλλάξει;
                  <input
                    className="input"
                    name="body"
                    value={text}
                    maxLength={2000}
                    onChange={(event) => setText(event.target.value)}
                  />
                </label>
              </H34Form>
            )}
          </>
        )
      )}
    </H2Box>
  );
}
