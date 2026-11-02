import type { PickerRole } from "./n1-adapter";

interface RolePickerProps {
  roles: readonly PickerRole[];
  idPrefix: string;
  selected: readonly string[];
}

// Οι Ρόλοι ομάδας με τι βλέπει ο καθένας· όσους δεν μπορείς να δώσεις (ή να αφαιρέσεις) τους βλέπεις κλειδωμένους, με τον λόγο.
export function RolePicker({ roles, idPrefix, selected }: RolePickerProps) {
  return (
    <fieldset className="n1-roles">
      <legend>Ρόλοι (τουλάχιστον ένας)</legend>
      {roles.length === 0 && (
        <p className="muted">Δεν έχεις Ρόλο που να μπορείς να δώσεις.</p>
      )}
      {roles.map((def) => {
        const id = `${idPrefix}-${def.id}`;
        const isChecked = selected.includes(def.id);
        return (
          <div key={def.id} className="n1-role" data-locked={!!def.reason}>
            <input
              type="checkbox"
              id={id}
              name="role"
              value={def.id}
              defaultChecked={isChecked}
              disabled={!!def.reason}
              // Όνομα για τον αναγνώστη οθόνης: η ελληνική ονομασία, όχι το τεχνικό id.
              aria-label={`Ρόλος ${def.name}`}
              aria-describedby={`${id}-about`}
            />
            {/* Ένα κλειδωμένο κουτί δεν στέλνεται με τη φόρμα· ο Ρόλος που ήδη έχει μένει όπως είναι. */}
            {def.reason && isChecked && (
              <input type="hidden" name="role" value={def.id} />
            )}
            <label htmlFor={id}>
              <strong>{def.name}</strong>{" "}
              <span id={`${id}-about`} className="muted">
                {def.description}
              </span>
              <span className="n1-reach">{def.reach}</span>
              {def.reason && (
                <span className="n1-why">Δεν γίνεται: {def.reason}.</span>
              )}
            </label>
          </div>
        );
      })}
    </fieldset>
  );
}
