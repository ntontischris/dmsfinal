"use client";

import { useState } from "react";

import { fmtDate } from "@/screens/shared";

interface AfterProps {
  finalLink?: string;
  request?: { when: string; text: string };
  onSubmit: (text: string) => void;
}

// Μετά την έγκριση: Τελικά αρχεία και αίτημα αλλαγής.
export function H4After({ finalLink, request, onSubmit }: AfterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");

  const handleSubmit = () => {
    onSubmit(text.trim());
    setIsOpen(false);
    setText("");
  };

  return (
    <>
      <section className="card">
        <div className="card-title">
          <h2>Τελικά αρχεία</h2>
        </div>
        {finalLink ? (
          <p className="h34-link">{finalLink}</p>
        ) : (
          <p className="muted">Τα τελικά αρχεία δεν έχουν οριστεί ακόμα.</p>
        )}
      </section>
      <section className="card">
        <div className="card-title">
          <h2>Αλλαγή μετά την έγκριση</h2>
        </div>
        {request ? (
          <p className="h34-memo">
            Το αίτημά σου στάλθηκε στις {fmtDate(request.when)} και το εξετάζει
            η ομάδα. «{request.text}»
          </p>
        ) : (
          <>
            <button
              type="button"
              className="button"
              onClick={() => setIsOpen(true)}
            >
              Ζητώ αλλαγή
            </button>
            {isOpen && (
              <div className="h34-form">
                <label>
                  Τι θέλεις να αλλάξει;
                  <input
                    className="input"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                  />
                </label>
                <div className="btn-row">
                  <button
                    type="button"
                    className="button"
                    data-primary="true"
                    disabled={text.trim().length === 0}
                    onClick={handleSubmit}
                  >
                    Στέλνω το αίτημα
                  </button>
                  <button
                    type="button"
                    className="button"
                    onClick={() => setIsOpen(false)}
                  >
                    Άκυρο
                  </button>
                </div>
                <span className="muted">(prototype: δεν αποθηκεύεται)</span>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
