"use client";

import { useState, type FormEvent } from "react";

import { useKeptForm } from "@/lib/use-kept-form";

import { updateClient } from "../actions-clients";
import type { ClientDetail } from "../types";
import {
  contactErrors,
  contactSavedText,
  type ContactDraft,
} from "./b2-contact-check";

interface ClientContactProps {
  client: ClientDetail;
  canEdit: boolean;
}

const draftOf = (client: ClientDetail): ContactDraft => ({
  name: client.contactName,
  phone: client.contactPhone,
  email: client.contactEmail,
  legalName: client.legalName,
  city: client.city,
  afm: client.afm ?? "",
});

// Κύριο πρόσωπο του Πελάτη (prototype `screens/b2-contact.tsx`), με «Αλλαγή στοιχείων» επί τόπου πάνω στην
// πραγματική ενέργεια: επαφή, Επωνυμία, Πόλη και ΑΦΜ, όπως η Επεξεργασία της κλασικής εμφάνισης· το όνομα πάει όπως είναι.
export function ClientContact({ client, canEdit }: ClientContactProps) {
  const contact = draftOf(client);
  const [draft, setDraft] = useState(contact);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState<readonly string[]>([]);
  const [saved, setSaved] = useState<string | null>(null);
  const [sent, setSent] = useState<{ before: ContactDraft; after: ContactDraft } | null>(
    null,
  );
  const { state, isPending, onSubmit, formRef } = useKeptForm(updateClient);
  const [handled, setHandled] = useState(state);

  // Νέα απάντηση της βάσης με επιτυχία: η φόρμα κλείνει και λέει τι άλλαξε (ενημέρωση κατά το render, όχι effect).
  if (state !== handled) {
    setHandled(state);
    if (state.notice && sent !== null) {
      setSaved(contactSavedText(sent.before, sent.after));
      setIsEditing(false);
      setSent(null);
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const found = contactErrors(draft);
    setErrors(found);
    if (found.length > 0) {
      event.preventDefault();
      return;
    }
    setSent({ before: contact, after: draft });
    onSubmit(event);
  };

  const field = (
    key: keyof ContactDraft,
    name: string,
    label: string,
    type = "text",
  ) => (
    <label className="field">
      <span>{label}</span>
      <input
        className="input"
        type={type}
        name={name}
        value={draft[key]}
        onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
      />
    </label>
  );

  if (isEditing)
    return (
      <form ref={formRef} className="stack" onSubmit={handleSubmit}>
        <input type="hidden" name="clientId" value={client.id} />
        <input type="hidden" name="name" value={client.name} />
        {field("name", "contactName", "Κύριο πρόσωπο")}
        {field("phone", "contactPhone", "Τηλέφωνο", "tel")}
        {field("email", "contactEmail", "Email", "email")}
        {field("legalName", "legalName", "Επωνυμία")}
        {field("city", "city", "Πόλη")}
        {field("afm", "afm", "ΑΦΜ (προαιρετικό)")}
        {(errors.length > 0 || state.error) && (
          <ul className="note" role="alert">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
            {errors.length === 0 && state.error && <li>{state.error}</li>}
          </ul>
        )}
        <span className="btn-row">
          <button
            type="submit"
            className="button"
            data-primary="true"
            disabled={isPending}
          >
            Αποθήκευση
          </button>
          <button
            type="button"
            className="button"
            onClick={() => {
              setDraft(contact);
              setErrors([]);
              setIsEditing(false);
            }}
          >
            Άκυρο
          </button>
        </span>
      </form>
    );

  return (
    <>
      {contact.name === "" ? "—" : contact.name}
      {contact.email !== "" && (
        <>
          <br />
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
        </>
      )}
      {contact.phone !== "" && (
        <>
          <br />
          <a href={`tel:${contact.phone.replace(/\s/g, "")}`}>
            Κλήση {contact.phone}
          </a>
        </>
      )}
      {canEdit && (
        <>
          <br />
          <button
            type="button"
            className="button"
            onClick={() => {
              setDraft(contact);
              setSaved(null);
              setIsEditing(true);
            }}
          >
            Αλλαγή στοιχείων
          </button>
        </>
      )}
      {saved && (
        <span className="note" role="status" style={{ display: "block" }}>
          {saved}
        </span>
      )}
    </>
  );
}
