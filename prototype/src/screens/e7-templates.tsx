"use client";

import { useState } from "react";

import { CREW_PEOPLE, personName, type CrewTemplate } from "@/data/filming";

import "./e5.css";

interface Draft {
  id: string | null;
  name: string;
  note: string;
  personIds: readonly string[];
}

const EMPTY_DRAFT: Draft = { id: null, name: "", note: "", personIds: [] };

function TemplateForm({
  draft,
  onChange,
  onSave,
  onCancel,
}: {
  draft: Draft;
  onChange: (draft: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [tried, setTried] = useState(false);
  const nameError = !draft.name.trim();
  const peopleError = draft.personIds.length === 0;
  const handleToggle = (id: string) =>
    onChange({
      ...draft,
      personIds: draft.personIds.includes(id)
        ? draft.personIds.filter((item) => item !== id)
        : [...draft.personIds, id],
    });
  const handleSave = () => {
    setTried(true);
    if (!nameError && !peopleError) onSave();
  };
  return (
    <section className="card e-form">
      <h2>{draft.id ? "Αλλαγή Προτύπου" : "Νέο Πρότυπο συνεργείου"}</h2>
      <label>
        Όνομα (υποχρεωτικό)
        <input
          className="input"
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
        />
      </label>
      <div className="e-field">
        Άτομα (τουλάχιστον ένα)
        <div className="e-checks">
          {CREW_PEOPLE.map((person) => (
            <label key={person.id}>
              <input
                type="checkbox"
                checked={draft.personIds.includes(person.id)}
                onChange={() => handleToggle(person.id)}
              />
              {person.name} ({person.skill})
            </label>
          ))}
        </div>
      </div>
      <label>
        Σημείωση
        <input
          className="input"
          value={draft.note}
          onChange={(e) => onChange({ ...draft, note: e.target.value })}
        />
      </label>
      {tried && (nameError || peopleError) && (
        <p className="e-warn" role="alert">
          {nameError && "Γράψε όνομα. "}
          {peopleError && "Διάλεξε τουλάχιστον ένα άτομο."}
        </p>
      )}
      <div className="btn-row">
        <button
          type="button"
          className="button"
          data-primary="true"
          onClick={handleSave}
        >
          Αποθήκευση
        </button>
        <button type="button" className="button" onClick={onCancel}>
          Άκυρο
        </button>
      </div>
    </section>
  );
}

// Πρότυπα συνεργείου: γρήγορος τρόπος να γεμίσει το Συνεργείο στο E3. Όλα στη μνήμη.
export function E7Templates({ initial }: { initial: readonly CrewTemplate[] }) {
  const [templates, setTemplates] = useState<readonly CrewTemplate[]>(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleSave = () => {
    if (!draft) return;
    const clean = {
      name: draft.name.trim(),
      note: draft.note.trim(),
      personIds: draft.personIds,
    };
    setTemplates((current) =>
      draft.id
        ? current.map((item) =>
            item.id === draft.id ? { ...item, ...clean } : item,
          )
        : [
            ...current,
            { ...clean, id: `ct-new-${current.length + 1}`, uses: 0 },
          ],
    );
    setDraft(null);
  };
  const handleDelete = (id: string) => {
    setTemplates((current) => current.filter((item) => item.id !== id));
    setDeleting(null);
  };

  return (
    <>
      <div className="e-info">
        Το Πρότυπο γεμίζει γρήγορα το Συνεργείο στο Γύρισμα (E3). Όταν το
        εφαρμόζεις, ο έλεγχος διαθεσιμότητας τρέχει κανονικά: Κλεισμένος χρόνος
        ενός ατόμου <strong>προειδοποιεί</strong>, Γύρισμα που επικαλύπτεται την
        ίδια ώρα <strong>μπλοκάρει</strong>. Αν σβήσεις Πρότυπο που
        χρησιμοποιήθηκε, τα Γυρίσματα που το είχαν <strong>δεν αλλάζουν</strong>
        .
      </div>
      <div className="btn-row" style={{ marginBottom: "var(--space-4)" }}>
        <button
          type="button"
          className="button"
          data-primary="true"
          onClick={() => setDraft(EMPTY_DRAFT)}
        >
          Νέο Πρότυπο
        </button>
      </div>
      {draft && (
        <TemplateForm
          draft={draft}
          onChange={setDraft}
          onSave={handleSave}
          onCancel={() => setDraft(null)}
        />
      )}
      {templates.length === 0 ? (
        <section className="card notice" data-kind="empty" role="status">
          <h2>Κανένα Πρότυπο συνεργείου</h2>
          <p className="muted">Φτιάξε το πρώτο με «Νέο Πρότυπο».</p>
        </section>
      ) : (
        templates.map((template) => (
          <section className="card" key={template.id}>
            <div className="card-title">
              <h2>{template.name}</h2>
              <span className="badge">{template.uses} χρήσεις</span>
            </div>
            <p>{template.personIds.map(personName).join(", ")}</p>
            {template.note && <p className="muted">{template.note}</p>}
            {deleting === template.id ? (
              <div className="btn-row">
                <span className="muted">
                  Σβήνεται το Πρότυπο· τα Γυρίσματα δεν αλλάζουν.
                </span>
                <button
                  type="button"
                  className="button"
                  data-danger="true"
                  onClick={() => handleDelete(template.id)}
                >
                  Ναι, διαγραφή
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => setDeleting(null)}
                >
                  Άκυρο
                </button>
              </div>
            ) : (
              <div className="btn-row">
                <button
                  type="button"
                  className="button"
                  onClick={() => setDraft({ ...template })}
                >
                  Αλλαγή
                </button>
                <button
                  type="button"
                  className="button"
                  data-danger="true"
                  onClick={() => setDeleting(template.id)}
                >
                  Διαγραφή
                </button>
              </div>
            )}
          </section>
        ))
      )}
    </>
  );
}
