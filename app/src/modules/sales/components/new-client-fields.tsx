import { Field, Input } from "@/components/ui/field";

export interface ClientFieldValues {
  name: string;
  legalName: string;
  city: string;
  afm: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

const EMPTY: ClientFieldValues = {
  name: "",
  legalName: "",
  city: "",
  afm: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
};

interface NewClientFieldsProps {
  defaults?: ClientFieldValues;
  onNameChange?: (name: string) => void; // η νέα Ευκαιρία δείχνει το όνομα στη σημείωση «γίνεσαι Υπεύθυνος»
}

interface FieldGroupProps {
  defaults: ClientFieldValues;
  onNameChange?: (name: string) => void;
}

function IdentityFields({ defaults, onNameChange }: FieldGroupProps) {
  return (
    <>
      <Field label="Όνομα Πελάτη">
        <Input
          name="name"
          defaultValue={defaults.name}
          autoComplete="off"
          onChange={(event) => onNameChange?.(event.target.value)}
        />
      </Field>
      <Field label="Επωνυμία">
        <Input
          name="legalName"
          defaultValue={defaults.legalName}
          autoComplete="off"
        />
      </Field>
      <Field label="Πόλη">
        <Input name="city" defaultValue={defaults.city} autoComplete="off" />
      </Field>
      <Field label="ΑΦΜ">
        <Input
          name="afm"
          defaultValue={defaults.afm}
          inputMode="numeric"
          autoComplete="off"
        />
      </Field>
    </>
  );
}

function ContactFields({ defaults }: Pick<FieldGroupProps, "defaults">) {
  return (
    <>
      <Field label="Κύριο πρόσωπο">
        <Input
          name="contactName"
          defaultValue={defaults.contactName}
          autoComplete="off"
        />
      </Field>
      <Field label="Email κύριου προσώπου">
        <Input
          name="contactEmail"
          defaultValue={defaults.contactEmail}
          inputMode="email"
          autoComplete="off"
        />
      </Field>
      <Field label="Τηλέφωνο">
        <Input
          name="contactPhone"
          type="tel"
          defaultValue={defaults.contactPhone}
          autoComplete="off"
        />
      </Field>
    </>
  );
}

// Τα στοιχεία Πελάτη, κοινά στη φόρμα «Νέα Ευκαιρία» (νέος Πελάτης) και στην Επεξεργασία. Ονόματα πεδίων = κλειδιά του schema.
export function NewClientFields({
  defaults = EMPTY,
  onNameChange,
}: NewClientFieldsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <IdentityFields defaults={defaults} onNameChange={onNameChange} />
      <ContactFields defaults={defaults} />
    </div>
  );
}
