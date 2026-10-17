"use client";

import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { useKeptForm } from "@/lib/use-kept-form";

import { createGdprRequest } from "../actions";
import { KIND_LABEL, SUBJECT_KIND_LABEL } from "../labels";
import { GDPR_KINDS, subjectRef, type GdprSubjects } from "../schemas";

// Οι επιλογές του «Ποιον αφορά», ανά είδος υποκειμένου.
const subjectGroups = (subjects: GdprSubjects) => [
  {
    label: SUBJECT_KIND_LABEL.team_user,
    options: subjects.teamUsers.map((user) => ({
      value: subjectRef("team_user", user.id),
      text: `${SUBJECT_KIND_LABEL.team_user}: ${user.name}`,
    })),
  },
  {
    label: SUBJECT_KIND_LABEL.client_user,
    options: subjects.clientUsers.map((user) => ({
      value: subjectRef("client_user", user.id),
      text: `${SUBJECT_KIND_LABEL.client_user}: ${user.name}`,
    })),
  },
  {
    label: SUBJECT_KIND_LABEL.contact,
    options: subjects.clients.map((client) => ({
      value: subjectRef("contact", client.id),
      text: `${SUBJECT_KIND_LABEL.contact}: ${client.contactName} (${client.name})`,
    })),
  },
  {
    label: SUBJECT_KIND_LABEL.client,
    options: subjects.clients.map((client) => ({
      value: subjectRef("client", client.id),
      text: `${SUBJECT_KIND_LABEL.client}: ${client.name}`,
    })),
  },
];

// Ν6: καταγραφή αιτήματος. Η προθεσμία (λήψη + 1 μήνας, ώρα Αθήνας) υπολογίζεται στη βάση.
export function GdprRequestForm({ subjects }: { subjects: GdprSubjects }) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(
    createGdprRequest,
    { resetOnSuccess: true },
  );
  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid max-w-xl gap-4">
      <Field label="Είδος">
        <Select name="kind" defaultValue="export">
          {GDPR_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {KIND_LABEL[kind]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Ποιον αφορά">
        <Select name="subject" required defaultValue="">
          <option value="" disabled>
            Διάλεξε πρόσωπο ή Πελάτη
          </option>
          {subjectGroups(subjects).map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.text}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Field>
      <Field
        label="Ημερομηνία λήψης"
        hint="Κενό = σήμερα. Η προθεσμία είναι 1 μήνας από τη λήψη."
      >
        <Input name="receivedOn" type="date" />
      </Field>
      <Field label="Σημείωση">
        <Input name="note" maxLength={1000} autoComplete="off" />
      </Field>
      <FormMessage state={state} />
      <div>
        <Button variant="primary" type="submit" disabled={isPending}>
          {isPending ? "Καταγραφή…" : "Καταγραφή αιτήματος"}
        </Button>
      </div>
    </form>
  );
}
