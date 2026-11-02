"use client";

import { useCallback, useState } from "react";

import { Panel } from "@/spaces/kit/panel";

import { requestChangeAfterApproval } from "../actions-client";
import type { ClientOpenRequest } from "../client-types";
import { fmtDay } from "./h4-adapter";
import { H34Form } from "./h4-form";

// Τελικά αρχεία: στην κορυφή της σελίδας μόλις εγκριθεί το Παραδοτέο (prototype `screens/h4-after.tsx`).
export function H4FinalFiles({ finalLink }: { finalLink: string | null }) {
  return (
    <Panel label="Τελικά αρχεία">
      {finalLink ? (
        <div className="stack">
          <a
            className="button"
            data-primary="true"
            href={finalLink}
            target="_blank"
            rel="noreferrer"
            download
          >
            Λήψη τελικού αρχείου
          </a>
          <p className="muted">Ανοίγει σε νέα καρτέλα.</p>
        </div>
      ) : (
        <p className="muted">
          Η ομάδα ετοιμάζει τα τελικά αρχεία. Μόλις ανέβουν, θα δεις εδώ κουμπί
          λήψης.
        </p>
      )}
    </Panel>
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
    <Panel label="Αλλαγή μετά την έγκριση">
      {request ? (
        <p className="h34-memo" role="status">
          Το αίτημά σου στάλθηκε στις {fmtDay(request.createdAt)} και το
          εξετάζει η ομάδα. «{request.body}»
        </p>
      ) : (
        canRequest && (
          <>
            <button
              type="button"
              className="button"
              onClick={() => setIsOpen(true)}
            >
              Ζητώ αλλαγή
            </button>
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
    </Panel>
  );
}
